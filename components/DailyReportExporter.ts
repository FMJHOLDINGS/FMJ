import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- CONSTANTS & CONFIGURATIONS ---
export const EXCEL_CONFIG = {
  dateCell: 'B1',
  production: {
    bm: {
      day: { plan: 'B5', achv: 'D5', loss: 'F5', pct: 'H5' },
      night: { plan: 'B6', achv: 'D6', loss: 'F6', pct: 'H6' },
      total: { plan: 'B7', achv: 'D7', loss: 'F7', pct: 'H7' },
      mtd: { plan: 'B8', achv: 'D8', loss: 'F8', pct: 'H8' }
    },
    im: {
      day: { plan: 'B10', achv: 'D10', loss: 'F10', pct: 'H10' },
      night: { plan: 'B11', achv: 'D11', loss: 'F11', pct: 'H11' },
      total: { plan: 'B12', achv: 'D12', loss: 'F12', pct: 'H12' },
      mtd: { plan: 'B13', achv: 'D13', loss: 'F13', pct: 'H13' }
    },
    grandTotal: {
      total: { plan: 'B14', achv: 'D14', loss: 'F14', pct: 'H14' },
      mtd: { plan: 'B15', achv: 'D15', loss: 'F15', pct: 'H15' }
    }
  },
  shiftStatus: {
    shiftA: { nameCell: 'B19', plan: 'E19', achv: 'E20', mtd: 'I19' },
    shiftB: { nameCell: 'B21', plan: 'E21', achv: 'E22', mtd: 'I21' }
  },
  register: {
    day: { im_mc: 'E26', im_tot: 'J26', bm_mc: 'E27', bm_tot: 'J27' },
    night: { im_mc: 'E28', im_tot: 'J28', bm_mc: 'E29', bm_tot: 'J29' },
    today: { im_mc: 'E30', im_tot: 'J30', bm_mc: 'E31', bm_tot: 'J31' }
  },
  att1: { startRow: 5, colActual: 'O', colPresent: 'R', colAbsent: 'U' },
  att2: { startRow: 5, colActual: 'AB', colPresent: 'AE', colAbsent: 'AH' },
  stock: { startRow: 18, colMonthOpen: 'P', colRVD: 'S', colRVDTotal: 'V', colIssue: 'Y', colIssuedTotal: 'AB', colStock: 'AE' },
  delivery: {
    im: { actual: 'S26', mtd: 'Z26' },
    bm: { actual: 'S27', mtd: 'Z27' },
    total: { actual: 'S28', mtd: 'Z28' },
    todayNote: ''
  }
};

export const ATT_KEYS = ['general', 'cnNight', 'shiftA', 'shiftB', 'training', 'new', 'total', 'req', 'balance'];
export const STOCK_KEYS = ['pp', 'pet', 'ppcp', 'color'];

// Helper to format numbers
export const fmt = (n: number) => {
  if (!n && n !== 0) return 0;
  return Number.isInteger(n) ? n : Number(n.toFixed(1));
};

// --- MAIN EXPORT FUNCTION ---
export const downloadDailyReportExcel = async (
    selDate: string,
    data: any,
    att1: any,
    att2: any,
    stock: any,
    reg: any,
    del: any,
    regTotals: any
) => {
    try {
      // Correct Path for Template
      // ඔබේ Repo එකේ නම 'FMJ' නම්:
const response = await fetch('/FMJ/template/report_template.xlsx');
      
      if (!response.ok) throw new Error("Template Not Found!");
      const buffer = await response.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);npm
      const ws = wb.worksheets[0];

      ws.getCell(EXCEL_CONFIG.dateCell).value = selDate;

      const C_PROD = EXCEL_CONFIG.production;
      const fillProd = (map: any, d: any) => {
        if (map.plan) ws.getCell(map.plan).value = fmt(d.p);
        if (map.achv) ws.getCell(map.achv).value = fmt(d.a);
        if (map.loss) ws.getCell(map.loss).value = fmt(d.l);
        if (map.pct) ws.getCell(map.pct).value = d.pct / 100;
      };
      fillProd(C_PROD.bm.day, data.bm.d); fillProd(C_PROD.bm.night, data.bm.n); fillProd(C_PROD.bm.total, data.bm.t); fillProd(C_PROD.bm.mtd, data.bm.m);
      fillProd(C_PROD.im.day, data.im.d); fillProd(C_PROD.im.night, data.im.n); fillProd(C_PROD.im.total, data.im.t); fillProd(C_PROD.im.mtd, data.im.m);
      fillProd(C_PROD.grandTotal.total, data.grand.t); fillProd(C_PROD.grandTotal.mtd, data.grand.m);

      const C_SHIFT = EXCEL_CONFIG.shiftStatus;
      ws.getCell(C_SHIFT.shiftA.nameCell).value = `Shift A\n${data.shift.as}`;
      ws.getCell(C_SHIFT.shiftA.plan).value = fmt(data.shift.a.p);
      ws.getCell(C_SHIFT.shiftA.achv).value = fmt(data.shift.a.a);
      ws.getCell(C_SHIFT.shiftA.mtd).value = data.shift.a.pct / 100;

      ws.getCell(C_SHIFT.shiftB.nameCell).value = `Shift B\n${data.shift.bs}`;
      ws.getCell(C_SHIFT.shiftB.plan).value = fmt(data.shift.b.p);
      ws.getCell(C_SHIFT.shiftB.achv).value = fmt(data.shift.b.a);
      ws.getCell(C_SHIFT.shiftB.mtd).value = data.shift.b.pct / 100;

      const fillAtt = (conf: any, attData: any) => {
        ATT_KEYS.forEach((k, i) => {
          const r = conf.startRow + i;
          ws.getCell(`${conf.colActual}${r}`).value = attData[k].a;
          ws.getCell(`${conf.colPresent}${r}`).value = attData[k].p;
          ws.getCell(`${conf.colAbsent}${r}`).value = attData[k].ab;
        });
      };
      fillAtt(EXCEL_CONFIG.att1, att1);
      fillAtt(EXCEL_CONFIG.att2, att2);

      const C_STOCK = EXCEL_CONFIG.stock;
      STOCK_KEYS.forEach((k, i) => {
        const r = C_STOCK.startRow + i;
        const s = stock[k as keyof typeof stock];
        ws.getCell(`${C_STOCK.colMonthOpen}${r}`).value = s.o;
        ws.getCell(`${C_STOCK.colRVD}${r}`).value = s.r;
        ws.getCell(`${C_STOCK.colRVDTotal}${r}`).value = s.rt;
        ws.getCell(`${C_STOCK.colIssue}${r}`).value = s.i;
        ws.getCell(`${C_STOCK.colIssuedTotal}${r}`).value = s.it;
        ws.getCell(`${C_STOCK.colStock}${r}`).value = s.s;
      });

      const C_REG = EXCEL_CONFIG.register;
      // Using values from reg state, ensuring totals are passed correctly
      ws.getCell(C_REG.day.im_mc).value = reg.dIM_mc; ws.getCell(C_REG.day.im_tot).value = reg.dIM_t;
      ws.getCell(C_REG.day.bm_mc).value = reg.dBM_mc; ws.getCell(C_REG.day.bm_tot).value = reg.dBM_t;
      ws.getCell(C_REG.night.im_mc).value = reg.nIM_mc; ws.getCell(C_REG.night.im_tot).value = reg.nIM_t;
      ws.getCell(C_REG.night.bm_mc).value = reg.nBM_mc; ws.getCell(C_REG.night.bm_tot).value = reg.nBM_t;
      ws.getCell(C_REG.today.im_mc).value = reg.tIM_mc; ws.getCell(C_REG.today.im_tot).value = reg.tIM_t;
      ws.getCell(C_REG.today.bm_mc).value = reg.tBM_mc; ws.getCell(C_REG.today.bm_tot).value = reg.tBM_t;

      const C_DEL = EXCEL_CONFIG.delivery;
      ws.getCell(C_DEL.im.actual).value = del.imA; ws.getCell(C_DEL.im.mtd).value = del.imM;
      ws.getCell(C_DEL.bm.actual).value = del.bmA; ws.getCell(C_DEL.bm.mtd).value = del.bmM;
      ws.getCell(C_DEL.total.actual).value = del.totA; ws.getCell(C_DEL.total.mtd).value = del.totM;

      const out = await wb.xlsx.writeBuffer();
      saveAs(new Blob([out]), `Daily_Report_${selDate}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Template Error: Check public/template/report_template.xlsx");
    }
};