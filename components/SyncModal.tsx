import React, { useRef } from 'react';
import { Cloud, CloudOff, RefreshCw, Download, Upload, X, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminConfig } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCloudEnabled: boolean;
  toggleCloudSync: (val: boolean) => void;
  cloudStatus: string;
  localStatus: string;
  lastSyncTime: string | null;
  adminConfig: AdminConfig;
}

const SyncModal: React.FC<SyncModalProps> = ({ 
  isOpen, onClose, isCloudEnabled, toggleCloudSync, cloudStatus, localStatus, lastSyncTime, adminConfig
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = () => {
    try {
        const fullBackup: Record<string, any> = { adminConfig };
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('fmj_data_')) {
                const monthData = JSON.parse(localStorage.getItem(key) || '{}');
                Object.assign(fullBackup, monthData);
            }
        }
        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `fmj_backup_full.json`;
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
        if(window.confirm('Restore? This will overwrite local data.')) { 
            Object.keys(localStorage).forEach(k => { if(k.startsWith('fmj_data_') || k === 'fmj_settings') localStorage.removeItem(k); });
            if(parsed.adminConfig) localStorage.setItem('fmj_settings', JSON.stringify(parsed.adminConfig));
            const monthMap: Record<string, Record<string, any>> = {};
            Object.keys(parsed).forEach(key => {
                if(key === 'adminConfig') return;
                const match = key.match(/^(\d{4}-\d{2})/);
                if(match) {
                    if(!monthMap[match[1]]) monthMap[match[1]] = {};
                    monthMap[match[1]][key] = parsed[key];
                }
            });
            Object.keys(monthMap).forEach(m => localStorage.setItem(`fmj_data_${m}`, JSON.stringify(monthMap[m])));
            window.location.reload();
        }
      } catch { alert('Invalid file.'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                 <div><h3 className="text-base font-black dark:text-white uppercase tracking-tight">System Status</h3></div>
                 <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"><X size={18}/></button>
             </div>
             <div className="p-6 space-y-5">
                 <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#151b2e] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4"><div className={`p-3 rounded-2xl ${isCloudEnabled ? 'bg-sky-500/10 text-sky-500' : 'bg-slate-500/10 text-slate-400'}`}>{isCloudEnabled ? <Cloud size={24} /> : <CloudOff size={24} />}</div><div><div className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">Cloud Sync</div><div className="text-[10px] font-bold text-slate-400 mt-0.5">{isCloudEnabled ? 'Auto-Backup Enabled' : 'Local Only'}</div></div></div>
                     <button onClick={() => toggleCloudSync(!isCloudEnabled)} className="transition-transform active:scale-95 focus:outline-none">{isCloudEnabled ? <ToggleRight size={40} className="text-sky-500 drop-shadow-md"/> : <ToggleLeft size={40} className="text-slate-500"/>}</button>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                     <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#151b2e] border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center shadow-sm">
                         <div className={`p-3 rounded-full mb-3 ${localStatus === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{localStatus === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}</div>
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Local Storage</span><span className={`text-xs font-bold mt-1 ${localStatus === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{localStatus === 'success' ? 'Saved' : 'Error'}</span>
                     </div>
                     <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#151b2e] border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center shadow-sm opacity-90">
                         <div className={`p-3 rounded-full mb-3 ${!isCloudEnabled ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : cloudStatus === 'success' ? 'bg-sky-500/10 text-sky-500' : cloudStatus === 'syncing' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>{!isCloudEnabled ? <CloudOff size={24} /> : cloudStatus === 'syncing' ? <RefreshCw className="animate-spin" size={24} /> : cloudStatus === 'success' ? <Cloud size={24} /> : <AlertCircle size={24} />}</div>
                         <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cloud Status</span><span className={`text-xs font-bold mt-1 ${!isCloudEnabled ? 'text-slate-400' : cloudStatus === 'success' ? 'text-sky-500' : cloudStatus === 'syncing' ? 'text-amber-500' : 'text-rose-500'}`}>{!isCloudEnabled ? 'Disabled' : cloudStatus === 'success' ? 'Synced' : cloudStatus === 'syncing' ? 'Syncing...' : 'Offline'}</span>
                     </div>
                 </div>
                 {isCloudEnabled && (
                     <div className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 py-2 rounded-xl border border-slate-200 dark:border-slate-800/50">Last Cloud Sync: <span className="text-slate-700 dark:text-slate-200 ml-1">{lastSyncTime || 'Pending...'}</span></div>
                 )}
                 <div className="pt-2 grid grid-cols-2 gap-3">
                     <button onClick={handleExportData} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group shadow-sm hover:shadow-md"><Download className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Backup</span></button>
                     <button onClick={handleImportClick} className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group shadow-sm hover:shadow-md"><Upload className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Restore</span></button>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                 </div>
             </div>
          </div>
        </div>
  );
};

export default SyncModal;