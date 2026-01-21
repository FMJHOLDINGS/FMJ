import React, { useMemo, useState, useEffect } from 'react';
import { ProductionRow } from '../types';
import { calculateMetrics, getDatesInRange } from '../utils';
import { Database, User, ChevronDown, ChevronUp, Calendar, Layers, Clock, Box, AlertTriangle, Zap, Target, Activity, TrendingDown } from 'lucide-react';
import { handleDatabaseExport } from './ReportExporter';

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

  const reportData = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);

    const grouped = dates.map(date => {
      const key = `${date}_${machineType}`;
      const dayData = allData[key];
      const rows: ProductionRow[] = dayData ? dayData.rows : [];
      const supervisors = { day: dayData?.daySupervisor || '-', night: dayData?.nightSupervisor || '-' };

      rows.sort((a, b) => {
        if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;
        return a.startTime.localeCompare(b.startTime);
      });

      const filteredRows = rows.filter(row => {
        if (machineFilter.length > 0 && !machineFilter.includes(row.machine)) return false;
        if (productFilter.length > 0 && !productFilter.includes(row.product)) return false;
        return true;
      });

      const subTotal = filteredRows.reduce((acc, row) => {
        const m = calculateMetrics(row);
        return {
          planQty: acc.planQty + m.planQty,
          achvQty: acc.achvQty + row.achievedQty,
          rejQty: acc.rejQty + (row.rejectionQty || 0),
          startQty: acc.startQty + (row.startupQty || 0),
          accQty: acc.accQty + m.acceptedQty,
          planKg: acc.planKg + m.planKg,
          achvKg: acc.achvKg + m.achievedKg,
          lostQty: acc.lostQty + m.lostQty,
          lostKg: acc.lostKg + m.lostKg,
          bdLostKg: acc.bdLostKg + m.bdLostKg,
          effLostKg: acc.effLostKg + m.efficiencyLossKg,
        };
      }, { 
        planQty: 0, achvQty: 0, rejQty: 0, startQty: 0, accQty: 0, 
        planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 
      });

      return { date, rows: filteredRows, subTotal, supervisors };
    }).filter(group => group.rows.length > 0);

    return grouped;
  }, [startDate, endDate, machineType, allData, machineFilter, productFilter]);

  useEffect(() => { setExpandedDates({}); }, [machineFilter, productFilter, startDate, endDate, machineType]);
  const toggleDate = (date: string) => { setExpandedDates(prev => ({ ...prev, [date]: !prev[date] })); };

  const grandTotal = reportData.reduce((acc, group) => {
    return {
      planQty: acc.planQty + group.subTotal.planQty,
      achvQty: acc.achvQty + group.subTotal.achvQty,
      planKg: acc.planKg + group.subTotal.planKg,
      achvKg: acc.achvKg + group.subTotal.achvKg,
      lostQty: acc.lostQty + group.subTotal.lostQty,
      lostKg: acc.lostKg + group.subTotal.lostKg,
      bdLostKg: acc.bdLostKg + group.subTotal.bdLostKg,
      effLostKg: acc.effLostKg + group.subTotal.effLostKg,
    };
  }, { planQty: 0, achvQty: 0, planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 });

  const onExport = () => {
    handleDatabaseExport(startDate, endDate, machineType, allData, machineFilter, productFilter);
  };

  if (reportData.length === 0) {
    return (
      <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col items-center animate-fade-in">
        <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 mb-6 shadow-inner"><Database className="w-12 h-12 opacity-50" /></div>
        <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-2">No Records Found</h3>
        <p className="text-slate-400 dark:text-slate-500 font-medium">Adjust the date range to view production logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* GRAND TOTAL SUMMARY */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10"><Layers className="w-8 h-8 text-indigo-400" /></div>
              <div><h2 className="text-xl font-black uppercase tracking-widest text-slate-400">{machineType} REPORT SUMMARY</h2><div className="text-3xl font-black text-white">{grandTotal.achvKg.toFixed(1)} <span className="text-lg text-slate-500">kg</span></div></div>
           </div>
           <div className="flex flex-wrap justify-center gap-4 lg:gap-8">
              <div className="text-center px-4 py-2 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Plan Kg</div><div className="text-xl font-black text-white">{grandTotal.planKg.toFixed(1)}</div></div>
              <div className="text-center px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 backdrop-blur-sm"><div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Achv Kg</div><div className="text-xl font-black text-emerald-400">{grandTotal.achvKg.toFixed(1)}</div></div>
              <div className="text-center px-4 py-2 bg-rose-500/10 rounded-2xl border border-rose-500/20 backdrop-blur-sm"><div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Lost Kg</div><div className="text-xl font-black text-rose-400">{grandTotal.lostKg.toFixed(1)}</div></div>
              <div className="text-center px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-sm"><div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Eff %</div><div className="text-xl font-black text-amber-400">{grandTotal.planKg > 0 ? ((grandTotal.achvKg / grandTotal.planKg) * 100).toFixed(1) : '0.0'}%</div></div>
           </div>
        </div>
      </div>

      {/* DAILY CARDS LIST */}
      <div className="space-y-3">
        {reportData.map((group) => {
          const isExpanded = expandedDates[group.date];
          const eff = group.subTotal.planKg > 0 ? (group.subTotal.achvKg / group.subTotal.planKg) * 100 : 0;

          return (
            <div key={group.date} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden transition-all hover:shadow-lg">
              
              {/* --- SUMMARY CARD HEADER (Optimized for Mobile) --- */}
              <div onClick={() => toggleDate(group.date)} className="bg-slate-50 dark:bg-slate-900/50 p-3 md:p-5 flex flex-col md:flex-row items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border-b border-slate-200 dark:border-slate-700">
                 
                 {/* Top Row: Date, Icon & Supervisors */}
                 <div className="flex justify-between items-start w-full md:w-auto md:justify-start md:gap-4">
                    <div className="flex items-center gap-3">
                       <div className={`p-2.5 rounded-xl shrink-0 ${eff >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : eff >= 80 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}><Calendar className="w-5 h-5" /></div>
                       <div>
                          <div className="flex items-center gap-2">
                             <h3 className="text-sm md:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{group.date}</h3>
                             <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold">{group.rows.length} REC</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-400 mt-0.5">
                             <span className="flex items-center gap-1"><User className="w-3 h-3" /> {group.supervisors.day}</span>
                             <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
                             <span className="flex items-center gap-1"><User className="w-3 h-3" /> {group.supervisors.night}</span>
                          </div>
                       </div>
                    </div>
                    {/* Mobile Chevron (visible only on mobile) */}
                    <div className="md:hidden pt-1">{isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</div>
                 </div>

                 {/* Bottom Row: Stats (Horizontal Strip on Mobile) */}
                 <div className="w-full md:w-auto mt-1 md:mt-0">
                    <div className="grid grid-cols-4 gap-1 md:gap-8 bg-white dark:bg-slate-950/50 md:bg-transparent rounded-lg p-2 md:p-0 border border-slate-100 dark:border-slate-800 md:border-none">
                       <div className="text-center md:text-left"><div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan</div><div className="font-black text-slate-700 dark:text-slate-300 text-xs md:text-lg">{group.subTotal.planKg.toFixed(1)}</div></div>
                       <div className="text-center md:text-left"><div className="text-[8px] md:text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Achv</div><div className="font-black text-emerald-600 dark:text-emerald-400 text-xs md:text-lg">{group.subTotal.achvKg.toFixed(1)}</div></div>
                       <div className="text-center md:text-left"><div className="text-[8px] md:text-[9px] font-bold text-rose-500 uppercase tracking-wider">Lost</div><div className="font-black text-rose-600 dark:text-rose-400 text-xs md:text-lg">{group.subTotal.lostKg.toFixed(1)}</div></div>
                       <div className="text-center md:text-left"><div className="text-[8px] md:text-[9px] font-bold text-amber-500 uppercase tracking-wider">Eff %</div><div className="font-black text-amber-600 dark:text-amber-400 text-xs md:text-lg">{eff.toFixed(1)}%</div></div>
                    </div>
                 </div>

                 {/* Desktop Chevron */}
                 <div className="hidden md:block">{isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}</div>
              </div>

              {/* --- EXPANDED DETAILS --- */}
              {isExpanded && (
                 <div className="bg-slate-50/50 dark:bg-black/20 p-3 md:p-0">
                    
                    {/* DESKTOP TABLE VIEW */}
                    <div className="hidden md:block overflow-x-auto custom-scrollbar">
                       <table className="w-full text-left text-[11px] min-w-[1500px] border-collapse">
                          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200 dark:border-slate-700">
                             <tr>
                                <th className="py-3 px-2 w-24 text-center">Shift</th>
                                <th className="py-3 px-2 w-20">Machine</th>
                                <th className="py-3 px-4 w-48">Product</th>
                                <th className="py-3 px-2 w-16 text-right">Wt(g)</th>
                                <th className="py-3 px-2 w-16 text-right">Qty/Hr</th>
                                <th className="py-3 px-2 w-12 text-center">Cav</th>
                                <th className="py-3 px-2 w-16 text-center text-indigo-500">Time</th>
                                <th className="py-3 px-2 w-20 text-right bg-slate-200/50 dark:bg-slate-800/50">Plan Qty</th>
                                <th className="py-3 px-2 w-20 text-right bg-slate-200/50 dark:bg-slate-800/50">Gross</th>
                                <th className="py-3 px-2 w-20 text-right text-rose-500 bg-rose-50/50 dark:bg-rose-900/10">Rejection</th>
                                <th className="py-3 px-2 w-20 text-right text-amber-500 bg-amber-50/50 dark:bg-amber-900/10">Startup</th>
                                <th className="py-3 px-2 w-20 text-right text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10">Accepted</th>
                                <th className="py-3 px-2 w-20 text-right bg-slate-200/50 dark:bg-slate-800/50">Plan Kg</th>
                                <th className="py-3 px-2 w-20 text-right bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400">Achv Kg</th>
                                <th className="py-3 px-2 w-20 text-right text-rose-500 bg-rose-50/50 dark:bg-rose-900/10">Lost Kg</th>
                                <th className="py-3 px-2 w-20 text-right text-amber-500">BD Loss</th>
                                <th className="py-3 px-2 w-20 text-right text-amber-500">Eff Loss</th>
                                <th className="py-3 px-2 w-12 text-center">Eff %</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                             {group.rows.map((row) => {
                                const m = calculateMetrics(row);
                                const team = row.shift === 'day' ? group.supervisors.day : group.supervisors.night;
                                return (
                                   <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors dark:text-slate-300">
                                      <td className="py-2.5 px-2 text-center">
                                         <div className="flex flex-col items-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${row.shift === 'day' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700'}`}>{row.shift}</span>
                                            <span className="text-[9px] font-black text-slate-400 mt-0.5">({team})</span>
                                         </div>
                                      </td>
                                      <td className="py-2.5 px-2 font-black text-slate-700 dark:text-slate-200">{row.machine}</td>
                                      <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400">{row.product}</td>
                                      <td className="py-2.5 px-2 text-right text-slate-500">{row.unitWeight}</td>
                                      <td className="py-2.5 px-2 text-right text-slate-500">{row.qtyPerHour}</td>
                                      <td className="py-2.5 px-2 text-center text-slate-500">{row.cavities}</td>
                                      <td className="py-2.5 px-2 text-center font-mono text-indigo-500">{m.timeHr}</td>
                                      <td className="py-2.5 px-2 text-right font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/30">{m.planQty}</td>
                                      <td className="py-2.5 px-2 text-right font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30">{row.achievedQty}</td>
                                      <td className="py-2.5 px-2 text-right text-rose-500 bg-rose-50/10 dark:bg-rose-900/5 font-bold">{row.rejectionQty || 0}</td>
                                      <td className="py-2.5 px-2 text-right text-amber-500 bg-amber-50/10 dark:bg-amber-900/5 font-bold">{row.startupQty || 0}</td>
                                      <td className="py-2.5 px-2 text-right text-emerald-600 bg-emerald-50/10 dark:bg-emerald-900/5 font-black">{m.acceptedQty}</td>
                                      <td className="py-2.5 px-2 text-right font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/30">{m.planKg}</td>
                                      <td className="py-2.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/5">{m.achievedKg}</td>
                                      <td className="py-2.5 px-2 text-right font-bold text-rose-500 bg-rose-50/10 dark:bg-rose-900/5">{m.lostKg}</td>
                                      <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-500">{m.bdLostKg}</td>
                                      <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-500">{m.efficiencyLossKg}</td>
                                      <td className="py-2.5 px-2 text-center text-[10px] font-bold bg-slate-50 dark:bg-slate-800/30">{m.efficiency.toFixed(0)}%</td>
                                   </tr>
                                );
                             })}
                          </tbody>
                          <tfoot className="bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-600 font-bold text-slate-800 dark:text-white text-xs">
                             <tr>
                                <td colSpan={7} className="py-3 px-4 text-right uppercase text-slate-500 tracking-widest text-[10px]">Total ({group.date})</td>
                                <td className="py-3 px-2 text-right">{group.subTotal.planQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right">{group.subTotal.achvQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400">{group.subTotal.rejQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-400">{group.subTotal.startQty.toLocaleString()}</td>
                                <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400">{group.subTotal.accQty.toLocaleString()}</td>
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

                    {/* MOBILE VIEW (Beautiful Card Layout with ALL Data) */}
                    <div className="md:hidden space-y-3">
                       {group.rows.map((row) => {
                          const m = calculateMetrics(row);
                          const team = row.shift === 'day' ? group.supervisors.day : group.supervisors.night;
                          return (
                             <div key={row.id} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                
                                {/* Header: Shift, Time, Machine, Product */}
                                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-2">
                                   <div className="flex flex-col gap-1 w-full">
                                      <div className="flex items-center justify-between w-full">
                                         <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${row.shift === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{row.shift}</span>
                                            <span className="text-xs font-black text-slate-800 dark:text-white">{row.machine}</span>
                                         </div>
                                         <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            <Clock className="w-3 h-3" />
                                            {m.timeHr} HR
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 mt-1">
                                         <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                         <span className="text-sm font-bold truncate">{row.product}</span>
                                      </div>
                                   </div>
                                </div>

                                {/* Main Stats: 4-Column Grid */}
                                <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                   <div><div className="text-[8px] font-bold text-slate-400 uppercase">Plan</div><div className="text-xs font-black text-slate-700 dark:text-slate-300">{m.planQty}</div></div>
                                   <div><div className="text-[8px] font-bold text-emerald-500 uppercase">Gross</div><div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{row.achievedQty}</div></div>
                                   <div><div className="text-[8px] font-bold text-rose-500 uppercase">Rej</div><div className="text-xs font-black text-rose-600 dark:text-rose-400">{row.rejectionQty || 0}</div></div>
                                   <div><div className="text-[8px] font-bold text-amber-500 uppercase">Start</div><div className="text-xs font-black text-amber-600 dark:text-amber-400">{row.startupQty || 0}</div></div>
                                </div>

                                {/* Secondary Stats: Weight, Cycle, Cavity, Efficiency */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                   <div><div className="text-[8px] font-bold text-slate-400 uppercase">Weight</div><div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{row.unitWeight}g</div></div>
                                   <div><div className="text-[8px] font-bold text-slate-400 uppercase">Cycle</div><div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{row.cycleTime}s</div></div>
                                   <div><div className="text-[8px] font-bold text-slate-400 uppercase">Cavity</div><div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{row.cavities}</div></div>
                                   <div><div className="text-[8px] font-bold text-slate-400 uppercase">Eff</div><div className={`text-[10px] font-black ${m.efficiency >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{m.efficiency.toFixed(0)}%</div></div>
                                </div>

                                {/* Losses Breakdown: BD, Eff, Total Loss Kg */}
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                   <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20 text-center flex flex-col justify-center">
                                      <div className="flex items-center justify-center gap-1 text-[8px] font-black text-rose-500 uppercase"><AlertTriangle className="w-3 h-3" /> Lost Kg</div>
                                      <div className="text-xs font-black text-rose-700 dark:text-rose-400">{m.lostKg}</div>
                                   </div>
                                   <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-100 dark:border-amber-900/20 text-center flex flex-col justify-center">
                                      <div className="flex items-center justify-center gap-1 text-[8px] font-black text-amber-500 uppercase"><Zap className="w-3 h-3" /> BD Loss</div>
                                      <div className="text-xs font-black text-amber-700 dark:text-amber-400">{m.bdLostKg}</div>
                                   </div>
                                   <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center flex flex-col justify-center">
                                      <div className="flex items-center justify-center gap-1 text-[8px] font-black text-slate-500 uppercase"><TrendingDown className="w-3 h-3" /> Eff Loss</div>
                                      <div className="text-xs font-black text-slate-700 dark:text-slate-300">{m.efficiencyLossKg}</div>
                                   </div>
                                </div>

                                {/* Final Output: Achieved Kg */}
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/20 flex justify-between items-center px-3">
                                   <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                      <Target className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-wider">ACHIEVED KG</span>
                                   </div>
                                   <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">{m.achievedKg} kg</div>
                                </div>

                             </div>
                          );
                       })}
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