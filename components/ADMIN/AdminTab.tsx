import React, { useState, useEffect } from 'react';
import { AdminConfig } from '../../types';
import { Database, AlertOctagon, Settings, Users, ShieldAlert, HardDrive, UserPlus, Lock, Palette } from 'lucide-react'; // 🟢 Palette icon එකතු කළා
import { useAuth } from '../../context/AuthContext';

// Import Sub Components
import StorageManager from './StorageManager';
import AdminItemAdd from './AdminItemAdd';
import AdmBreakdownsAdd from './AdmBreakdownsAdd';
import AdminQaDefectsAdd from './AdminQaDefectsAdd';
import AdminTeamsAdd from './AdminTeamsAdd';
import AdminRegisterUser from './AdminRegisterUser';
import AdminUISettings from './AdminUISettings'; // 🟢 අලුත් ගොනුව Import කළා

interface Props {
   config: AdminConfig;
   onUpdate: (config: AdminConfig) => void;
}

const AdminTab: React.FC<Props> = ({ config, onUpdate }) => {
   // 🟢 'UI_SETTINGS' අලුතින් එකතු කළා
   const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATS' | 'TEAMS' | 'QA' | 'STORAGE' | 'REGISTER' | 'UI_SETTINGS'>('ITEMS');
   
   const { userData } = useAuth();
   const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin';

   useEffect(() => {
       if (onUpdate && config) {
           const safeConfig = {
               productionItems: config.productionItems || [],
               breakdownCategories: config.breakdownCategories || [],
               shiftTeams: config.shiftTeams || [],
               qaCategories: (config as any).qaCategories || []
           };
           if (!config.productionItems || !(config as any).qaCategories) {
               onUpdate(safeConfig as AdminConfig);
           }
       }
   }, [onUpdate]);

   return (
      <div className="p-8 space-y-8 animate-fade-in pb-24 max-w-7xl mx-auto">

         {/* HEADER */}
         <div className="flex flex-col xl:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4 transition-all">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2.5 rounded-xl"><Settings className="w-5 h-5" /></div>
               <div>
                  <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">System Admin</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Master Data Control</p>
               </div>
            </div>

            <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
               <TabButton active={activeTab === 'ITEMS'} icon={Database} label="Items" onClick={() => setActiveTab('ITEMS')} color="indigo" />
               <TabButton active={activeTab === 'CATS'} icon={AlertOctagon} label="Breakdowns" onClick={() => setActiveTab('CATS')} color="rose" />
               <TabButton active={activeTab === 'QA'} icon={ShieldAlert} label="QA Defects" onClick={() => setActiveTab('QA')} color="amber" />
               <TabButton active={activeTab === 'TEAMS'} icon={Users} label="Teams" onClick={() => setActiveTab('TEAMS')} color="emerald" />
               
               <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 self-center hidden md:block"></div>
               <TabButton active={activeTab === 'STORAGE'} icon={HardDrive} label="Storage" onClick={() => setActiveTab('STORAGE')} color="cyan" />
               <TabButton active={activeTab === 'UI_SETTINGS'} icon={Palette} label="UI Settings" onClick={() => setActiveTab('UI_SETTINGS')} color="fuchsia" /> {/* 🟢 අලුත් බොත්තම */}
               <TabButton active={activeTab === 'REGISTER'} icon={UserPlus} label="Register" onClick={() => setActiveTab('REGISTER')} color="violet" />
            </div>
         </div>

         {/* --- CONTENT AREA --- */}
         {activeTab === 'ITEMS' && <AdminItemAdd config={config} onUpdate={onUpdate} />}
         {activeTab === 'CATS' && <AdmBreakdownsAdd config={config} onUpdate={onUpdate} />}
         {activeTab === 'QA' && <AdminQaDefectsAdd config={config} onUpdate={onUpdate} />}
         {activeTab === 'TEAMS' && <AdminTeamsAdd config={config} onUpdate={onUpdate} />}
         {activeTab === 'STORAGE' && <StorageManager onRefresh={() => window.location.reload()} />}
         
         {/* 🟢 අලුත් UI Settings Content එක */}
         {activeTab === 'UI_SETTINGS' && <AdminUISettings />}

         {activeTab === 'REGISTER' && (
             isAdmin ? (
                 <AdminRegisterUser />
             ) : (
                 <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm text-center animate-fade-in">
                     <div className="p-6 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full mb-6 ring-8 ring-rose-50/50 dark:ring-rose-900/10">
                         <Lock size={48} />
                     </div>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Access Restricted</h3>
                     <p className="text-slate-500 font-medium mt-2 max-w-md">
                         You do not have permission to view this section. <br/>
                         Please log in with an <span className="text-rose-500 font-bold">Administrator</span> account.
                     </p>
                 </div>
             )
         )}

      </div>
   );
};

const TabButton = ({ active, icon: Icon, label, onClick, color }: any) => {
   const colorClasses: Record<string, string> = {
       indigo: active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600',
       rose: active ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-500 hover:text-rose-500',
       amber: active ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-amber-500',
       emerald: active ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-500',
       cyan: active ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-cyan-500',
       violet: active ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-violet-600',
       fuchsia: active ? 'bg-fuchsia-500 text-white shadow-lg' : 'text-slate-500 hover:text-fuchsia-500', // 🟢 අලුත් බොත්තමේ පාට
   };

   return (
       <button onClick={onClick} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${colorClasses[color]}`}>
           <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{label}</span>
       </button>
   );
};

export default AdminTab;