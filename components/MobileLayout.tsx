import React, { useState, useEffect } from 'react';
import { AppTab, AdminConfig } from '../types';
import SyncModal from './SyncModal';
import { useProductionData } from '../hooks/useProductionData';
import { 
  LayoutDashboard, TrendingUp, Activity, ClipboardCheck, 
  UserCog, Menu, CalendarClock, Truck, X, Factory, LogOut, Sun, Moon 
} from 'lucide-react';

// Tab Components
import ProductionTab from './ProductionTab';
import KPITab from './KPITab';
import OEETab from './OEETab';
import QualityTab from './QualityTab';
import AdminTab from './AdminTab';
import PlanningTab from './PlanningTab';
import DeliveryTab from './DeliveryTab';

const MobileLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState(AppTab.KPI);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const t = localStorage.getItem('theme'); return t === 'dark' || (!t && true); 
  });

  // Load Custom Hook
  const { 
    combinedData, adminConfig, updateDayData, updateAdminConfig, 
    isCloudEnabled, toggleCloudSync, cloudStatus, localStatus, lastSyncTime 
  } = useProductionData(selectedDate);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const handleTabClick = (tab: AppTab) => {
      setActiveTab(tab);
      setIsMenuOpen(false); 
  };

  // Menu Items Config
  const MENU_ITEMS = [
      { id: AppTab.PRODUCTION, label: 'Production Log', icon: LayoutDashboard, color: 'text-amber-500' },
      { id: AppTab.KPI, label: 'KPI Dashboard', icon: TrendingUp, color: 'text-indigo-500' },
      { id: AppTab.OEE, label: 'OEE Analytics', icon: Activity, color: 'text-purple-500' },
      { id: AppTab.QUALITY, label: 'Quality Control', icon: ClipboardCheck, color: 'text-emerald-500' },
      { id: AppTab.PLANNING, label: 'Planning', icon: CalendarClock, color: 'text-cyan-500' },
      { id: AppTab.DELIVERY, label: 'Delivery', icon: Truck, color: 'text-orange-500' },
      { id: AppTab.ADMIN, label: 'System Admin', icon: UserCog, color: 'text-rose-500' },
  ];

  const activeTitle = MENU_ITEMS.find(i => i.id === activeTab)?.label;

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAFAFA] text-slate-900 dark:bg-[#020617] dark:text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Mobile Header (Fixed Top) */}
      <div className="flex-none h-14 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 z-30 shadow-sm">
         <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsMenuOpen(true)} 
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
             >
                 <Menu size={20} strokeWidth={2.5} />
             </button>
             <div>
                 <h1 className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                    {activeTitle}
                 </h1>
             </div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => setIsSyncModalOpen(true)} className={`w-2.5 h-2.5 rounded-full ${localStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse ring-2 ring-emerald-500/20`}></button>
         </div>
      </div>

      {/* 2. Slide-out Menu (Drawer) */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />
      
      <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0B1121] z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                      <Factory size={16} />
                  </div>
                  <div>
                      <h2 className="text-base font-black tracking-tighter text-slate-800 dark:text-white">FMJ PRO</h2>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mobile v1.0</p>
                  </div>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={18} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                      <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id as AppTab)}
                          className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                              isActive 
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                          } border`}
                      >
                          <Icon size={18} className={isActive ? item.color : 'text-slate-400'} />
                          <span className={`text-xs font-bold ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                              {item.label}
                          </span>
                          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </button>
                  );
              })}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-transform"
              >
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 flex items-center gap-2">
                      {isDarkMode ? <Moon size={14}/> : <Sun size={14}/>}
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
              </button>
          </div>
      </div>

      {/* 3. Main Content Area - REDUCED PADDING TO p-2 */}
      <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2 pb-20">
              <div className="min-w-0 max-w-full">
                  {activeTab === AppTab.PRODUCTION && <ProductionTab date={selectedDate} onDateChange={setSelectedDate} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} />}
                  {activeTab === AppTab.KPI && <KPITab data={combinedData} />}
                  {activeTab === AppTab.OEE && <OEETab data={combinedData} />}
                  {activeTab === AppTab.QUALITY && <QualityTab data={combinedData} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} />}
                  {activeTab === AppTab.PLANNING && <PlanningTab />}
                  {activeTab === AppTab.DELIVERY && <DeliveryTab />}
                  {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
              </div>
          </div>
      </div>

      <SyncModal 
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isCloudEnabled={isCloudEnabled}
        toggleCloudSync={toggleCloudSync}
        cloudStatus={cloudStatus}
        localStatus={localStatus}
        lastSyncTime={lastSyncTime}
        adminConfig={adminConfig}
      />
    </div>
  );
};

export default MobileLayout;