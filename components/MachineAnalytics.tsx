import React, { useMemo } from 'react';
import { calculateMetrics, getDatesInRange, calculateTimeDiff } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { Cpu, Target, Clock, AlertTriangle, Zap, CheckCircle2, BarChart2 } from 'lucide-react';

// ============================================================================
// 🎨 1. THEME & COLOR CONFIGURATION (Compact & Premium UI)
// ============================================================================
const THEME = {
  cardBg: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
  borderLight: "border-slate-200/60 dark:border-slate-700/60",
  textMain: "text-slate-800 dark:text-white",
  textMuted: "text-slate-500 dark:text-slate-400",
  gpuClasses: "transform-gpu will-change-transform",

  colors: {
    oeeExcellent: '#10b981', // 85%+ (Emerald)
    oeeGood: '#f59e0b',      // 70%-85% (Amber)
    oeePoor: '#ef4444',      // <70% (Red)
  }
};

// 🟢 අලුත් Props: Daily/Monthly Mode සහ තෝරාගත් දිනය
interface Props {
  data: Record<string, any>;
  startDate: string;
  endDate: string;
  machineFilter: 'IM' | 'BM';
  timeMode: 'MONTHLY' | 'DAILY';
  specificDate: string;
}

// ============================================================================
// 🚀 2. MAIN COMPONENT
// ============================================================================
const MachineAnalytics: React.FC<Props> = ({ data, startDate, endDate, machineFilter, timeMode, specificDate }) => {

// ============================================================================
  // 🧠 3. DATA ENGINE: යන්ත්‍ර මට්ටමින් OEE ගණනය කිරීම
  // ============================================================================
  const machineStats = useMemo(() => {
    const stats: Record<string, any> = {};
    
    // 🟢 Daily නම් තේරූ දිනය පමණක් ගනී, නැතිනම් මුළු මාසයම ගනී
    const dates = timeMode === 'DAILY' ? [specificDate] : getDatesInRange(startDate, endDate);

    dates.forEach(date => {
        const type = machineFilter; // IM හෝ BM පමණයි
        const dayData = data[`${date}_${type}`];
        
        if (dayData && dayData.rows) {
            
            // 🟢 [FIX] අදාළ දවසේ වැඩ කළ යන්ත්‍ර සටහන් කරගැනීම
            const machinesWorkedToday = new Set<string>();

            dayData.rows.forEach((row: any) => {
                const mc = row.machine?.trim() || 'Unknown';
                
                machinesWorkedToday.add(mc);

                if (!stats[mc]) {
                    stats[mc] = {
                        machine: mc, type,
                        totalShiftMins: 0, 
                        totalPlannedMins: 0, 
                        totalUnplannedMins: 0,
                        unplannedEvents: 0,
                        totalPlanKg: 0, 
                        totalPlanningLossKg: 0, 
                        totalBDLossKg: 0,
                        totalGrossKg: 0, 
                        totalRejectKg: 0,
                        rowCount: 0,
                        totalTheoreticalMins: 0 // 🟢 අලුතින් එක් කරන ලදී
                    };
                }

                const unitWt = Number(row.unitWeight) || 0;
                const duration = calculateTimeDiff(row.startTime, row.endTime);

                stats[mc].totalShiftMins += duration;
                stats[mc].rowCount += 1;

                // --- Breakdowns වෙන් කිරීම ---
                let plannedMins = 0;
                let unplannedMins = 0;
                let unplannedEvents = 0;

                if (row.breakdowns) {
                    row.breakdowns.forEach((bd: any) => {
                        const mins = calculateTimeDiff(bd.startTime, bd.endTime);
                        if (bd.category && bd.category.toLowerCase().includes('planning')) {
                            plannedMins += mins;
                        } else {
                            unplannedMins += mins;
                            unplannedEvents += 1;
                        }
                    });
                }

                stats[mc].totalPlannedMins += plannedMins;
                stats[mc].totalUnplannedMins += unplannedMins;
                stats[mc].unplannedEvents += unplannedEvents;

                // --- Kg ගණනය කිරීම ---
                const ratePerMin = ((row.qtyPerHour || 0) * (Math.max(1, row.cavities || 1))) / 60;
                const planQty = Math.floor(ratePerMin * duration);
                const plannedLossQty = Math.floor(ratePerMin * plannedMins);
                const bdLossQty = Math.floor(ratePerMin * unplannedMins);

                stats[mc].totalPlanKg += (planQty * unitWt) / 1000;
                stats[mc].totalPlanningLossKg += (plannedLossQty * unitWt) / 1000;
                stats[mc].totalBDLossKg += (bdLossQty * unitWt) / 1000;
                stats[mc].totalGrossKg += ((row.achievedQty || 0) * unitWt) / 1000;
                
                const dailyRejQty = (row.qaRejQty ? Number(row.qaRejQty) : 0) + (row.qaStartQty ? Number(row.qaStartQty) : 0);
                stats[mc].totalRejectKg += (dailyRejQty * unitWt) / 1000;
            });

            // 🟢 [FIX] දවසේ අවසානයට, එදින වැඩ කළ සෑම අනන්‍ය යන්ත්‍රයකටම විනාඩි 1440 බැගින් එකතු කිරීම
            machinesWorkedToday.forEach((mc) => {
                if(stats[mc]) {
                    stats[mc].totalTheoreticalMins += 1440;
                }
            });
        }
    });

    // --- අවසාන OEE සහ ප්‍රතිශත ගණනය කිරීම ---
    const processedList = Object.values(stats).map(mc => {
        // 🟢 M/C Planned Time (Net Run Time)
        const netPlannedTime = Math.max(0, mc.totalShiftMins - mc.totalPlannedMins);
        
        // 🟢 M/C Actual Run Time (Availability Min / Operating Time)
        const operatingTime = Math.max(0, netPlannedTime - mc.totalUnplannedMins);
        
        const availability = netPlannedTime > 0 ? (operatingTime / netPlannedTime) * 100 : 0;

        const targetRunningKg = Math.max(0, mc.totalPlanKg - mc.totalPlanningLossKg - mc.totalBDLossKg);
        const performance = targetRunningKg > 0 ? (mc.totalGrossKg / targetRunningKg) * 100 : 0;

        const totalGoodKg = Math.max(0, mc.totalGrossKg - mc.totalRejectKg);
        const quality = mc.totalGrossKg > 0 ? (totalGoodKg / mc.totalGrossKg) * 100 : 0;

        const oee = (availability * performance * quality) / 10000;

        // 🟢 [FIX] පේළි ගණන (rowCount * 720) වෙනුවට, නිවැරදිව Theoretical Mins වලින් Logged Mins අඩු කිරීම
        const noDemandMins = Math.max(0, mc.totalTheoreticalMins - mc.totalShiftMins);

        return {
            ...mc,
            availability, performance, quality, oee,
            targetRunningKg, totalGoodKg,
            netPlannedTime, operatingTime, noDemandMins
        };
    });

    // 🟢 යන්ත්‍රයේ නම (Machine Name) අනුව අකාරාදී හා සංඛ්‍යාත්මකව (IM 01, IM 02...) පිළිවෙලට පෙළගැස්වීම
    return processedList.sort((a, b) => a.machine.localeCompare(b.machine, undefined, { numeric: true, sensitivity: 'base' }));

  }, [data, startDate, endDate, machineFilter, timeMode, specificDate]);

  


// ============================================================================
  // 🖥️ 4. UI RENDER (තිරය නිර්මාණය)
  // ============================================================================
  
  if (machineStats.length === 0) {
    return (
        <div className="p-12 mt-4 text-center border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-[2rem]">
           <div className="flex justify-center mb-3"><Cpu className="w-8 h-8 text-slate-400 opacity-50" /></div>
           <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No Production Data Available for {timeMode === 'DAILY' ? specificDate : `${machineFilter} Machines`}</p>
        </div>
    );
}

return (
  // 🟢 'max-h' වෙනුවට 'h-[calc(100vh-240px)]' යොදා ඇත. එමගින් Container එක තිරයේ යටටම විහිදී Scrollbar එක යටම Freeze වේ.
  <div className={`w-full h-[calc(100vh-240px)] overflow-auto custom-scrollbar pb-4 ${THEME.gpuClasses}`}>
      <div className="min-w-[1000px] pr-2">

          {/* --- MACHINE DETAILS GRID (Chart එක ඉවත් කර ඇත, 5 Columns) --- */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
                {machineStats.map((mc, idx) => {
                    const oeeColor = mc.oee >= 85 ? 'text-emerald-500' : mc.oee >= 70 ? 'text-amber-500' : 'text-rose-500';
                    const oeeBg = mc.oee >= 85 ? 'bg-emerald-50 dark:bg-emerald-500/10' : mc.oee >= 70 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10';

                    return (
                        <div key={idx} className={`${THEME.cardBg} rounded-2xl p-4 md:p-5 border ${THEME.borderLight} shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 group flex flex-col`}>
                            
                            {/* Header (Font size මදක් ලොකු කර ඇත) */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`text-base font-black ${THEME.textMain} leading-tight truncate max-w-[120px]`} title={mc.machine}>{mc.machine}</h3>
                                </div>
                                <div className={`p-1.5 rounded-lg ${oeeBg} ${oeeColor} shadow-sm`}><Cpu className="w-4 h-4" /></div>
                            </div>

                            {/* Circular OEE Score (Font size ලොකු කර ඇත: text-4xl) */}
                            <div className="flex items-center justify-center mb-5">
                                <div className="text-center">
                                    <span className={`text-4xl font-black tracking-tighter ${oeeColor}`}>{mc.oee.toFixed(1)}<span className="text-xl opacity-80">%</span></span>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${THEME.textMuted}`}>OEE Score</p>
                                </div>
                            </div>

                            {/* Key Stats (A, P, Q) */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <MiniStat label="Avail" value={mc.availability} color="text-amber-500" />
                                <MiniStat label="Perf" value={mc.performance} color="text-indigo-500" />
                                <MiniStat label="Qual" value={mc.quality} color="text-rose-500" />
                            </div>

                            <div className={`w-full h-px ${THEME.borderLight} my-3 opacity-50`} />

                            

                            {/* Detailed Analytics (Icons සහ Font මදක් ලොකු කර ඇත) */}
                            <div className="space-y-2 mt-auto">
                                <DetailRow icon={<Target className="w-3.5 h-3.5 text-slate-400"/>} label="Target Run" value={`${mc.targetRunningKg.toFixed(0)} Kg`} />
                                <DetailRow icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>} label="Good Achv" value={`${mc.totalGoodKg.toFixed(0)} Kg`} />
                                
                                <div className={`w-full h-px ${THEME.borderLight} my-2.5 opacity-30`} />

                                <DetailRow icon={<Clock className="w-3.5 h-3.5 text-indigo-400"/>} label="M/C Planned Time" value={mc.netPlannedTime >= 60 ? `${(mc.netPlannedTime / 60).toFixed(1)} hr` : `${mc.netPlannedTime.toFixed(0)} min`} />
                                <DetailRow icon={<Zap className="w-3.5 h-3.5 text-amber-500"/>} label="M/C Actual Run Time" value={mc.operatingTime >= 60 ? `${(mc.operatingTime / 60).toFixed(1)} hr` : `${mc.operatingTime.toFixed(0)} min`} />
                                
                                <DetailRow icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500"/>} label="Unplanned BD" value={mc.totalUnplannedMins >= 60 ? `${(mc.totalUnplannedMins / 60).toFixed(1)} hr (${mc.unplannedEvents})` : `${mc.totalUnplannedMins.toFixed(0)} min (${mc.unplannedEvents})`} isAlert={mc.totalUnplannedMins > 0} />
                                
                                {mc.totalPlannedMins > 0 && (
                                    <DetailRow icon={<Clock className="w-3.5 h-3.5 text-amber-500"/>} label="Planned Downtime" value={mc.totalPlannedMins >= 60 ? `${(mc.totalPlannedMins / 60).toFixed(1)} hr` : `${mc.totalPlannedMins.toFixed(0)} min`} />
                                )}

                                {mc.noDemandMins > 0 && (
                                    <DetailRow icon={<Clock className="w-3.5 h-3.5 text-slate-500"/>} label="No Demand" value={mc.noDemandMins >= 60 ? `${(mc.noDemandMins / 60).toFixed(1)} hr` : `${mc.noDemandMins.toFixed(0)} min`} />
                                )}
                            </div>



                        </div>
                    );
                })}
            </div>

        </div>
    </div>
  );
};


// ============================================================================
// 🧩 5. HELPER COMPONENTS (Adjusted Font Sizes)
// ============================================================================

const MiniStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1.5 md:p-2 text-center border border-slate-100 dark:border-slate-700/50">
        <p className={`text-[11px] md:text-xs font-black ${color} leading-none`}>{value.toFixed(0)}%</p>
        <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${THEME.textMuted}`}>{label}</p>
    </div>
);

const DetailRow = ({ icon, label, value, isAlert = false }: { icon: any, label: string, value: string | number, isAlert?: boolean }) => (
    <div className="flex justify-between items-center text-[10px] md:text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
            {icon} <span>{label}</span>
        </div>
        <span className={`font-black ${isAlert ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded' : THEME.textMain}`}>
            {value}
        </span>
    </div>
);

export default MachineAnalytics;