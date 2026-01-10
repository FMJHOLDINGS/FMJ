import { ProductionRow, DayData } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const parseMinutes = (timeStr: string): number | null => {
  if (!timeStr || !timeStr.includes(':')) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + m;
};

export const calculateTimeDiff = (start: string, end: string): number => {
  const s = parseMinutes(start);
  const e0 = parseMinutes(end);

  if (s === null || e0 === null) return 0;

  let e = e0;
  if (e < s) e += 1440; // Crosses midnight

  return Math.max(0, e - s);
};

export const calculateMetrics = (row: ProductionRow) => {
  const durationMins = calculateTimeDiff(row.startTime, row.endTime);
  const timeHr = durationMins > 0 ? Number((durationMins / 60).toFixed(2)) : 0;

  let bdMins = 0;
  let bdLostQty = 0;

  const unitWeight = row.unitWeight || 0;
  const qtyPerHour = row.qtyPerHour || 0;
  const cavities = Math.max(1, row.cavities || 1);

  // Rate per minute calculation
  const ratePerMin = (qtyPerHour * cavities) / 60;

  // Calculate Breakdown Loss
  if (row.breakdowns) {
    row.breakdowns.forEach((bd) => {
      const min = calculateTimeDiff(bd.startTime, bd.endTime);
      bdMins += min;

      const thisBdLoss = Math.floor(ratePerMin * min);
      bdLostQty += thisBdLoss;
    });
  }

  // --- CALCULATIONS ---
  const achievedQty = row.achievedQty || 0; // Gross Production
  const rejectionQty = row.rejectionQty || 0;
  const startupQty = row.startupQty || 0;

  // Accepted Qty (Good Production) = Gross - Rejects - Startup
  const calculatedAccepted = Math.max(0, achievedQty - rejectionQty - startupQty);
  const acceptedQty = calculatedAccepted;

  // Use exact minutes for Plan Qty to avoid rounding errors
  const planQty = Math.floor(qtyPerHour * cavities * (durationMins / 60));

  const planKg = Number(((planQty * unitWeight) / 1000).toFixed(2));
  const achievedKg = Number(((achievedQty * unitWeight) / 1000).toFixed(2));
  const acceptedKg = Number(((acceptedQty * unitWeight) / 1000).toFixed(2)); // Good Kg

  const lostQty = Math.max(0, planQty - achievedQty);
  const lostKg = Number(((lostQty * unitWeight) / 1000).toFixed(2));

  const bdLostKg = Number(((bdLostQty * unitWeight) / 1000).toFixed(2));

  const efficiencyLossQty = Math.max(0, lostQty - bdLostQty);
  const efficiencyLossKg = Number(((efficiencyLossQty * unitWeight) / 1000).toFixed(2));

  const efficiency = planQty > 0 ? (achievedQty / planQty) * 100 : 0;

  return {
    timeHr,
    planQty,
    planKg,
    achievedQty,
    achievedKg,
    rejectionQty,
    startupQty,
    acceptedQty,
    acceptedKg,
    lostQty,
    lostKg,
    bdMins,
    bdLostQty,
    bdLostKg,
    efficiencyLossQty,
    efficiencyLossKg,
    efficiency,
  };
};

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const currDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currDate <= lastDate) {
    dates.push(currDate.toISOString().split('T')[0]);
    currDate.setDate(currDate.getDate() + 1);
  }

  return dates;
};

export const getMTDData = (
  allData: Record<string, any>,
  currentDate: string,
  machineType: string
) => {
  const currentMonthPrefix = currentDate.substring(0, 7);

  let mtdPlan = 0;
  let mtdAchv = 0;
  let mtdLoss = 0;

  Object.values(allData).forEach((dayData: any) => {
    if (
      dayData?.date &&
      typeof dayData.date === 'string' &&
      dayData.date.startsWith(currentMonthPrefix) &&
      dayData.date <= currentDate &&
      dayData.machineType === machineType
    ) {
      if (Array.isArray(dayData.rows)) {
        dayData.rows.forEach((row: ProductionRow) => {
          const m = calculateMetrics(row);
          mtdPlan += m.planKg;
          mtdAchv += m.achievedKg;
          mtdLoss += m.lostKg;
        });
      }
    }
  });

  return { mtdPlan, mtdAchv, mtdLoss };
};

export const getBreakdownSummary = (rows: any[]) => {
  const grouped: Record<string, any[]> = {};

  rows.forEach((row) => {
    if (row?.breakdowns) {
      row.breakdowns.forEach((bd: any) => {
        if (!grouped[bd.category]) grouped[bd.category] = [];

        const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
        const mins = calculateTimeDiff(bd.startTime, bd.endTime);
        const lossQty = Math.floor(ratePerMin * mins);
        const lossKg = (lossQty * (row.unitWeight || 0)) / 1000;

        grouped[bd.category].push({
          ...bd,
          shift: row.shift,
          machine: row.machine,
          product: row.product,
          mins,
          lossKg,
        });
      });
    }
  });

  return grouped;
};

export const exportToExcel = async (
  rows: ProductionRow[],
  filters: { machine: string[]; product: string[]; startDate: string; endDate: string; type: string }
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Report');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Shift', key: 'shift', width: 8 },
    { header: 'Machine', key: 'machine', width: 15 },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'Wt (g)', key: 'wt', width: 10 },
    { header: 'Plan Qty', key: 'planQty', width: 12 },
    { header: 'Achv Qty', key: 'achvQty', width: 12 },
    { header: 'Rej Qty', key: 'rejQty', width: 12 },
    { header: 'Start Qty', key: 'startQty', width: 12 },
    { header: 'Acc Qty', key: 'accQty', width: 12 },
    { header: 'Plan Kg', key: 'planKg', width: 12 },
    { header: 'Achv Kg', key: 'achvKg', width: 12 },
    { header: 'Lost Qty', key: 'lostQty', width: 12 },
    { header: 'Lost Kg', key: 'lostKg', width: 12 },
  ];

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
  };

  const headerRow = worksheet.getRow(1);
  headerRow.values = [
    'Date',
    'Shift',
    'Machine',
    'Product',
    'Wt(g)',
    'Plan Qty',
    'Gross Qty',
    'Rej Qty',
    'Start Qty',
    'Good Qty',
    'Plan Kg',
    'Gross Kg',
    'Lost Qty',
    'Lost Kg',
  ];

  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // --- INITIALIZE TOTALS ---
  let tPlanQty = 0, tAchvQty = 0, tRejQty = 0, tStartQty = 0, tAccQty = 0;
  let tPlanKg = 0, tAchvKg = 0, tLostQty = 0, tLostKg = 0;

  rows.forEach((row) => {
    const m = calculateMetrics(row);

    // Sum Totals
    tPlanQty += m.planQty;
    tAchvQty += row.achievedQty;
    tRejQty += row.rejectionQty || 0;
    tStartQty += row.startupQty || 0;
    tAccQty += m.acceptedQty;
    tPlanKg += m.planKg;
    tAchvKg += m.achievedKg;
    tLostQty += m.lostQty;
    tLostKg += m.lostKg;

    worksheet.addRow([
      (row as any).date || '',
      row.shift.toUpperCase(),
      row.machine,
      row.product,
      row.unitWeight,
      m.planQty,
      row.achievedQty,
      row.rejectionQty || 0,
      row.startupQty || 0,
      m.acceptedQty,
      m.planKg,
      m.achievedKg,
      m.lostQty,
      m.lostKg,
    ]);
  });

  // --- ADD GRAND TOTAL ROW ---
  const totalRow = worksheet.addRow([
    'TOTAL', '', '', '', '',
    tPlanQty, tAchvQty, tRejQty, tStartQty, tAccQty,
    tPlanKg.toFixed(2), tAchvKg.toFixed(2), tLostQty, tLostKg.toFixed(2)
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow Highlight
    cell.alignment = { horizontal: 'right' };
    cell.border = { top: { style: 'double' }, bottom: { style: 'thick' } };
  });
  
  // Merge first few cells for 'TOTAL' label
  worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
  worksheet.getCell(`A${totalRow.number}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, `Production_Report_${filters.type}.xlsx`);
};

/** ---------- OEE HELPERS (New) ---------- **/

export const calculateOEEFromRows = (rows: ProductionRow[]) => {
  let plannedMins = 0;
  let downtimeMins = 0;

  let planQty = 0;
  let grossQty = 0;
  let goodQty = 0;

  rows.forEach((row) => {
    plannedMins += calculateTimeDiff(row.startTime, row.endTime);

    const m = calculateMetrics(row);
    downtimeMins += m.bdMins;

    planQty += m.planQty;
    grossQty += row.achievedQty || 0;
    goodQty += m.acceptedQty || 0;
  });

  const operatingMins = Math.max(0, plannedMins - downtimeMins);

  const availability = plannedMins > 0 ? operatingMins / plannedMins : 0;
  const performance = planQty > 0 ? grossQty / planQty : 0;
  const quality = grossQty > 0 ? goodQty / grossQty : 0;

  const oee = availability * performance * quality;

  return {
    availability,
    performance,
    quality,
    oee,
    plannedMins,
    downtimeMins,
    operatingMins,
    planQty,
    grossQty,
    goodQty,
  };
};

export const isDayData = (v: any): v is DayData => {
  return (
    v &&
    typeof v === 'object' &&
    typeof v.date === 'string' &&
    Array.isArray(v.rows)
  );
};