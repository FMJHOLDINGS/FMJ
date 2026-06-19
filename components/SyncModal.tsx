import React from 'react';
import { Cloud, CloudOff, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminConfig } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  // මේවා තවදුරටත් Props ලෙස එවන නමුත් භාවිතයට නොගනී (Compatibility සඳහා තබා ඇත)
  isCloudEnabled?: boolean; 
  toggleCloudSync?: (val: boolean) => void;
  localStatus?: string;
  adminConfig?: AdminConfig;
  
  // අවශ්‍යම Props දෙක
  cloudStatus: string; 
  lastSyncTime: string | Date | null;
}

const SyncModal: React.FC<SyncModalProps> = ({ 
  isOpen, onClose, cloudStatus, lastSyncTime 
}) => {

    const formatTime = (time: string | Date | null) => {
        if (!time) return 'Pending...';
        
    
        const dateObj = new Date(time); 
        
        return dateObj.toLocaleString('en-US', { 
            year: 'numeric', month: 'short', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true // AM/PM පෙන්වීමට
        });
    };

    
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B1121] w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-white/10 scale-100 animate-in zoom-in-95 duration-200">
             
             {/* Header */}
             <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                 <div><h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">System Status</h3></div>
                 <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"><X size={18}/></button>
             </div>
             
             <div className="p-6 space-y-6">
                 
                 {/* 🟢 Cloud Status Card (ප්‍රධාන දර්ශකය) */}
                 <div className="flex flex-col items-center text-center">
                     <div className={`p-4 rounded-full mb-4 shadow-sm border ${
                         cloudStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border-emerald-100 dark:border-emerald-500/20' : 
                         cloudStatus === 'syncing' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 border-amber-100 dark:border-amber-500/20' : 
                         'bg-rose-50 dark:bg-rose-500/10 text-rose-500 border-rose-100 dark:border-rose-500/20'
                     }`}>
                         {cloudStatus === 'syncing' ? <RefreshCw className="animate-spin" size={40} /> : 
                          cloudStatus === 'success' ? <Cloud size={40} /> : 
                          <CloudOff size={40} />}
                     </div>
                     <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                         {cloudStatus === 'success' ? 'Fully Synced' : 
                          cloudStatus === 'syncing' ? 'Syncing Data...' : 
                          'Offline / Error'}
                     </h4>
                     <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-4">
                         {cloudStatus === 'success' ? 'All your data is securely saved in the cloud.' : 
                          cloudStatus === 'syncing' ? 'Updating your recent changes to the cloud.' : 
                          'Unable to connect. Check your internet connection.'}
                     </p>
                 </div>

                 <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>

                 {/* 🟢 Last Updated Time */}
                 <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#151b2e] border border-slate-100 dark:border-slate-800 shadow-sm">
                     <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${cloudStatus === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                             {cloudStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                         </div>
                         <div className="flex flex-col text-left">
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Last Updated</span>
                             <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatTime(lastSyncTime)}</span>
                         </div>
                     </div>
                 </div>

             </div>
          </div>
        </div>
  );
};

export default SyncModal;