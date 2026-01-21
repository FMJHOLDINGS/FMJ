import React, { useState, useEffect } from 'react';
import { AppTab } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import SyncModal from './SyncModal';
import { useProductionData } from '../hooks/useProductionData';

// Tab Components
import ProductionTab from './ProductionTab';
import KPITab from './KPITab';
import OEETab from './OEETab';
import QualityTab from './QualityTab';
import AdminTab from './AdminTab';
import PlanningTab from './PlanningTab';
import DeliveryTab from './DeliveryTab';

const DesktopLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState(AppTab.KPI);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const t = localStorage.getItem('theme'); return t === 'dark' || (!t && true); 
  });

  // Load Custom Hook (The Brain)
  const { 
    combinedData, adminConfig, updateDayData, updateAdminConfig, 
    isCloudEnabled, toggleCloudSync, cloudStatus, localStatus, lastSyncTime 
  } = useProductionData(selectedDate);

  // Theme Handling
  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-amber-500/30">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        cloudStatus={cloudStatus}
        localStatus={localStatus}
        isCloudEnabled={isCloudEnabled}
      />

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#FAFAFA] dark:bg-[#020617]">
        <Header activeTab={activeTab} />

        <div className="flex-1 overflow-hidden relative">
           <div className="absolute inset-0 p-4 scroll-smooth overflow-y-auto custom-scrollbar">
              {activeTab === AppTab.PRODUCTION && <ProductionTab date={selectedDate} onDateChange={setSelectedDate} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} />}
              {activeTab === AppTab.KPI && <KPITab data={combinedData} />}
              {activeTab === AppTab.OEE && <OEETab data={combinedData} />}
              {activeTab === AppTab.QUALITY && <QualityTab data={combinedData} allData={combinedData} onUpdate={updateDayData} adminConfig={adminConfig} />}
              {activeTab === AppTab.PLANNING && <PlanningTab />}
              {activeTab === AppTab.DELIVERY && <DeliveryTab />}
              {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
           </div>
        </div>
      </main>

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

export default DesktopLayout;