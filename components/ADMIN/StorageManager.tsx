import React, { useState, useRef } from 'react';
import { Database, Download, Upload, Server, RefreshCw, Archive, CheckSquare, Square, ChevronDown, Settings, Layers } from 'lucide-react';
import { doc, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// 1. CONFIG & REUSABLE DROPDOWN
// ============================================================================
const BACKUP_OPTS = [
  { id: 'IM_JOBS', label: 'IM Plan & Completed Jobs' },
  { id: 'BM_JOBS', label: 'BM Plan & Completed Jobs' },
  { id: 'IM_PRODUCTS', label: 'IM Product DB' },
  { id: 'BM_PRODUCTS', label: 'BM Product DB' },
  { id: 'DAILY_PLANS', label: 'Daily Production Plans' }
];

const SYS_BACKUP_OPTS = [
  { id: 'ADMIN_CONFIG', label: 'Admin Configuration (Teams, Categories)' },
  { id: 'QA_SETTINGS', label: 'QA Settings (Defects List)' },
  { id: 'PROD_DATA', label: 'Production Data & Summaries' },
  { id: 'KPI_DATA', label: 'KPI Records' }
];

const MultiSelect = ({ opts, sel, onChange, label }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 p-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">
        <span>{sel.length === 0 ? `Select ${label}...` : `${sel.length} Selected`}</span><ChevronDown size={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-2 max-h-48 overflow-y-auto">
          {opts.map((o: any) => (
            <div key={o.id} onClick={() => onChange(sel.includes(o.id) ? sel.filter((i:string) => i !== o.id) : [...sel, o.id])} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
              {sel.includes(o.id) ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} className="text-slate-400" />}
              <span className="text-xs font-bold dark:text-slate-300">{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. MAIN COMPONENT (OPTIMIZED)
// ============================================================================
const StorageManager = ({ onRefresh }: { onRefresh: () => void }) => {
  const { userData } = useAuth();
  const factoryId = userData?.collectionName;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  
  // --- PLANNING DATA STATES ---
  const [expSel, setExpSel] = useState<string[]>(BACKUP_OPTS.map(o => o.id));
  const [impSel, setImpSel] = useState<string[]>([]);
  const [importData, setImportData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- SYSTEM DATA STATES ---
  const [sysExpSel, setSysExpSel] = useState<string[]>(SYS_BACKUP_OPTS.map(o => o.id));
  const [sysImpSel, setSysImpSel] = useState<string[]>([]);
  const [sysImportData, setSysImportData] = useState<any>(null);
  const sysFileRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // --- PLANNING EXPORT (BACKUP) ---
  // ============================================================================
  const handleExport = async () => {
      if (!factoryId) return alert("Factory ID not found! Please login again.");
      if (!expSel.length) return alert("Select items to backup.");
      
      setLoading(true); setMsg('Exporting Data...');
      try {
          const data: any = {};
          const ref = `PLANNING_${factoryId}`;
          const mKey = new Date().toISOString().slice(0, 7);

          const fetchActive = async (t: string) => (await getDocs(collection(db, ref, `${t}_PLANS`, 'ACTIVE_JOBS'))).docs.map(d => ({ id: d.id, ...d.data() }));
          const fetchDoc = async (docName: string) => (await getDoc(doc(db, ref, docName))).data();

          if (expSel.includes('IM_JOBS')) { data.IM_ACTIVE = await fetchActive('IM'); data.IM_COMP = (await fetchDoc(`${mKey}_Completed_IM`))?.items || []; }
          if (expSel.includes('BM_JOBS')) { data.BM_ACTIVE = await fetchActive('BM'); data.BM_COMP = (await fetchDoc(`${mKey}_Completed_BM`))?.items || []; }
          if (expSel.includes('IM_PRODUCTS')) data.IM_PROD = (await fetchDoc('PRODUCT_IM'))?.items || [];
          if (expSel.includes('BM_PRODUCTS')) data.BM_PROD = (await fetchDoc('PRODUCT_BM'))?.items || [];
          if (expSel.includes('DAILY_PLANS')) data.DAILY = await fetchDoc(`DAILY_PLANS_${mKey}`);

          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
          link.download = `${factoryId}_Planning_Backup_${new Date().toISOString().split('T')[0]}.json`;
          link.click(); URL.revokeObjectURL(link.href);
          
          alert('Planning Backup Successful!');
      } catch (e) { console.error(e); alert('Backup Failed!'); } 
      finally { setLoading(false); setMsg(''); }
  };

  // ============================================================================
  // --- PLANNING IMPORT (RESTORE) ---
  // ============================================================================
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      const r = new FileReader();
      r.onload = (ev) => {
          try {
              const parsed = JSON.parse(ev.target?.result as string);
              setImportData(parsed);
              setImpSel(BACKUP_OPTS.filter(o => {
                  if(o.id==='IM_JOBS') return parsed.IM_ACTIVE || parsed.IM_COMP;
                  if(o.id==='BM_JOBS') return parsed.BM_ACTIVE || parsed.BM_COMP;
                  if(o.id==='IM_PRODUCTS') return parsed.IM_PROD;
                  if(o.id==='BM_PRODUCTS') return parsed.BM_PROD;
                  if(o.id==='DAILY_PLANS') return parsed.DAILY;
                  return false;
              }).map(o => o.id));
          } catch { alert('Invalid Backup File'); }
      };
      r.readAsText(file); e.target.value = '';
  };

  const handleRestore = async () => {
      if (!factoryId || !importData || !impSel.length) return;
      if (!window.confirm("WARNING: This will OVERWRITE current planning data! Proceed?")) return;
      
      setLoading(true); setMsg('Restoring Data...');
      try {
          const ref = `PLANNING_${factoryId}`;
          const mKey = new Date().toISOString().slice(0, 7);

          const restoreActive = async (t: string, jobs: any[]) => {
              const colRef = collection(db, ref, `${t}_PLANS`, 'ACTIVE_JOBS');
              for (const j of jobs) await setDoc(doc(colRef, j.jobNo || j.id), j);
          };

          if (impSel.includes('IM_JOBS')) {
              if (importData.IM_ACTIVE) await restoreActive('IM', importData.IM_ACTIVE);
              if (importData.IM_COMP) await setDoc(doc(db, ref, `${mKey}_Completed_IM`), { items: importData.IM_COMP, lastModified: Date.now() });
          }
          if (impSel.includes('BM_JOBS')) {
              if (importData.BM_ACTIVE) await restoreActive('BM', importData.BM_ACTIVE);
              if (importData.BM_COMP) await setDoc(doc(db, ref, `${mKey}_Completed_BM`), { items: importData.BM_COMP, lastModified: Date.now() });
          }
          if (impSel.includes('IM_PRODUCTS') && importData.IM_PROD) await setDoc(doc(db, ref, 'PRODUCT_IM'), { items: importData.IM_PROD, lastModified: Date.now() });
          if (impSel.includes('BM_PRODUCTS') && importData.BM_PROD) await setDoc(doc(db, ref, 'PRODUCT_BM'), { items: importData.BM_PROD, lastModified: Date.now() });
          if (impSel.includes('DAILY_PLANS') && importData.DAILY) await setDoc(doc(db, ref, `DAILY_PLANS_${mKey}`), importData.DAILY);

          alert("Restore Successful! Please refresh."); setImportData(null); onRefresh();
      } catch (e) { console.error(e); alert("Restore Failed!"); } 
      finally { setLoading(false); setMsg(''); }
  };

  // ============================================================================
  // --- SYSTEM DATA EXPORT (BACKUP) ---
  // ============================================================================
  const handleSysExport = async () => {
    if (!factoryId) return alert("Factory ID not found! Please login again.");
    if (!sysExpSel.length) return alert("Select items to backup.");
    
    setLoading(true); setMsg('Exporting System Data...');
    try {
        const data: any = {};

        if (sysExpSel.includes('ADMIN_CONFIG')) {
            data.ADMIN_CONFIG = (await getDoc(doc(db, factoryId, 'admin_config'))).data() || null;
        }
        if (sysExpSel.includes('QA_SETTINGS')) {
            data.QA_SETTINGS = (await getDoc(doc(db, factoryId, 'QA_Settings'))).data() || null;
        }
        if (sysExpSel.includes('PROD_DATA')) {
            const prodDocs = await getDocs(collection(db, factoryId));
            data.PROD_DATA = {};
            prodDocs.forEach(d => {
                if (d.id !== 'admin_config' && d.id !== 'QA_Settings') data.PROD_DATA[d.id] = d.data();
            });
        }
        if (sysExpSel.includes('KPI_DATA')) {
            const kpiDocs = await getDocs(collection(db, `KPI_${factoryId}`));
            data.KPI_DATA = {};
            kpiDocs.forEach(d => { data.KPI_DATA[d.id] = d.data(); });
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.download = `${factoryId}_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click(); URL.revokeObjectURL(link.href);
        
        alert('System Backup Successful!');
    } catch (e) { console.error(e); alert('System Backup Failed!'); } 
    finally { setLoading(false); setMsg(''); }
  };

  // ============================================================================
  // --- SYSTEM DATA IMPORT (RESTORE) ---
  // ============================================================================
  const handleSysFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      const r = new FileReader();
      r.onload = (ev) => {
          try {
              const parsed = JSON.parse(ev.target?.result as string);
              setSysImportData(parsed);
              setSysImpSel(SYS_BACKUP_OPTS.filter(o => {
                  if(o.id==='ADMIN_CONFIG') return parsed.ADMIN_CONFIG;
                  if(o.id==='QA_SETTINGS') return parsed.QA_SETTINGS;
                  if(o.id==='PROD_DATA') return parsed.PROD_DATA;
                  if(o.id==='KPI_DATA') return parsed.KPI_DATA;
                  return false;
              }).map(o => o.id));
          } catch { alert('Invalid System Backup File'); }
      };
      r.readAsText(file); e.target.value = '';
  };

  const handleSysRestore = async () => {
      if (!factoryId || !sysImportData || !sysImpSel.length) return;
      if (!window.confirm("WARNING: This will OVERWRITE current System data! Proceed?")) return;
      
      setLoading(true); setMsg('Restoring System Data...');
      try {
          if (sysImpSel.includes('ADMIN_CONFIG') && sysImportData.ADMIN_CONFIG) {
              await setDoc(doc(db, factoryId, 'admin_config'), sysImportData.ADMIN_CONFIG);
          }
          if (sysImpSel.includes('QA_SETTINGS') && sysImportData.QA_SETTINGS) {
              await setDoc(doc(db, factoryId, 'QA_Settings'), sysImportData.QA_SETTINGS);
          }
          if (sysImpSel.includes('PROD_DATA') && sysImportData.PROD_DATA) {
              for (const [docId, docData] of Object.entries(sysImportData.PROD_DATA)) {
                  await setDoc(doc(db, factoryId, docId), docData as any);
              }
          }
          if (sysImpSel.includes('KPI_DATA') && sysImportData.KPI_DATA) {
              for (const [docId, docData] of Object.entries(sysImportData.KPI_DATA)) {
                  await setDoc(doc(db, `KPI_${factoryId}`, docId), docData as any);
              }
          }
          alert("System Restore Successful! Please refresh."); setSysImportData(null); onRefresh();
      } catch (e) { console.error(e); alert("System Restore Failed!"); } 
      finally { setLoading(false); setMsg(''); }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {/* ===================================================== */}
        {/* PLANNING DATA BACKUP SECTION */}
        {/* ===================================================== */}
        
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex items-center gap-5">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg"><Database className="w-6 h-6" /></div>
            <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Planning Data Management</h2>
                <p className="text-indigo-200 font-bold text-[10px] uppercase tracking-widest mt-1 opacity-80">Backup & Restore Planning Database</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PLANNING EXPORT */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border dark:border-slate-800 shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Server size={20} /></div>
                    <h3 className="text-sm font-black text-indigo-600 uppercase">Export Backup</h3>
                </div>
                <MultiSelect opts={BACKUP_OPTS} sel={expSel} onChange={setExpSel} label="Export" />
                <button onClick={handleExport} disabled={loading} className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2 transition-all">
                    {loading && msg.includes('Exporting Data') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {loading && msg.includes('Exporting Data') ? msg : 'Download JSON'}
                </button>
            </div>

            {/* PLANNING IMPORT */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border dark:border-slate-800 shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl"><Archive size={20} /></div>
                    <h3 className="text-sm font-black text-amber-600 uppercase">Restore Backup</h3>
                </div>
                {!importData ? (
                    <button onClick={() => fileRef.current?.click()} className="w-full mt-10 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
                        <Upload className="w-4 h-4" /> Select Backup File
                    </button>
                ) : (
                    <div className="animate-fade-in">
                        <MultiSelect opts={BACKUP_OPTS.filter(o => {
                           if(o.id==='IM_JOBS') return importData.IM_ACTIVE || importData.IM_COMP;
                           if(o.id==='BM_JOBS') return importData.BM_ACTIVE || importData.BM_COMP;
                           if(o.id==='IM_PRODUCTS') return importData.IM_PROD;
                           if(o.id==='BM_PRODUCTS') return importData.BM_PROD;
                           if(o.id==='DAILY_PLANS') return importData.DAILY;
                           return false;
                        })} sel={impSel} onChange={setImpSel} label="Restore" />
                        <div className="flex gap-2">
                            <button onClick={() => setImportData(null)} disabled={loading} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-xs font-black uppercase rounded-lg">Cancel</button>
                            <button onClick={handleRestore} disabled={loading} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2">
                                {loading && msg.includes('Restoring Data') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />} {loading && msg.includes('Restoring Data') ? msg : 'Confirm Restore'}
                            </button>
                        </div>
                    </div>
                )}
                <input type="file" ref={fileRef} onChange={handleFile} accept=".json" className="hidden" />
            </div>
        </div>

        {/* ===================================================== */}
        {/* SYSTEM DATA BACKUP SECTION */}
        {/* ===================================================== */}
        
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex items-center gap-5 mt-10">
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg"><Settings className="w-6 h-6" /></div>
            <div>
                <h2 className="text-xl font-black uppercase tracking-tight">System & Production Master Data</h2>
                <p className="text-emerald-200 font-bold text-[10px] uppercase tracking-widest mt-1 opacity-80">Backup & Restore Main System Database</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* SYSTEM EXPORT */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border dark:border-slate-800 shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Layers size={20} /></div>
                    <h3 className="text-sm font-black text-emerald-600 uppercase">Export System Backup</h3>
                </div>
                <MultiSelect opts={SYS_BACKUP_OPTS} sel={sysExpSel} onChange={setSysExpSel} label="System Export" />
                <button onClick={handleSysExport} disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2 transition-all">
                    {loading && msg.includes('System') && msg.includes('Export') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {loading && msg.includes('System') && msg.includes('Export') ? msg : 'Download JSON'}
                </button>
            </div>

            {/* SYSTEM IMPORT */}
            <div className="bg-white dark:bg-[#0F172A] rounded-[2rem] border dark:border-slate-800 shadow-md p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl"><Archive size={20} /></div>
                    <h3 className="text-sm font-black text-amber-600 uppercase">Restore System Backup</h3>
                </div>
                {!sysImportData ? (
                    <button onClick={() => sysFileRef.current?.click()} className="w-full mt-10 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
                        <Upload className="w-4 h-4" /> Select System Backup
                    </button>
                ) : (
                    <div className="animate-fade-in">
                        <MultiSelect opts={SYS_BACKUP_OPTS.filter(o => {
                           if(o.id==='ADMIN_CONFIG') return sysImportData.ADMIN_CONFIG;
                           if(o.id==='QA_SETTINGS') return sysImportData.QA_SETTINGS;
                           if(o.id==='PROD_DATA') return sysImportData.PROD_DATA;
                           if(o.id==='KPI_DATA') return sysImportData.KPI_DATA;
                           return false;
                        })} sel={sysImpSel} onChange={setSysImpSel} label="System Restore" />
                        <div className="flex gap-2">
                            <button onClick={() => setSysImportData(null)} disabled={loading} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-xs font-black uppercase rounded-lg">Cancel</button>
                            <button onClick={handleSysRestore} disabled={loading} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-lg flex justify-center items-center gap-2">
                                {loading && msg.includes('System') && msg.includes('Restoring') ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />} {loading && msg.includes('System') && msg.includes('Restoring') ? msg : 'Confirm Restore'}
                            </button>
                        </div>
                    </div>
                )}
                <input type="file" ref={sysFileRef} onChange={handleSysFile} accept=".json" className="hidden" />
            </div>
        </div>

    </div>
  );
};

export default StorageManager;