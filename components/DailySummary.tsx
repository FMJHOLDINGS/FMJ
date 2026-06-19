import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { calculateMetrics, getDatesInRange } from '../utils';
import { downloadDailyReportExcel, STOCK_KEYS } from './DailyReportExporter';
import DailySummaryView from './DailySummaryView';

interface Props {
  allData: Record<string, any>;
  date: string;
  breakdownCategories?: string[];
  onUpdate?: (key: string, data: any) => void;
  loadDataForRange?: (start: string, end: string) => void;
  readOnly?: boolean;
}

const INITIAL_ATT = { date: '', general: { a: '', p: '', ab: '' }, cnNight: { a: '', p: '', ab: '' }, shiftA: { a: '', p: '', ab: '' }, shiftB: { a: '', p: '', ab: '' }, training: { a: '', p: '', ab: '' }, new: { a: '', p: '', ab: '' }, total: { a: '', p: '', ab: '' }, req: { a: '', p: '', ab: '' }, balance: { a: '', p: '', ab: '' } };
const INITIAL_STOCK = { pp: { o: '', r: '', rt: '', i: '', it: '', s: '' }, pet: { o: '', r: '', rt: '', i: '', it: '', s: '' }, ppcp: { o: '', r: '', rt: '', i: '', it: '', s: '' }, color: { o: '', r: '', rt: '', i: '', it: '', s: '' } };
const INITIAL_REG = { dIM_mc: '', dIM_t: '', dBM_mc: '', dBM_t: '', d_GT: '', nIM_mc: '', nIM_t: '', nBM_mc: '', nBM_t: '', n_GT: '', tIM_mc: '', tIM_t: '', tBM_mc: '', tBM_t: '', t_GT: '' };
const INITIAL_DEL = { imA: '', imM: '', bmA: '', bmM: '', totA: '', totM: '' };

const getInitAtt = () => JSON.parse(JSON.stringify(INITIAL_ATT));
const getInitStock = () => JSON.parse(JSON.stringify(INITIAL_STOCK));
const getInitReg = () => JSON.parse(JSON.stringify(INITIAL_REG));
const getInitDel = () => JSON.parse(JSON.stringify(INITIAL_DEL));

// ============================================================================
// 1. 🧠 DATA & STATE MANAGEMENT 
// ============================================================================
const DailySummary: React.FC<Props> = ({ allData, date, breakdownCategories = [], onUpdate, loadDataForRange, readOnly }) => {
  const [subTab, setSubTab] = useState<'DAILY' | 'BREAKDOWNS' | 'MONTHLY'>('DAILY');
  const [selDate, setSelDate] = useState(date);
  const [includePreform, setIncludePreform] = useState(false);

  const [att1, setAtt1] = useState(getInitAtt());
  const [att2, setAtt2] = useState(getInitAtt());
  const [stock, setStock] = useState(getInitStock());
  const [reg, setReg] = useState(getInitReg());
  const [del, setDel] = useState(getInitDel());

  const reportKey = `${selDate}_REPORT`;

  // 🟢 1. RANGE DATA LOAD
  useEffect(() => {
      if (loadDataForRange) {
          const [y, m] = selDate.split('-');
          const start = `${y}-${m}-01`;
          const endDay = new Date(parseInt(y), parseInt(m), 0).getDate();
          const end = `${y}-${m}-${String(endDay).padStart(2, '0')}`;
          loadDataForRange(start, end);
      }
  }, [selDate, loadDataForRange]);

  // 🟢 2. SMART AUTO-SAVE (Distributed Overwrite-Proof System)
  const lastSavedString = useRef<string>('');
  const prevLocalData = useRef<any>({}); 
  const latestAllDataRef = useRef(allData);

  // හැමවිටම අලුත්ම (Freshest) Database දත්ත Ref එකක තබා ගැනීම
  useEffect(() => {
      latestAllDataRef.current = allData;
  }, [allData]);

  useEffect(() => {
      const monthPrefix = selDate.substring(0, 7);
      const isDataLoaded = Object.keys(allData).some(k => k.startsWith(monthPrefix));
      
      if (!isDataLoaded) return; 

      const currentData = { att1, att2, stock, reg, del };
      const currentStr = JSON.stringify({ id: reportKey, date: selDate, ...currentData });

      if (currentStr === lastSavedString.current) {
          prevLocalData.current = currentData;
          return;
      }

      const savedData = allData[reportKey];
      if (savedData) {
          const fbStr = JSON.stringify({ id: reportKey, date: selDate, att1: savedData.att1 || getInitAtt(), att2: savedData.att2 || getInitAtt(), stock: savedData.stock || getInitStock(), reg: savedData.reg || getInitReg(), del: savedData.del || getInitDel() });
          if (currentStr === fbStr) {
              prevLocalData.current = currentData;
              return; 
          }
      }

      // 🟢 මේ User වෙනස් කළේ මොන කොටසදැයි (Section) හරියටම සොයාගැනීම
      const changedKeys: string[] = [];
      ['att1', 'att2', 'stock', 'reg', 'del'].forEach(k => {
          if (JSON.stringify(prevLocalData.current[k]) !== JSON.stringify(currentData[k as keyof typeof currentData])) {
              changedKeys.push(k);
          }
      });

      const saveTimer = setTimeout(() => {
          // 🟢 Database එකේ තියෙන අලුත්ම දත්ත (Latest Data) අරගෙන, ඒකට මේ User වෙනස් කළ කොටස පමණක් එකතු කිරීම
          const latestDbData = latestAllDataRef.current[reportKey] || {};
          const payloadToSave: any = { 
              att1: getInitAtt(), att2: getInitAtt(), stock: getInitStock(), reg: getInitReg(), del: getInitDel(),
              ...latestDbData, 
              id: reportKey, date: selDate 
          };

          changedKeys.forEach(k => {
              payloadToSave[k] = currentData[k as keyof typeof currentData];
          });

          lastSavedString.current = JSON.stringify(payloadToSave);
          prevLocalData.current = currentData;

          if (onUpdate && changedKeys.length > 0) {
              onUpdate(reportKey, payloadToSave);
          }
      }, 800);

      return () => clearTimeout(saveTimer);
  }, [att1, att2, stock, reg, del, reportKey, selDate, allData, onUpdate]);


  

  const persistData = useCallback(() => {}, []);

  // 🟢 3. දින මාරු කිරීමේදී දත්ත ආරක්ෂා කිරීම
  const handleDateChange = useCallback((newDate: string) => {
      if (onUpdate) onUpdate(reportKey, { id: reportKey, date: selDate, att1, att2, stock, reg, del });
      setSelDate(newDate);
  }, [reportKey, selDate, att1, att2, stock, reg, del, onUpdate]);

  // 🟢 4. Firebase දත්ත පැමිණි විට පෝරමය යාවත්කාලීන කිරීම (Production දත්ත මඟින් මැකී යාම වැළැක්වීම)
  const lastDbSyncData = useRef<string | null>(null);

  useEffect(() => {
    const savedData = allData[reportKey];
    
    if (savedData) {
        const currentDbString = JSON.stringify(savedData);
        
        // 🟢 වෙනත් කෙනෙක් Production දත්ත දැමූ විට මේ පෝරමය Reset වීම වැළැක්වීමට,
        // Daily Report එකේ දත්ත ඇත්තටම වෙනස් වී ඇත්නම් පමණක් Local State එක Update කරන්න.
        if (currentDbString !== lastDbSyncData.current) {
            setAtt1(prev => JSON.stringify(prev) !== JSON.stringify(savedData.att1) ? savedData.att1 : prev);
            setAtt2(prev => JSON.stringify(prev) !== JSON.stringify(savedData.att2) ? savedData.att2 : prev);
            setStock(prev => JSON.stringify(prev) !== JSON.stringify(savedData.stock) ? savedData.stock : prev);
            setReg(prev => JSON.stringify(prev) !== JSON.stringify(savedData.reg) ? savedData.reg : prev);
            setDel(prev => JSON.stringify(prev) !== JSON.stringify(savedData.del) ? savedData.del : prev);
            
            lastDbSyncData.current = currentDbString;
        }
    } else {
        if (lastDbSyncData.current !== 'EMPTY') {
            setAtt1(getInitAtt()); 
            setAtt2(getInitAtt()); 
            setStock(getInitStock()); 
            setReg(getInitReg()); 
            setDel(getInitDel());
            lastDbSyncData.current = 'EMPTY';
        }
    }
  }, [allData, reportKey]);
  

  // ============================================================================
  // 5. 🟢 PLANNING DOWNTIME & METRICS CALCULATION 
  // ============================================================================
  const getAdjustedMetrics = useCallback((row: any) => {
    const m = calculateMetrics(row);
    let planningMins = 0;
    let actualBdMins = 0;

    (row.breakdowns || []).forEach((bd: any) => {
        if (bd.startTime && bd.endTime && bd.category) {
            const [sh, sm] = bd.startTime.split(':').map(Number);
            const [eh, em] = bd.endTime.split(':').map(Number);
            let mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins < 0) mins += 1440;
            if (mins > 0) {
                if (bd.category.toLowerCase().includes('planning')) planningMins += mins;
                else actualBdMins += mins;
            }
        }
    });

    const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
    const planningLossQty = Math.floor(ratePerMin * planningMins);
    const actualBdLossQty = Math.floor(ratePerMin * actualBdMins);

    m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
    m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2));

    const updatedTotalLoss = m.planQty - (row.achievedQty || 0);
    m.efficiencyLossQty = updatedTotalLoss - actualBdLossQty;
    m.efficiencyLossKg = Number(((m.efficiencyLossQty * (row.unitWeight || 0)) / 1000).toFixed(2));

    m.lostQty = updatedTotalLoss;
    m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2));
    m.bdLostQty = actualBdLossQty;
    m.bdLostKg = Number(((actualBdLossQty * (row.unitWeight || 0)) / 1000).toFixed(2));
    m.bdMins = actualBdMins;

    return m;
  }, []);

  // ============================================================================
  // 6. 📊 CORE SUMMARY DATA LOGIC
  // ============================================================================
  const data = useMemo(() => {
    const getProductType = (row: any) => row.productType || ''; 

    const filterRows = (rows: any[], type: 'IM' | 'BM') => {
      let out = rows || [];
      if (type === 'IM' && !includePreform) {
          out = out.filter((r: any) => {
              const pType = getProductType(r).toLowerCase();
              const pName = (r.product || '').toLowerCase();
              return pType.includes('cap') || pName.includes('cap');
          });
      }
      return out;
    };
    
    const bmRows = filterRows(allData[`${selDate}_BM`]?.rows || [], 'BM');
    const imRows = filterRows(allData[`${selDate}_IM`]?.rows || [], 'IM');

    const bmD = allData[`${selDate}_BM`];
    const imD = allData[`${selDate}_IM`];

    const calc = (rows: any[], shift?: string) => {
      const f = shift ? rows.filter((r: any) => r.shift === shift) : rows;
      const res = f.reduce((acc, row) => {
        const m = getAdjustedMetrics(row); 
        return { p: acc.p + m.planKg, a: acc.a + m.achievedKg, l: acc.l + m.lostKg };
      }, { p: 0, a: 0, l: 0 });
      return { ...res, pct: res.p > 0 ? (res.a / res.p) * 100 : 0 };
    };

    const bD = calc(bmRows, 'day'); const bN = calc(bmRows, 'night'); const bT = calc(bmRows);
    const iD = calc(imRows, 'day'); const iN = calc(imRows, 'night'); const iT = calc(imRows);

    const getMTD = (type: string) => {
      const monthPrefix = selDate.substring(0, 7);
      const datesInRange = getDatesInRange(`${monthPrefix}-01`, selDate);
      let p = 0, a = 0, l = 0;

      datesInRange.forEach(d => {
        const dayDoc = allData[`${d}_${type}`];
        if (dayDoc && dayDoc.rows) {
          const rows = filterRows(dayDoc.rows, type as 'IM' | 'BM');
          rows.forEach((r: any) => { 
              const m = getAdjustedMetrics(r); 
              p += m.planKg; a += m.achievedKg; l += m.lostKg; 
          });
        }
      });
      return { p, a, l, pct: p > 0 ? (a / p) * 100 : 0 };
    };

    const bM = getMTD('BM'); const iM = getMTD('IM');
    const gT = { p: bT.p + iT.p, a: bT.a + iT.a, l: bT.l + iT.l, pct: (bT.p + iT.p) > 0 ? ((bT.a + iT.a) / (bT.p + iT.p)) * 100 : 0 };
    const gM = { p: bM.p + iM.p, a: bM.a + iM.a, l: bM.l + iM.l, pct: (bM.p + iM.p) > 0 ? ((bM.a + iM.a) / (bM.p + iM.p)) * 100 : 0 };

    const calculateTeamStats = (teamName: string) => {
      const monthPrefix = selDate.substring(0, 7);
      let plan = 0, achv = 0;
      getDatesInRange(`${monthPrefix}-01`, selDate).forEach(d => {
        const supData = allData[`${d}_SUPERVISORS`] || { day: 'Shift-A', night: 'Shift-B' }; 
        (['IM', 'BM'] as const).forEach(type => {
          filterRows(allData[`${d}_${type}`]?.rows || [], type).forEach((r: any) => {
            const m = getAdjustedMetrics(r);
            if ((r.shift === 'day' ? supData.day : supData.night) === teamName) { plan += m.planKg; achv += m.achievedKg; }
          });
        });
      });
      return { p: plan, a: achv, pct: plan > 0 ? (achv / plan) * 100 : 0 };
    };

    return {
      bm: { d: bD, n: bN, t: bT, m: bM },
      im: { d: iD, n: iN, t: iT, m: iM },
      grand: { t: gT, m: gM },
      shift: {
        a: calculateTeamStats('Shift-A'), b: calculateTeamStats('Shift-B'),
        as: bmD?.daySupervisor || imD?.daySupervisor || '-', bs: bmD?.nightSupervisor || imD?.nightSupervisor || '-'
      }
    };
  }, [allData, selDate, includePreform, getAdjustedMetrics]);

  // ============================================================================
  // 7. AUTO CALCULATIONS (State Updates Only - Auto-Save is handled centrally)
  // ============================================================================
  const calculatedStock = useMemo(() => {
    const day1 = `${selDate.substring(0, 7)}-01`;
    const isDay1 = selDate === day1;
    const calcs: any = {};
    STOCK_KEYS.forEach(k => {
      const open = isDay1 ? (Number(stock[k as keyof typeof stock]?.o) || 0) : (Number(allData[`${day1}_REPORT`]?.stock?.[k]?.o) || 0);
      let mtdR = 0, mtdI = 0;
      getDatesInRange(day1, selDate).forEach(d => {
        const sData = (d === selDate) ? stock : allData[`${d}_REPORT`]?.stock;
        if (sData && sData[k]) { mtdR += Number(sData[k].r || 0); mtdI += Number(sData[k].i || 0); }
      });
      calcs[k] = { o: open, rt: mtdR, it: mtdI, s: (open + mtdR) - mtdI };
    });
    return { isDay1, calcs };
  }, [allData, stock, selDate]);

  useEffect(() => {
    setStock(prevStock => {
      let hasChanges = false;
      const newStock = JSON.parse(JSON.stringify(prevStock));
      STOCK_KEYS.forEach(k => {
        const c = calculatedStock.calcs[k];
        if (Number(newStock[k].rt) !== Number(c.rt)) { newStock[k].rt = c.rt; hasChanges = true; }
        if (Number(newStock[k].it) !== Number(c.it)) { newStock[k].it = c.it; hasChanges = true; }
        if (Number(newStock[k].s) !== Number(c.s)) { newStock[k].s = c.s; hasChanges = true; }
        if (!calculatedStock.isDay1 && Number(newStock[k].o) !== Number(c.o)) { newStock[k].o = c.o; hasChanges = true; }
      });
      return hasChanges ? newStock : prevStock;
    });
  }, [calculatedStock]);
  
  const regTotals = useMemo(() => ({
    d_GT: (parseFloat(reg.dIM_t || '0') + parseFloat(reg.dBM_t || '0')).toString(),
    n_GT: (parseFloat(reg.nIM_t || '0') + parseFloat(reg.nBM_t || '0')).toString(),
    t_GT: (parseFloat(reg.tIM_t || '0') + parseFloat(reg.tBM_t || '0')).toString()
  }), [reg.dIM_t, reg.dBM_t, reg.nIM_t, reg.nBM_t, reg.tIM_t, reg.tBM_t]);

  useEffect(() => {
    setReg(prev => {
      if (prev.d_GT !== regTotals.d_GT || prev.n_GT !== regTotals.n_GT || prev.t_GT !== regTotals.t_GT) {
        return { ...prev, d_GT: regTotals.d_GT, n_GT: regTotals.n_GT, t_GT: regTotals.t_GT };
      }
      return prev;
    });
  }, [regTotals]); 

  const delTotals = useMemo(() => ({
    totA: (parseFloat(del.imA || '0') + parseFloat(del.bmA || '0')).toFixed(1),
    totM: (parseFloat(del.imM || '0') + parseFloat(del.bmM || '0')).toFixed(1)
  }), [del.imA, del.bmA, del.imM, del.bmM]);

  useEffect(() => {
    setDel(prev => {
      if (prev.totA !== delTotals.totA || prev.totM !== delTotals.totM) {
        return { ...prev, totA: delTotals.totA, totM: delTotals.totM };
      }
      return prev;
    });
  }, [delTotals]); 



  
 // 🟢 4.1 Attendance Totals සහ Balance Auto-Calculate කිරීම
 useEffect(() => {
  const calcTotals = (prev: any) => {
    const keys = ['general', 'cnNight', 'shiftA', 'shiftB', 'training', 'new'];
    let tA = 0, tP = 0, tAb = 0;
    
    keys.forEach(k => {
      tA += Number(prev[k]?.a || 0);
      tP += Number(prev[k]?.p || 0);
      tAb += Number(prev[k]?.ab || 0);
    });

    const newTotA = tA === 0 ? '' : tA.toString();
    const newTotP = tP === 0 ? '' : tP.toString();
    const newTotAb = tAb === 0 ? '' : tAb.toString();
    
    const newBal = (Number(prev.req?.a || 0) - tA).toString();

    if (prev.total?.a !== newTotA || prev.total?.p !== newTotP || prev.total?.ab !== newTotAb || prev.balance?.a !== newBal) {
      return { 
        ...prev, 
        total: { a: newTotA, p: newTotP, ab: newTotAb }, 
        balance: { ...prev.balance, a: newBal } 
      };
    }
    return prev;
  };

  setAtt1(prev => calcTotals(prev));
  setAtt2(prev => calcTotals(prev));
}, [JSON.stringify(att1), JSON.stringify(att2)]);





  return (
    <DailySummaryView
      readOnly={readOnly}
      subTab={subTab} setSubTab={setSubTab}
      selDate={selDate} setSelDate={handleDateChange} 
      includePreform={includePreform} setIncludePreform={setIncludePreform}
      data={data}
      att1={att1} setAtt1={setAtt1} att2={att2} setAtt2={setAtt2}
      stock={stock} setStock={setStock}
      reg={reg} setReg={setReg} del={del} setDel={setDel}
      calculatedStock={calculatedStock} regTotals={regTotals}
      handleExport={() => downloadDailyReportExcel(selDate, data, att1, att2, stock, reg, del, regTotals)}
      persistData={persistData}
      allData={allData} breakdownCategories={breakdownCategories}
      loadDataForRange={loadDataForRange}
    />
  );
};

export default DailySummary;