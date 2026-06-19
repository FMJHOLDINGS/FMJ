import React, { useState, useMemo } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import { Calendar, CheckSquare, Activity, Table } from 'lucide-react';

import { calculateMetrics } from '../../utils';

// ============================================================================
// 🎨 1. THEME & COLORS CONFIGURATION 
// ============================================================================
const THEME = {
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200 dark:border-slate-800",
    textMain: "text-slate-800 dark:text-white",
    textMuted: "text-slate-500 dark:text-slate-400",
    tableHeadBg: "bg-slate-100 dark:bg-slate-800/50",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/30",
    gpuRender: "transform-gpu will-change-transform", // Zero-lag hardware acceleration
};

const CHART_COLORS = {
    plan: '#94a3b8',        // Slate for Plan
    achv: '#10b981',        // Emerald for Achievement
    shiftA: '#6366f1',      // Indigo (Shift A)
    shiftB: '#f59e0b',      // Amber (Shift B)
    rejIM_A: '#3b82f6',     // Blue (Rej IM A)
    rejBM_A: '#8b5cf6',     // Violet (Rej BM A)
    rejIM_B: '#f97316',     // Orange (Rej IM B)
    rejBM_B: '#ef4444',     // Red (Rej BM B)
};

// ============================================================================
// 🧠 2. DATA PROCESSING HOOK (Zero-Lag Calculations with Fixed Keys & Future Cutoff)
// ============================================================================
const useSummaryCalculations = (rawData: any, kpiData: any, withPreform: boolean, selectedMonth: string) => {
    return useMemo(() => {
        if (!rawData) return { chartData: [], summaryTable: {} };

        const elecData = kpiData?.electricity || {};
        const waterData = kpiData?.water || {};
        const rejData = kpiData?.rejections || {};
        const absData = kpiData?.absenteeism || {};
        const laborData = kpiData?.labor || {};

        const monthPrefix = selectedMonth || new Date().toLocaleDateString('en-CA').substring(0, 7);
        
        // අදාළ මාසයේ දින ගණන නිවැරදිව ලබාගැනීම (28, 30, හෝ 31)
        const daysInMonth = new Date(Number(monthPrefix.split('-')[0]), Number(monthPrefix.split('-')[1]), 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

        // 🟢 P vs A සහ Productivity සඳහා (Filtered)
        let cumPlanA_Filtered = 0, cumAchvA_Filtered = 0;
        let cumPlanB_Filtered = 0, cumAchvB_Filtered = 0;
        
        // 🟢 Electricity, Water සහ Rejections සඳහා (Total - හැමවිටම Preform ඇතුළත් වේ)
        let cumAchvA_Total = 0, cumAchvB_Total = 0;
        let cumAchvA_IM = 0, cumAchvB_IM = 0;
        let cumAchvA_BM = 0, cumAchvB_BM = 0;

        let cumMhA = 0, cumMhB = 0;
        let cumElecA = 0, cumElecB = 0;
        let cumWaterA = 0, cumWaterB = 0;
        let cumRejIM_A = 0, cumRejBM_A = 0, cumRejIM_B = 0, cumRejBM_B = 0;
        let cumAbsA = 0, cumAllocA = 0, cumAbsB = 0, cumAllocB = 0;


        
       // 🟢 අනාගත දින බ්ලොක් කරන නීතිය සම්පූර්ණයෙන්ම ඉවත් කර ඇත
       let latestTotals: any = null;

       const chartData = days.map(day => {
           const dateStr = `${monthPrefix}-${day}`;

           // දවසේ Filtered සහ Total අගයන්
           let planA_Filtered = 0, planB_Filtered = 0;
           let prodA_Filtered = 0, prodB_Filtered = 0;
           let prodA_Total = 0, prodB_Total = 0;
           
           let prodA_IM = 0, prodB_IM = 0;
           let prodA_BM = 0, prodB_BM = 0;

           // 🟢 අලුතින් එකතු කරන Rejection විචල්‍යයන්
           let rejA_IM = 0, rejA_BM = 0;
           let rejB_IM = 0, rejB_BM = 0;

           const supData = rawData[`${dateStr}_SUPERVISORS`] || {};
           const dayTeam = supData.day || 'Shift-A';
           const nightTeam = supData.night || 'Shift-B';

           // ====================================================================
           // 🟢 FIX: KPIPvsALojic හි ඇති 100% නිවැරදි Logic එකම මෙහි යොදා ඇත
           // ====================================================================
           const getProductType = (row: any) => {
               const pType = (row.productType || '').toString().toLowerCase();
               const logName = (row.product || row.itemName || '').toString().trim().toLowerCase();
               if (pType.includes('preform') || pType.includes('p/f') || logName.includes('preform') || logName.includes('p/f')) return 'Preform';
               if (pType.includes('cap') || logName.includes('cap')) return 'Cap';
               return 'Preform'; 
           };

           const getAdjustedMetrics = (row: any) => {
               const m = calculateMetrics(row);
               let planningMins = 0;
               (row.breakdowns || []).forEach((bd: any) => {
                   if (bd.startTime && bd.endTime && bd.category) {
                       const [sh, sm] = bd.startTime.split(':').map(Number);
                       const [eh, em] = bd.endTime.split(':').map(Number);
                       let mins = (eh * 60 + em) - (sh * 60 + sm);
                       if (mins < 0) mins += 1440; // රාත්‍රී මුරය සඳහා හැඩගැස්වීම
                       if (mins > 0 && bd.category.toLowerCase().includes('planning')) {
                           planningMins += mins;
                       }
                   }
               });

               const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
               const planningLossQty = Math.floor(ratePerMin * planningMins);

               m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
               const itemWeight = Number(row.unitWeight || row.weight || 0);
               
               // හරියටම Kg අගය ගණනය කිරීම (Error ආවත් වැඩ කරයි)
               m.planKg = Number(((m.planQty * itemWeight) / 1000).toFixed(2));
               m.achievedKg = m.achievedKg || Number(((Number(row.achievedQty || 0) * itemWeight) / 1000).toFixed(2));
               
               return m;
           };

// ====================================================================
           // 🟢 WITH PREFORM LOGIC
           // ====================================================================


           const processRow = (row: any, machineType: 'IM' | 'BM') => {
            const isPreform = getProductType(row) === 'Preform';
            const metrics = getAdjustedMetrics(row);
            
            const achvKg = metrics.achievedKg || 0;
            const pKg = metrics.planKg || 0;

            // 🟢 පේළියෙන්ම (Row) Rejection Kg ගණනය කිරීම
            const rQty = Number(row.qaRejQty !== undefined ? row.qaRejQty : row.qtyReject || 0);
            const sQty = Number(row.qaStartQty !== undefined ? row.qaStartQty : row.qtyStartup || 0);
            const unitWt = Number(row.unitWeight || row.weight || 0);
            const rowRejKg = ((rQty + sQty) * unitWt) / 1000;

            let isShiftA = false;

            if (row.shift === 'day') isShiftA = (dayTeam === 'Shift-A');
            else isShiftA = (nightTeam === 'Shift-A');

            // 🔴 1. TOTAL අගයන් (Rejection Kg ද එකතු කර ඇත)
            if (isShiftA) {
                prodA_Total += achvKg;
                if (machineType === 'IM') { prodA_IM += achvKg; rejA_IM += rowRejKg; } 
                else { prodA_BM += achvKg; rejA_BM += rowRejKg; }
            } else {
                prodB_Total += achvKg;
                if (machineType === 'IM') { prodB_IM += achvKg; rejB_IM += rowRejKg; } 
                else { prodB_BM += achvKg; rejB_BM += rowRejKg; }
            }



            // 🔴 2. P vs A සඳහා පමණක් බලපාන FILTERED අගයන්
            // 🟢 අලුත් වෙනස: BM යන්ත්‍රයේ කිසිදු දත්තයක් අයින් නොකරයි. IM යන්ත්‍රයේදී පමණක් Preform පෙරහන් කරයි.
            if (machineType === 'IM' && !withPreform && isPreform) {
                return; 
            }

            if (isShiftA) { 
                prodA_Filtered += achvKg; 
                planA_Filtered += pKg; 
            } else { 
                prodB_Filtered += achvKg; 
                planB_Filtered += pKg; 
            }
        };



           (rawData[`${dateStr}_IM`]?.rows || []).forEach((r: any) => processRow(r, 'IM'));
           (rawData[`${dateStr}_BM`]?.rows || []).forEach((r: any) => processRow(r, 'BM'));

           // Cumulative අගයන් යාවත්කාලීන කිරීම
           cumPlanA_Filtered += planA_Filtered; cumAchvA_Filtered += prodA_Filtered;
           cumPlanB_Filtered += planB_Filtered; cumAchvB_Filtered += prodB_Filtered;

           cumAchvA_Total += prodA_Total; cumAchvB_Total += prodB_Total;
           cumAchvA_IM += prodA_IM; cumAchvB_IM += prodB_IM;
           cumAchvA_BM += prodA_BM; cumAchvB_BM += prodB_BM;

           // --- 2. Man Hours (Productivity) ---
           const workersA = Number(laborData[dateStr]?.['Shift-A'] || laborData[dateStr]?.shiftA || 0);
           const workersB = Number(laborData[dateStr]?.['Shift-B'] || laborData[dateStr]?.shiftB || 0);
           cumMhA += (workersA * 12); cumMhB += (workersB * 12);

           const prodCumA = cumMhA > 0 ? (cumAchvA_Filtered / cumMhA) : 0;
           const prodCumB = cumMhB > 0 ? (cumAchvB_Filtered / cumMhB) : 0;

           // --- 3 & 4. Electricity & Water ---
           cumElecA += Number(elecData[dateStr]?.['Shift-A'] || elecData[dateStr]?.shiftA || 0);
           cumElecB += Number(elecData[dateStr]?.['Shift-B'] || elecData[dateStr]?.shiftB || 0);
           const elecCumA = cumAchvA_Total > 0 ? (cumElecA / cumAchvA_Total) : 0;
           const elecCumB = cumAchvB_Total > 0 ? (cumElecB / cumAchvB_Total) : 0;

           cumWaterA += Number(waterData[dateStr]?.['Shift-A'] || waterData[dateStr]?.shiftA || 0);
           cumWaterB += Number(waterData[dateStr]?.['Shift-B'] || waterData[dateStr]?.shiftB || 0);
           const waterCumA = cumAchvA_Total > 0 ? ((cumWaterA * 1000) / cumAchvA_Total) : 0;
           const waterCumB = cumAchvB_Total > 0 ? ((cumWaterB * 1000) / cumAchvB_Total) : 0;

           // --- 5. Rejections ---
           
           cumRejIM_A += rejA_IM;
           cumRejBM_A += rejA_BM;
           cumRejIM_B += rejB_IM;
           cumRejBM_B += rejB_BM;

           const rejPerIM_A = cumAchvA_IM > 0 ? (cumRejIM_A / cumAchvA_IM) * 100 : 0;
           const rejPerBM_A = cumAchvA_BM > 0 ? (cumRejBM_A / cumAchvA_BM) * 100 : 0;
           const rejPerIM_B = cumAchvB_IM > 0 ? (cumRejIM_B / cumAchvB_IM) * 100 : 0;
           const rejPerBM_B = cumAchvB_BM > 0 ? (cumRejBM_B / cumAchvB_BM) * 100 : 0;

           const rejPerA_Total = cumAchvA_Total > 0 ? ((cumRejIM_A + cumRejBM_A) / cumAchvA_Total) * 100 : 0;
           const rejPerB_Total = cumAchvB_Total > 0 ? ((cumRejIM_B + cumRejBM_B) / cumAchvB_Total) * 100 : 0;

           // --- 6. Absenteeism ---
           cumAbsA += Number(absData[dateStr]?.['Shift-A']?.absent || absData[dateStr]?.shiftA?.absent || 0);
           cumAllocA += Number(absData[dateStr]?.['Shift-A']?.allocated || absData[dateStr]?.shiftA?.allocated || 0);
           cumAbsB += Number(absData[dateStr]?.['Shift-B']?.absent || absData[dateStr]?.shiftB?.absent || 0);
           cumAllocB += Number(absData[dateStr]?.['Shift-B']?.allocated || absData[dateStr]?.shiftB?.allocated || 0);

           const absCumA = cumAllocA > 0 ? (cumAbsA / cumAllocA) * 100 : 0;
           const absCumB = cumAllocB > 0 ? (cumAbsB / cumAllocB) * 100 : 0;

           const dataRow = {
               day, 
               planTot: planA_Filtered + planB_Filtered, 
               achvTot: prodA_Filtered + prodB_Filtered, 
               cumPlanA: cumPlanA_Filtered, cumAchvA: cumAchvA_Filtered, 
               cumPlanB: cumPlanB_Filtered, cumAchvB: cumAchvB_Filtered, 
               prodCumA, prodCumB, elecCumA, elecCumB, waterCumA, waterCumB,
               rejPerIM_A, rejPerBM_A, rejPerIM_B, rejPerBM_B,
               rejPerA_Total, rejPerB_Total, absCumA, absCumB
           };

           // 🟢 මුළු මාසයේම අවසානයට එකතු වන දත්ත (Grand Total) Table එකට ලබා දීමට
           latestTotals = dataRow;

           return dataRow;
       });





        // අලුත්ම දත්ත නොමැතිනම් පලමු දිනයේ දත්ත ගනී
        if (!latestTotals) latestTotals = chartData[0] || {};

        // 🟢 FIX: P vs A සඳහා Plan සහ Achievement අගයන්ද ලබා දීම
        const pVsA_A_Per = ((latestTotals.cumAchvA / (latestTotals.cumPlanA || 1)) * 100).toFixed(1);
        const pVsA_B_Per = ((latestTotals.cumAchvB / (latestTotals.cumPlanB || 1)) * 100).toFixed(1);

        const summaryTable = {
            // 🟢 Achievement අගයන් Shift A (Indigo) සහ Shift B (Amber) වර්ණවලින් සකසා ඇත
            pVsA_A: (
                <span>
                    <span className="text-red-500 dark:text-red-400">{latestTotals.cumPlanA?.toFixed(0) || 0}</span> / 
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold"> {latestTotals.cumAchvA?.toFixed(0) || 0} </span> 
                    <span className="text-emerald-500 dark:text-emerald-400 font-black">({pVsA_A_Per}%)</span>
                </span>
            ),
            pVsA_B: (
                <span>
                    <span className="text-red-500 dark:text-red-400">{latestTotals.cumPlanB?.toFixed(0) || 0}</span> / 
                    <span className="text-amber-600 dark:text-amber-400 font-bold"> {latestTotals.cumAchvB?.toFixed(0) || 0} </span> 
                    <span className="text-emerald-500 dark:text-emerald-400 font-black">({pVsA_B_Per}%)</span>
                </span>
            ),



            prodA: latestTotals.prodCumA?.toFixed(2) || '0.00',
            prodB: latestTotals.prodCumB?.toFixed(2) || '0.00',
            elecA: latestTotals.elecCumA?.toFixed(2) || '0.00',
            elecB: latestTotals.elecCumB?.toFixed(2) || '0.00',
            waterA: latestTotals.waterCumA?.toFixed(2) || '0.00',
            waterB: latestTotals.waterCumB?.toFixed(2) || '0.00',
            rejIM_A: `${latestTotals.rejPerIM_A?.toFixed(2) || '0.00'}%`,
            rejIM_B: `${latestTotals.rejPerIM_B?.toFixed(2) || '0.00'}%`,
            rejBM_A: `${latestTotals.rejPerBM_A?.toFixed(2) || '0.00'}%`,
            rejBM_B: `${latestTotals.rejPerBM_B?.toFixed(2) || '0.00'}%`,
            absA: `${latestTotals.absCumA?.toFixed(2) || '0.00'}%`,
            absB: `${latestTotals.absCumB?.toFixed(2) || '0.00'}%`,
        };

        return { chartData, summaryTable };
    }, [rawData, kpiData, withPreform, selectedMonth]);
};



// ============================================================================
// 📊 3. REUSABLE CHART COMPONENTS (එළියට ගෙන ඇත - Flickering සදහටම නවතී!)
// ============================================================================
const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="p-2 rounded-xl border shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-[10px] font-bold border-slate-200 dark:border-slate-700">
            <div className="mb-1 text-slate-500 uppercase">Day {label}</div>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }}></span>
                    <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
                    <span style={{ color: entry.color }}>{Number(entry.value).toFixed(1)}</span>
                </div>
            ))}
        </div>
    );
};

// 🟢 data අගය prop එකක් ලෙස ලබාගැනීමට සකසා ඇත
const BaseChart = ({ data, children }: any) => (
    <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
            <XAxis dataKey="day" tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickCount={5} tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
            {children}
        </ComposedChart>
    </ResponsiveContainer>
);

// ============================================================================
// 🖥️ 4. MAIN SUMMARY COMPONENT
// ============================================================================
// 🟢 selectedMonth අලුතින් Props වලට එකතු කර ඇත
const KPISummary = ({ data, kpiData, selectedMonth }: { data: any, kpiData: any, selectedMonth: string }) => {
    
    // Header Controls State (selectedMonth state එක මෙතැනින් ඉවත් කර ඇත)
    const [withPreform, setWithPreform] = useState(false);

    const { chartData, summaryTable } = useSummaryCalculations(data, kpiData, withPreform, selectedMonth) as any;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`w-full pb-10 ${THEME.gpuRender}`}>
            
            {/* 🟢 MAIN HORIZONTAL SCROLL CONTAINER */}
            <div className="w-full overflow-x-auto custom-scrollbar pb-6">
                <div className="min-w-[1000px] space-y-6 pr-4">
                    
                    {/* --- 1. HEADER & CONTROLS --- */}
                    <div className={`flex justify-between items-center p-4 rounded-3xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><Activity size={20} /></div>
                            <h2 className={`text-lg font-black uppercase tracking-tight ${THEME.textMain}`}>Executive KPI Summary</h2>
                        </div>
                        
                        <div className="flex items-center gap-6">


                           {/* With Preform Toggle */}
                           <label 
                                className="flex items-center gap-2 cursor-pointer group"
                                onClick={(e) => {
                                    e.preventDefault(); // 🟢 අනවශ්‍ය Click වීම් නවතයි
                                    setWithPreform(prev => !prev);
                                }}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${withPreform ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {withPreform && <CheckSquare size={14} className="text-white" />}
                                </div>
                                <span className={`text-xs font-black uppercase ${THEME.textMuted} group-hover:text-indigo-500`}>With Preform</span>
                            </label>
                        </div>
                    </div>

                    {/* --- 2. SUMMARY TABLE --- */}
                    <div className={`rounded-3xl border shadow-sm overflow-hidden ${THEME.cardBg} ${THEME.cardBorder}`}>
                        <div className={`px-4 py-2 border-b flex items-center gap-2 ${THEME.tableHeadBg} ${THEME.cardBorder}`}>
                            <Table size={14} className="text-indigo-500" />
                            <h3 className={`text-xs font-black uppercase tracking-widest ${THEME.textMain}`}>Monthly Cumulative Summary</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`border-b ${THEME.cardBorder}`}>
                                    <th className={`p-2 pl-4 text-[10px] font-black uppercase ${THEME.textMuted}`}>KPI Parameter</th>
                                    <th className={`p-2 text-center text-[10px] font-black uppercase text-indigo-500`}>Shift A</th>
                                    <th className={`p-2 text-center text-[10px] font-black uppercase text-amber-500`}>Shift B</th>
                                </tr>
                            </thead>
                            <tbody className={`text-[11px] font-bold ${THEME.textMain}`}>
                                {[
                                    { label: 'P vs A (%)', a: summaryTable.pVsA_A, b: summaryTable.pVsA_B },
                                    { label: 'Productivity (Cum. Kg/MH)', a: summaryTable.prodA, b: summaryTable.prodB },
                                    { label: 'Electricity (Cu. U/kg)', a: summaryTable.elecA, b: summaryTable.elecB },
                                    { label: 'Water (Cu. Ltr/Kg)', a: summaryTable.waterA, b: summaryTable.waterB },
                                    { label: 'Rejection IM (Cu. Rej IM %)', a: summaryTable.rejIM_A, b: summaryTable.rejIM_B },
                                    { label: 'Rejection BM (Cu. Rej BM %)', a: summaryTable.rejBM_A, b: summaryTable.rejBM_B },
                                    { label: 'Absent (Cu. Absent %)', a: summaryTable.absA, b: summaryTable.absB },
                                ].map((row, i) => (
                                    <tr key={i} className={`border-b last:border-0 ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                        <td className="p-2 pl-4">{row.label}</td>
                                        <td className="p-2 text-center text-indigo-600 dark:text-indigo-400">{row.a || '-'}</td>
                                        <td className="p-2 text-center text-amber-600 dark:text-amber-400">{row.b || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* --- 3. CHARTS GRID (3 Rows x 2 Columns) --- */}
                    <div className="grid grid-cols-2 gap-4">
                        
                        {/* 1. Plan vs Achievement */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                        <h3 className="text-xs font-black uppercase mb-3 text-green-600 dark:text-green-400">1. Plan vs Achievement (Total)</h3>
                            {/* 🟢 BaseChart වෙත data යවා ඇත */}
                            <BaseChart data={chartData}>
                                <Bar isAnimationActive={false} dataKey="planTot" name="Plan Kg" fill={CHART_COLORS.plan} radius={[2, 2, 0, 0]} />
                                <Bar isAnimationActive={false} dataKey="achvTot" name="Achv Kg" fill={CHART_COLORS.achv} radius={[2, 2, 0, 0]} />
                            </BaseChart>
                        </div>

                        {/* 2. Productivity */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                            <h3 className="text-xs font-black uppercase mb-3 text-blue-400 dark:text-blue-400">2. Productivity (Cum. Kg/MH)</h3>
                            <BaseChart data={chartData}>
                                <Line isAnimationActive={false} type="monotone" dataKey="prodCumA" name="Shift A" stroke={CHART_COLORS.shiftA} strokeWidth={2} dot={{r:2}} />
                                <Line isAnimationActive={false} type="monotone" dataKey="prodCumB" name="Shift B" stroke={CHART_COLORS.shiftB} strokeWidth={2} dot={{r:2}} />
                            </BaseChart>
                        </div>

                        {/* 3. Electricity */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                            <h3 className="text-xs font-black uppercase mb-3 text-amber-600 dark:text-amber-400">3. Electricity (Cu. U/kg)</h3>
                            <BaseChart data={chartData}>
                                <Line isAnimationActive={false} type="monotone" dataKey="elecCumA" name="Shift A" stroke={CHART_COLORS.shiftA} strokeWidth={2} dot={{r:2}} />
                                <Line isAnimationActive={false} type="monotone" dataKey="elecCumB" name="Shift B" stroke={CHART_COLORS.shiftB} strokeWidth={2} dot={{r:2}} />
                            </BaseChart>
                        </div>

                        {/* 4. Water */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                            <h3 className="text-xs font-black uppercase mb-3 text-blue-600 dark:text-blue-600">4. Water (Cu. Ltr/Kg)</h3>
                            <BaseChart data={chartData}>
                                <Line isAnimationActive={false} type="monotone" dataKey="waterCumA" name="Shift A" stroke={CHART_COLORS.shiftA} strokeWidth={2} dot={{r:2}} />
                                <Line isAnimationActive={false} type="monotone" dataKey="waterCumB" name="Shift B" stroke={CHART_COLORS.shiftB} strokeWidth={2} dot={{r:2}} />
                            </BaseChart>
                        </div>

                        {/* 5. Rejection Chart */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                            <h3 className="text-xs font-black uppercase mb-3 text-red-600 dark:text-red-400">5. Rejection (Cu. Rej %)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                                    <XAxis dataKey="day" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={0} />
                                    <YAxis tickCount={5} tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                                    
                                    <Line isAnimationActive={false} type="monotone" dataKey="rejPerA_Total" name="Shift A" stroke={CHART_COLORS.shiftA} strokeWidth={2} dot={{r:2}} />
                                    <Line isAnimationActive={false} type="monotone" dataKey="rejPerB_Total" name="Shift B" stroke={CHART_COLORS.shiftB} strokeWidth={2} dot={{r:2}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 6. Absenteeism */}
                        <div className={`p-4 rounded-3xl border shadow-sm h-[280px] ${THEME.cardBg} ${THEME.cardBorder}`}>
                            <h3 className="text-xs font-black uppercase mb-3 text-orange-400 dark:text-orange-400">6. Absenteeism (Cu. Absent %)</h3>
                            <BaseChart data={chartData}>
                                <Line isAnimationActive={false} type="monotone" dataKey="absCumA" name="Shift A" stroke={CHART_COLORS.shiftA} strokeWidth={2} dot={{r:2}} />
                                <Line isAnimationActive={false} type="monotone" dataKey="absCumB" name="Shift B" stroke={CHART_COLORS.shiftB} strokeWidth={2} dot={{r:2}} />
                            </BaseChart>
                        </div>

                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default KPISummary;