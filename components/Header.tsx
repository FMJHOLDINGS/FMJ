import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Activity, TrendingUp, ClipboardCheck, 
  UserCog, CalendarClock, Truck, Clock 
} from 'lucide-react';
import { AppTab } from '../types';

const DigitalClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    return (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm group hover:border-amber-500/30 transition-colors">
            <div className="p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow"><Clock className="w-3.5 h-3.5 text-white" /></div>
            <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{dateStr}</span><span className="text-xs font-black text-slate-700 dark:text-amber-400 tabular-nums leading-tight tracking-wide">{timeStr}</span></div>
        </div>
    );
};

const Header: React.FC<{ activeTab: AppTab }> = ({ activeTab }) => {
  const getActiveColor = (tab: AppTab) => {
    switch (tab) {
        case AppTab.PRODUCTION: return 'text-amber-500';
        case AppTab.KPI: return 'text-indigo-500';
        case AppTab.OEE: return 'text-purple-500';
        case AppTab.QUALITY: return 'text-emerald-500';
        case AppTab.PLANNING: return 'text-cyan-500';
        case AppTab.DELIVERY: return 'text-orange-500';
        case AppTab.ADMIN: return 'text-rose-500';
        default: return 'text-slate-500';
    }
  };

  const titleText = {
    [AppTab.PRODUCTION]: 'Production Log', [AppTab.KPI]: 'KPI Dashboard', [AppTab.OEE]: 'OEE Analytics',
    [AppTab.QUALITY]: 'Quality Control', [AppTab.PLANNING]: 'Production Planning', [AppTab.DELIVERY]: 'Delivery Schedule', [AppTab.ADMIN]: 'System Admin'
  }[activeTab];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl flex items-center justify-between px-6 z-40 sticky top-0 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <div><h1 className={`text-base font-black dark:text-white uppercase tracking-tight flex items-center gap-2 ${getActiveColor(activeTab)}`}>
                {activeTab === AppTab.QUALITY && <ClipboardCheck className="w-5 h-5"/>}{activeTab === AppTab.PRODUCTION && <LayoutDashboard className="w-5 h-5"/>}{activeTab === AppTab.KPI && <TrendingUp className="w-5 h-5"/>}{activeTab === AppTab.OEE && <Activity className="w-5 h-5"/>}{activeTab === AppTab.PLANNING && <CalendarClock className="w-5 h-5"/>}{activeTab === AppTab.DELIVERY && <Truck className="w-5 h-5"/>}{activeTab === AppTab.ADMIN && <UserCog className="w-5 h-5"/>}{titleText}</h1></div>
        </div>
        <div className="flex items-center gap-4"><DigitalClock /></div>
    </header>
  );
};

export default Header;