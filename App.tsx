
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Factory, LayoutDashboard, Activity, Calendar, ChevronRight, 
  TrendingUp, Cloud, Download, ShieldCheck, HardDrive, 
  RefreshCw, Settings as SettingsIcon, Database, CheckCircle2, 
  XCircle, CloudUpload, UserCog
} from 'lucide-react';
import { AppTab, MachineType, DayData, AdminConfig } from './types';
import ProductionTab from './components/ProductionTab';
import KPITab from './components/KPITab';
import OEETab from './components/OEETab';
import AdminTab from './components/AdminTab';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.PRODUCTION);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [allData, setAllData] = useState<Record<string, any>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Cloud Config
  const [binId, setBinId] = useState(localStorage.getItem('jsonbin_id') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('jsonbin_key') || '');
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initial Load from Local Storage and Cloud
  useEffect(() => {
    const savedLocal = localStorage.getItem('fmj_pro_json_db');
    if (savedLocal) {
      try {
        setAllData(JSON.parse(savedLocal));
      } catch (e) { console.error("Local parse error"); }
    }
    if (binId && apiKey) fetchFromCloud();
  }, []);

  const fetchFromCloud = async () => {
    if (!binId || !apiKey) return;
    setCloudStatus('syncing');
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': apiKey }
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const cloudData = result.record.entries || result.record;
      setAllData(cloudData);
      localStorage.setItem('fmj_pro_json_db', JSON.stringify(cloudData));
      setCloudStatus('success');
      setHasUnsavedChanges(false);
      setTimeout(() => setCloudStatus('idle'), 3000);
    } catch (e) { setCloudStatus('error'); }
  };

  const syncToCloud = async () => {
    if (!binId || !apiKey) return;
    setCloudStatus('syncing');
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey },
        body: JSON.stringify({ entries: allData, last_sync: new Date().toISOString() })
      });
      setCloudStatus('success');
      setHasUnsavedChanges(false);
      setTimeout(() => setCloudStatus('idle'), 3000);
    } catch (e) { setCloudStatus('error'); }
  };

  // Sync state to local storage when allData changes
  useEffect(() => {
    if (Object.keys(allData).length > 0) {
      localStorage.setItem('fmj_pro_json_db', JSON.stringify(allData));
      if (cloudStatus !== 'syncing') setHasUnsavedChanges(true);
    }
  }, [allData]);

  const adminConfig: AdminConfig = useMemo(() => {
    return allData.adminConfig || { machineMappings: [] };
  }, [allData]);

  const updateAdminConfig = (newConfig: AdminConfig) => {
    setAllData(prev => ({ ...prev, adminConfig: newConfig }));
  };

  const updateDayData = (key: string, newData: DayData) => {
    setAllData(prev => ({ ...prev, [key]: newData }));
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-[#0F172A] text-slate-400 transition-all duration-300 flex flex-col z-50 shadow-2xl ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50 gap-4 overflow-hidden">
          <div className="bg-indigo-600 p-2 rounded-xl flex-shrink-0"><Factory className="w-6 h-6 text-white" /></div>
          {isSidebarOpen && <div className="flex flex-col"><span className="text-white font-black">FMJ PRO</span><span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{binId ? 'Cloud Sync' : 'Offline'}</span></div>}
        </div>

        <nav className="flex-1 px-3 py-8 space-y-2">
          <NavItem icon={<LayoutDashboard />} label="Productions" active={activeTab === AppTab.PRODUCTION} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.PRODUCTION)} />
          <NavItem icon={<TrendingUp />} label="Analytics" active={activeTab === AppTab.KPI} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.KPI)} />
          <NavItem icon={<Activity />} label="Efficiency" active={activeTab === AppTab.OEE} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.OEE)} />
          <NavItem icon={<UserCog />} label="Admin Panel" active={activeTab === AppTab.ADMIN} isOpen={isSidebarOpen} onClick={() => setActiveTab(AppTab.ADMIN)} />
          
          <div className="pt-8 border-t border-slate-800/30 mt-4 px-3">
            {binId && (
              <button onClick={syncToCloud} disabled={cloudStatus === 'syncing'} className={`w-full flex items-center gap-4 py-3 px-3 rounded-xl transition-all relative ${hasUnsavedChanges ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30' : 'hover:bg-slate-800'}`}>
                <CloudUpload className={cloudStatus === 'syncing' ? 'animate-spin' : ''} />
                {isSidebarOpen && <span className="font-bold text-sm">Sync Now</span>}
                {hasUnsavedChanges && isSidebarOpen && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
              </button>
            )}
            <button onClick={() => setIsConfigModalOpen(true)} className="w-full flex items-center gap-4 py-3 px-3 mt-2 rounded-xl hover:bg-slate-800 text-slate-400">
              <SettingsIcon /><>{isSidebarOpen && <span className="font-bold text-sm">Cloud Setup</span>}</>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full p-3 rounded-xl hover:bg-slate-800 transition-all flex justify-center">
             <ChevronRight className={`transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeTab}</h1>
             <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xs font-black text-indigo-800 outline-none" />
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Mode</p>
                <p className="text-xs font-bold text-slate-800">{binId ? 'Cloud Syncing' : 'Local Only'}</p>
             </div>
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${binId ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-400'}`}>
                <ShieldCheck />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#F8FAFC]">
          {activeTab === AppTab.PRODUCTION && (
            <ProductionTab date={selectedDate} allData={allData} onUpdate={updateDayData} adminConfig={adminConfig} />
          )}
          {activeTab === AppTab.KPI && <KPITab data={allData} />}
          {activeTab === AppTab.OEE && <OEETab data={allData} />}
          {activeTab === AppTab.ADMIN && <AdminTab config={adminConfig} onUpdate={updateAdminConfig} />}
        </div>
      </main>

      {/* Cloud Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 animate-fade-in">
              <div className="p-8 bg-[#0F172A] text-white flex items-center gap-4">
                <Database className="w-8 h-8 text-indigo-400" />
                <div><h3 className="text-xl font-black uppercase tracking-tight">Cloud Settings</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">JSONBin.io Integration</p></div>
              </div>
              <div className="p-8 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bin ID</label>
                    <input type="text" value={binId} onChange={(e) => setBinId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold mt-1" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master API Key</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold mt-1" />
                 </div>
                 <div className="flex gap-3 pt-4">
                   <button onClick={() => setIsConfigModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-black uppercase text-xs text-slate-600">Cancel</button>
                   <button onClick={() => { localStorage.setItem('jsonbin_id', binId); localStorage.setItem('jsonbin_key', apiKey); setIsConfigModalOpen(false); fetchFromCloud(); }} className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-600/20">Connect & Sync</button>
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
