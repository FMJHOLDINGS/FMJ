import React, { useState, useEffect } from 'react';
import { AppTab } from '../types';
import { UserData } from '../context/AuthContext';
import { useProductionData } from '../hooks/useProductionData';

import Sidebar from './Sidebar';
import Header from './Header';
import SyncModal from './SyncModal';

import ProductionTab from './ProductionTab';
import KPITab from './KPI/KPITab';
import OEETab from './OEETab';
import QualityTab from './QUALITY/QualityTab';
import AdminTab from './ADMIN/AdminTab';
import PlanningTab from './PLANNING/PlanningTab';
import DeliveryTab from './DELIVERY/DeliveryTab';
import StoresTab from './STORES/StoresTab';

interface DesktopLayoutProps { user: UserData; }

const DesktopLayout: React.FC<DesktopLayoutProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState(AppTab.OEE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('fmj_entry_date') || new Date().toISOString().split('T')[0]);
  const [isDarkMode, setIsDarkMode] = useState(() => { const t = localStorage.getItem('theme'); return t === 'dark' || (!t && false); });

  // 🟢 State for All 8 Colors
  const [colors, setColors] = useState({
      lMain: '#FAFAFA', lSide: '#FFFFFF', lCard: '#FFFFFF', lText: '#0F172A',
      dMain: '#020617', dSide: '#0B1121', dCard: '#060d23', dText: '#F8FAFC'
  });

  const { combinedData, adminConfig, updateDayData, updateAdminConfig, loadDataForRange, cloudStatus,  lastSyncTime, localStatus, isCloudEnabled, toggleCloudSync } = useProductionData(selectedDate, user.collectionName);


  

  const handleManualRefresh = () => {
    if (!selectedDate) return;
    
    // 🟢 Timezone දෝෂ රහිතව Start සහ End Dates සෑදීම
    const [y, m] = selectedDate.split('-');
    const startOfMonth = `${y}-${m}-01`;
    const endDay = new Date(parseInt(y), parseInt(m), 0).getDate();
    const endOfMonth = `${y}-${m}-${String(endDay).padStart(2, '0')}`;
    
    loadDataForRange(startOfMonth, endOfMonth, true); // 🟢 Force Refresh
  };
  
  
  



useEffect(() => {
  if (activeTab === AppTab.PRODUCTION || activeTab === AppTab.ADMIN) return;
  
  // 🟢 Timezone දෝෂ රහිතව වර්තමාන මාසයේ දින පරාසය සෑදීම
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  
  const startOfMonth = `${y}-${m}-01`;
  const endDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const endOfMonth = `${y}-${m}-${String(endDay).padStart(2, '0')}`;
  
  loadDataForRange(startOfMonth, endOfMonth);
}, [activeTab, loadDataForRange]);



  useEffect(() => {
    const handleStorageChange = () => { const newDate = localStorage.getItem('fmj_entry_date'); if (newDate && newDate !== selectedDate) setSelectedDate(newDate); };
    const interval = setInterval(handleStorageChange, 1000); return () => clearInterval(interval);
  }, [selectedDate]);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  // 🟢 Read Colors from LocalStorage every second
  useEffect(() => {
      const interval = setInterval(() => {
          setColors({
              lMain: localStorage.getItem('c_l_main') || '#FAFAFA',
              lSide: localStorage.getItem('c_l_side') || '#FFFFFF',
              lCard: localStorage.getItem('c_l_card') || '#FFFFFF',
              lText: localStorage.getItem('c_l_text') || '#0F172A',
              dMain: localStorage.getItem('c_d_main') || '#020617',
              dSide: localStorage.getItem('c_d_side') || '#0B1121',
              dCard: localStorage.getItem('c_d_card') || '#1E293B',
              dText: localStorage.getItem('c_d_text') || '#F8FAFC'
          });
      }, 1000);
      return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* 🟢 THE MAGIC OVERRIDE CSS: ඔබ තෝරන පාටවල් මුළු පද්ධතියටම බලපාන ආකාරය */}
      <style>{`
        /* ================= LIGHT MODE ================= */
        /* 1. Main Background */
        html:not(.dark) body, html:not(.dark) .bg-\\[\\#FAFAFA\\] { background-color: ${colors.lMain} !important; }
        
        /* 2. Sidebar & Header */
        html:not(.dark) aside, html:not(.dark) header { background-color: ${colors.lSide} !important; }
        
        /* 3. Cards & Containers */
        html:not(.dark) .bg-white { background-color: ${colors.lCard} !important; }
        
        /* 4. Text Colors */
        html:not(.dark) .text-slate-900, html:not(.dark) .text-slate-800, html:not(.dark) .text-slate-700 { color: ${colors.lText} !important; }

        /* ================= DARK MODE ================= */
        /* 1. Main Background */
        html.dark body, html.dark .dark\\:bg-\\[\\#020617\\] { background-color: ${colors.dMain} !important; }
        
        /* 2. Sidebar & Header */
        html.dark .dark\\:bg-\\[\\#0B1121\\] { background-color: ${colors.dSide} !important; }
        
        /* 3. Cards & Containers */
        html.dark .dark\\:bg-slate-800, html.dark .dark\\:bg-slate-900, html.dark .dark\\:bg-\\[\\#0F172A\\] { background-color: ${colors.dCard} !important; }
        
        /* 4. Text Colors */
        html.dark .dark\\:text-slate-100, html.dark .dark\\:text-white, html.dark .dark\\:text-slate-200 { color: ${colors.dText} !important; }
      `}</style>

      <div className="flex h-screen w-full transition-colors duration-500 font-sans selection:bg-amber-500/30">
        
        <Sidebar 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          cloudStatus={cloudStatus} localStatus={localStatus} isCloudEnabled={isCloudEnabled}
        />

<main className="flex-1 flex flex-col min-w-0 relative transition-colors duration-500 bg-[#FAFAFA] dark:bg-[#020617]">
<Header activeTab={activeTab} onRefresh={handleManualRefresh} />

          <div className="flex-1 overflow-hidden relative">
              <div className={`absolute inset-0 p-4 scroll-smooth custom-scrollbar ${activeTab === AppTab.PLANNING ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                  {activeTab === AppTab.PRODUCTION && <ProductionTab date={selectedDate} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} loadDataForRange={loadDataForRange} />}
                  

                  
                  {activeTab === AppTab.KPI && (
                      <KPITab 
                          data={combinedData} 
                          collectionName={user.collectionName} 
                          onMonthChange={(monthStr) => {
                              const [y, m] = monthStr.split('-');
                              const startOfMonth = `${y}-${m}-01`;
                              const endDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                              const endOfMonth = `${y}-${m}-${String(endDay).padStart(2, '0')}`;
                              loadDataForRange(startOfMonth, endOfMonth);
                          }}
                      />
                  )}



                  {activeTab === AppTab.OEE && <OEETab data={combinedData} loadDataForRange={loadDataForRange}/>}
                  {activeTab === AppTab.QUALITY && <QualityTab data={combinedData} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} loadDataForRange={loadDataForRange} />}
                  {activeTab === AppTab.PLANNING && <PlanningTab />}
                  {activeTab === AppTab.DELIVERY && <DeliveryTab />}
                  {activeTab === AppTab.STORES && <StoresTab />}
                  {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
              </div>
          </div>
        </main>

        {/* 🟢 SyncModal එක මෙතනට එකතු කරන්න */}
        {isSyncModalOpen && (
            <SyncModal 
                isOpen={isSyncModalOpen} 
                onClose={() => setIsSyncModalOpen(false)} 
                lastSyncTime={lastSyncTime}
                localStatus={localStatus}
                cloudStatus={cloudStatus}
                isCloudEnabled={isCloudEnabled}
                toggleCloudSync={toggleCloudSync}
                adminConfig={adminConfig} // 🟢 මේ පේළිය අලුතින් එකතු කරන්න
            />
        )}

        
      </div>
    </>
  );
};

export default DesktopLayout;