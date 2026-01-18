import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import {
  Factory,
  LayoutDashboard,
  Activity,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ClipboardCheck, 
  UserCog,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  X,
  Sun,
  Moon,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

import { AppTab, DayData, AdminConfig } from './types';

import ProductionTab from './components/ProductionTab';
import KPITab from './components/KPITab';
import OEETab from './components/OEETab';
import QualityTab from './components/QualityTab';
import AdminTab from './components/AdminTab';

import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

type CloudStatus = 'syncing' | 'success' | 'error' | 'disabled';

// DIGITAL CLOCK
const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm group hover:border-amber-500/30 transition-colors">
      <div className="p-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
        <Clock className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{dateStr}</span>
        <span className="text-xs font-black text-slate-700 dark:text-amber-400 tabular-nums leading-tight tracking-wide">{timeStr}</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(AppTab.QUALITY);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Initial Load: Try Local Storage First
  const [allData, setAllData] = useState<Record<string, any>>(() => {
    try {
        const saved = localStorage.getItem('fmj_pro_db_v2');
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) return true; // Default Dark
    return savedTheme === 'dark';
  });

  const [isCloudEnabled, setIsCloudEnabled] = useState(() => {
      const saved = localStorage.getItem('fmj_cloud_enabled');
      return saved !== 'false';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('syncing');
  const [localStatus, setLocalStatus] = useState<CloudStatus>('success');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track if this is the first load to prevent overwrite
  const isFirstLoad = useRef(true);

  const docRef = useMemo(() => doc(db, 'data', 'main_dashboard'), []);

  // --- SAFE SYNC LOGIC ---
  useEffect(() => {
    if (!isCloudEnabled) {
        setCloudStatus('disabled');
        return;
    }

    setCloudStatus('syncing');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        // --- CRITICAL FIX START ---
        // Check if we have local data currently
        const localStr = localStorage.getItem('fmj_pro_db_v2');
        const hasLocalData = localStr && localStr !== '{}';

        // Case A: Cloud has data
        if (docSnap.exists() && docSnap.data().entries && Object.keys(docSnap.data().entries).length > 0) {
            
            // If it's the very first load AND we have local data
            // We assume Local Data is fresher/safer to avoid "Reload Data Loss" bug.
            // Exception: If you want Cloud to ALWAYS win, remove this check. 
            // But for "offline-first" feel, we prioritize local on boot if not explicitly synced.
            
            // However, normally on reload, local and cloud should match. 
            // If cloud is OLDER (because push failed), we keep Local and Push Up.
            
            const cloudData = docSnap.data().entries;
            const syncTime = docSnap.data().last_sync;

            if (isFirstLoad.current && hasLocalData) {
                // Determine if we should overwrite local. 
                // Simple logic: If Local exists, stick with it and Sync UP to ensure Cloud catches up.
                console.log("Local Data Exists on Boot - Syncing UP to Cloud (Safety Preference)");
                setDoc(docRef, { entries: JSON.parse(localStr), last_sync: new Date().toISOString() }, { merge: true });
                setCloudStatus('success');
            } else {
                // Normal operation: Accept Cloud Update
                setAllData(cloudData);
                localStorage.setItem('fmj_pro_db_v2', JSON.stringify(cloudData));
                setLocalStatus('success');
                if(syncTime) {
                    try { setLastSyncTime(new Date(syncTime).toLocaleString()); } 
                    catch { setLastSyncTime(String(syncTime)); }
                }
                setCloudStatus('success');
            }
        } 
        // Case B: Cloud Is Empty / Missing
        else {
            if (hasLocalData) {
                // Cloud lost data or is new? Push Local UP.
                console.log("Cloud Empty - Restoring from Local");
                setDoc(docRef, { entries: JSON.parse(localStr), last_sync: new Date().toISOString() }, { merge: true });
                setCloudStatus('success');
            } else {
                // Both empty
                setCloudStatus('success');
            }
        }
        
        isFirstLoad.current = false;
        // --- CRITICAL FIX END ---

      }, (e) => { 
          console.error("Sync Logic Error:", e); 
          setCloudStatus('error'); 
      }
    );
    return () => unsubscribe();
  }, [docRef, isCloudEnabled]);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const toggleCloudSync = (enabled: boolean) => {
      setIsCloudEnabled(enabled);
      localStorage.setItem('fmj_cloud_enabled', String(enabled));
      if (enabled) { saveData(allData); } 
      else { setCloudStatus('disabled'); }
  };

  const saveData = useCallback(async (updatedData: any) => {
      // 1. Local Save First (Instant)
      setAllData(updatedData);
      try {
          localStorage.setItem('fmj_pro_db_v2', JSON.stringify(updatedData));
          setLocalStatus('success');
      } catch { setLocalStatus('error'); }

      // 2. Cloud Save (Async)
      if (isCloudEnabled) {
          try {
            setCloudStatus('syncing');
            const now = new Date().toISOString();
            await setDoc(docRef, { entries: updatedData, last_sync: now }, { merge: true });
            setCloudStatus('success');
            setLastSyncTime(new Date(now).toLocaleString());
          } catch (e) {
              console.error(e);
              setCloudStatus('error'); 
          }
      }
    }, [docRef, isCloudEnabled]
  );

  const adminConfig: AdminConfig = useMemo(() => {
    return allData.adminConfig || { productionItems: [], breakdownCategories: [], shiftTeams: [], qaCategories: [] };
  }, [allData]);

  // Admin Update Wrapper
  const updateAdminConfig = (newConfig: AdminConfig) => { 
      const updatedAllData = { ...allData, adminConfig: newConfig }; 
      saveData(updatedAllData); 
  };

  const updateDayData = (key: string, newData: DayData) => { 
      const updatedAllData = { ...allData, [key]: newData }; 
      saveData(updatedAllData); 
  };

  const handleExportData = () => {
    try {
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `fmj_backup.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (typeof parsed !== 'object' || parsed === null) throw new Error();
        if(window.confirm('Restore backup? This overwrites local & cloud data.')) { 
            saveData(parsed); 
            setIsSyncModalOpen(false); 
        }
      } catch { alert('Invalid file.'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  const titleText = {
    [AppTab.PRODUCTION]: 'Production Log',
    [AppTab.KPI]: 'KPI Dashboard',
    [AppTab.OEE]: 'OEE Analytics',
    [AppTab.QUALITY]: 'Quality Control',
    [AppTab.ADMIN]: 'System Admin'
  }[activeTab];

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 dark:bg-[#020617] dark:text-slate-100 transition-colors duration-500 font-sans selection:bg-amber-500/30">
      
      <aside className={`relative flex h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-[70px]'} z-50 shadow-2xl`}>
        <button onClick={() => setIsSidebarOpen((v) => !v)} className="absolute -right-3 top-6 z-50 rounded-full bg-amber-500 text-white p-1 shadow-lg hover:scale-110 transition-transform ring-4 ring-[#FAFAFA] dark:ring-[#020617]">
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="flex h-[60px] items-center justify-center border-b border-slate-100 dark:border-slate-800/60 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 transition-all duration-300 ${isSidebarOpen ? 'h-9 w-9' : 'h-8 w-8'}`}>
              <Factory size={isSidebarOpen ? 18 : 16} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col animate-fade-in origin-left">
                <span className="text-base font-black tracking-tight leading-none text-slate-800 dark:text-white">FMJ PRO</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Control Panel</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5 scrollbar-none">
          <style>{`.scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
          
          <NavItem icon={<LayoutDashboard size={18} />} label="Production" active={activeTab === AppTab.PRODUCTION} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.PRODUCTION)} />
          <NavItem icon={<TrendingUp size={18} />} label="KPI Metrics" active={activeTab === AppTab.KPI} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.KPI)} />
          <NavItem icon={<Activity size={18} />} label="OEE Analysis" active={activeTab === AppTab.OEE} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.OEE)} />
          <NavItem icon={<ClipboardCheck size={18} />} label="Quality" active={activeTab === AppTab.QUALITY} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.QUALITY)} />
          
          <div className="my-3 border-t border-slate-100 dark:border-slate-800/50 mx-2 opacity-50 shrink-0"></div>
          
          <NavItem icon={<UserCog size={18} />} label="Admin" active={activeTab === AppTab.ADMIN} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.ADMIN)} />
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 space-y-2 shrink-0">
          <button onClick={() => setIsSyncModalOpen(true)} className={`w-full relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 transition-all duration-200 active:scale-95`}>
            <div className={`flex items-center gap-2 p-2 ${!isSidebarOpen ? 'justify-center flex-col gap-1' : ''}`}>
               <div className={`relative p-1.5 rounded-lg ${localStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   <HardDrive size={14} />
                   <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${localStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
               </div>
               <div className={`relative p-1.5 rounded-lg ${!isCloudEnabled ? 'bg-slate-500/10 text-slate-400' : cloudStatus === 'success' ? 'bg-sky-500/10 text-sky-500' : cloudStatus === 'syncing' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {cloudStatus === 'syncing' ? <RefreshCw className="animate-spin" size={14}/> : !isCloudEnabled ? <CloudOff size={14}/> : <Cloud size={14}/>}
                   {isCloudEnabled && ( <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900 ${cloudStatus === 'success' ? 'bg-sky-500' : cloudStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'}`}></div> )}
               </div>
               {isSidebarOpen && (
                   <div className="text-left flex-1 min-w-0 ml-1">
                       <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">System Status</div>
                       <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                           {!isCloudEnabled ? 'Local Only' : cloudStatus === 'success' ? 'Fully Synced' : cloudStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                       </div>
                   </div>
               )}
            </div>
          </button>

          <button onClick={() => setIsDarkMode(v => !v)} className={`w-full flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-amber-400">
                 {isDarkMode ? <Moon size={14} /> : <Sun size={14} />}
             </div>
             {isSidebarOpen && <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{isDarkMode ? 'Dark' : 'Light'} Mode</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative bg-[#FAFAFA] dark:bg-[#020617]">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl flex items-center justify-between px-6 z-40 sticky top-0 shadow-sm shrink-0">
           <div className="flex items-center gap-4">
               <div>
                   <h1 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                       {activeTab === AppTab.QUALITY && <ClipboardCheck className="w-4 h-4 text-amber-500"/>}
                       {activeTab === AppTab.PRODUCTION && <LayoutDashboard className="w-4 h-4 text-amber-500"/>}
                       {activeTab === AppTab.KPI && <TrendingUp className="w-4 h-4 text-amber-500"/>}
                       {activeTab === AppTab.OEE && <Activity className="w-4 h-4 text-amber-500"/>}
                       {activeTab === AppTab.ADMIN && <UserCog className="w-4 h-4 text-amber-500"/>}
                       {titleText}
                   </h1>
               </div>
           </div>
           <div className="flex items-center gap-4"><DigitalClock /></div>
        </header>

        <div className="flex-1 overflow-hidden relative">
           <div className="absolute inset-0 p-4 scroll-smooth overflow-y-auto custom-scrollbar">
              {activeTab === AppTab.PRODUCTION && <ProductionTab date={selectedDate} allData={allData} onUpdate={updateDayData} adminConfig={adminConfig} />}
              {activeTab === AppTab.KPI && <KPITab data={allData} />}
              {activeTab === AppTab.OEE && <OEETab data={allData} />}
              {activeTab === AppTab.QUALITY && <QualityTab data={allData} allData={allData} onUpdate={updateDayData} adminConfig={adminConfig} />}
              {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
           </div>
        </div>
      </main>

      {isSyncModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
             <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                 <div><h3 className="text-sm font-black dark:text-white uppercase">System Status</h3></div>
                 <button onClick={() => setIsSyncModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"><X size={16}/></button>
             </div>
             
             <div className="p-5 space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${isCloudEnabled ? 'bg-sky-500/10 text-sky-500' : 'bg-slate-500/10 text-slate-400'}`}>
                             {isCloudEnabled ? <Cloud size={20} /> : <CloudOff size={20} />}
                         </div>
                         <div>
                             <div className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">Cloud Sync</div>
                             <div className="text-[10px] font-bold text-slate-400">{isCloudEnabled ? 'Auto-Backup Enabled' : 'Local Storage Only'}</div>
                         </div>
                     </div>
                     <button onClick={() => toggleCloudSync(!isCloudEnabled)} className="transition-transform active:scale-95">
                         {isCloudEnabled ? <ToggleRight size={32} className="text-sky-500"/> : <ToggleLeft size={32} className="text-slate-400"/>}
                     </button>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                         <div className={`p-2 rounded-full mb-2 ${localStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                             {localStatus === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                         </div>
                         <span className="text-xs font-black uppercase text-slate-500">Local Storage</span>
                         <span className={`text-[10px] font-bold mt-0.5 ${localStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {localStatus === 'success' ? 'Saved' : 'Error'}
                         </span>
                     </div>

                     <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center opacity-90">
                         <div className={`p-2 rounded-full mb-2 ${!isCloudEnabled ? 'bg-slate-200 text-slate-400' : cloudStatus === 'success' ? 'bg-sky-100 text-sky-600' : cloudStatus === 'syncing' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                             {!isCloudEnabled ? <CloudOff size={18} /> : cloudStatus === 'syncing' ? <RefreshCw className="animate-spin" size={18} /> : cloudStatus === 'success' ? <Cloud size={18} /> : <AlertCircle size={18} />}
                         </div>
                         <span className="text-xs font-black uppercase text-slate-500">Cloud Status</span>
                         <span className={`text-[10px] font-bold mt-0.5 ${!isCloudEnabled ? 'text-slate-400' : cloudStatus === 'success' ? 'text-sky-500' : cloudStatus === 'syncing' ? 'text-amber-500' : 'text-rose-500'}`}>
                             {!isCloudEnabled ? 'Disabled' : cloudStatus === 'success' ? 'Synced' : cloudStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                         </span>
                     </div>
                 </div>

                 {isCloudEnabled && lastSyncTime && <div className="text-center text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-1 rounded-lg">Last Cloud Sync: {lastSyncTime}</div>}

                 <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                     <button onClick={handleExportData} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                         <Download className="w-4 h-4 text-emerald-500 mb-1" /><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Backup</span>
                     </button>
                     <button onClick={handleImportClick} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                         <Upload className="w-4 h-4 text-amber-500 mb-1" /><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Restore</span>
                     </button>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// NAV ITEM
const NavItem: React.FC<{ icon: any, label: string, active: boolean, isOpen: boolean, onClick: () => void }> = ({ icon, label, active, isOpen, onClick }) => {
  return (
    <button onClick={onClick} className={`group relative flex items-center w-full p-2.5 rounded-xl transition-all duration-300 ${!isOpen? 'justify-center': ''}`}>
      {active && (
        <>
          <div className="absolute inset-0 rounded-xl bg-amber-500/10 dark:bg-amber-500/20" />
          <div className="absolute inset-0 rounded-xl overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-slide-right" />
             <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-slide-left" />
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
        </>
      )}
      <div className={`relative z-10 flex items-center ${active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>
          <span className={`transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'group-hover:scale-105'}`}>{icon}</span>
          {isOpen && <span className={`ml-3 text-xs font-bold tracking-wide transition-colors ${active ? 'text-slate-800 dark:text-white' : ''}`}>{label}</span>}
      </div>
      {!isOpen && <span className="absolute left-14 z-50 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-xl whitespace-nowrap">{label}</span>}
    </button>
  );
};

export default App;