import React, { useState, useMemo, useCallback } from 'react';
import { calculateMetrics } from '../utils';
import { FileDown, AlertTriangle, Calendar, Clock, Zap, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { downloadBreakdownSummaryExcel } from './BreakdownSummaryExcel';

// ============================================================================
// 1. 🎨 THEME CONFIGURATION
// ============================================================================
const THEME = {
    // --- Layout & Cards ---
    cardBg: "bg-white dark:bg-slate-800",
    cardBorder: "border-slate-200 dark:border-slate-700",
    textMain: "text-slate-800 dark:text-white",
    textMuted: "text-slate-400 dark:text-slate-500",
    inputBg: "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600",

    // --- Buttons ---
    btnExport: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30",
    btnIconWarning: "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/30",

    // --- Summary Blocks ---
    summaryTotalBd: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30",
    summaryEffLoss: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30",
    summaryGrandTotal: "bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-500/30",

    // --- Breakdowns Accordion ---
    accordionHeaderBg: "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900",
    accordionHeaderHover: "hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-800",
    tableHeaderBg: "bg-slate-50 dark:bg-slate-900/50",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
};

const PRIORITY_ORDER = [
    "BD Production", "BD Engineering", "Machine Settings", 
    "Cycle Time Deviation", "Mold Change Delay", "Absenteeism", "Power Failure"
];

interface Props {
    allData: Record<string, any>;
    initialDate: string;
}

// ============================================================================
// 2. 🧠 MAIN COMPONENT & LOGIC
// ============================================================================
const BreakdownSummary: React.FC<Props> = ({ allData, initialDate }) => {
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
    
    // 🟢 Preform Filter Checkbox State (Default is unticked/false)
    const [withPreform, setWithPreform] = useState(false); 

    // ============================================================================
    // 2.1 📦 HELPERS (භාණ්ඩ වර්ග හඳුනාගැනීම)
    // ============================================================================
    const getProductType = useCallback((row: any) => {
        const pType = (row.productType || '').toString().toLowerCase();
        const logName = (row.product || row.itemName || '').toString().trim().toLowerCase();
        if (pType.includes('preform') || pType.includes('p/f') || logName.includes('preform') || logName.includes('p/f')) return 'Preform';
        if (pType.includes('cap') || logName.includes('cap')) return 'Cap';
        return 'Preform'; 
    }, []); 

    // ============================================================================
    // 2.2 🧠 CORE METRICS CALCULATION (PLANNING DEDUCTION LOGIC)
    // ============================================================================
    const getAdjustedMetrics = useCallback((row: any) => {
        const m = calculateMetrics(row);
        let planningLossQty = 0;
        const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;

        (row.breakdowns || []).forEach((bd: any) => {
            if (bd.startTime && bd.endTime && bd.category) {
                const [sh, sm] = bd.startTime.split(':').map(Number);
                const [eh, em] = bd.endTime.split(':').map(Number);
                let mins = (eh * 60 + em) - (sh * 60 + sm);
                if (mins < 0) mins += 1440; 
                
                // Planning විනාඩි වලින් නැතිවූ Qty එක Breakdown log එකට සමානව හැදීම
                if (mins > 0 && bd.category.toLowerCase().includes('planning')) {
                    planningLossQty += Math.floor(ratePerMin * mins);
                }
            }
        });

        // 🟢 Planning Qty අඩු කර රවුම් කිරීම
        m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
        m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2)); 

        // 🟢 Math.max අයින් කර සෘණ අගයන්ට (Gain) ඉඩ ලබා දී රවුම් කිරීම
        const updatedTotalLoss = m.planQty - (row.achievedQty || 0);
        m.lostQty = updatedTotalLoss;
        m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2)); 

        return m;
    }, []);

    // ============================================================================
    // 2.3 📊 DATA AGGREGATION ENGINE (Optimized Single Pass)
    // ============================================================================
    const data = useMemo(() => {
        let effLossBM = 0;
        let effLossIM = 0;
        const bdList: any[] = [];
        const grouped: Record<string, any[]> = {};
        
        // 🟢 අලුත්: එකම හේතුව ඇති Breakdowns එකට එකතු කිරීම සඳහා Map එකක්
        const aggregationMap: Record<string, any> = {};

        ['IM', 'BM'].forEach((type) => {
            const rows = allData[`${selectedDate}_${type}`]?.rows || [];

            rows.forEach((row: any) => {
                // 🟢 PREFORM FILTER LOGIC: BM සඳහා අදාළ නැත. IM හිදී tick කර නැත්නම් Preform පේළිය අයින් කරයි.
                if (type === 'IM' && !withPreform) {
                    if (getProductType(row) === 'Preform') return; 
                }

                const m = getAdjustedMetrics(row);
                const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
                let rowBdKgTotal = 0;

                if (row.breakdowns) {
                    row.breakdowns.forEach((bd: any) => {
                        const catRaw = bd.category || '';
                        const catUpper = catRaw.toUpperCase().trim();
                        
                        // 🟢 SKIP LOGIC (Planning සහ Mold Change අනිවාර්යයෙන්ම අයින් කිරීම)
                        if (catUpper === "MOLD CHANGE" || catUpper === "PLANNED" || catRaw.toLowerCase().includes('planning')) {
                            return; 
                        }

                        if (bd.startTime && bd.endTime) {
                            const [sh, sm] = bd.startTime.split(':').map(Number);
                            const [eh, em] = bd.endTime.split(':').map(Number);
                            let mins = (eh * 60 + em) - (sh * 60 + sm);
                            if (mins < 0) mins += 1440;
                            
                            if (mins > 0) {
                                // 🟢 Breakdown Logs එකට 100% සමානව රවුම් කිරීම
                                const lQty = Math.floor(ratePerMin * mins);
                                const lKg = Number(((lQty * (row.unitWeight || 0)) / 1000).toFixed(2));
                                rowBdKgTotal += lKg;

                                const catStr = catRaw.trim() || 'Unknown';
                                const shiftStr = row.shift === 'day' ? 'Day' : 'Night';
                                const machineStr = row.machine || '-';
                                const prodStr = row.product || '-';
                                const reasonStr = bd.description || '-';

                                // 🟢 Unique Key එක සෑදීම (Category + Shift + Machine + Product + Reason)
                                const uniqueKey = `${catStr}_${shiftStr}_${machineStr}_${prodStr}_${reasonStr}`;

                                if (aggregationMap[uniqueKey]) {
                                    // 🟢 දැනටමත් එම පේළිය තිබේ නම්, කාලය සහ බර ඊට එකතු කරයි (Add කරයි)
                                    aggregationMap[uniqueKey].time += mins;
                                    aggregationMap[uniqueKey].weight += lKg;
                                } else {
                                    // 🟢 නොමැති නම් අලුතින් පේළියක් Map එකට එකතු කරයි
                                    aggregationMap[uniqueKey] = {
                                        cat: catStr,
                                        shift: shiftStr,
                                        machine: machineStr,
                                        time: mins,
                                        weight: lKg, 
                                        reason: reasonStr,
                                        prod: prodStr
                                    };
                                }
                            }
                        }
                    });
                }

                // 🟢 MAGIC FIX: Eff Loss = Total Lost Kg - Total Logged Breakdown Kg
                const exactEffLossKg = m.lostKg - rowBdKgTotal;
                if (type === 'IM') effLossIM += exactEffLossKg;
                else effLossBM += exactEffLossKg;
            });
        });

        // 🟢 Map එකෙහි එකතු වූ අවසන් පේළි ටික අරගෙන bdList එකට සහ grouped එකට දැමීම
        Object.values(aggregationMap).forEach((item: any) => {
            bdList.push(item);
            if (!grouped[item.cat]) grouped[item.cat] = [];
            grouped[item.cat].push(item);
        });

        const sortedCats = Object.keys(grouped).sort((a, b) => {
            const idxA = PRIORITY_ORDER.indexOf(a);
            const idxB = PRIORITY_ORDER.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        return { bdList, grouped, sortedCats, effLossBM, effLossIM };
    }, [allData, selectedDate, withPreform, getAdjustedMetrics, getProductType]);

    // --- HANDLERS ---
    const toggleCat = (cat: string) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

    const totalBreakdownWeight = data.bdList.reduce((sum, item) => sum + item.weight, 0);
    const totalEffLoss = data.effLossBM + data.effLossIM;
    const grandTotal = totalBreakdownWeight + totalEffLoss;
    const isEmpty = data.bdList.length === 0 && totalEffLoss === 0;

    // ============================================================================
    // 3. 🖥️ UI RENDER (Hardware Accelerated & Theme Applied)
    // ============================================================================
    return (
        <div className="space-y-6 animate-fade-in pb-10 transform-gpu">

            {/* --- HEADER --- */}
            <div className={`rounded-3xl p-6 shadow-xl border ${THEME.cardBg} ${THEME.cardBorder}`}>
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-lg ${THEME.btnIconWarning}`}>
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black uppercase tracking-tight ${THEME.textMain}`}>Breakdown Summary</h2>
                            <p className={`text-xs font-bold uppercase tracking-widest ${THEME.textMuted}`}>Daily Loss Analysis Report</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap justify-end">
                        
                        {/* 🟢 With Preform Checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm">
                            <input 
                                type="checkbox" 
                                checked={withPreform} 
                                onChange={(e) => setWithPreform(e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-indigo-600 rounded"
                            />
                            <span className={`text-xs font-bold uppercase tracking-widest ${THEME.textMain}`}>With Preform</span>
                        </label>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                            <div className={`relative flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-lg cursor-pointer hover:scale-105 transition-transform ${THEME.inputBg}`}>
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={`bg-transparent text-sm font-bold outline-none cursor-pointer uppercase dark:[color-scheme:dark] ${THEME.textMain}`}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => downloadBreakdownSummaryExcel(selectedDate, data, totalBreakdownWeight, totalEffLoss)}
                            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl hover:scale-105 ${THEME.btnExport}`}
                        >
                            <FileDown className="w-4 h-4" /> Download Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {isEmpty ? (
                <div className={`rounded-3xl p-16 text-center border shadow-lg ${THEME.cardBg} ${THEME.cardBorder}`}>
                    <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${THEME.textMuted}`} />
                    <p className={`text-lg font-bold mb-1 ${THEME.textMuted}`}>No Breakdown Data Found</p>
                    <p className={`text-sm opacity-70 ${THEME.textMuted}`}>Adjust the date or filters to view breakdowns.</p>
                </div>
            ) : (
                <>
                    {/* --- SUMMARY CARDS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 transform-gpu">
                        <div className={`rounded-2xl p-6 text-white shadow-xl ${THEME.summaryTotalBd}`}>
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <TrendingDown className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Total Breakdown</span>
                            </div>
                            <p className="text-3xl font-black">{totalBreakdownWeight.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                        <div className={`rounded-2xl p-6 text-white shadow-xl ${THEME.summaryEffLoss}`}>
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <Zap className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Efficiency Loss</span>
                            </div>
                            <p className="text-3xl font-black">{totalEffLoss.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                        <div className={`rounded-2xl p-6 text-white shadow-xl ${THEME.summaryGrandTotal}`}>
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <Clock className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Grand Total</span>
                            </div>
                            <p className="text-3xl font-black">{grandTotal.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                    </div>

                    {/* --- BREAKDOWN ACCORDIONS --- */}
                    <div className="space-y-4">
                        {data.sortedCats.map(catName => {
                            const items = data.grouped[catName];
                            const catWeight = items.reduce((sum: number, item: any) => sum + item.weight, 0);
                            const isExpanded = expandedCats[catName] !== false; // Default expanded

                            return (
                                <div key={catName} className={`rounded-2xl border shadow-lg overflow-hidden transform-gpu will-change-transform ${THEME.cardBg} ${THEME.cardBorder}`}>
                                    <button
                                        onClick={() => toggleCat(catName)}
                                        className={`w-full flex items-center justify-between p-5 transition-all ${THEME.accordionHeaderBg} ${THEME.accordionHeaderHover}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                                            <h3 className={`text-lg font-black uppercase tracking-tight ${THEME.textMain}`}>{catName}</h3>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${THEME.inputBg} ${THEME.textMuted}`}>{items.length} items</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-black text-rose-500">{catWeight.toFixed(2)} kg</span>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-sm">
                                                <thead className={`font-bold uppercase text-xs border-b ${THEME.tableHeaderBg} ${THEME.cardBorder} ${THEME.textMuted}`}>
                                                    <tr>
                                                        <th className="px-5 py-3 text-left">Shift</th>
                                                        <th className="px-3 py-3 text-left">Machine</th>
                                                        <th className="px-3 py-3 text-center">Time</th>
                                                        <th className="px-3 py-3 text-right text-rose-500">Weight (kg)</th>
                                                        <th className="px-3 py-3 text-left">Product</th>
                                                        <th className="px-5 py-3 text-left">Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y text-slate-600 dark:text-slate-300 ${THEME.cardBorder}`}>
                                                    {items.map((item: any, idx: number) => (
                                                        <tr key={idx} className={`transition-colors ${THEME.tableRowHover}`}>
                                                            <td className="px-5 py-3 font-medium">{item.shift}</td>
                                                            <td className={`px-3 py-3 font-bold ${THEME.textMain}`}>{item.machine}</td>
                                                            <td className="px-3 py-3 text-center font-mono opacity-80">{item.time}m</td>
                                                            <td className="px-3 py-3 text-right font-bold text-rose-500">{item.weight.toFixed(2)}</td>
                                                            <td className="px-3 py-3 opacity-80">{item.prod}</td>
                                                            <td className="px-5 py-3 opacity-80 max-w-xs truncate">{item.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* --- EFFICIENCY LOSS SECTION --- */}
                    {totalEffLoss > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 shadow-lg transform-gpu">
                            <h3 className="text-lg font-black uppercase text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-3">
                                <Zap className="w-5 h-5" /> Efficiency Loss
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`rounded-xl p-4 border border-amber-200 dark:border-amber-800 ${THEME.cardBg}`}>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">BM Efficiency Loss</p>
                                    <p className="text-xl font-black text-amber-600">{data.effLossBM.toFixed(2)} kg</p>
                                </div>
                                <div className={`rounded-xl p-4 border border-amber-200 dark:border-amber-800 ${THEME.cardBg}`}>
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">IM Efficiency Loss</p>
                                    <p className="text-xl font-black text-amber-600">{data.effLossIM.toFixed(2)} kg</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BreakdownSummary;