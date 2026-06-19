import React, { useMemo, useState, useEffect } from 'react';
import { calculateMetrics, getDatesInRange, calculateTimeDiff } from '../utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area
} from 'recharts';
import { Calendar, Activity, Zap, TrendingUp, AlertOctagon, BarChart2, Layers, Cpu } from 'lucide-react';

import MachineAnalytics from './MachineAnalytics';

// ============================================================================
// 🎨 1. THEME & COLOR CONFIGURATION (Premium UI)
// ============================================================================
const THEME = {
  mainBg: "bg-transparent",
  cardBg: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
  headerBg: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md",
  borderLight: "border-slate-200/60 dark:border-slate-700/60",
  textMain: "text-slate-800 dark:text-white",
  textMuted: "text-slate-500 dark:text-slate-400",
  
  charts: {
      potential: '#94a3b8',     // Slate (Target Kg)
      noDemandLoss: '#475569',  // Slate Dark (No Demand Loss)
      planningLoss: '#64748b',  // Slate Dark (Plan Loss)
      bdLoss: '#ef4444',        // Red (BD Loss)
      speedLoss: '#f59e0b',     // Amber (Speed Loss)
      qualityLoss: '#ec4899',   // Pink (Quality Loss)
      goodUnits: '#10b981',     // Emerald (Good Kg)
      trendLine: '#6366f1',     // Indigo (Trend OEE 1)
      trendFill: '#818cf8',     // Indigo Light 
      trendLine2: '#a855f7',    // Purple (Trend OEE 2)
      trendFill2: '#c084fc',    // Purple Light
  },
  
  availColor: "bg-amber-500",
  perfColor: "bg-indigo-500",
  qualColor: "bg-rose-500",
  gpuClasses: "transform-gpu will-change-transform will-change-scroll",
  scrollClasses: "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500"
};

interface Props {
   data: Record<string, any>;
   loadDataForRange?: (start: string, end: string, forceRefresh?: boolean) => void;
 }

const OEETab: React.FC<Props> = ({ data, loadDataForRange }) => {
  // ============================================================================
  // 📅 STATES & DATE LOGIC
  // ============================================================================
  const [selectedMonth, setSelectedMonth] = useState(() => {
     const d = new Date();
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [machineType, setMachineType] = useState<'ALL' | 'IM' | 'BM'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'MACHINE_ANALYTICS'>('OVERVIEW');

  const [analyticsTimeMode, setAnalyticsTimeMode] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() - 1); 
      return d.toISOString().split('T')[0];
  });

  const { startDate, endDate } = useMemo(() => {
     const [year, month] = selectedMonth.split('-');
     const start = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-CA');
     const end = new Date(Number(year), Number(month), 0).toLocaleDateString('en-CA');
     return { startDate: start, endDate: end };
  }, [selectedMonth]);

  const monthDates = useMemo(() => getDatesInRange(startDate, endDate), [startDate, endDate]);

  useEffect(() => {
      if (!monthDates.includes(selectedDailyDate) && monthDates.length > 0) {
          setSelectedDailyDate(monthDates[0]);
      }
  }, [monthDates, selectedDailyDate]);

  useEffect(() => {
   if (loadDataForRange && startDate && endDate) {
       // true යෙදීමෙන් cache එක මඟහැර අනිවාර්යයෙන්ම Cloud එකෙන් දත්ත ගනී
       loadDataForRange(startDate, endDate, true); 
   }
}, [startDate, endDate, loadDataForRange]);




// ============================================================================
  // 🧠 3. OEE CALCULATION ENGINE (OEE 1 & OEE 2)
  // ============================================================================
  const oeeData = useMemo(() => {
   const dates = getDatesInRange(startDate, endDate);
   
   let totalTheoreticalMins = 0; 
   let totalShiftMins = 0; 
   let totalPlannedMins = 0; 
   let totalUnplannedMins = 0;
   
   let totalPlanKg = 0; let totalPlanningLossKg = 0; let totalBDLossKg = 0;
   let totalGrossKg = 0; let totalRejectKg = 0;
   let totalNoDemandLossKg = 0; 

   dates.forEach(date => {
      const types = machineType === 'ALL' ? ['IM', 'BM'] : [machineType];
      types.forEach(type => {
         const dayData = data[`${date}_${type}`];
         if(dayData && dayData.rows) {
            
            const machineAggregates: Record<string, any> = {};

            dayData.rows.forEach((row: any) => {
               const mId = row.machineId || row.machineName || row.machine || 'Machine_1';
               
               if (!machineAggregates[mId]) {
                   machineAggregates[mId] = { duration: 0, rateSum: 0, wtSum: 0, count: 0 };
               }

               const unitWt = Number(row.unitWeight) || 0;
               const duration = calculateTimeDiff(row.startTime, row.endTime);
               
               totalShiftMins += duration;
               machineAggregates[mId].duration += duration;
               machineAggregates[mId].count += 1;

               let plannedMins = 0;
               let unplannedMins = 0;
               if (row.breakdowns) {
                   row.breakdowns.forEach((bd: any) => {
                       const mins = calculateTimeDiff(bd.startTime, bd.endTime);
                       if (bd.category && bd.category.toLowerCase().includes('planning')) {
                           plannedMins += mins;
                       } else {
                           unplannedMins += mins;
                       }
                   });
               }
               totalPlannedMins += plannedMins;
               totalUnplannedMins += unplannedMins;

               const ratePerMin = ((Number(row.qtyPerHour) || 0) * (Math.max(1, Number(row.cavities) || 1))) / 60;
               
               machineAggregates[mId].rateSum += ratePerMin;
               machineAggregates[mId].wtSum += unitWt;

               const planQty = Math.floor(ratePerMin * duration);
               const plannedLossQty = Math.floor(ratePerMin * plannedMins);
               const bdLossQty = Math.floor(ratePerMin * unplannedMins);

               totalPlanKg += (planQty * unitWt) / 1000;
               totalPlanningLossKg += (plannedLossQty * unitWt) / 1000;
               totalBDLossKg += (bdLossQty * unitWt) / 1000;
               totalGrossKg += ((row.achievedQty || 0) * unitWt) / 1000;
               
               const dailyRejQty = (row.qaRejQty ? Number(row.qaRejQty) : 0) + (row.qaStartQty ? Number(row.qaStartQty) : 0);
               totalRejectKg += (dailyRejQty * unitWt) / 1000;
            });

            // 🟢 දවසේ අවසානයට, එක මැෂින් එකකට විනාඩි 1440 බැගින් ලබා දී No Demand සෙවීම
            Object.values(machineAggregates).forEach((mac: any) => {
                totalTheoreticalMins += 1440;
                
                const noDemandM = Math.max(0, 1440 - mac.duration);
                const avgRate = mac.rateSum / mac.count;
                const avgWt = mac.wtSum / mac.count;
                
                totalNoDemandLossKg += (noDemandM * avgRate * avgWt) / 1000;
            });
         }
      });
   });

   const noDemandMins = Math.max(0, totalTheoreticalMins - totalShiftMins);
   const netPlannedTime = Math.max(0, totalShiftMins - totalPlannedMins); 
   const operatingTime = Math.max(0, netPlannedTime - totalUnplannedMins);

   const availability1 = netPlannedTime > 0 ? (operatingTime / netPlannedTime) * 100 : 0;
   const availability2 = totalTheoreticalMins > 0 ? (operatingTime / totalTheoreticalMins) * 100 : 0;

   const targetRunningKg = Math.max(0, totalPlanKg - totalPlanningLossKg - totalBDLossKg);
   const performance = targetRunningKg > 0 ? (totalGrossKg / targetRunningKg) * 100 : 0;

   const totalGoodKg = Math.max(0, totalGrossKg - totalRejectKg);
   const quality = totalGrossKg > 0 ? (totalGoodKg / totalGrossKg) * 100 : 0;

   const oee1 = (availability1 * performance * quality) / 10000; 
   const oee2 = (availability2 * performance * quality) / 10000; 
   
   const speedLossKg = Math.max(0, targetRunningKg - totalGrossKg);
   const maxPotentialKg = totalPlanKg + totalNoDemandLossKg; 

   return {
      availability: availability1, 
      performance, 
      quality, 
      oee1, oee2,
      lossDataKg: [
         { name: 'Max Potential', value: Number(maxPotentialKg.toFixed(1)), fill: THEME.charts.potential }, 
         { name: 'No Demand', value: -Number(totalNoDemandLossKg.toFixed(1)), fill: THEME.charts.noDemandLoss }, 
         { name: 'Plan Loss', value: -Number(totalPlanningLossKg.toFixed(1)), fill: THEME.charts.planningLoss }, 
         { name: 'Unplanned BD', value: -Number(totalBDLossKg.toFixed(1)), fill: THEME.charts.bdLoss }, 
         { name: 'Speed Loss', value: -Number(speedLossKg.toFixed(1)), fill: THEME.charts.speedLoss },  
         { name: 'Quality Loss', value: -Number(totalRejectKg.toFixed(1)), fill: THEME.charts.qualityLoss }, 
         { name: 'Good (Kg)', value: Number(totalGoodKg.toFixed(1)), fill: THEME.charts.goodUnits }   
      ],
      stats: {
         netPlannedTime, operatingTime, totalUnplannedMins, totalPlannedMins, noDemandMins,
         totalGoodKg, totalRejectKg, speedLossKg
      }
   };
 }, [data, startDate, endDate, machineType]);




// ============================================================================
  // 📈 TREND DATA CALCULATION (OEE 1 & OEE 2 Daily Trend)
  // ============================================================================
  const trendData = useMemo(() => {
   const dates = getDatesInRange(startDate, endDate);
   return dates.map(date => {
       let tTheoretical = 0, tShift = 0, tPlanM = 0, tUnplanM = 0;
       let tPlanQ = 0, tPlanLQ = 0, tBdLQ = 0, tGross = 0, tRej = 0;

       const types = machineType === 'ALL' ? ['IM', 'BM'] : [machineType];
       types.forEach(type => {
           const dayData = data[`${date}_${type}`];
           if(dayData && dayData.rows) {
               
               const uniqueMachines = new Set();

               dayData.rows.forEach((row: any) => {
                   const mId = row.machineId || row.machineName || row.machine || 'Machine_1';
                   uniqueMachines.add(mId);

                   const duration = calculateTimeDiff(row.startTime, row.endTime);
                   
                   tShift += duration;
                   
                   let pMins = 0, uMins = 0;
                   if(row.breakdowns) {
                       row.breakdowns.forEach((bd: any) => {
                           const m = calculateTimeDiff(bd.startTime, bd.endTime);
                           if (bd.category && bd.category.toLowerCase().includes('planning')) pMins += m;
                           else uMins += m;
                       });
                   }
                   tPlanM += pMins;
                   tUnplanM += uMins;

                   const rate = ((Number(row.qtyPerHour) || 0) * (Math.max(1, Number(row.cavities) || 1))) / 60;
                   tPlanQ += Math.floor(rate * duration);
                   tPlanLQ += Math.floor(rate * pMins);
                   tBdLQ += Math.floor(rate * uMins);
                   tGross += (row.achievedQty || 0);
                   tRej += ((row.qaRejQty ? Number(row.qaRejQty) : 0) + (row.qaStartQty ? Number(row.qaStartQty) : 0));
               });

               // 🟢 එක් මැෂින් එකකට විනාඩි 1440 (පැය 24) බැගින් Theoretical Time එකතු කිරීම
               tTheoretical += uniqueMachines.size * 1440;
           }
       });

       const netPlanT = Math.max(0, tShift - tPlanM);
       const opT = Math.max(0, netPlanT - tUnplanM);
       
       const a1 = netPlanT > 0 ? (opT / netPlanT) * 100 : 0;
       const a2 = tTheoretical > 0 ? (opT / tTheoretical) * 100 : 0;

       const targetQ = Math.max(0, tPlanQ - tPlanLQ - tBdLQ);
       const p = targetQ > 0 ? (tGross / targetQ) * 100 : 0;
       const q = tGross > 0 ? (Math.max(0, tGross - tRej) / tGross) * 100 : 0;

       return {
           date: new Date(date).getDate().toString(),
           OEE1: Number(((a1 * p * q) / 10000).toFixed(1)),
           OEE2: Number(((a2 * p * q) / 10000).toFixed(1))
       };
   });
}, [data, startDate, endDate, machineType]);



  // ============================================================================
  // 🖥️ 4. UI RENDER
  // ============================================================================
  return (
    <div className={`space-y-6 pb-12 animate-fade-in ${THEME.gpuClasses}`}>
      
      {/* --- FILTER BAR --- */}
      <div className={`${THEME.headerBg} p-4 rounded-3xl border ${THEME.borderLight} shadow-sm flex flex-col md:flex-row justify-between items-center gap-4`}>
         <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                   <Activity className="w-5 h-5" />
                </div>
                <div>
                   <h2 className={`text-lg font-black ${THEME.textMain} uppercase tracking-tight`}>Efficiency</h2>
                </div>
             </div>

             <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                <button 
                   onClick={() => setActiveSubTab('OVERVIEW')} 
                   className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'OVERVIEW' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                   <Activity className="w-3.5 h-3.5" /> Plant OEE
                </button>
                <button 
                   onClick={() => {
                       setActiveSubTab('MACHINE_ANALYTICS');
                       if (machineType === 'ALL') setMachineType('IM'); 
                   }} 
                   className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'MACHINE_ANALYTICS' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                   <Cpu className="w-3.5 h-3.5" /> Machine Analytics
                </button>
             </div>
         </div>

         <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
             
             {activeSubTab === 'MACHINE_ANALYTICS' && (
                 <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                     <button onClick={() => setAnalyticsTimeMode('MONTHLY')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${analyticsTimeMode === 'MONTHLY' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Monthly</button>
                     <button onClick={() => setAnalyticsTimeMode('DAILY')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${analyticsTimeMode === 'DAILY' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Daily</button>
                 </div>
             )}

             <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                {(activeSubTab === 'MACHINE_ANALYTICS' ? ['IM', 'BM'] : ['ALL', 'IM', 'BM']).map((t) => (
                   <button 
                     key={t} onClick={() => setMachineType(t as any)}
                     className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${machineType === t ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                   >
                      {t}
                   </button>
                ))}
             </div>
             
             {activeSubTab === 'MACHINE_ANALYTICS' && analyticsTimeMode === 'DAILY' ? (
                 <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-inner min-w-[140px] transition-colors">
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <select 
                       value={selectedDailyDate} 
                       onChange={e => setSelectedDailyDate(e.target.value)} 
                       className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-full appearance-none dark:[color-scheme:dark]"
                    >
                        {monthDates.map(d => (
                            <option key={d} value={d} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold">{d}</option>
                        ))}
                    </select>
                 </div>
             ) : (
                 <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <input 
                       type="month" 
                       value={selectedMonth} 
                       onChange={e => setSelectedMonth(e.target.value)} 
                       className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer dark:[color-scheme:dark]" 
                    />
                 </div>
             )}
         </div>
      </div>



             
{/* ============================================================================ */}
      {/* 🟢 TAB CONTENT RENDERING (OVERVIEW) */}
      {/* ============================================================================ */}
      
      {activeSubTab === 'OVERVIEW' ? (
          
          /* 🟢 ප්‍රධාන Horizontal Scrollbar එක සඳහා පමණක් overflow-x-auto ලබා දී ඇත. 
             Vertical Scroll එක බ්‍රව්සර් එක මගින් පාලනය වේ (Double scrollbars ඉවත් කර ඇත). */
             <div className={`w-full overflow-x-auto pb-6 ${THEME.scrollClasses}`}>
             
             {/* 🟢 1100px යන්න 1250px ලෙස වෙනස් කළා. එවිට Waterfall Chart එකට සහ Trend Chart එකට හොඳ පළලක් ලැබේ */}
               <div className="w-full min-w-[1300px] grid grid-cols-4 gap-6 transition-all duration-500 ease-in-out">
                
                {/* --- 1. BIG OEE GAUGES --- */}
                <div className="col-span-1 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-indigo-950 rounded-[2.5rem] p-6 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] border border-white/10 group">
                   <div className="absolute top-0 right-0 p-32 bg-indigo-500/30 rounded-full blur-[100px] group-hover:bg-indigo-400/40 transition-colors duration-700"></div>
                   <div className="absolute bottom-0 left-0 p-24 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-400/30 transition-colors duration-700"></div>
                   
                   <div className="relative z-10 w-full flex flex-col gap-6 h-full justify-evenly py-2">

                      {/* 🟢 OEE 1 Gauge */}
                      <div className="text-center flex flex-col items-center">
                          <h3 className="text-[14px] font-black text-indigo-200/80 uppercase tracking-[0.2em] mb-3 drop-shadow-md">Production OEE (Net)</h3>
                          <div className="relative w-44 h-44 mx-auto flex items-center justify-center drop-shadow-2xl">
                             <CircularProgress value={oeeData.oee1} color={oeeData.oee1 >= 85 ? "#10b981" : oeeData.oee1 >= 70 ? "#f59e0b" : "#ef4444"} size={176} strokeWidth={15} />
                             <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none tracking-tighter">
                                   {oeeData.oee1.toFixed(1)}<span className="text-xl text-white/70">%</span>
                                </span>
                                <span className="text-[12px] font-black text-indigo-300 uppercase mt-2 tracking-[0.2em] bg-black/20 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/5">OEE 1</span>
                             </div>
                          </div>
                      </div>

                      <div className="w-2/3 mx-auto h-px bg-white/10"></div>

                      {/* 🟢 OEE 2 Gauge */}
                      <div className="text-center flex flex-col items-center">
                          <h3 className="text-[14px] font-black text-purple-200/80 uppercase tracking-[0.2em] mb-3 drop-shadow-md">Plant Util. (TEEP)</h3>
                          <div className="relative w-44 h-44 mx-auto flex items-center justify-center drop-shadow-2xl">
                             <CircularProgress value={oeeData.oee2} color="#a855f7" size={176} strokeWidth={15} />
                             <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                                <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none tracking-tighter">
                                   {oeeData.oee2.toFixed(1)}<span className="text-xl text-white/70">%</span>
                                </span>
                                <span className="text-[12px] font-black text-purple-300 uppercase mt-2 tracking-[0.2em] bg-black/20 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/5">OEE 2</span>
                             </div>
                          </div>
                      </div>
                   </div>
                </div>

                {/* 🟢 දකුණු පස කොටස */}
                <div className="col-span-3 flex flex-col gap-6 w-full">
                    


                    {/* --- 2. 3 FACTORS --- */}
                    <div className="grid grid-cols-3 gap-6 w-full shrink-0">
                       <OEECard title="Availability" value={oeeData.availability} icon={<Zap className="w-6 h-6 text-white" />} color={THEME.availColor} details={[
                          { label: "M/C Planned Time", val: oeeData.stats.netPlannedTime >= 60 ? `${(oeeData.stats.netPlannedTime / 60).toFixed(1)} hr` : `${oeeData.stats.netPlannedTime.toFixed(0)} min` }, 
                          { label: "M/C Actual Run", val: oeeData.stats.operatingTime >= 60 ? `${(oeeData.stats.operatingTime / 60).toFixed(1)} hr` : `${oeeData.stats.operatingTime.toFixed(0)} min` },
                          { label: "Unplanned BD", val: oeeData.stats.totalUnplannedMins >= 60 ? `${(oeeData.stats.totalUnplannedMins / 60).toFixed(1)} hr` : `${oeeData.stats.totalUnplannedMins.toFixed(0)} min` },
                          { label: "Planned BD", val: oeeData.stats.totalPlannedMins >= 60 ? `${(oeeData.stats.totalPlannedMins / 60).toFixed(1)} hr` : `${oeeData.stats.totalPlannedMins.toFixed(0)} min` },
                          { label: "No Demand", val: oeeData.stats.noDemandMins >= 60 ? `${(oeeData.stats.noDemandMins / 60).toFixed(1)} hr` : `${oeeData.stats.noDemandMins.toFixed(0)} min` }
                       ]} />



                       <OEECard title="Performance" value={oeeData.performance} icon={<TrendingUp className="w-6 h-6 text-white" />} color={THEME.perfColor} details={[
                          { label: "Target (Good+Rej+Loss)", val: `${(oeeData.stats.totalGoodKg + oeeData.stats.totalRejectKg + oeeData.stats.speedLossKg).toFixed(0)} Kg` }, 
                          { label: "Speed Loss", val: `${oeeData.stats.speedLossKg.toFixed(0)} Kg` }
                       ]} />
                       <OEECard title="Quality" value={oeeData.quality} icon={<AlertOctagon className="w-6 h-6 text-white" />} color={THEME.qualColor} details={[
                          { label: "Good Units", val: `${oeeData.stats.totalGoodKg.toFixed(0)} Kg` }, 
                          { label: "Total Rejects", val: `${oeeData.stats.totalRejectKg.toFixed(0)} Kg` }
                       ]} />
                    </div>

                    {/* --- CHARTS ROW --- */}
                    <div className="grid grid-cols-3 gap-6 flex-1 w-full min-h-0">
                        
                       {/* --- 3. OEE TREND CHART --- */}
                       <div className={`col-span-2 ${THEME.cardBg} rounded-[2rem] p-6 border ${THEME.borderLight} shadow-xl shadow-indigo-500/5 min-h-[350px] w-full flex flex-col relative overflow-hidden group`}>
                          <div className="flex justify-between items-center mb-6 w-full shrink-0">
                              <h4 className={`font-black ${THEME.textMain} uppercase text-sm tracking-widest flex items-center gap-2`}>
                                 <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-500"><BarChart2 className="w-4 h-4"/></div> Daily Trend Analysis
                              </h4>
                              <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> OEE 1</span>
                                  <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> TEEP</span>
                              </div>
                          </div>
                          
                          {/* 🟢 Chart එක ඇතුළත තිබූ සියලුම scrollbars ඉවත් කර, දින 31ම එකම තිරයේ පෙන්වීමට 100% width ලබා දී ඇත */}
                          <div className="w-full flex-1">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                       <linearGradient id="colorOEE1" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={THEME.charts.trendFill} stopOpacity={0.6}/>
                                          <stop offset="95%" stopColor={THEME.charts.trendFill} stopOpacity={0}/>
                                       </linearGradient>
                                       <linearGradient id="colorOEE2" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={THEME.charts.trendFill2} stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor={THEME.charts.trendFill2} stopOpacity={0}/>
                                       </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} dy={10} interval={0} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} domain={[0, 100]} dx={-10} />
                                    
                                    <Tooltip 
                                          cursor={{stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4'}}
                                          content={({ active, payload, label }) => active && payload?.length ? (
                                             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs font-bold">
                                                <p className="text-slate-500 dark:text-slate-400 mb-1">Date : {label}</p>
                                                {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}
                                             </div>
                                          ) : null}
                                       />


                                    <Area type="monotone" name="OEE 1 (Prod)" dataKey="OEE1" stroke={THEME.charts.trendLine} strokeWidth={4} fillOpacity={1} fill="url(#colorOEE1)" activeDot={{r: 6, fill: '#fff', stroke: THEME.charts.trendLine, strokeWidth: 3 }} />
                                    <Area type="monotone" name="TEEP (Util)" dataKey="OEE2" stroke={THEME.charts.trendLine2} strokeWidth={3} fillOpacity={1} fill="url(#colorOEE2)" strokeDasharray="5 5" activeDot={{r: 5, fill: '#fff', stroke: THEME.charts.trendLine2, strokeWidth: 2 }} />
                                 </AreaChart>
                              </ResponsiveContainer>
                          </div>
                       </div>

                       {/* --- 4. LOSS WATERFALL CHART --- */}
                       <div className={`col-span-1 ${THEME.cardBg} rounded-[2rem] p-6 border ${THEME.borderLight} shadow-xl shadow-rose-500/5 min-h-[350px] w-full flex flex-col relative overflow-hidden group`}>
                          <h4 className={`font-black ${THEME.textMain} uppercase text-xs tracking-widest mb-6 flex items-center gap-2 shrink-0`}>
                             <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-500"><Layers className="w-4 h-4"/></div> Loss Waterfall (Kg)
                          </h4>
                          
                          <div className="w-full flex-1 overflow-hidden">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={oeeData.lossDataKg} layout="vertical" margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.15} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} width={85} />
                                   
                                   
                                    <Tooltip 
                                          cursor={{fill: 'rgba(148,163,184,0.05)'}}
                                          content={({ active, payload, label }) => active && payload?.length ? (
                                             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg text-xs font-bold text-slate-800 dark:text-white">
                                                <p className="text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                                                <p>Weight: {Math.abs(Number(payload[0].value)).toFixed(1)} Kg</p>
                                             </div>
                                          ) : null}
                                       />


                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                       {oeeData.lossDataKg.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} className="transition-all duration-300 hover:brightness-110" />
                                       ))}
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                          </div>
                       </div>
                    
                    </div>
                </div>
             </div>
          </div>

      ) : (





          
          /* 🟢 MACHINE ANALYTICS TAB CONTENT */
          <div className="transition-all duration-500 ease-in-out animate-fade-in-up">
              <MachineAnalytics 
                  data={data} 
                  startDate={startDate} 
                  endDate={endDate} 
                  machineFilter={machineType === 'ALL' ? 'IM' : machineType as 'IM' | 'BM'}
                  timeMode={analyticsTimeMode}
                  specificDate={selectedDailyDate}
              />
          </div>

      )}

    </div>
  );
};

// ============================================================================
// 🧩 6. HELPER COMPONENTS
// ============================================================================

const CircularProgress = ({ value, size, strokeWidth, color }: any) => {
   const radius = (size - strokeWidth) / 2;
   const circumference = radius * 2 * Math.PI;
   const offset = circumference - (value / 100) * circumference;

   return (
      <svg width={size} height={size} className="transform -rotate-90">
         <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" />
         <circle 
            cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" 
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} 
         />
      </svg>
   );
};

const OEECard = ({ title, value, icon, color, details }: any) => (
   <div className={`${THEME.cardBg} p-5 rounded-[2rem] border ${THEME.borderLight} shadow-sm flex flex-col justify-between w-full transition-all hover:shadow-lg hover:-translate-y-1 duration-300 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500`}></div>
      <div className="flex justify-between items-start relative z-10">
         <div>
            <p className={`text-[9px] font-black ${THEME.textMuted} uppercase tracking-[0.15em]`}>{title}</p>
            <h3 className={`text-[28px] font-black ${THEME.textMain} mt-1 leading-none tracking-tight`}>{value.toFixed(1)}%</h3>
         </div>
         <div className={`p-3 rounded-2xl shadow-lg ${color} shadow-current/30 text-white`}>
            {icon}
         </div>
      </div>
      
      <div className="mt-5 space-y-2 relative z-10">
         {details.map((d: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
               <span className={`${THEME.textMuted} font-bold text-[10px] uppercase tracking-wider`}>{d.label}</span>
               <span className={`${THEME.textMain} font-black text-[11px]`}>{d.val}</span>
            </div>
         ))}
      </div>
      
      <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative z-10">
         <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${Math.min(100, value)}%` }}></div>
      </div>
   </div>
);

export default OEETab;