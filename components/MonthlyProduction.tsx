import React, { useState, useMemo } from 'react';
import { calculateMetrics } from '../utils';
import { CalendarDays, TrendingUp, TrendingDown, Package, Activity, LayoutGrid, List } from 'lucide-react';
import MonthlyDetailedView from './MonthlyDetailedView';

interface Props {
    allData: Record<string, any>;
    currentDate: string;
    breakdownCategories?: string[];
}

const MonthlyProduction: React.FC<Props> = ({ allData, currentDate, breakdownCategories = [] }) => {
    const [selectedMonth, setSelectedMonth] = useState(currentDate.slice(0, 7)); // "YYYY-MM"
    const [viewMode, setViewMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE'); // Default to Simple

    // --- ENHANCED DATA CALCULATION ---
    const monthData = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        let totalPlan = 0, totalAchv = 0, totalLoss = 0;

        // Split Totals
        let imTotalPlan = 0, imTotalAchv = 0, imTotalLoss = 0;
        let bmTotalPlan = 0, bmTotalAchv = 0, bmTotalLoss = 0;

        const dailyBreakdown = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            // Get rows
            const imRow = allData[`${dayStr}_IM`]?.rows || [];
            const bmRow = allData[`${dayStr}_BM`]?.rows || [];

            // Calc IM Daily
            let imD_Plan = 0, imD_Achv = 0, imD_Loss = 0;
            imRow.forEach((r: any) => { const m = calculateMetrics(r); imD_Plan += m.planKg; imD_Achv += m.achievedKg; imD_Loss += m.lostKg; });

            // Calc BM Daily
            let bmD_Plan = 0, bmD_Achv = 0, bmD_Loss = 0;
            bmRow.forEach((r: any) => { const m = calculateMetrics(r); bmD_Plan += m.planKg; bmD_Achv += m.achievedKg; bmD_Loss += m.lostKg; });

            // Only add if there is data
            if (imD_Plan > 0 || bmD_Plan > 0 || imD_Achv > 0 || bmD_Achv > 0) {
                dailyBreakdown.push({
                    date: dayStr,
                    // Detailed Breakdown Structure
                    im: { plan: imD_Plan, achv: imD_Achv, loss: imD_Loss },
                    bm: { plan: bmD_Plan, achv: bmD_Achv, loss: bmD_Loss },
                    // Daily Totals
                    plan: imD_Plan + bmD_Plan,
                    achv: imD_Achv + bmD_Achv,
                    loss: imD_Loss + bmD_Loss,
                    totalEff: (imD_Plan + bmD_Plan) > 0 ? ((imD_Achv + bmD_Achv) / (imD_Plan + bmD_Plan)) * 100 : 0
                });

                // Accumulate Month Totals
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
    }, [selectedMonth, allData]);

    return (
        <div className="space-y-6 animate-fade-in">

            {/* HEADER & CONTROLS */}
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
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('SIMPLE')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'SIMPLE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Simple
                        </button>
                        <button
                            onClick={() => setViewMode('DETAILED')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'DETAILED' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List className="w-4 h-4" /> Detailed
                        </button>
                    </div>

                    {/* Month Picker */}
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer text-sm dark:[color-scheme:dark]"
                    />
                </div>
            </div>

            {/* --- VIEW 1: SIMPLE MODE (Cards + Basic List) --- */}
            {viewMode === 'SIMPLE' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Cards */}
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

                    {/* Simple List */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-lg p-6">
                        <h3 className="font-black text-slate-700 dark:text-slate-200 mb-4">Daily Performance (Quick View)</h3>
                        <div className="grid grid-cols-6 gap-2 text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2 dark:border-slate-700">
                            <div className="col-span-1">Date</div>
                            <div className="col-span-1 text-right">Plan</div>
                            <div className="col-span-1 text-right">Achieved</div>
                            <div className="col-span-1 text-right">Loss</div>
                            <div className="col-span-2 text-center">Status</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                            {monthData.dailyBreakdown.map((day, i) => (
                                <div key={i} className="grid grid-cols-6 gap-2 items-center text-sm font-bold text-slate-700 dark:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg">
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

            {/* --- VIEW 2: DETAILED MODE (New Complex Table) --- */}
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