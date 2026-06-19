import { ProductionRow, DayData, Breakdown } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// We keep this import if you rely on it elsewhere, otherwise it's optional for this file logic
import { generateProductionReport } from './components/QUALITY/QalityExcelExport';

// ============================================================================
// ⏱️ 1. TIME CALCULATION HELPERS (කාලය ගණනය කිරීමේ උපකාරක)
// ============================================================================

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


// ============================================================================
// 📊 2. CORE METRICS CALCULATION (ප්‍රධාන දත්ත ගණනය කිරීම්)
// ============================================================================

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
  // (🟢 Reject, Startup සහ Accepted Qty මෙතැනින් ඉවත් කර ඇත)
  const achievedQty = row.achievedQty || 0; 

  const planQty = Math.floor(qtyPerHour * cavities * (durationMins / 60));

  const planKg = Number(((planQty * unitWeight) / 1000).toFixed(2));
  const achievedKg = Number(((achievedQty * unitWeight) / 1000).toFixed(2));

  const lostQty = planQty - achievedQty;
  const lostKg = Number(((lostQty * unitWeight) / 1000).toFixed(2));

  const bdLostKg = Number(((bdLostQty * unitWeight) / 1000).toFixed(2));

  const efficiencyLossQty = lostQty - bdLostQty;
  const efficiencyLossKg = Number(((efficiencyLossQty * unitWeight) / 1000).toFixed(2));

  const efficiency = planQty > 0 ? (achievedQty / planQty) * 100 : 0;

  return {
    timeHr,
    planQty,
    planKg,
    achievedQty,
    achievedKg,
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


// ============================================================================
// 📅 3. DATE UTILITIES (දින සම්බන්ධ උපකාරක)
// ============================================================================

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  // 🟢 'Z' අකුර යෙදීමෙන් Local Time එක මඟහැර ලෝක වේලාව (UTC) ලබා ගනී
  let currentDate = new Date(`${startDate}T00:00:00Z`); 
  const lastDate = new Date(`${endDate}T00:00:00Z`);

  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1); // 🟢 UTC දවස් පමණක් එකතු කරයි
  }

  return dates;
};





// ============================================================================
// 📉 4. EXCEL EXPORTS: BREAKDOWN LOG (Breakdown දත්ත Excel කිරීම)
// ============================================================================

export const exportBreakdownsToExcel = async (
  data: any[],
  dateRange: { start: string; end: string }
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Breakdown Log');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Machine', key: 'machine', width: 10 },
    { header: 'Product', key: 'product', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Reason', key: 'reason', width: 30 },
    { header: 'Start', key: 'start', width: 10 },
    { header: 'End', key: 'end', width: 10 },
    { header: 'Mins', key: 'mins', width: 10 },
    { header: 'Cavity', key: 'cav', width: 8 },
    { header: 'Cyc (s)', key: 'cycle', width: 8 },
    { header: 'Lost Qty', key: 'lqty', width: 12 },
    { header: 'Lost Kg', key: 'lkg', width: 12 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let totalMins = 0;
  let totalLostQty = 0;
  let totalLostKg = 0;

  data.forEach((item) => {
    totalMins += item.mins;
    totalLostQty += item.lostQty;
    totalLostKg += item.lostKg;

    worksheet.addRow({
      date: item.date,
      machine: item.machine,
      product: item.product,
      category: item.category,
      reason: item.description,
      start: item.startTime,
      end: item.endTime,
      mins: item.mins,
      cav: item.cavities,
      cycle: item.cycleTime,
      lqty: item.lostQty,
      lkg: item.lostKg.toFixed(2),
    });
  });

  const totalRow = worksheet.addRow([
    'TOTAL', '', '', '', '', '', '',
    totalMins, '', '', 
    totalLostQty, 
    totalLostKg.toFixed(2)
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    cell.alignment = { horizontal: 'right' };
    cell.border = { top: { style: 'double' } };
  });

  worksheet.mergeCells(`A${totalRow.number}:G${totalRow.number}`);
  worksheet.getCell(`A${totalRow.number}`).alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Breakdown_Log_${dateRange.start}_to_${dateRange.end}.xlsx`);
};


// ============================================================================
// 🏭 5. EXCEL EXPORTS: PRODUCTION REPORT (ප්‍රධාන දත්ත Excel කිරීම)
// ============================================================================

export const exportToExcel = async (
  rows: ProductionRow[],
  filters: { machine: string[]; product: string[]; startDate: string; endDate: string; type: string }
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Production Report');
  
    // (🟢 Rej Qty, Start Qty, Acc Qty සහ Good Qty මෙතැනින් ඉවත් කර ඇත)
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Shift', key: 'shift', width: 8 },
      { header: 'Machine', key: 'machine', width: 15 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'Wt (g)', key: 'wt', width: 10 },
      { header: 'Plan Qty', key: 'planQty', width: 12 },
      { header: 'Gross Qty', key: 'achvQty', width: 12 },
      { header: 'Plan Kg', key: 'planKg', width: 12 },
      { header: 'Gross Kg', key: 'achvKg', width: 12 },
      { header: 'Lost Qty', key: 'lostQty', width: 12 },
      { header: 'Lost Kg', key: 'lostKg', width: 12 },
    ];
  
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const headerFont: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    const headerRow = worksheet.getRow(1);
    
    headerRow.values = ['Date', 'Shift', 'Machine', 'Product', 'Wt(g)', 'Plan Qty', 'Gross Qty', 'Plan Kg', 'Gross Kg', 'Lost Qty', 'Lost Kg'];
    headerRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
  
    let tPlanQty = 0, tAchvQty = 0, tPlanKg = 0, tAchvKg = 0, tLostQty = 0, tLostKg = 0;
  
    rows.forEach((row) => {
      const m = calculateMetrics(row);
      tPlanQty += m.planQty; 
      tAchvQty += row.achievedQty; 
      tPlanKg += m.planKg; 
      tAchvKg += m.achievedKg; 
      tLostQty += m.lostQty; 
      tLostKg += m.lostKg;
  
      worksheet.addRow([
        (row as any).date || '', row.shift.toUpperCase(), row.machine, row.product, row.unitWeight,
        m.planQty, row.achievedQty, 
        m.planKg, m.achievedKg, m.lostQty, m.lostKg
      ]);
    });
  
    const totalRow = worksheet.addRow(['TOTAL', '', '', '', '', tPlanQty, tAchvQty, tPlanKg.toFixed(2), tAchvKg.toFixed(2), tLostQty, tLostKg.toFixed(2)]);
    totalRow.eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; cell.alignment = { horizontal: 'right' }; cell.border = { top: { style: 'double' }, bottom: { style: 'thick' } }; });
    
    // (A සිට E දක්වා Merge කිරීම)
    worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
    worksheet.getCell(`A${totalRow.number}`).alignment = { horizontal: 'center', vertical: 'middle' };
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Production_Report_${filters.type}.xlsx`);
};


// ============================================================================
// 📂 6. TEMPLATE DOWNLOAD (Excel Template එක Download කිරීම)
// ============================================================================

export const downloadTemplate = async () => {
  try {
    const response = await fetch('./template/report_template.xlsx');
    
    if (!response.ok) {
        throw new Error('Template file not found. Check public/template folder.');
    }

    const blob = await response.blob();
    saveAs(blob, 'report_template.xlsx');
  } catch (error) {
    console.error('Template Download Failed:', error);
    alert('Template Error: Check public/template/report_template.xlsx');
  }
};