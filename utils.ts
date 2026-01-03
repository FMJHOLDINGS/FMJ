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
    row.breakdowns.forEach(bd => {
      const min = calculateTimeDiff(bd.startTime, bd.endTime);
      bdMins += min;
      const thisBdLoss = Math.floor(ratePerMin * min);
      bdLostQty += thisBdLoss;
    });
  }

  const achievedQty = row.achievedQty || 0;
  const planQty = Math.floor(qtyPerHour * cavities * timeHr);

  const planKg = Number(((planQty * unitWeight) / 1000).toFixed(2));
  const achievedKg = Number(((achievedQty * unitWeight) / 1000).toFixed(2));

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
    achievedKg,
    lostQty,
    lostKg,
    bdMins,
    bdLostQty,
    bdLostKg,
    efficiencyLossQty,
    efficiencyLossKg,
    efficiency
  };
};

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates = [];
  const currDate = new Date(startDate);
  const lastDate = new Date(endDate);
  while (currDate <= lastDate) {
    dates.push(currDate.toISOString().split('T')[0]);
    currDate.setDate(currDate.getDate() + 1);
  }
  return dates;
};

// --- NEW HELPERS FOR REPORTS (MTD & BREAKDOWNS) ---

export const getMTDData = (allData: Record<string, any>, currentDate: string, machineType: string) => {
  const currentMonthPrefix = currentDate.substring(0, 7); // e.g. "2025-12"

  let mtdPlan = 0;
  let mtdAchv = 0;
  let mtdLoss = 0;

  Object.values(allData).forEach((dayData: any) => {
    // Ensure we only sum up data for the requested machine type AND current month
    if (dayData.date && dayData.date.startsWith(currentMonthPrefix) &&
      dayData.date <= currentDate &&
      dayData.machineType === machineType) {

      if (dayData.rows) {
        dayData.rows.forEach((row: any) => {
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

  rows.forEach(row => {
    if (row.breakdowns) {
      row.breakdowns.forEach((bd: any) => {
        if (!grouped[bd.category]) grouped[bd.category] = [];

        // Re-calculate breakdown specific loss
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
          lossKg
        });
      });
    }
  });

  return grouped;
};

export const exportToCSV = (dayData: DayData) => {
  const headers = [
    'Shift', 'Start', 'End', 'Machine', 'Product', 'Unit Wt', 'Qty/Hr', 'Cavities',
    'Time Hr', 'Plan Qty', 'Achieved Qty', 'Plan Kg', 'Achieved Kg', 'Lost Qty', 'BD Minutes', 'Efficiency %'
  ];

  const rows = dayData.rows.map(row => {
    const m = calculateMetrics(row);
    return [
      row.shift, row.startTime, row.endTime, row.machine, row.product, row.unitWeight,
      row.qtyPerHour, row.cavities, m.timeHr, m.planQty, row.achievedQty, m.planKg,
      m.achievedKg, m.lostQty, m.bdMins, m.efficiency.toFixed(1)
    ];
  });

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Production_Report_${dayData.date}_${dayData.machineType}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = async (
  rows: ProductionRow[],
  filters: { machine: string[], product: string[], startDate: string, endDate: string, type: string }
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Report');

  // Set Column Widths
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Shift', key: 'shift', width: 8 },
    { header: 'Machine', key: 'machine', width: 15 },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'Wt (g)', key: 'wt', width: 10 },
    { header: 'Plan Qty', key: 'planQty', width: 12 },
    { header: 'Achv Qty', key: 'achvQty', width: 12 },
    { header: 'Plan Kg', key: 'planKg', width: 12 },
    { header: 'Achv Kg', key: 'achvKg', width: 12 },
    { header: 'Lost Qty', key: 'lostQty', width: 12 },
    { header: 'Lost Kg', key: 'lostKg', width: 12 },
  ];

  // Styling Constants
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
  const headerFont: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
  const border: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // Add Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.values = [
    'Date', 'Shift', 'Machine', 'Product', 'Wt(g)',
    'Plan Qty', 'Achv Qty', 'Plan Kg', 'Achv Kg', 'Lost Qty', 'Lost Kg'
  ];

  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = border;
  });
  headerRow.height = 25;

  let totalPlanKg = 0;
  let totalAchvKg = 0;
  let totalLostKg = 0;

  rows.forEach((row, index) => {
    const m = calculateMetrics(row);

    totalPlanKg += m.planKg;
    totalAchvKg += m.achievedKg;
    totalLostKg += m.lostKg;

    const r = worksheet.addRow([
      (row as any).date || '',
      row.shift.toUpperCase(),
      row.machine,
      row.product,
      row.unitWeight,
      m.planQty,
      row.achievedQty,
      m.planKg,
      m.achievedKg,
      m.lostQty,
      m.lostKg
    ]);

    // Row Styling
    r.height = 20;
    r.eachCell((cell, colNumber) => {
      cell.border = border;
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 4 ? 'left' : 'right' };
      if (colNumber > 4) cell.numFmt = '#,##0.0'; // Number format
      if (colNumber === 2) { // Shift
        cell.font = { color: { argb: row.shift === 'day' ? 'FFD97706' : 'FF4F46E5' }, bold: true };
      }
    });
  });

  // Add Total Row
  const totalRow = worksheet.addRow([
    'TOTAL', '', '', '', '',
    '', '', totalPlanKg, totalAchvKg, '', totalLostKg
  ]);
  totalRow.height = 30;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };
    cell.alignment = { vertical: 'middle', horizontal: colNumber <= 4 ? 'left' : 'right' };
    if (colNumber > 4) cell.numFmt = '#,##0.0';
  });

  worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Production_Report_${filters.type}_${filters.startDate}_to_${filters.endDate}.xlsx`);
};