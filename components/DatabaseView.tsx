import React, { useMemo, useState, useEffect } from 'react';
import { ProductionRow } from '../types';
import { calculateMetrics, getDatesInRange } from '../utils';
import { Database, User, ChevronDown, ChevronUp, Calendar, Layers, Clock, Box, AlertTriangle, Zap, Target, Activity, TrendingDown } from 'lucide-react';
import { handleDatabaseExport } from './ImBmDBExcel';

// ============================================================================
// 1. 🎨 THEME & COLOR CONFIGURATION (වර්ණ වෙනස් කිරීමට මෙතැනින් හැක)
// ============================================================================
const THEME = {
   // --- Main Structure (ප්‍රධාන පසුබිම් වර්ණ) ---
   bgMain: "bg-white dark:bg-[#0F172A]",
   bgSub: "bg-slate-50 dark:bg-[#1E293B]",
   borderMain: "border-slate-200 dark:border-slate-700",
   textMain: "text-slate-800 dark:text-slate-200",
   textMuted: "text-slate-500 dark:text-slate-400",
 
   // --- Top Summary Header (උඩම ඇති Summary කොටසේ වර්ණ) ---
   summaryBg: "bg-white dark:bg-[#0F172A]", // Light/Dark දෙකටම ගැලපෙන ලෙස වෙනස් කරන ලදී
   summaryText: "text-slate-800 dark:text-white",
   summaryBoxBg: "bg-slate-50 dark:bg-[#1E293B]",
   summaryBorder: "border-slate-200 dark:border-slate-700",
 
   // --- Table Headers & Sticky Columns (වගුවේ හිස සහ Freeze වන Column වර්ණ) ---
   tableHeadBg: "bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400",
   tableRowHover: "group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 transition-colors",
   stickyColBg: "bg-white dark:bg-[#0F172A]", 
   stickyColHover: "group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80",
 
   // --- Shift Badges (Day/Night පෙන්වන වර්ණ) ---
   shiftDayBg: "bg-amber-100 dark:bg-amber-900/30",
   shiftDayText: "text-amber-700 dark:text-amber-500",
   shiftNightBg: "bg-indigo-100 dark:bg-indigo-900/30",
   shiftNightText: "text-indigo-700 dark:text-indigo-400",
 
   // --- Metrics Highlights (දත්ත පෙන්වන කොටු වල වර්ණ) ---
   valPlan: "text-slate-600 dark:text-slate-300",
   valAchv: "text-emerald-600 dark:text-emerald-400",
   valRej: "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-900/10",
   valStart: "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10",
   valAcc: "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10",
   valLostKg: "text-rose-500 bg-rose-50/10 dark:bg-rose-900/5",
   valBdEff: "text-amber-600 dark:text-amber-500",
 };

interface Props {
  startDate: string;
  endDate: string;
  machineType: 'IM' | 'BM';
  allData: Record<string, any>;
  machineFilter: string[];
  productFilter: string[];
}

const DatabaseView: React.FC<Props> = ({ startDate, endDate, machineType, allData, machineFilter, productFilter }) => {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // ============================================================================
// ============================================================================
  // 2. 🧠 CORE LOGIC & MEMOIZATION (Performance Optimization)
  // ============================================================================
  const reportData = useMemo(() => {
   // 🟢 Timezone/Calendar ලෙඩ සම්පූර්ණයෙන්ම මඟහැරීම!
   // getDatesInRange වෙනුවට, කෙලින්ම Database එකෙන් ආපු දත්තවල තියෙන දින (Keys) ටික පාවිච්චි කිරීම.
   const dates = Object.keys(allData)
       .filter(key => key.endsWith(`_${machineType}`)) // අදාළ Machine Type එක පමණක් තේරීම (IM/BM)
       .map(key => key.split('_')[0]) // දිනය පමණක් වෙන් කර ගැනීම (උදා: "2024-03-31")
       .filter(date => date >= startDate && date <= endDate) // නිවැරදි දින පරාසයේ ඇති දින පමණක් පෙරීම
       .sort(); // අනුපිළිවෙලට (Chronological) සැකසීම

   const grouped = dates.map(date => {
     const key = `${date}_${machineType}`;
     const dayData = allData[key];
      const rows: ProductionRow[] = dayData ? dayData.rows : [];
      const supervisors = { day: dayData?.daySupervisor || '-', night: dayData?.nightSupervisor || '-' };


      // 🟢 අලුත් වෙනස: මුලින්ම Shift එක (Day -> Night) අනුවද, පසුව යන්ත්‍රයේ අංකය (Machine Number) අනුවද පිළිවෙළට සැකසීම
      rows.sort((a, b) => {
        // 1. Shift එක අනුව වෙන් කිරීම (Day මුලින්, Night පසුව)
        if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;
        
        // 2. යන්ත්‍රයේ නම/අංකය අනුව අකාරාදී පිළිවෙළට සහ අංක පිළිවෙළට සැකසීම (Numeric Sort)
        const machineA = (a.machine || '').toString();
        const machineB = (b.machine || '').toString();
        
        return machineA.localeCompare(machineB, undefined, { numeric: true, sensitivity: 'base' });
      });


      // 🟢 2.1 පෙරීම සහ Metrics ගණනය කිරීම (Planning එක අඩු කිරීමද මෙහිම සිදුවේ)
      const filteredRowsWithMetrics = rows.filter(row => {
        if (machineFilter.length > 0 && !machineFilter.includes(row.machine)) return false;
        if (productFilter.length > 0 && !productFilter.includes(row.product)) return false;
        return true;
      }).map(row => {
        const m = calculateMetrics(row);

        // --- Planning Logic (අලුතින් එක්කළ කොටස) ---
        let planningMins = 0;
        let actualBdMins = 0;

        (row.breakdowns || []).forEach(bd => {
            if (bd.startTime && bd.endTime && bd.category && bd.startTime.includes(':') && bd.endTime.includes(':')) {
                const [sh, sm] = bd.startTime.split(':').map(n => Number(n) || 0);
                const [eh, em] = bd.endTime.split(':').map(n => Number(n) || 0);
                let mins = (eh * 60 + em) - (sh * 60 + sm);
                if (mins < 0) mins += 1440; 
                if (mins > 0) {
                    if (bd.category.toLowerCase().includes('planning')) planningMins += mins;
                    else actualBdMins += mins;
                }
            }
        });

        const ratePerMin = ((Number(row.qtyPerHour) || 0) * (Number(row.cavities) || 1)) / 60;
        const planningLossQty = Math.floor(ratePerMin * planningMins) || 0;
        const actualBdLossQty = Math.floor(ratePerMin * actualBdMins) || 0;
        
        // Planning Qty, Kg සහ Time නියම Plan එකෙන් අඩු කිරීම
        m.planQty = Math.max(0, (Number(m.planQty) || 0) - planningLossQty); 
        m.planKg = Number(((m.planQty * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;
        
        // 🟢 අලුත් වෙනස: සෘණ අගයන් පෙන්වීම සඳහා Math.max(0, ...) ඉවත් කර ඇත
        const updatedTotalLoss = m.planQty - (Number(row.achievedQty) || 0);
        m.efficiencyLossQty = updatedTotalLoss - actualBdLossQty;
        m.efficiencyLossKg = Number(((m.efficiencyLossQty * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;
        
        m.lostQty = updatedTotalLoss || 0;
        m.lostKg = Number(((updatedTotalLoss * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;
        
        m.bdLostQty = actualBdLossQty || 0;
        m.bdLostKg = Number(((actualBdLossQty * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;
        m.bdMins = actualBdMins || 0;

        // 🟢 UI එකේ Error එක නැවැත්වීමට අමතර ආරක්ෂාව (NaN සම්පූර්ණයෙන්ම මඟහැරීම)
        m.timeHr = Number(m.timeHr) || 0;
        m.achievedKg = Number(m.achievedKg) || 0;
        m.efficiency = Number(m.efficiency) || 0;

        return { ...row, adjustedMetrics: m };
      });

      // 🟢 2.2 SubTotal ගණනය කිරීම
      const subTotal = filteredRowsWithMetrics.reduce((acc, row) => {
         const m = row.adjustedMetrics;
         return {
           planQty: acc.planQty + m.planQty,
           achvQty: acc.achvQty + row.achievedQty,
           planKg: acc.planKg + m.planKg,
           achvKg: acc.achvKg + m.achievedKg,
           lostQty: acc.lostQty + m.lostQty,
           lostKg: acc.lostKg + m.lostKg,
           bdLostKg: acc.bdLostKg + m.bdLostKg,
           effLostKg: acc.effLostKg + m.efficiencyLossKg,
         };
       }, { planQty: 0, achvQty: 0, planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 });



      return { date, rows: filteredRowsWithMetrics, subTotal, supervisors };
    }).filter(group => group.rows.length > 0);

    return grouped;
  }, [startDate, endDate, machineType, allData, machineFilter, productFilter]);

  useEffect(() => { setExpandedDates({}); }, [machineFilter, productFilter, startDate, endDate, machineType]);
  const toggleDate = (date: string) => { setExpandedDates(prev => ({ ...prev, [date]: !prev[date] })); };

  // Grand Total Calculation
  const grandTotal = reportData.reduce((acc, group) => {
    return {
      planQty: acc.planQty + group.subTotal.planQty, achvQty: acc.achvQty + group.subTotal.achvQty,
      planKg: acc.planKg + group.subTotal.planKg, achvKg: acc.achvKg + group.subTotal.achvKg,
      lostQty: acc.lostQty + group.subTotal.lostQty, lostKg: acc.lostKg + group.subTotal.lostKg,
      bdLostKg: acc.bdLostKg + group.subTotal.bdLostKg, effLostKg: acc.effLostKg + group.subTotal.effLostKg,
    };
  }, { planQty: 0, achvQty: 0, planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 });

  const onExport = () => handleDatabaseExport(startDate, endDate, machineType, allData, machineFilter, productFilter);

  if (reportData.length === 0) {
    return (
      <div className={`p-16 text-center rounded-3xl border shadow-xl flex flex-col items-center animate-fade-in ${THEME.bgMain} ${THEME.borderMain}`}>
        <div className={`p-6 rounded-full mb-6 shadow-inner ${THEME.bgSub}`}><Database className={`w-12 h-12 opacity-50 ${THEME.textMuted}`} /></div>
        <h3 className={`text-2xl font-black mb-2 ${THEME.textMain}`}>No Records Found</h3>
        <p className={`font-medium ${THEME.textMuted}`}>Adjust the date range to view production logs.</p>
      </div>
    );
  }

  // ============================================================================
  // 3. 🎨 UI RENDER
  // ============================================================================
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 🟢 3.1 GRAND TOTAL SUMMARY (Responsive & Light/Dark UI Matched) */}
      <div className={`rounded-2xl p-3 md:p-4 shadow-sm border overflow-x-auto custom-scrollbar transform-gpu will-change-scroll ${THEME.summaryBg} ${THEME.borderMain}`}>
         <div className="flex items-center min-w-max gap-4 md:gap-8">
             <div className="flex items-center gap-3 shrink-0">
                <div className={`p-2 md:p-3 rounded-xl border ${THEME.summaryBoxBg} ${THEME.summaryBorder}`}><Layers className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 dark:text-indigo-400" /></div>
                <div>
                    <h2 className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${THEME.textMuted}`}>{machineType} SUMMARY</h2>
                    <div className={`text-lg md:text-2xl font-black ${THEME.summaryText}`}>{grandTotal.achvKg.toFixed(1)} <span className="text-[10px] md:text-xs opacity-50">kg</span></div>
                </div>
             </div>
             <div className="w-px h-8 shrink-0 mx-2 bg-slate-200 dark:bg-slate-700"></div>
             
             {/* Stat Blocks - Inline Flex */}
             <div className="flex items-center gap-2 md:gap-4 shrink-0">
                 <div className={`text-center px-3 md:px-4 py-1.5 md:py-2 rounded-xl border ${THEME.summaryBoxBg} ${THEME.summaryBorder}`}>
                    <div className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Plan Kg</div>
                    <div className={`text-sm md:text-lg font-black ${THEME.summaryText}`}>{grandTotal.planKg.toFixed(1)}</div>
                 </div>
                 <div className="text-center px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                    <div className="text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-0.5">Achv Kg</div>
                    <div className="text-sm md:text-lg font-black text-emerald-600 dark:text-emerald-400">{grandTotal.achvKg.toFixed(1)}</div>
                 </div>
                 <div className="text-center px-3 md:px-4 py-1.5 md:py-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/30">
                    <div className="text-[9px] md:text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider mb-0.5">Lost Kg</div>
                    <div className="text-sm md:text-lg font-black text-rose-600 dark:text-rose-400">{grandTotal.lostKg.toFixed(1)}</div>
                 </div>
                 <div className="text-center px-3 md:px-4 py-1.5 md:py-2 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <div className="text-[9px] md:text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-0.5">Eff %</div>
                    <div className="text-sm md:text-lg font-black text-amber-600 dark:text-amber-400">{grandTotal.planKg > 0 ? ((grandTotal.achvKg / grandTotal.planKg) * 100).toFixed(1) : '0.0'}%</div>
                 </div>
             </div>
         </div>
      </div>

      {/* 🟢 3.2 DAILY CARDS LIST */}
      <div className="space-y-3"> {/* 🟢 චූටි පරතරය සඳහා space-y-3 යොදා ඇත */}
        {reportData.map((group) => {
          const isExpanded = expandedDates[group.date];
          const eff = group.subTotal.planKg > 0 ? (group.subTotal.achvKg / group.subTotal.planKg) * 100 : 0;

          return (
            <div key={group.date} className={`rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${THEME.bgMain} ${THEME.borderMain} border`}>
              
              {/* --- Card Header (Inline Compact Layout) --- */}
              <div onClick={() => toggleDate(group.date)} className={`p-2.5 md:p-4 flex items-center justify-between gap-2 cursor-pointer transition-colors border-b ${THEME.bgSub} hover:bg-slate-100 dark:hover:bg-slate-800 ${THEME.borderMain}`}>
                 {/* Left Side: Date & Supervisors */}
                 <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl shrink-0 ${eff >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : eff >= 80 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                       <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="min-w-0">
                       <div className="flex items-center gap-1.5 md:gap-2">
                          <h3 className={`text-[11px] md:text-lg font-black uppercase tracking-tight truncate ${THEME.textMain}`}>{group.date}</h3>
                          <span className={`text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded font-bold bg-slate-200 dark:bg-slate-700 ${THEME.textMuted}`}>{group.rows.length} <span className="hidden md:inline">REC</span></span>
                       </div>
                       <div className={`flex items-center gap-1 md:gap-3 text-[8px] md:text-xs font-bold mt-0.5 md:mt-1 ${THEME.textMuted} truncate`}>
                          <span className="flex items-center gap-0.5 md:gap-1"><User className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="md:hidden">{group.supervisors.day.replace('Shift-','')}</span><span className="hidden md:inline">{group.supervisors.day}</span></span>
                          <span className="w-px h-2.5 md:h-3 bg-slate-300 dark:bg-slate-600"></span>
                          <span className="flex items-center gap-0.5 md:gap-1"><User className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="md:hidden">{group.supervisors.night.replace('Shift-','')}</span><span className="hidden md:inline">{group.supervisors.night}</span></span>
                       </div>
                    </div>
                 </div>

                 {/* Right Side: Inline Metrics + Arrow */}
                 <div className="flex items-center gap-2 md:gap-6 shrink-0">
                    <div className="flex items-center gap-2 md:gap-8">
                       <div className="text-right"><div className="text-[7px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Plan</div><div className={`font-black text-[10px] md:text-lg leading-tight ${THEME.textMain}`}>{group.subTotal.planKg.toFixed(1)}</div></div>
                       <div className="text-right"><div className="text-[7px] md:text-[9px] font-bold text-emerald-600 uppercase tracking-wider leading-tight">Achv</div><div className="font-black text-emerald-600 dark:text-emerald-400 text-[10px] md:text-lg leading-tight">{group.subTotal.achvKg.toFixed(1)}</div></div>
                       <div className="text-right"><div className="text-[7px] md:text-[9px] font-bold text-rose-600 uppercase tracking-wider leading-tight">Lost</div><div className="font-black text-rose-600 dark:text-rose-400 text-[10px] md:text-lg leading-tight">{group.subTotal.lostKg.toFixed(1)}</div></div>
                       <div className="text-right"><div className="text-[7px] md:text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-tight">Eff%</div><div className="font-black text-amber-600 dark:text-amber-400 text-[10px] md:text-lg leading-tight">{eff.toFixed(1)}%</div></div>
                    </div>
                    <div className="pl-0.5 md:pl-0">
                       {isExpanded ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />}
                    </div>
                 </div>
              </div>

              {/* --- Expanded Table --- */}
              {isExpanded && (
                 <div className="bg-slate-50/50 dark:bg-black/20 p-0 border-t border-slate-200 dark:border-slate-800">
                    <div className="overflow-x-auto custom-scrollbar transform-gpu will-change-scroll w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                       <table className="w-full text-left text-[11px] min-w-[1300px] border-collapse relative">
                          <thead className={`uppercase tracking-wider font-bold text-[10px] border-b ${THEME.tableHeadBg} ${THEME.borderMain}`}>
                             <tr>
                                <th className={`py-3 px-2 w-[70px] min-w-[70px] max-w-[70px] text-center ${THEME.tableHeadBg}`}>Shift</th>
                                <th className={`py-3 px-2 w-[80px] min-w-[80px] max-w-[80px] ${THEME.tableHeadBg}`}>Machine</th>
                                <th className={`py-3 px-3 w-[160px] min-w-[160px] max-w-[160px] ${THEME.tableHeadBg}`}>Product</th>
                                <th className={`py-3 px-2 w-[60px] min-w-[60px] max-w-[60px] text-right ${THEME.tableHeadBg}`}>Wt(g)</th>
                                <th className="py-3 px-2 w-[60px] text-right">Qty/Hr</th>
                                <th className="py-3 px-2 w-[40px] text-center">Cav</th>
                                <th className="py-3 px-2 w-[60px] text-center text-indigo-500">Time</th>
                                <th className="py-3 px-2 w-[70px] text-right">Plan Qty</th>
                                <th className="py-3 px-2 w-[70px] text-right">Gross</th>
                                <th className="py-3 px-2 w-[70px] text-right">Plan Kg</th>
                                <th className="py-3 px-2 w-[70px] text-right text-emerald-600 dark:text-emerald-400">Achv Kg</th>
                                <th className="py-3 px-2 w-[70px] text-right text-rose-500">Lost Kg</th>
                                <th className="py-3 px-2 w-[70px] text-right text-amber-500">BD Loss</th>
                                <th className="py-3 px-2 w-[70px] text-right text-amber-500">Eff Loss</th>
                                <th className="py-3 px-2 w-[50px] text-center">Eff %</th>
                             </tr>
                          </thead>
                          <tbody className={`divide-y divide-slate-100 dark:divide-slate-800/50 ${THEME.bgMain}`}>
                             {group.rows.map((row: any) => {
                                const m = row.adjustedMetrics; 
                                const team = row.shift === 'day' ? group.supervisors.day : group.supervisors.night;
                                return (
                                   <tr key={row.id} className={`group ${THEME.tableRowHover} ${THEME.textMain}`}>
                                      <td className="py-2 px-2 text-center">
                                         <div className="flex flex-col items-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${row.shift === 'day' ? THEME.shiftDayBg + ' ' + THEME.shiftDayText : THEME.shiftNightBg + ' ' + THEME.shiftNightText}`}>{row.shift}</span>
                                            <span className="text-[9px] font-black text-slate-400 mt-0.5 truncate max-w-[50px]">({team})</span>
                                         </div>
                                      </td>
                                      <td className="py-2 px-2 font-black">{row.machine}</td>
                                      <td className="py-2 px-3 font-medium truncate" title={row.product}>{row.product}</td>
                                      <td className="py-2 px-2 text-right text-slate-500 font-bold">{row.unitWeight}</td>
                                      <td className="py-2 px-2 text-right text-slate-500">{row.qtyPerHour}</td>
                                      <td className="py-2 px-2 text-center text-slate-500">{row.cavities}</td>
                                      <td className="py-2 px-2 text-center font-mono text-indigo-500">{m.timeHr}</td>
                                      <td className={`py-2 px-2 text-right font-medium ${THEME.valPlan}`}>{m.planQty}</td>
                                      <td className="py-2 px-2 text-right font-bold">{row.achievedQty}</td>
                                      <td className={`py-2 px-2 text-right font-medium ${THEME.valPlan}`}>{m.planKg}</td>
                                      <td className={`py-2 px-2 text-right font-bold ${THEME.valAchv}`}>{m.achievedKg}</td>
                                      <td className={`py-2 px-2 text-right font-bold ${THEME.valLostKg}`}>{m.lostKg}</td>
                                      <td className={`py-2 px-2 text-right ${THEME.valBdEff}`}>{m.bdLostKg}</td>
                                      <td className={`py-2 px-2 text-right ${THEME.valBdEff}`}>{m.efficiencyLossKg}</td>
                                      <td className="py-2 px-2 text-center text-[10px] font-bold">{m.efficiency.toFixed(0)}%</td>
                                   </tr>
                                );
                             })}
                          </tbody>
                          <tfoot className={`${THEME.tableHeadBg} border-t font-bold text-xs ${THEME.borderMain}`}>
                             <tr>
                                <td colSpan={4} className={`py-3 px-4 text-right uppercase tracking-widest text-[10px] ${THEME.tableHeadBg}`}>Total</td>
                                <td colSpan={3} className="py-3 px-2"></td>
                                <td className="py-3 px-2 text-right">{group.subTotal.planQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right">{group.subTotal.achvQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right">{group.subTotal.planKg.toFixed(1)}</td>
                                <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{group.subTotal.achvKg.toFixed(1)}</td>
                                <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400">{group.subTotal.lostKg.toFixed(1)}</td>
                                <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-500">{group.subTotal.bdLostKg.toFixed(1)}</td>
                                <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-500">{group.subTotal.effLostKg.toFixed(1)}</td>
                                <td></td>
                             </tr>

                          </tfoot>
                       </table>
                    </div>


                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DatabaseView;