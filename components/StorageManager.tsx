import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Trash2, Download, Upload, Server, CalendarDays, 
  RefreshCw, Archive, PieChart, Activity, HardDrive
} from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  onRefresh: () => void;
}

const StorageManager: React.FC<Props> = ({ onRefresh }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // --- USAGE METRICS (Estimated) ---
  const [storageSize, setStorageSize] = useState(0); // in KB
  const [dailyReads, setDailyReads] = useState(0);
  const [dailyWrites, setDailyWrites] = useState(0);

  // Calculate Estimation on Load
  useEffect(() => {
      const dataStr = localStorage.getItem('fmj_pro_db_v2');
      if (dataStr) {
          // 1. Calculate Size (Approx bytes -> KB)
          const sizeBytes = new Blob([dataStr]).size;
          setStorageSize(sizeBytes / 1024);

          // 2. Estimate Reads (Based on Object Keys)
          const data = JSON.parse(dataStr);
          // Assuming 1 key = 1 read session in granular mode mostly
          const recordsCount = Object.keys(data).length;
          // Rough estimation: Base load (records) + buffer
          setDailyReads(Math.min(50000, recordsCount * 2 + 50)); 
          
          // 3. Estimate Writes (Based on today's modification count if tracked, else static estimate)
          // For now, static safe estimate relative to size
          setDailyWrites(Math.min(20000, Math.floor(recordsCount / 5) + 20));
      }
  }, []);

  // --- ACTIONS ---
  const handleClearData = async () => {
    if (!startDate || !endDate) { alert("Select date range."); return; }
    if (!window.confirm("WARNING: Permanent deletion. Proceed?")) return;

    setIsProcessing(true);
    setStatusMsg('Analyzing data...');

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const keysToDelete: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        keysToDelete.push(`${dateStr}_IM`, `${dateStr}_BM`);
      }

      // Local Clear
      const localStr = localStorage.getItem('fmj_pro_db_v2');
      if (localStr) {
        const localData = JSON.parse(localStr);
        keysToDelete.forEach(k => delete localData[k]);
        localStorage.setItem('fmj_pro_db_v2', JSON.stringify(localData));
      }

      // Cloud Clear
      const distinctMonths = new Set<string>();
      keysToDelete.forEach(k => distinctMonths.add(k.substring(0, 7)));

      for (const monthDocId of Array.from(distinctMonths)) {
         setStatusMsg(`Cleaning Cloud: ${monthDocId}...`);
         const docRef = doc(db, 'production_data', monthDocId);
         const updates: Record<string, any> = {};
         let hasUpdates = false;

         keysToDelete.forEach(k => {
             if (k.startsWith(monthDocId)) {
                 updates[`entries.${k}`] = deleteField();
                 hasUpdates = true;
             }
         });

         if (hasUpdates) {
             updates['last_sync'] = new Date().toISOString();
             await updateDoc(docRef, updates).catch(() => {});
         }
      }

      setStatusMsg('Done!');
      setTimeout(() => {
          setStartDate(''); setEndDate(''); setIsProcessing(false); setStatusMsg('');
          onRefresh();
          alert('Cleanup Complete.');
      }, 800);

    } catch (err) {
      console.error(err); setIsProcessing(false); alert('Error occurred.');
    }
  };

  const handleBackup = () => {
      try {
          const dataStr = localStorage.getItem('fmj_pro_db_v2');
          if(!dataStr) return;
          const url = URL.createObjectURL(new Blob([dataStr], {type:'application/json'}));
          const link = document.createElement('a'); link.href = url; link.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } catch { alert('Backup Failed'); }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      const r = new FileReader();
      r.onload = (ev) => {
          try {
              const d = JSON.parse(ev.target?.result as string);
              if(window.confirm("Restore backup? Overwrites current data.")) {
                  localStorage.setItem('fmj_pro_db_v2', JSON.stringify(d));
                  onRefresh();
              }
          } catch { alert('Invalid file'); }
      };
      r.readAsText(file); e.target.value = '';
  };

  // Helper for progress bar color
  const getProgressColor = (val: number, max: number) => {
      const pct = (val / max) * 100;
      if (pct < 50) return 'bg-emerald-500';
      if (pct < 80) return 'bg-amber-500';
      return 'bg-rose-500';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {/* HEADER */}
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden border border-slate-700">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="relative z-10 flex items-center gap-5">
                <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg ring-4 ring-white/10">
                    <Database className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Storage Management</h2>
                    <p className="text-indigo-200 font-bold text-[10px] uppercase tracking-widest mt-1 opacity-80">Cloud Cleanup & Disaster Recovery</p>
                </div>
            </div>
        </div>

        {/* METRICS DASHBOARD (NEW) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Storage Usage */}
            <div className="bg-white dark:bg-[#0F172A] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Size</h4>
                        <span className="text-xl font-black text-slate-800 dark:text-white">{storageSize.toFixed(2)} <span className="text-xs text-slate-500">KB</span></span>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500"><HardDrive className="w-5 h-5"/></div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getProgressColor(storageSize, 1024*1024)} transition-all duration-1000`} style={{ width: `${Math.min((storageSize / (1024*1024))*100, 100)}%` }}></div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 text-right">Limit: 1 GB (Free Tier)</p>
            </div>

            {/* Reads */}
            <div className="bg-white dark:bg-[#0F172A] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-sky-600"></div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Daily Reads</h4>
                        <span className="text-xl font-black text-slate-800 dark:text-white">{dailyReads.toLocaleString()} <span className="text-xs text-slate-500">ops</span></span>
                    </div>
                    <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-xl text-sky-500"><PieChart className="w-5 h-5"/></div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full ${getProgressColor(dailyReads, 50000)} transition-all duration-1000`} style={{ width: `${(dailyReads / 50000) * 100}%` }}></div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 text-right">Limit: 50k / Day</p>
            </div>

            {/* Writes */}
            <div className="bg-white dark:bg-[#0F172A] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Daily Writes</h4>
                        <span className="text-xl font-black text-slate-800 dark:text-white">{dailyWrites.toLocaleString()} <span className="text-xs text-slate-500">ops</span></span>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500"><Activity className="w-5 h-5"/></div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full ${getProgressColor(dailyWrites, 20000)} transition-all duration-1000`} style={{ width: `${(dailyWrites / 20000) * 100}%` }}></div>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 text-right">Limit: 20k / Day</p>
            </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CLEANUP ACTIONS */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">System Purge</h3>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Remove historical data (Irreversible)</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-4">
                     <div className="flex gap-4">
                         <div className="flex-1 space-y-1">
                             <label className="text-[9px] font-black uppercase text-slate-400">Start Date</label>
                             <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl">
                                 <CalendarDays className="w-4 h-4 text-slate-400" />
                                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent w-full text-xs font-bold text-slate-700 dark:text-white outline-none uppercase dark:[color-scheme:dark]" />
                             </div>
                         </div>
                         <div className="flex-1 space-y-1">
                             <label className="text-[9px] font-black uppercase text-slate-400">End Date</label>
                             <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl">
                                 <CalendarDays className="w-4 h-4 text-slate-400" />
                                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent w-full text-xs font-bold text-slate-700 dark:text-white outline-none uppercase dark:[color-scheme:dark]" />
                             </div>
                         </div>
                     </div>

                     {isProcessing ? (
                         <div className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                             <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                             <span className="text-xs font-bold text-slate-400">{statusMsg}</span>
                         </div>
                     ) : (
                         <button onClick={handleClearData} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
                             <Trash2 className="w-4 h-4" /> Clear Records
                         </button>
                     )}
                </div>
            </div>

            {/* BACKUP RESTORE */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><Server className="w-5 h-5" /></div>
                         <div>
                             <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Manual Backup</h3>
                             <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Download or restore JSON snapshots</p>
                         </div>
                    </div>
                </div>

                <div className="p-6 flex-1 grid grid-cols-1 gap-3 content-center">
                    <button onClick={handleBackup} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-900/30 transition-all active:scale-95">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Archive className="w-5 h-5" /></div>
                            <div className="text-left">
                                <h4 className="text-xs font-black text-slate-700 dark:text-white uppercase">Download DB</h4>
                            </div>
                        </div>
                        <Download className="w-4 h-4 text-emerald-500" />
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/50 dark:bg-slate-900/30 transition-all active:scale-95">
                         <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl"><Upload className="w-5 h-5" /></div>
                            <div className="text-left">
                                <h4 className="text-xs font-black text-slate-700 dark:text-white uppercase">Upload Backup</h4>
                            </div>
                         </div>
                         <Upload className="w-4 h-4 text-amber-500" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
                </div>
            </div>

        </div>
    </div>
  );
};

export default StorageManager;