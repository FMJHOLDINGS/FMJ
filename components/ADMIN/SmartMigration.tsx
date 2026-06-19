import React, { useState } from 'react';
import { Server, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface Props {
  collectionName: string;
}

const SmartMigration: React.FC<Props> = ({ collectionName }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deleteOld, setDeleteOld] = useState(false); // පරණ ඒවා මකන්නද?

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

  const handleMigration = async () => {
    if (!collectionName) return alert("System Error: No Collection Name");
    if (!startDate || !endDate) return alert("Please select date range");
    if (!window.confirm("Start Data Migration? This will copy data to the new structure.")) return;

    setIsMigrating(true);
    setLogs([]);
    addLog("🚀 Starting Migration...");

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        addLog(`Processing: ${dateStr}...`);

        // 1. පරණ තැන් වලින් දත්ත කියවීම (Read Old Data)
        const imRef = doc(db, collectionName, `${dateStr}_IM`);
        const bmRef = doc(db, collectionName, `${dateStr}_BM`);
        const supRef = doc(db, collectionName, `${dateStr}_SUPERVISORS`);

        const [imSnap, bmSnap, supSnap] = await Promise.all([
          getDoc(imRef), getDoc(bmRef), getDoc(supRef)
        ]);

        if (!imSnap.exists() && !bmSnap.exists() && !supSnap.exists()) {
          // addLog(`Skipped: No data for ${dateStr}`);
          continue;
        }

        // 2. දත්ත සකස් කිරීම (Combine Data)
        const newData = {
          IM: imSnap.exists() ? imSnap.data() : null,
          BM: bmSnap.exists() ? bmSnap.data() : null,
          supervisors: supSnap.exists() ? supSnap.data() : null
        };

        // 3. අලුත් තැනට සේව් කිරීම (Save to Single Doc)
        // Merge භාවිතා කරයි, එවිට වෙනත් දත්ත මැකෙන්නේ නෑ
        await setDoc(doc(db, collectionName, dateStr), newData, { merge: true });
        addLog(`✅ Migrated: ${dateStr}`);

        // 4. (Optional) පරණ ඒවා මැකීම
        if (deleteOld) {
           if (imSnap.exists()) await deleteDoc(imRef);
           if (bmSnap.exists()) await deleteDoc(bmRef);
           if (supSnap.exists()) await deleteDoc(supRef);
           addLog(`🗑️ Deleted old docs for ${dateStr}`);
        }
      }

      addLog("🎉 Migration Complete!");
      alert("Migration Successfully Completed!");

    } catch (error) {
      console.error(error);
      addLog(`❌ Error: ${error}`);
      alert("Error during migration. Check logs.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col mt-6">
       {/* Header */}
       <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><Server className="w-5 h-5" /></div>
             <div>
                <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">System Migration Tool</h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Upgrade data to "Single-Document" structure</p>
             </div>
          </div>
       </div>

       {/* Controls */}
       <div className="p-6 space-y-4">
          <div className="flex gap-4">
             <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none dark:[color-scheme:dark]" />
             </div>
             <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none dark:[color-scheme:dark]" />
             </div>
          </div>

          <div className="flex items-center gap-2">
             <input type="checkbox" id="delOld" checked={deleteOld} onChange={e => setDeleteOld(e.target.checked)} className="rounded border-slate-300" />
             <label htmlFor="delOld" className="text-xs text-slate-500 font-bold select-none cursor-pointer">Delete old documents after migration (Optional)</label>
          </div>

          <button onClick={handleMigration} disabled={isMigrating} className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isMigrating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}>
             {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
             {isMigrating ? 'Migrating...' : 'Start Migration'}
          </button>

          {/* Logs Console */}
          <div className="bg-slate-900 rounded-xl p-3 h-32 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1 border border-slate-700">
             {logs.length === 0 && <span className="text-slate-600 italic">Logs will appear here...</span>}
             {logs.map((log, i) => (
                <div key={i} className={`flex items-center gap-2 ${log.includes('Error') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}`}>
                   <span>{log.includes('✅') ? <CheckCircle2 size={10}/> : log.includes('Error') ? <AlertCircle size={10}/> : '>'}</span>
                   <span>{log}</span>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default SmartMigration;