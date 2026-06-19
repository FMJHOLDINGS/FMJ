import React, { useState, useMemo } from 'react';
import { 
  Target, TrendingUp, Zap, Droplets, 
  XCircle, UserX, FileText, Calendar, Loader2
} from 'lucide-react';

// Import Child Components
import KPIPlanVsAch from './KPIPvsAView'; 
import KPIProductivity from './LaborProdUiView'; 
import KPIElectricity from './KPI_Electricity';
import KPIWater from './KPI_Water';
import KPIRejections from './KPI_Rejections';
import KPIAbsenteeism from './KPI_Absenteeism';
import KPISummary from './KPI_Summary';

// KPI Manager Hook
import { useKpiManager } from '../../hooks/useKpiManager';
import { useAuth } from '../../context/AuthContext';

interface Props {
  data: Record<string, any>;
  config?: any; 
  collectionName: string; 
  onMonthChange?: (month: string) => void;
}

// 🟢 Dashboard ඉවත් කර SUMMARY පළමුවෙනියට දමා ඇත
const TABS = [
  { id: 'SUMMARY', label: 'Summary', icon: FileText, color: 'text-violet-500', glow: 'shadow-violet-500/50', border: 'from-violet-600 via-fuchsia-500 to-violet-600' },
  { id: 'PLAN_VS_ACH', label: 'Plan vs Ach', icon: Target, color: 'text-emerald-500', glow: 'shadow-emerald-500/50', border: 'from-emerald-600 via-teal-500 to-emerald-600' },
  { id: 'PRODUCTIVITY', label: 'Productivity', icon: TrendingUp, color: 'text-cyan-500', glow: 'shadow-cyan-500/50', border: 'from-cyan-600 via-sky-500 to-cyan-600' },
  { id: 'ELECTRICITY', label: 'Electricity', icon: Zap, color: 'text-amber-500', glow: 'shadow-amber-500/50', border: 'from-amber-600 via-yellow-500 to-amber-600' },
  { id: 'WATER', label: 'Water', icon: Droplets, color: 'text-blue-500', glow: 'shadow-blue-500/50', border: 'from-blue-600 via-indigo-500 to-blue-600' },
  { id: 'REJECTIONS', label: 'Rejections', icon: XCircle, color: 'text-rose-500', glow: 'shadow-rose-500/50', border: 'from-rose-600 via-pink-500 to-rose-600' },
  { id: 'ABSENTEEISM', label: 'Absenteeism', icon: UserX, color: 'text-orange-500', glow: 'shadow-orange-500/50', border: 'from-orange-600 via-amber-500 to-orange-600' },
] as const;

// Helper: Format Date as YYYY-MM-DD strictly
const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const KPITab: React.FC<Props> = ({ data, config, collectionName, onMonthChange }) => {
  // 🟢 1. PERMISSION CHECKING
  const { userData } = useAuth();
  const tabPermission = userData?.permissions?.KPI || 'none';
  const isReadOnly = tabPermission === 'view';

  // 🟢 2. 'none' නම් මුකුත් පෙන්වන්නේ නෑ, Access Denied පෙන්වනවා
  if (tabPermission === 'none') {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 dark:bg-[#020617]">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl flex flex-col items-center text-center border border-rose-100 dark:border-rose-900/30">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
                      <XCircle className="w-10 h-10 text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Access Denied</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">You don't have permission to access this section. </p>
              </div>
          </div>
      );
  }

  // 🟢 Default ටැබ් එක SUMMARY ලෙස සකසා ඇත
  const [activeSubTab, setActiveSubTab] = useState<string>('SUMMARY');

  // --- 🟢 DATE RANGE STATE (අලුත් Month Picker ක්‍රමය) ---
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; 
  });

  const startDate = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return formatDate(new Date(parseInt(y), parseInt(m) - 1, 1));
  }, [selectedMonth]);

  const endDate = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return formatDate(new Date(parseInt(y), parseInt(m), 0));
  }, [selectedMonth]);


  React.useEffect(() => {
    if (onMonthChange) {
      onMonthChange(selectedMonth);
    }
  }, [selectedMonth, onMonthChange]);


  const { kpiData, loading: kpiLoading } = useKpiManager(startDate);

  return (
    <div className="flex flex-col h-full gap-5">
      
      {/* 1. HEADER BAR */}
      <div className="bg-white dark:bg-[#0B1121] p-2 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Sub Navigation */}
        <div className="flex overflow-x-auto custom-scrollbar w-full xl:w-auto pb-2 xl:pb-0">
            <div className="flex gap-2 px-1">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                
                return (
                <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`relative group px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 overflow-hidden whitespace-nowrap
                    ${isActive 
                        ? 'text-white shadow-lg ' + tab.glow 
                        : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    {isActive && (
                    <>
                        <div className={`absolute inset-0 bg-gradient-to-r ${tab.border} opacity-90`} />
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 translate-x-[-200%] animate-shine opacity-30" />
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-slide-right opacity-50" />
                        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-slide-left opacity-50" />
                    </>
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                    <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                    <span>{tab.label}</span>
                    </div>
                </button>
                );
            })}
            </div>
        </div>

        {/* 🟢 Month Picker with Loading Indicator */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
            {kpiLoading && (
              <div className="px-2 animate-spin text-indigo-500">
                <Loader2 size={16} />
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#0B1121] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Calendar size={10} /> Month
                </span>
                <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-700 dark:text-white outline-none uppercase dark:[color-scheme:dark]"
                />
            </div>
        </div>

      </div>

      {/* 2. Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        
        {/* SUMMARY TAB */}
        {activeSubTab === 'SUMMARY' && (
            <KPISummary 
                data={data} 
                kpiData={kpiData}
                selectedMonth={selectedMonth} 
            />
        )}
        
        {/* PLAN VS ACH */}
        {activeSubTab === 'PLAN_VS_ACH' && (
            <KPIPlanVsAch 
                data={data} 
                adminItems={config?.productionItems} 
                currentDate={startDate} 
                startDate={startDate} 
                endDate={endDate}     
            />
        )}
        
        {/* PRODUCTIVITY */}
        {activeSubTab === 'PRODUCTIVITY' && (
            <KPIProductivity 
                readOnly={isReadOnly}
                data={data} 
                config={config} 
                currentDate={startDate} 
                startDate={startDate} 
                endDate={endDate}
            />
        )}
        
        {/* ELECTRICITY */}
        {activeSubTab === 'ELECTRICITY' && (
            <KPIElectricity 
                readOnly={isReadOnly}
                data={data} 
                startDate={startDate} 
                endDate={endDate} 
                collectionName={collectionName} 
            />
        )}

        {/* WATER */}
        {activeSubTab === 'WATER' && (
            <KPIWater
                readOnly={isReadOnly}             
                data={data}
                startDate={startDate} 
                endDate={endDate} 
            />
        )}

        {/* REJECTIONS */}
        {activeSubTab === 'REJECTIONS' && (
            <KPIRejections 
                data={data} 
                startDate={startDate} 
                endDate={endDate} 
            />
        )}

        {/* ABSENTEEISM */}
        {activeSubTab === 'ABSENTEEISM' && (
            <KPIAbsenteeism 
                readOnly={isReadOnly}
                data={data} 
                startDate={startDate} 
                endDate={endDate} 
            />
        )}

      </div>

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