import { exportToExcel } from '../utils';

export const handleDatabaseExport = async (
  startDate: string,
  endDate: string,
  machineType: 'IM' | 'BM',
  allData: Record<string, any>,
  machineFilter: string[],
  productFilter: string[]
) => {
  // Generate date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  while (start <= end) {
    dates.push(start.toISOString().split('T')[0]);
    start.setDate(start.getDate() + 1);
  }

  const rows: any[] = [];
  dates.forEach(d => {
    const dd = allData[`${d}_${machineType}`];
    if (dd?.rows) {
      dd.rows.forEach((r: any) => {
        if (
          (!machineFilter.length || machineFilter.includes(r.machine)) &&
          (!productFilter.length || productFilter.includes(r.product))
        ) {
          rows.push({ ...r, date: d });
        }
      });
    }
  });

  if (!rows.length) {
    alert('No data to export');
    return;
  }

  await exportToExcel(rows, {
    machine: machineFilter,
    product: productFilter,
    startDate,
    endDate,
    type: machineType
  });
};