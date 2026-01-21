import React, { useState } from 'react';
import { 
  LayoutDashboard, Target, TrendingUp, Zap, Droplets, 
  XCircle, UserX, FileText 
} from 'lucide-react';

import KPIDashboard from './KPI_Dashboard';
import KPIPlanVsAch from './KPI_PlanVsAch';
import KPIProductivity from './KPI_Productivity';
import KPIElectricity from './KPI_Electricity';
import KPIWater from './KPI_Water';
import KPIRejections from './KPI_Rejections';
import KPIAbsenteeism from './KPI_Absenteeism';
import KPISummary from './KPI_Summary';

interface Props {
  data: Record<string, any>;
}

const TABS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-500', glow: 'shadow-indigo-500/50', border: 'from-indigo-600 via-purple-500 to-indigo-600' },
  { id: 'PLAN_VS_ACH', label: 'Plan vs Ach', icon: Target, color: 'text-emerald-500', glow: 'shadow-emerald-500/50', border: 'from-emerald-600 via-teal-500 to-emerald-600' },
  { id: 'PRODUCTIVITY', label: 'Productivity', icon: TrendingUp, color: 'text-cyan-500', glow: 'shadow-cyan-500/50', border: 'from-cyan-600 via-sky-500 to-cyan-600' },
  { id: 'ELECTRICITY', label: 'Electricity', icon: Zap, color: 'text-amber-500', glow: 'shadow-amber-500/50', border: 'from-amber-600 via-yellow-500 to-amber-600' },
  { id: 'WATER', label: 'Water', icon: Droplets, color: 'text-blue-500', glow: 'shadow-blue-500/50', border: 'from-blue-600 via-indigo-500 to-blue-600' },
  { id: 'REJECTIONS', label: 'Rejections', icon: XCircle, color: 'text-rose-500', glow: 'shadow-rose-500/50', border: 'from-rose-600 via-pink-500 to-rose-600' },
  { id: 'ABSENTEEISM', label: 'Absenteeism', icon: UserX, color: 'text-orange-500', glow: 'shadow-orange-500/50', border: 'from-orange-600 via-amber-500 to-orange-600' },
  { id: 'SUMMARY', label: 'Summary', icon: FileText, color: 'text-violet-500', glow: 'shadow-violet-500/50', border: 'from-violet-600 via-fuchsia-500 to-violet-600' },
] as const;

const KPITab: React.FC<Props> = ({ data }) => {
  const [activeSubTab, setActiveSubTab] = useState<string>('DASHBOARD');

  return (
    <div className="flex flex-col h-full gap-5">
      
      {/* 1. Animated Sub Navigation Bar */}
      <div className="bg-white dark:bg-[#0B1121] p-2.5 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex overflow-x-auto custom-scrollbar shrink-0 pb-3">
        <div className="flex gap-3 px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative group px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 overflow-hidden
                  ${isActive 
                    ? 'text-white shadow-lg ' + tab.glow 
                    : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {/* --- Electrical Border Animation (Active) --- */}
                {isActive && (
                  <>
                     {/* Background Gradient */}
                     <div className={`absolute inset-0 bg-gradient-to-r ${tab.border} opacity-90`} />
                     
                     {/* Animated Moving Beam */}
                     <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 translate-x-[-200%] animate-shine opacity-30" />

                     {/* Electrical Border Flow */}
                     <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-slide-right opacity-50" />
                     <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-slide-left opacity-50" />
                  </>
                )}

                {/* Content */}
                <div className="relative z-10 flex items-center gap-2">
                  <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {activeSubTab === 'DASHBOARD' && <KPIDashboard data={data} />}
        {activeSubTab === 'PLAN_VS_ACH' && <KPIPlanVsAch data={data} />}
        {activeSubTab === 'PRODUCTIVITY' && <KPIProductivity data={data} />}
        {activeSubTab === 'ELECTRICITY' && <KPIElectricity data={data} />}
        {activeSubTab === 'WATER' && <KPIWater data={data} />}
        {activeSubTab === 'REJECTIONS' && <KPIRejections data={data} />}
        {activeSubTab === 'ABSENTEEISM' && <KPIAbsenteeism data={data} />}
        {activeSubTab === 'SUMMARY' && <KPISummary data={data} />}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-200%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shine {
          animation: shine 3s infinite linear;
        }
        @keyframes slide-right {
           0% { transform: translateX(-100%); } 100% { transform: translateX(100%); }
        }
        @keyframes slide-left {
           0% { transform: translateX(100%); } 100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default KPITab;