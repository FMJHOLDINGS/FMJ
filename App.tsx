import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Factory, LayoutDashboard, Activity, Calendar, ChevronRight, 
  TrendingUp, CloudUpload, UserCog, Settings as SettingsIcon, 
  Database, Sun, Moon 
} from 'lucide-react';
import { AppTab, DayData, AdminConfig } from './types';
import ProductionTab from './components/ProductionTab';
import KPITab from './components/KPITab';
import OEETab from './components/OEETab';
import AdminTab from './components/AdminTab';

// Firebase Imports
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PRODUCTION);
  // This state is just an initial value now, managed inside ProductionTab
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [allData, setAllData] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('fmj_pro_db_v2');
    return saved ? JSON.parse(saved) : {};
  });

  // Dark Mode State Logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const docRef = useMemo(() => doc(db, "data", "main_dashboard"), []);

  useEffect(() => {
    setCloudStatus('syncing');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().entries || {};
        setAllData(cloudData);
        localStorage.setItem('fmj_pro_db_v2', JSON.stringify(cloudData));
        setCloudStatus('success');
        setTimeout(() => setCloudStatus('idle'), 2000);
      }
    }, (error) => {
      console.error("Firebase Sync Error:", error);
      setCloudStatus('error');
    });

    return () => unsubscribe();
  }, [docRef]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const saveData = useCallback(async (updatedData: any) => {
    setAllData(updatedData);
    localStorage.setItem('fmj_pro_db_v2', JSON.stringify(updatedData));
    
    try {
      setCloudStatus('syncing');
      await setDoc(docRef, { 
        entries: updatedData, 
        last_sync: new Date().toISOString() 
      }, { merge: true });
      setCloudStatus('success');
      setTimeout(() => setCloudStatus('idle'), 2000);
    } catch (e) {
      console.error("Cloud Save Error:", e);
      setCloudStatus('error');
    }
  }, [docRef]);

  const adminConfig: AdminConfig = useMemo(() => {
    return allData.adminConfig || { machineMappings: [] };
  }, [allData]);

  const updateAdminConfig = (newConfig: AdminConfig) => {
    const updatedData = { ...allData, adminConfig: newConfig };
    saveData(updatedData);
  };

  const updateDayData = (key: string, newData: DayData) => {
    const updatedData = { ...allData, [key]: newData };
    saveData(updatedData);
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-[#020617] text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`bg-[#0F172A] border-r border-slate-800 text-slate-400 transition-all duration-300 flex flex-col z-50 shadow-2xl ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-800 gap-4 overflow-hidden">
          <div className="bg-indigo-600 p-2 rounded-xl flex-shrink-0"><Factory className="w-6 h-6 text-white" /></div>
          {isSidebarOpen && <div className="flex flex-col"><span className="text-white font-black">FMJ PRO</span><span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Hybrid Sync</span></div>}
        </div>

        <nav className="flex-1 px-3 py-8 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Productions" active={activeTab === AppTab.PRODUCTION} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.PRODUCTION)} />
          <NavItem icon={<TrendingUp />} label="Analytics" active={activeTab === AppTab.KPI} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.KPI)} />
          <NavItem icon={<Activity />} label="Efficiency" active={activeTab === AppTab.OEE} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.OEE)} />
          <NavItem icon={<UserCog />} label="Admin Panel" active={activeTab === AppTab.ADMIN} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.ADMIN)} />
          
          <div className="pt-8 border-t border-slate-800 mt-4 px-3">
            <div className={`flex items-center gap-4 py-3 px-3 rounded-xl transition-all ${cloudStatus === 'syncing' ? 'text-indigo-400' : cloudStatus === 'success' ? 'text-emerald-400' : 'text-slate-500'}`}>
              <CloudUpload className={cloudStatus === 'syncing' ? 'animate-spin' : ''} />
              {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">{cloudStatus === 'syncing' ? 'Syncing...' : 'Cloud Active'}</span>}
            </div>
            <button onClick={() => setIsConfigModalOpen(true)} className="w-full flex items-center gap-4 py-3 px-3 mt-2 rounded-xl hover:bg-slate-800 text-slate-400">
              <SettingsIcon /><>{isSidebarOpen && <span className="font-bold text-sm text-left">Sync Settings</span>}</>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full p-3 rounded-xl hover:bg-slate-800 transition-all flex justify-center">
             <ChevronRight className={`transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{activeTab}</h1>
             
             {/* --- OLD DATE PICKER REMOVED FROM HERE --- */}
             {/* It is now inside ProductionTab.tsx */}

          </div>
          
          {/* Dark Mode Toggle Switch */}
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:block">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center relative shadow-inner ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}
                >
                   <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center absolute ${isDarkMode ? 'translate-x-[26px]' : 'translate-x-0'}`}>
                      {isDarkMode ? (
                        <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                      )}
                   </div>
                </button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300">
          {activeTab === AppTab.PRODUCTION && (
            <ProductionTab date={selectedDate} allData={allData} onUpdate={updateDayData} adminConfig={adminConfig} />
          )}
          {activeTab === AppTab.KPI && <KPITab data={allData} />}
          {activeTab === AppTab.OEE && <OEETab data={allData} />}
          {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
        </div>
      </main>

      {/* Sync Info Modal - Fully Dynamic */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in relative">
              <div className="p-8 bg-[#0F172A] text-white flex items-center gap-4">
                <Database className={`w-8 h-8 ${cloudStatus === 'syncing' ? 'text-amber-400 animate-pulse' : cloudStatus === 'error' ? 'text-rose-500' : 'text-emerald-400'}`} />
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Sync Status</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Real-time Hybrid Engine</p>
                </div>
              </div>

              <div className="p-8 space-y-4">
                 <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-1 bg-emerald-100 dark:bg-emerald-800 rounded-full mt-0.5"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div></div>
                    <div>
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Local Storage: Active</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500/70 mt-1 font-medium">Data is stored securely on this device.</p>
                    </div>
                 </div>

                 <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors duration-500 ${
                    cloudStatus === 'error' 
                      ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' 
                      : cloudStatus === 'syncing' 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
                        : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
                 }`}>
                    <div className={`p-1 rounded-full mt-0.5 ${
                        cloudStatus === 'error' ? 'bg-rose-100 dark:bg-rose-800' : cloudStatus === 'syncing' ? 'bg-amber-100 dark:bg-amber-800' : 'bg-indigo-100 dark:bg-indigo-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                          cloudStatus === 'error' ? 'bg-rose-500' : cloudStatus === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-indigo-500'
                      }`}></div>
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide ${
                          cloudStatus === 'error' ? 'text-rose-800 dark:text-rose-400' : cloudStatus === 'syncing' ? 'text-amber-800 dark:text-amber-400' : 'text-indigo-800 dark:text-indigo-400'
                      }`}>
                         {cloudStatus === 'error' ? 'Cloud Sync: Disconnected' : cloudStatus === 'syncing' ? 'Cloud Sync: Syncing...' : 'Cloud Sync: Connected'}
                      </p>
                      <p className={`text-[10px] mt-1 font-medium ${
                          cloudStatus === 'error' ? 'text-rose-600 dark:text-rose-400/70' : cloudStatus === 'syncing' ? 'text-amber-600 dark:text-amber-400/70' : 'text-indigo-600 dark:text-indigo-400/70'
                      }`}>
                         {cloudStatus === 'error' ? 'Check your internet connection.' : 'Data is automatically backing up to Firebase.'}
                      </p>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-4">
                   <button onClick={() => setIsConfigModalOpen(false)} className="w-full bg-slate-900 dark:bg-slate-800 text-white py-3.5 rounded-xl font-black uppercase text-xs hover:bg-black transition-all shadow-lg">Close Monitor</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: any, label: string, active: boolean, isOpen: boolean, onClick: () => void }> = ({ icon, label, active, isOpen, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
    {icon}
    {isOpen && <span className="font-bold text-sm tracking-tight whitespace-nowrap">{label}</span>}
  </button>
);

export default App;