import React, { useState, useMemo, KeyboardEvent, useEffect, useCallback } from 'react';
import { calculateMetrics, getDatesInRange } from '../utils';
import { FileDown, Calendar, CheckSquare } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import MonthlyProduction from './MonthlyProduction';
import BreakdownSummary from './BreakdownSummary';

interface Props {
  allData: Record<string, any>;
  date: string;
  breakdownCategories?: string[];
  onUpdate?: (key: string, data: any) => void;
}

// =========================================================================================
// ⚙️ EXCEL CONFIG (SAME)
// =========================================================================================
const EXCEL_CONFIG = {
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

const INITIAL_ATT = { general: { a: '', p: '', ab: '' }, cnNight: { a: '', p: '', ab: '' }, shiftA: { a: '', p: '', ab: '' }, shiftB: { a: '', p: '', ab: '' }, training: { a: '', p: '', ab: '' }, new: { a: '', p: '', ab: '' }, total: { a: '', p: '', ab: '' }, req: { a: '', p: '', ab: '' }, balance: { a: '', p: '', ab: '' } };
const INITIAL_STOCK = { pp: { o: '', r: '', rt: '', i: '', it: '', s: '' }, pet: { o: '', r: '', rt: '', i: '', it: '', s: '' }, ppcp: { o: '', r: '', rt: '', i: '', it: '', s: '' }, color: { o: '', r: '', rt: '', i: '', it: '', s: '' } };
const INITIAL_REG = { dIM_mc: '', dIM_t: '', dBM_mc: '', dBM_t: '', d_GT: '', nIM_mc: '', nIM_t: '', nBM_mc: '', nBM_t: '', n_GT: '', tIM_mc: '', tIM_t: '', tBM_mc: '', tBM_t: '', t_GT: '' };
const INITIAL_DEL = { imA: '', imM: '', bmA: '', bmM: '', totA: '', totM: '' };

const ATT_KEYS = ['general', 'cnNight', 'shiftA', 'shiftB', 'training', 'new', 'total', 'req', 'balance'];
const STOCK_KEYS = ['pp', 'pet', 'ppcp', 'color'];

// --- HELPERS ---
const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
  const [section, rowStr, colStr] = id.split('-');
  const row = parseInt(rowStr);
  const col = parseInt(colStr);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
    let nextId = '';
    if (e.key === 'ArrowUp') nextId = `${section}-${row - 1}-${col}`;
    if (e.key === 'ArrowDown' || e.key === 'Enter') nextId = `${section}-${row + 1}-${col}`;
    if (e.key === 'ArrowLeft') nextId = `${section}-${row}-${col - 1}`;
    if (e.key === 'ArrowRight') nextId = `${section}-${row}-${col + 1}`;
    const nextEl = document.getElementById(nextId);
    if (nextEl) {
      e.preventDefault();
      nextEl.focus();
    }
  }
};

const fmt = (n: number) => {
  if (!n && n !== 0) return 0;
  return Number.isInteger(n) ? n : Number(n.toFixed(1));
};

const ReadOnlyCell = ({ val, suffix = '', color = '', bg = '' }: { val: string | number; suffix?: string; color?: string; bg?: string }) => (
  <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${color} ${bg}`}>
    {typeof val === 'number' ? fmt(val) : val}
    {suffix}
  </div>
);

const InputCell = React.memo(({ id, val, onChange, onBlur, className = '', disabled = false }: any) => (
  <input
    id={id}
    type="text"
    autoComplete="off"
    value={val ?? ''}
    onChange={e => onChange(e.target.value)}
    onBlur={onBlur}
    onKeyDown={(e) => handleKeyDown(e, id)}
    disabled={disabled}
    className={`w-full h-full text-center text-xs font-bold outline-none transition-all placeholder:text-slate-400 
            ${disabled
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
        : 'bg-yellow-50/80 dark:bg-yellow-900/10 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500'
      } ${className}`}
  />
));

const TH = ({ children, className = '', colSpan = 1, rowSpan = 1 }: any) => (
  <th
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={`border border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] p-2 text-center ${className}`}
  >
    {children}
  </th>
);
const TD = ({ children, className = '', colSpan = 1, rowSpan = 1 }: any) => (
  <td colSpan={colSpan} rowSpan={rowSpan} className={`border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs p-0 ${className}`}>
    {children}
  </td>
);

const DailySummary: React.FC<Props> = ({ allData, date, breakdownCategories = [], onUpdate }) => {
  const [subTab, setSubTab] = useState<'DAILY' | 'BREAKDOWNS' | 'MONTHLY'>('DAILY');
  const [selDate, setSelDate] = useState(date);
  const [includePreform, setIncludePreform] = useState(false);

  const [att1, setAtt1] = useState(INITIAL_ATT);
  const [att2, setAtt2] = useState(INITIAL_ATT);
  const [stock, setStock] = useState(INITIAL_STOCK);
  const [reg, setReg] = useState(INITIAL_REG);
  const [del, setDel] = useState(INITIAL_DEL);

  const reportKey = `${selDate}_REPORT`;

  useEffect(() => {
    const savedData = allData[reportKey];
    if (savedData) {
      setAtt1(savedData.att1 || INITIAL_ATT);
      setAtt2(savedData.att2 || INITIAL_ATT);
      setStock(savedData.stock || INITIAL_STOCK);
      setReg(savedData.reg || INITIAL_REG);
      setDel(savedData.del || INITIAL_DEL);
    } else {
      setAtt1(INITIAL_ATT);
      setAtt2(INITIAL_ATT);
      setStock(INITIAL_STOCK);
      setReg(INITIAL_REG);
      setDel(INITIAL_DEL);
    }
  }, [selDate, allData, reportKey]);

  // Stock Calculations (Same as before)
  const calculatedStock = useMemo(() => {
    const [y, m] = selDate.split('-');
    const day1 = `${y}-${m}-01`;
    const isDay1 = selDate === day1;
    const reportKeyDay1 = `${day1}_REPORT`;

    const calcs: any = {};
    STOCK_KEYS.forEach(k => {
      let open = 0;
      if (isDay1) {
        open = Number(stock[k as keyof typeof stock]?.o) || 0;
      } else {
        open = Number(allData[reportKeyDay1]?.stock?.[k]?.o) || 0;
      }

      const dates = getDatesInRange(day1, selDate);
      let mtdR = 0;
      let mtdI = 0;

      dates.forEach(d => {
        const sData = (d === selDate) ? stock : allData[`${d}_REPORT`]?.stock;
        if (sData && sData[k]) {
          mtdR += Number(sData[k].r || 0);
          mtdI += Number(sData[k].i || 0);
        }
      });

      const closing = (open + mtdR) - mtdI;
      calcs[k] = { o: open, rt: mtdR, it: mtdI, s: closing };
    });
    return { isDay1, calcs };
  }, [allData, stock, selDate]);

  useEffect(() => {
    let hasChanges = false;
    const newStock = JSON.parse(JSON.stringify(stock));
    STOCK_KEYS.forEach(k => {
      const c = calculatedStock.calcs[k];
      if (newStock[k].rt != c.rt) { newStock[k].rt = c.rt; hasChanges = true; }
      if (newStock[k].it != c.it) { newStock[k].it = c.it; hasChanges = true; }
      if (newStock[k].s != c.s) { newStock[k].s = c.s; hasChanges = true; }
      if (!calculatedStock.isDay1 && newStock[k].o != c.o) { newStock[k].o = c.o; hasChanges = true; }
    });
    if (hasChanges) setStock(newStock);
  }, [calculatedStock]);

  const persistData = useCallback(() => {
    if (onUpdate) {
      onUpdate(reportKey, { id: reportKey, date: selDate, att1, att2, stock, reg, del });
    }
  }, [att1, att2, stock, reg, del, onUpdate, reportKey, selDate]);

  // --- CORE DATA LOGIC ---
  const data = useMemo(() => {
    const getProductType = (row: any) => {
      if (row.productType) return row.productType;
      const adminItems = allData.adminConfig?.productionItems || [];
      const found = adminItems.find((i: any) => i.itemName === row.product && i.type === 'IM');
      return found ? found.productType : 'Preform';
    };

    // (same as before)
    const getData = (type: 'IM' | 'BM') => {
      let rows = allData[`${selDate}_${type}`]?.rows || [];
      if (type === 'IM' && !includePreform) {
        rows = rows.filter((r: any) => getProductType(r) === 'Cap');
      }
      return rows;
    };

    // ✅ NEW helper for team stats (uses same filter rule)
    const filterRows = (rows: any[], type: 'IM' | 'BM') => {
      let out = rows || [];
      if (type === 'IM' && !includePreform) {
        out = out.filter((r: any) => getProductType(r) === 'Cap');
      }
      return out;
    };

    const imRows = getData('IM');
    const bmRows = getData('BM');

    const bmD = allData[`${selDate}_BM`];
    const imD = allData[`${selDate}_IM`];

    const calc = (rows: any[], shift?: string) => {
      const f = shift ? rows.filter((r: any) => r.shift === shift) : rows;
      const res = f.reduce((acc, row) => {
        const m = calculateMetrics(row);
        return { p: acc.p + m.planKg, a: acc.a + m.achievedKg, l: acc.l + m.lostKg };
      }, { p: 0, a: 0, l: 0 });
      return { ...res, pct: res.p > 0 ? (res.a / res.p) * 100 : 0 };
    };

    const bD = calc(bmRows, 'day'); const bN = calc(bmRows, 'night'); const bT = calc(bmRows);
    const iD = calc(imRows, 'day'); const iN = calc(imRows, 'night'); const iT = calc(imRows);

    const getMTD = (type: string) => {
      const monthPrefix = selDate.substring(0, 7);
      let p = 0, a = 0, l = 0;
      Object.values(allData).forEach((d: any) => {
        if (d?.date?.startsWith(monthPrefix) && d.date <= selDate && d.machineType === type) {
          let rows = d.rows || [];
          if (type === 'IM' && !includePreform) {
            rows = rows.filter((r: any) => getProductType(r) === 'Cap');
          }
          rows.forEach((r: any) => { const m = calculateMetrics(r); p += m.planKg; a += m.achievedKg; l += m.lostKg; });
        }
      });
      return { p, a, l, pct: p > 0 ? (a / p) * 100 : 0 };
    };

    const bM = getMTD('BM'); const iM = getMTD('IM');

    const gT = { p: bT.p + iT.p, a: bT.a + iT.a, l: bT.l + iT.l, pct: (bT.p + iT.p) > 0 ? ((bT.a + iT.a) / (bT.p + iT.p)) * 100 : 0 };
    const gM = { p: bM.p + iM.p, a: bM.a + iM.a, l: bM.l + iM.l, pct: (bM.p + iM.p) > 0 ? ((bM.a + iM.a) / (bM.p + iM.p)) * 100 : 0 };

    // =====================================================================================
    // ✅ CHANGED PART: Team MTD (Roster/Supervisor mapping)
    // =====================================================================================
    const calculateTeamStats = (teamName: string) => {
      const monthPrefix = selDate.substring(0, 7);
      let plan = 0, achv = 0;

      getDatesInRange(`${monthPrefix}-01`, selDate).forEach(d => {
        const supKey = `${d}_SUPERVISORS`;
        const supData = allData[supKey] || { day: 'Shift-A', night: 'Shift-B' }; // Default

        (['IM', 'BM'] as const).forEach(type => {
          const rows = filterRows(allData[`${d}_${type}`]?.rows || [], type);

          rows.forEach((r: any) => {
            const m = calculateMetrics(r);
            const rowSup = r.shift === 'day' ? supData.day : supData.night;

            if (rowSup === teamName) {
              plan += m.planKg;
              achv += m.achievedKg;
            }
          });
        });
      });

      return { p: plan, a: achv, pct: plan > 0 ? (achv / plan) * 100 : 0 };
    };

    // ✅ Replace old getShiftMTD(day/night) with team-based MTD
    const shiftA_MTD = calculateTeamStats('Shift-A');
    const shiftB_MTD = calculateTeamStats('Shift-B');

    return {
      bm: { d: bD, n: bN, t: bT, m: bM },
      im: { d: iD, n: iN, t: iT, m: iM },
      grand: { t: gT, m: gM },
      shift: {
        a: { p: shiftA_MTD.p, a: shiftA_MTD.a, pct: shiftA_MTD.pct },
        b: { p: shiftB_MTD.p, a: shiftB_MTD.a, pct: shiftB_MTD.pct },
        as: bmD?.daySupervisor || imD?.daySupervisor || '-',
        bs: bmD?.nightSupervisor || imD?.nightSupervisor || '-'
      }
    };
  }, [allData, selDate, includePreform]);

  // --- REGISTER GRAND TOTAL AUTO CALC ---
  const regTotals = useMemo(() => {
    const sum = (v1: string, v2: string) => (parseFloat(v1 || '0') + parseFloat(v2 || '0')).toString();
    return {
      d_GT: sum(reg.dIM_t, reg.dBM_t),
      n_GT: sum(reg.nIM_t, reg.nBM_t),
      t_GT: sum(reg.tIM_t, reg.tBM_t)
    };
  }, [reg]);

  useEffect(() => {
    if (reg.d_GT !== regTotals.d_GT || reg.n_GT !== regTotals.n_GT || reg.t_GT !== regTotals.t_GT) {
      setReg(prev => ({ ...prev, d_GT: regTotals.d_GT, n_GT: regTotals.n_GT, t_GT: regTotals.t_GT }));
    }
  }, [regTotals]);

  const downloadExcel = async () => {
    try {
      const response = await fetch('/template/report_template.xlsx');
      if (!response.ok) throw new Error("Template Not Found!");
      const buffer = await response.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
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

  return (
    <div className="space-y-8 pb-20 animate-fade-in relative w-full">
      <div className="flex justify-center mb-4">
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {['DAILY', 'BREAKDOWNS', 'MONTHLY'].map(t => (
            <button
              key={t}
              onClick={() => setSubTab(t as any)}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${subTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'DAILY' && (
        <div className="max-w-7xl mx-auto px-4">
          <form className="space-y-8" onSubmit={e => e.preventDefault()}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-md border border-slate-400 dark:border-slate-700">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-400 dark:border-slate-700">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <input
                    type="date"
                    value={selDate}
                    onChange={e => setSelDate(e.target.value)}
                    className="bg-transparent font-black text-slate-700 dark:text-white outline-none uppercase text-sm dark:[color-scheme:dark]"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${includePreform ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 dark:border-slate-500 group-hover:border-indigo-400'}`}>
                    {includePreform && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input type="checkbox" checked={includePreform} onChange={e => setIncludePreform(e.target.checked)} className="hidden" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">With Preform</span>
                </label>
              </div>

              <button
                type="button"
                onClick={downloadExcel}
                className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1"
              >
                <FileDown className="w-4 h-4" /> Export Report
              </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-5 space-y-6">
                {/* PRODUCTION */}
                <div className="rounded-lg shadow-sm overflow-hidden border border-slate-400 dark:border-slate-600">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 text-center font-black text-slate-700 dark:text-slate-200 uppercase text-xs border-b border-slate-400 dark:border-slate-600">Daily Production Summary</div>
                  <table className="w-full border-collapse">
                    <thead><tr><TH>Type</TH><TH>Planned</TH><TH>Achieve</TH><TH>Loss</TH><TH>%</TH></tr></thead>
                    <tbody>
                      {[
                        { l: 'BM Line', h: true },
                        { l: 'Day', d: data.bm.d },
                        { l: 'Night', d: data.bm.n },
                        { l: 'Total', d: data.bm.t },
                        { l: 'MTD', d: data.bm.m },
                        { l: 'IM Line', h: true },
                        { l: 'Day', d: data.im.d },
                        { l: 'Night', d: data.im.n },
                        { l: 'Total', d: data.im.t },
                        { l: 'MTD', d: data.im.m },
                        { l: 'IM+BM\nTotal', d: data.grand.t, b: true },
                        { l: 'IM+BM\nMTD', d: data.grand.m, b: true }
                      ].map((r: any, i) => (
                        <tr key={i}>
                          {r.h ? <TD colSpan={5} className="font-bold text-center bg-slate-50 dark:bg-slate-800/50 p-1 text-indigo-600 dark:text-indigo-400">{r.l}</TD> : (
                            <>
                              <TD className={`text-center font-bold p-1.5 ${r.b ? 'whitespace-pre-line text-emerald-600 dark:text-emerald-400' : ''}`}>{r.l}</TD>
                              <TD className="text-center"><ReadOnlyCell val={r.d.p.toFixed(1)} /></TD>
                              <TD className="text-center"><ReadOnlyCell val={r.d.a.toFixed(1)} /></TD>
                              <TD className="text-center"><ReadOnlyCell val={r.d.l.toFixed(1)} color="text-rose-500" /></TD>
                              <TD className="text-center"><ReadOnlyCell val={r.d.pct.toFixed(0)} suffix="%" /></TD>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SHIFT STATUS */}
                <div className="rounded-lg shadow-sm overflow-hidden border border-slate-400 dark:border-slate-600">
                  <table className="w-full border-collapse">
                    <thead><tr><TH className="w-32">Shift</TH><TH colSpan={2}>Plan Vs Achievement</TH><TH className="w-20">MTD %</TH></tr></thead>
                    <tbody>
                      {[{ n: 'Shift A', s: data.shift.as, d: data.shift.a }, { n: 'Shift B', s: data.shift.bs, d: data.shift.b }].map((r, i) => (
                        <React.Fragment key={i}>
                          <tr>
                            <TD rowSpan={2} className="text-center font-bold p-2 bg-slate-50 dark:bg-slate-800">
                              {r.n}<br /><span className="font-normal text-[9px] text-slate-500">{r.s}</span>
                            </TD>
                            <TD className="text-center font-bold w-24 p-1 text-slate-500">Plan</TD>
                            <TD className="text-center"><ReadOnlyCell val={r.d.p.toFixed(1)} /></TD>
                            <TD rowSpan={2} className="text-center font-black text-indigo-600 dark:text-indigo-400">
                              <ReadOnlyCell val={r.d.pct.toFixed(0)} suffix="%" />
                            </TD>
                          </tr>
                          <tr>
                            <TD className="text-center font-bold p-1 text-slate-500 border-t border-slate-400 dark:border-slate-600">Achievement</TD>
                            <TD className="text-center border-t border-slate-400 dark:border-slate-600"><ReadOnlyCell val={r.d.a.toFixed(1)} /></TD>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* REGISTER */}
                <div className="rounded-lg shadow-sm overflow-hidden border border-slate-400 dark:border-slate-600">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 text-center font-black text-slate-700 dark:text-slate-200 uppercase text-xs border-b border-slate-400 dark:border-slate-600">Register</div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr><TH rowSpan={2} className="w-20">Shift</TH><TH rowSpan={2} className="w-16"></TH><TH rowSpan={2}>Related M/C</TH><TH colSpan={2}>Total M/C</TH></tr>
                      <tr><TH className="w-12 text-[8px]">Each</TH><TH className="w-12 text-[8px]">Grand</TH></tr>
                    </thead>
                    <tbody>
                      {['Day', 'Night', 'Today'].map((s, idx) => {
                        const p = s === 'Day' ? 'd' : s === 'Night' ? 'n' : 't';
                        const baseRow = idx * 2;
                        const gtVal = idx === 0 ? regTotals.d_GT : idx === 1 ? regTotals.n_GT : regTotals.t_GT;
                        return (
                          <React.Fragment key={s}>
                            <tr>
                              <TD rowSpan={2} className="text-center font-bold p-2 text-sm bg-slate-50 dark:bg-slate-800">{s}</TD>
                              <TD className="text-center font-bold p-1 text-[10px]">IM</TD>
                              <TD className="p-0"><InputCell id={`reg-${baseRow}-0`} val={reg[`${p}IM_mc` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}IM_mc`]: v })} onBlur={persistData} /></TD>
                              <TD className="p-0"><InputCell id={`reg-${baseRow}-1`} val={reg[`${p}IM_t` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}IM_t`]: v })} onBlur={persistData} /></TD>
                              <TD rowSpan={2} className="p-0 border-l border-slate-400 dark:border-slate-600 bg-indigo-50/50 dark:bg-indigo-900/20">
                                <ReadOnlyCell val={gtVal} color="text-indigo-700 dark:text-indigo-400 font-black" />
                              </TD>
                            </tr>
                            <tr className="border-t border-black">
                              <TD className="text-center font-bold p-1 text-[10px] border-t border-slate-400 dark:border-slate-600">BM</TD>
                              <TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id={`reg-${baseRow + 1}-0`} val={reg[`${p}BM_mc` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}BM_mc`]: v })} onBlur={persistData} /></TD>
                              <TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id={`reg-${baseRow + 1}-1`} val={reg[`${p}BM_t` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}BM_t`]: v })} onBlur={persistData} /></TD>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="col-span-12 xl:col-span-7 space-y-6">
                {/* ATTENDANCE */}
                <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-2 border border-slate-400 dark:border-slate-600 rounded-lg shadow-sm">
                  <div className="col-span-2 text-center font-bold text-slate-700 dark:text-slate-200 uppercase text-lg border-b border-slate-400 dark:border-slate-600 mb-2 pb-1">Attendance</div>
                  {[att1, att2].map((att, idx) => (
                    <table key={idx} className="w-full border-collapse border border-slate-400 dark:border-slate-600">
                      <thead><tr><TH className="text-left pl-2 bg-slate-50 dark:bg-slate-900 w-24"> </TH><TH>Act</TH><TH>Pre</TH><TH>Abs</TH></tr></thead>
                      <tbody>
                        {ATT_KEYS.map((k, rIdx) => (
                          <tr key={k}>
                            <TD className="font-bold pl-2 p-1 capitalize text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">{k.replace(/([A-Z])/g, ' $1').trim()}</TD>
                            <TD className="p-0 w-12"><InputCell id={`att${idx}-${rIdx}-0`} val={att[k].a} onChange={v => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], a: v } })} onBlur={persistData} /></TD>
                            <TD className="p-0 w-12"><InputCell id={`att${idx}-${rIdx}-1`} val={att[k].p} onChange={v => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], p: v } })} onBlur={persistData} /></TD>
                            <TD className="p-0 w-12"><InputCell id={`att${idx}-${rIdx}-2`} val={att[k].ab} onChange={v => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], ab: v } })} onBlur={persistData} className="text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10" /></TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>

                {/* STOCK */}
                <div className="rounded-lg shadow-sm overflow-hidden border border-slate-400 dark:border-slate-600">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 text-center font-black text-slate-700 dark:text-slate-200 uppercase text-xs border-b border-slate-400 dark:border-slate-600">Preform Issues & Stock Details</div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <TH className="w-20">Item</TH>
                          <TH className="w-24">Opn</TH>
                          <TH className="w-24">Rvd</TH>
                          <TH className="w-24">Tot (MTD)</TH>
                          <TH className="w-24">Iss</TH>
                          <TH className="w-24">IsT (MTD)</TH>
                          <TH className="w-24">Stk</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {STOCK_KEYS.map((k, rIdx) => {
                          const c = calculatedStock.calcs[k];
                          return (
                            <tr key={k}>
                              <TD className="font-bold text-center uppercase p-1 bg-slate-50 dark:bg-slate-900">{k}</TD>
                              <TD className="p-0 h-8"><InputCell id={`stk-${rIdx}-0`} val={c.o} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], o: v } })} onBlur={persistData} disabled={!calculatedStock.isDay1} className={!calculatedStock.isDay1 ? 'text-slate-500 bg-slate-100 dark:bg-slate-800' : ''} /></TD>
                              <TD className="p-0 h-8"><InputCell id={`stk-${rIdx}-1`} val={stock[k as keyof typeof stock].r} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], r: v } })} onBlur={persistData} /></TD>
                              <TD className="p-0 h-8 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"><ReadOnlyCell val={c.rt} color="text-indigo-700 dark:text-indigo-300" /></TD>
                              <TD className="p-0 h-8"><InputCell id={`stk-${rIdx}-3`} val={stock[k as keyof typeof stock].i} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], i: v } })} onBlur={persistData} /></TD>
                              <TD className="p-0 h-8 bg-rose-50/50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"><ReadOnlyCell val={c.it} color="text-rose-700 dark:text-rose-300" /></TD>
                              <TD className="p-0 h-8 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black border-l border-slate-400 dark:border-slate-600"><ReadOnlyCell val={c.s} color="text-emerald-700 dark:text-emerald-300" /></TD>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DELIVERY */}
                <div className="rounded-lg shadow-sm border border-slate-400 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 text-center font-black text-slate-700 dark:text-slate-200 uppercase text-xs border-b border-slate-400 dark:border-slate-600">Delivery Details</div>
                  <div className="p-2">
                    <table className="w-full border-collapse">
                      <thead><tr><TH></TH><TH>Actual</TH><TH>MTD</TH></tr></thead>
                      <tbody>
                        <tr><TD className="font-bold text-center p-1 bg-slate-50 dark:bg-slate-900">IM</TD><TD className="p-0"><InputCell id="del-0-0" val={del.imA} onChange={v => setDel({ ...del, imA: v })} onBlur={persistData} /></TD><TD className="p-0"><InputCell id="del-0-1" val={del.imM} onChange={v => setDel({ ...del, imM: v })} onBlur={persistData} /></TD></tr>
                        <tr><TD className="font-bold text-center p-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-400 dark:border-slate-600">BM</TD><TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id="del-1-0" val={del.bmA} onChange={v => setDel({ ...del, bmA: v })} onBlur={persistData} /></TD><TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id="del-1-1" val={del.bmM} onChange={v => setDel({ ...del, bmM: v })} onBlur={persistData} /></TD></tr>
                        <tr><TD className="font-bold text-center p-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-400 dark:border-slate-600">Total</TD><TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id="del-2-0" val={del.totA} onChange={v => setDel({ ...del, totA: v })} onBlur={persistData} /></TD><TD className="p-0 border-t border-slate-400 dark:border-slate-600"><InputCell id="del-2-1" val={del.totM} onChange={v => setDel({ ...del, totM: v })} onBlur={persistData} /></TD></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {subTab === 'BREAKDOWNS' && (
        <div className="max-w-7xl mx-auto px-4">
          <BreakdownSummary allData={allData} initialDate={selDate} />
        </div>
      )}

      {subTab === 'MONTHLY' && (
        <div className="w-full px-2">
          <MonthlyProduction allData={allData} currentDate={selDate} breakdownCategories={breakdownCategories} />
        </div>
      )}
    </div>
  );
};

export default DailySummary;
