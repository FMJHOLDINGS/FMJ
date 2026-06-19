import React, { useState } from 'react';
import { FileDown, Table2, LayoutList, Calendar } from 'lucide-react';
import { useMonthlyLogic } from './useMonthlyLogic';
import MonthlyDataTable from './MonthlyDataTable';
import MonthlyParetoCharts from './MonthlyParetoCharts';

interface Props {
    dailyData: any[]; // (Backward compat only)
    monthTotals: any; // (Backward compat only)
    allData: Record<string, any>;
    currentDate: string;
    breakdownCategories?: string[];
}

const MonthlyDetailedView: React.FC<Props> = ({ allData, currentDate, breakdownCategories = [] }) => {

    // --- Tab State (Summary හෝ දිනය) ---
    const [activeTab, setActiveTab] = useState<string>('Summary');

  // --- Logic Hook භාවිතා කිරීම (Export Logic ඉවත් කර ඇත) ---
  const { REASONS, getProcessedData } = useMonthlyLogic(allData, currentDate );

    // --- අවශ්‍ය දත්ත ලබා ගැනීම ---
    const { imR, bmR, globalR, breakdownData } = getProcessedData(activeTab);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            
            

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                
                {/* --- TAB NAVIGATION --- */}
                <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-200 dark:border-slate-700 p-2 gap-2 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={() => setActiveTab('Summary')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'Summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
                        <LayoutList className="w-4 h-4" /> Summary
                    </button>
                    {/* දින 31 සඳහා බොත්තම් */}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <button key={day} onClick={() => setActiveTab(String(day))} className={`flex-shrink-0 w-10 h-10 rounded-xl text-xs font-bold flex justify-center items-center transition-all ${activeTab === String(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
                            {day}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            {activeTab === 'Summary' ? `Month Summary - ${currentDate}` : `Daily Report - ${currentDate}-${String(activeTab).padStart(2, '0')}`}
                        </h3>
                    </div>

                    {/* --- TABLE RENDER --- */}
                    <MonthlyDataTable 
                        isSummary={activeTab === 'Summary'}
                        imR={imR}
                        bmR={bmR}
                        globalR={globalR}
                        breakdownData={breakdownData}
                        REASONS={REASONS}
                    />

                    {/* --- CHARTS RENDER (Summary Only) --- */}
                    
                        <div className="mt-8">
                            <MonthlyParetoCharts 
                                breakdownData={breakdownData}
                                REASONS={REASONS}
                            />
                        </div>
                    
                </div>
            </div>
        </div>
    );
};

export default MonthlyDetailedView;