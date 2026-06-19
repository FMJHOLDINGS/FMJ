import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { calculateMetrics } from '../../utils';
import { CalendarDays, TrendingUp, TrendingDown, Package, Activity, LayoutGrid, List, FileDown } from 'lucide-react';
import MonthlyDetailedView from './MonthlyDetailedView';
import { useMonthlyLogic } from './useMonthlyLogic';

interface Props {
    allData: Record<string, any>;
    currentDate: string;
    breakdownCategories?: string[];
    loadDataForRange?: (start: string, end: string, forceRefresh?: boolean) => void;
}

const MonthlyProduction: React.FC<Props> = ({ allData, currentDate, breakdownCategories = [], loadDataForRange }) => {
    const [selectedMonth, setSelectedMonth] = useState(currentDate.slice(0, 7)); // "YYYY-MM"
    const [viewMode, setViewMode] = useState<'DETAILED' | 'SIMPLE'>('DETAILED');

    // ============================================================================
    // 1. 🧠 LOCAL METRICS CALCULATION (Planning Deduction)
    // ============================================================================
    const getAdjustedMetrics = useCallback((row: any) => {
        const m = calculateMetrics(row);
        let planningLossQty = 0;
        let actualBdLossQty = 0;
        const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;

        (row.breakdowns || []).forEach((bd: any) => {
            if (bd.startTime && bd.endTime && bd.category) {
                const [sh, sm] = bd.startTime.split(':').map(Number);
                const [eh, em] = bd.endTime.split(':').map(Number);
                let mins = (eh * 60 + em) - (sh * 60 + sm);
                if (mins < 0) mins += 1440;
                
                if (mins > 0) {
                    const bdQty = Math.floor(ratePerMin * mins);
                    if (bd.category.toLowerCase().includes('planning')) planningLossQty += bdQty;
                    else actualBdLossQty += bdQty;
                }
            }
        });

        m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
        m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2));

        const updatedTotalLoss = m.planQty - (row.achievedQty || 0); // Math.max ඉවත් කර ඇත
        m.lostQty = updatedTotalLoss;
        m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2));

        return m;
    }, []);

    // ============================================================================
    // 2. 🟢 AUTO DATA FETCHING (Cloud Sync)
    // ============================================================================
    useEffect(() => {
        if (loadDataForRange && selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            const start = `${year}-${month}-01`;
            const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const end = `${year}-${month}-${String(endDay).padStart(2, '0')}`;
            
            // true යොදා ඇත්තේ cache මඟහැර සෑම විටම අලුත් දත්ත ලබා ගැනීමටයි
            loadDataForRange(start, end, true); 
        }
    }, [selectedMonth, loadDataForRange]);

    // ============================================================================
    // 3. 🚀 FAST DATA CALCULATION (Single Pass per day)
    // ============================================================================
    const monthData = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        let totalPlan = 0, totalAchv = 0, totalLoss = 0;
        let imTotalPlan = 0, imTotalAchv = 0, imTotalLoss = 0;
        let bmTotalPlan = 0, bmTotalAchv = 0, bmTotalLoss = 0;

        const dailyBreakdown = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            let imD_Plan = 0, imD_Achv = 0, imD_Loss = 0;
            (allData[`${dayStr}_IM`]?.rows || []).forEach((r: any) => { 
                const m = getAdjustedMetrics(r); 
                imD_Plan += m.planKg; imD_Achv += m.achievedKg; imD_Loss += m.lostKg; 
            });

            let bmD_Plan = 0, bmD_Achv = 0, bmD_Loss = 0;
            (allData[`${dayStr}_BM`]?.rows || []).forEach((r: any) => { 
                const m = getAdjustedMetrics(r); 
                bmD_Plan += m.planKg; bmD_Achv += m.achievedKg; bmD_Loss += m.lostKg; 
            });

            if (imD_Plan > 0 || bmD_Plan > 0 || imD_Achv > 0 || bmD_Achv > 0) {
                dailyBreakdown.push({
                    date: dayStr,
                    im: { plan: imD_Plan, achv: imD_Achv, loss: imD_Loss },
                    bm: { plan: bmD_Plan, achv: bmD_Achv, loss: bmD_Loss },
                    plan: imD_Plan + bmD_Plan,
                    achv: imD_Achv + bmD_Achv,
                    loss: imD_Loss + bmD_Loss,
                    totalEff: (imD_Plan + bmD_Plan) > 0 ? ((imD_Achv + bmD_Achv) / (imD_Plan + bmD_Plan)) * 100 : 0
                });

                imTotalPlan += imD_Plan; imTotalAchv += imD_Achv; imTotalLoss += imD_Loss;
                bmTotalPlan += bmD_Plan; bmTotalAchv += bmD_Achv; bmTotalLoss += bmD_Loss;
            }
        }

        totalPlan = imTotalPlan + bmTotalPlan;
        totalAchv = imTotalAchv + bmTotalAchv;
        totalLoss = imTotalLoss + bmTotalLoss;
        const efficiency = totalPlan > 0 ? (totalAchv / totalPlan) * 100 : 0;

        return {
            totalPlan, totalAchv, totalLoss, efficiency, dailyBreakdown,
            imTotalPlan, imTotalAchv, imTotalLoss,
            bmTotalPlan, bmTotalAchv, bmTotalLoss
        };
    }, [selectedMonth, allData, getAdjustedMetrics]);

    const { isGenerating, downloadSystemReport } = useMonthlyLogic(allData, selectedMonth);

    // ============================================================================
    // 4. 🖥️ UI RENDER (Hardware Accelerated)
    // ============================================================================
    return (
        <div className="space-y-6 animate-fade-in transform-gpu will-change-transform">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/30">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Monthly Overview</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Select Month to Analyze</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">

                    {/* 🟢 Export Button */}
                    <button onClick={downloadSystemReport} disabled={isGenerating} className={`px-4 py-2.5 md:px-5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-md ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105'}`}>
                        {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <FileDown className="w-4 h-4" />}
                        <span className="hidden md:inline">{isGenerating ? "Generating..." : "Download Excel (31 Sheets)"}</span>
                        <span className="md:hidden">Export</span>
                    </button>

                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setViewMode('SIMPLE')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'SIMPLE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <LayoutGrid className="w-4 h-4" /> Simple
                        </button>
                        <button onClick={() => setViewMode('DETAILED')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'DETAILED' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            <List className="w-4 h-4" /> Detailed
                        </button>
                    </div>
                    
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer text-sm dark:[color-scheme:dark]"
                    />
                </div>

            </div>

            {/* --- VIEW 1: SIMPLE MODE --- */}
            {viewMode === 'SIMPLE' && (
                <div className="space-y-6 animate-fade-in transform-gpu">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-500 text-white rounded-lg"><Package className="w-5 h-5" /></div>
                                <span className="text-xs font-black uppercase text-indigo-400">Total Output</span>
                            </div>
                            <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{monthData.totalAchv.toFixed(0)} <span className="text-sm">kg</span></p>
                            <p className="text-xs font-bold text-indigo-400/70 mt-1">Target: {monthData.totalPlan.toFixed(0)} kg</p>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500 text-white rounded-lg"><Activity className="w-5 h-5" /></div>
                                <span className="text-xs font-black uppercase text-emerald-500">Efficiency</span>
                            </div>
                            <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{monthData.efficiency.toFixed(1)}%</p>
                        </div>

                        <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-500 text-white rounded-lg"><TrendingDown className="w-5 h-5" /></div>
                                <span className="text-xs font-black uppercase text-rose-400">Total Loss</span>
                            </div>
                            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{monthData.totalLoss.toFixed(0)} <span className="text-sm">kg</span></p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-slate-700 text-white rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                                <span className="text-xs font-black uppercase text-slate-400">IM vs BM</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div><span className="text-xs font-bold text-slate-400">IM</span> <p className="text-xl font-black dark:text-white">{monthData.imTotalAchv.toFixed(0)}</p></div>
                                <div><span className="text-xs font-bold text-slate-400">BM</span> <p className="text-xl font-black dark:text-white">{monthData.bmTotalAchv.toFixed(0)}</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-lg p-6">
                        <h3 className="font-black text-slate-700 dark:text-slate-200 mb-4">Daily Performance (Quick View)</h3>
                        <div className="grid grid-cols-6 gap-2 text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2 dark:border-slate-700">
                            <div className="col-span-1">Date</div>
                            <div className="col-span-1 text-right">Plan</div>
                            <div className="col-span-1 text-right">Achieved</div>
                            <div className="col-span-1 text-right">Loss</div>
                            <div className="col-span-2 text-center">Status</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 transform-gpu will-change-scroll">
                            {monthData.dailyBreakdown.map((day, i) => (
                                <div key={i} className="grid grid-cols-6 gap-2 items-center text-sm font-bold text-slate-700 dark:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                                    <div className="col-span-1 font-mono text-xs opacity-70">{day.date}</div>
                                    <div className="col-span-1 text-right">{day.plan.toFixed(0)}</div>
                                    <div className="col-span-1 text-right text-emerald-600">{day.achv.toFixed(0)}</div>
                                    <div className="col-span-1 text-right text-rose-500">{day.loss.toFixed(0)}</div>
                                    <div className="col-span-2 flex justify-center">
                                        <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden relative">
                                            <div className={`h-full absolute left-0 ${day.totalEff >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, day.totalEff)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW 2: DETAILED MODE --- */}
            {viewMode === 'DETAILED' && (
                <MonthlyDetailedView
                    dailyData={monthData.dailyBreakdown}
                    monthTotals={monthData}
                    allData={allData}
                    currentDate={selectedMonth}
                    breakdownCategories={breakdownCategories}
                />
            )}
        </div>
    );
};

export default MonthlyProduction;