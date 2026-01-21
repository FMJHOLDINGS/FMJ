import React from 'react';
import { CalendarClock, FolderPlus, Settings2 } from 'lucide-react';

const PlanningTab: React.FC = () => {
    return (
        <div className="w-full h-full flex flex-col gap-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-md border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/30">
                        <CalendarClock className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Production Planning</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Schedule & Resource Management</p>
                    </div>
                </div>
            </div>

            {/* Content Placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                    <Settings2 className="w-12 h-12 text-cyan-500 opacity-50" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Module Under Construction</h3>
                <p className="text-xs font-bold text-slate-400 mt-2">Planning features will be available soon.</p>
                <button className="mt-6 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <FolderPlus className="w-4 h-4" /> Create Plan
                </button>
            </div>
        </div>
    );
};

export default PlanningTab;