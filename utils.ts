import { ProductionRow, DayData } from './types';

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
  const ratePerMin = (qtyPerHour * cavities) / 60;

  // Calculate Breakdown Loss specifically
  row.breakdowns.forEach(bd => {
    const min = calculateTimeDiff(bd.startTime, bd.endTime);
    bdMins += min;
    // Specific BD loss calculation
    const thisBdLoss = Math.floor(ratePerMin * min);
    bdLostQty += thisBdLoss;
  });

  const achievedQty = row.achievedQty || 0;
  const planQty = Math.floor(qtyPerHour * cavities * timeHr);
  const planKg = Number(((planQty * unitWeight) / 1000).toFixed(2));
  const achievedKg = Number(((achievedQty * unitWeight) / 1000).toFixed(2));
  
  const lostQty = Math.max(0, planQty - achievedQty);
  const lostKg = Number(((lostQty * unitWeight) / 1000).toFixed(2));

  // BD Lost Kg
  const bdLostKg = Number(((bdLostQty * unitWeight) / 1000).toFixed(2));

  // Efficiency Loss is the remaining loss after accounting for breakdowns
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

// --- NEW HELPERS FOR DATE RANGE ---

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

export const exportToCSV = (dayData: DayData) => {
  // Existing export logic (keep as is or update if needed)
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