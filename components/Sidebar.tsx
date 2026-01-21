import React from 'react';
import { 
  Factory, LayoutDashboard, Activity, ChevronLeft, ChevronRight,
  TrendingUp, ClipboardCheck, UserCog, Cloud, CloudOff, RefreshCw,
  Moon, Sun, HardDrive, CalendarClock, Truck
} from 'lucide-react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: any) => void;
  isDarkMode: boolean;
  setIsDarkMode: (v: any) => void;
  onOpenSyncModal: () => void;
  cloudStatus: string;
  localStatus: string;
  isCloudEnabled: boolean;
}

const NavItem: React.FC<{ icon: any, label: string, active: boolean, isOpen: boolean, onClick: () => void, color: string }> = ({ icon, label, active, isOpen, onClick, color }) => {
  return (
    <button onClick={onClick} className={`group relative flex items-center w-full p-2.5 rounded-xl transition-all duration-300 ${!isOpen? 'justify-center': ''}`}>
      {active && (<><div className="absolute inset-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/20" /><div className="absolute inset-0 rounded-xl overflow-hidden"><div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-slide-right" /><div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-slide-left" /></div><div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.6)]" /></>)}
      <div className={`relative z-10 flex items-center ${active ? color : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}><span className={`transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'group-hover:scale-105'}`}>{icon}</span>{isOpen && <span className={`ml-3 text-xs font-bold tracking-wide transition-colors ${active ? 'text-slate-800 dark:text-white' : ''}`}>{label}</span>}</div>
      {!isOpen && <span className="absolute left-14 z-50 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-xl whitespace-nowrap">{label}</span>}
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, 
  isDarkMode, setIsDarkMode, onOpenSyncModal, cloudStatus, localStatus, isCloudEnabled 
}) => {
  return (
    <aside className={`relative flex h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-[70px]'} z-50 shadow-2xl`}>
        <button onClick={() => setIsSidebarOpen((v: boolean) => !v)} className={`absolute -right-3 top-6 z-50 rounded-full text-white p-1 shadow-lg hover:scale-110 transition-transform ring-4 ring-[#FAFAFA] dark:ring-[#020617] bg-indigo-600`}>
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex h-[60px] items-center justify-center border-b border-slate-100 dark:border-slate-800/60 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 ${isSidebarOpen ? 'h-9 w-9' : 'h-8 w-8'}`}><Factory size={isSidebarOpen ? 18 : 16} /></div>
            {isSidebarOpen && (<div className="flex flex-col animate-fade-in origin-left"><span className="text-base font-black tracking-tight leading-none text-slate-800 dark:text-white">FMJ PRO</span><span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Control Panel</span></div>)}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5 scrollbar-none">
          <style>{`.scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
          <NavItem icon={<LayoutDashboard size={18} />} label="Production" active={activeTab === AppTab.PRODUCTION} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.PRODUCTION)} color="text-amber-500" />
          <NavItem icon={<TrendingUp size={18} />} label="KPI Metrics" active={activeTab === AppTab.KPI} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.KPI)} color="text-indigo-500" />
          <NavItem icon={<Activity size={18} />} label="OEE Analysis" active={activeTab === AppTab.OEE} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.OEE)} color="text-purple-500" />
          <NavItem icon={<ClipboardCheck size={18} />} label="Quality" active={activeTab === AppTab.QUALITY} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.QUALITY)} color="text-emerald-500" />
          <NavItem icon={<CalendarClock size={18} />} label="Planning" active={activeTab === AppTab.PLANNING} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.PLANNING)} color="text-cyan-500" />
          <NavItem icon={<Truck size={18} />} label="Delivery" active={activeTab === AppTab.DELIVERY} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.DELIVERY)} color="text-orange-500" />
          <div className="my-3 border-t border-slate-100 dark:border-slate-800/50 mx-2 opacity-50 shrink-0"></div>
          <NavItem icon={<UserCog size={18} />} label="Admin" active={activeTab === AppTab.ADMIN} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.ADMIN)} color="text-rose-500" />
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-2 shrink-0">
          <button onClick={onOpenSyncModal} className={`w-full relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 transition-all duration-200 active:scale-95`}>
            <div className={`flex items-center gap-2 p-2 ${!isSidebarOpen ? 'justify-center flex-col gap-1' : ''}`}>
               <div className={`relative p-1.5 rounded-lg ${localStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}><HardDrive size={14} /><div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${localStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div></div>
               <div className={`relative p-1.5 rounded-lg ${!isCloudEnabled ? 'bg-slate-500/10 text-slate-400' : cloudStatus === 'success' ? 'bg-sky-500/10 text-sky-500' : cloudStatus === 'syncing' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {cloudStatus === 'syncing' ? <RefreshCw className="animate-spin" size={14}/> : !isCloudEnabled ? <CloudOff size={14}/> : <Cloud size={14}/>}
                   {isCloudEnabled && ( <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${cloudStatus === 'success' ? 'bg-sky-500' : cloudStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'}`}></div> )}
               </div>
               {isSidebarOpen && (<div className="text-left flex-1 min-w-0 ml-1"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">System Status</div><div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{!isCloudEnabled ? 'Local Only' : cloudStatus === 'success' ? 'Fully Synced' : cloudStatus === 'syncing' ? 'Syncing...' : 'Offline'}</div></div>)}
            </div>
          </button>
          <button onClick={() => setIsDarkMode((v: boolean) => !v)} className={`w-full flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 ${!isSidebarOpen ? 'justify-center' : ''}`}><div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-amber-400">{isDarkMode ? <Moon size={14} /> : <Sun size={14} />}</div>{isSidebarOpen && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{isDarkMode ? 'Dark' : 'Light'} Mode</span>}</button>
        </div>
      </aside>
  );
};

export default Sidebar;