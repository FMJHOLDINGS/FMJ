import React, { useState, useEffect } from 'react';
import { AdminConfig, ProductionItem, MachineType, ProductType } from '../types';
import { Plus, Trash2, Database, AlertOctagon, Settings, Users, ShieldAlert } from 'lucide-react';

interface Props {
   config: AdminConfig;
   onUpdate: (config: AdminConfig) => void;
}

const AdminTab: React.FC<Props> = ({ config, onUpdate }) => {
   const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATS' | 'TEAMS' | 'QA'>('ITEMS');
   const [activeMachineType, setActiveMachineType] = useState<MachineType>('IM'); 

   // --- ITEM STATE ---
   const [newItem, setNewItem] = useState<Partial<ProductionItem>>({
      machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: '', productType: 'Preform'
   });
   const [itemErrors, setItemErrors] = useState<Record<string, boolean>>({});

   // --- BREAKDOWN CAT STATE ---
   const [newCategory, setNewCategory] = useState('');
   const [categoryError, setCategoryError] = useState<string>('');

   // --- QA DEFECT STATE ---
   const [newDefect, setNewDefect] = useState('');
   const [defectError, setDefectError] = useState<string>('');

   // --- TEAM STATE ---
   const [newTeam, setNewTeam] = useState('');
   const [teamError, setTeamError] = useState<string>('');

   // Safe Initialization (Prevents Crash)
   useEffect(() => {
       if (onUpdate && config) {
           const safeConfig = {
               productionItems: config.productionItems || [],
               breakdownCategories: config.breakdownCategories || [],
               shiftTeams: config.shiftTeams || [],
               qaCategories: (config as any).qaCategories || []
           };
           // Only update if something is missing to prevent infinite loops
           if (!config.productionItems || !(config as any).qaCategories) {
               onUpdate(safeConfig as AdminConfig);
           }
       }
   }, [onUpdate]); // Added dependency to prevent stale closure

   // 1. ADD ITEM
   const addItem = () => {
      if (!onUpdate) return; // Safety check

      const errors: Record<string, boolean> = {};
      if (!newItem.machine?.trim()) errors.machine = true;
      if (!newItem.itemName?.trim()) errors.itemName = true;

      setItemErrors(errors);
      if (Object.keys(errors).length > 0) return;
      
      const item: ProductionItem = {
         id: `itm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
         machine: newItem.machine!.trim().toUpperCase(),
         itemName: newItem.itemName!.trim(),
         customerName: newItem.customerName?.trim() || '-',
         unitWeight: Number(newItem.unitWeight) || 0,
         jobNo: newItem.jobNo?.trim() || '-',
         type: activeMachineType,
         productType: activeMachineType === 'IM' ? (newItem.productType as ProductType) : undefined
      };

      const updatedConfig = { 
          ...config, 
          productionItems: [...(config.productionItems || []), item] 
      };
      
      onUpdate(updatedConfig);
      setNewItem({ machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: '', productType: 'Preform' });
      setItemErrors({}); 
   };
   
   const handleItemChange = (field: keyof ProductionItem, value: any) => {
      setNewItem(prev => ({ ...prev, [field]: value }));
      if (itemErrors[field]) setItemErrors(prev => ({ ...prev, [field]: false }));
   };

   const deleteItem = (id: string) => {
       if (!onUpdate) return;
       if (!window.confirm("Remove this item?")) return;
       const updatedConfig = {
           ...config,
           productionItems: (config.productionItems || []).filter(i => i.id !== id)
       };
       onUpdate(updatedConfig);
   };

   // 2. ADD BREAKDOWN CATEGORY
   const addCategory = () => {
      if (!onUpdate) return;
      const trimmedCat = newCategory.trim();
      if (!trimmedCat) return;
      
      const currentCats = config.breakdownCategories || [];
      if (currentCats.some(c => c.toLowerCase() === trimmedCat.toLowerCase())) {
         setCategoryError("Category exists!");
         return;
      }
      
      const updatedConfig = { ...config, breakdownCategories: [...currentCats, trimmedCat] };
      onUpdate(updatedConfig);
      setNewCategory('');
      setCategoryError(''); 
   };

   const deleteCategory = (cat: string) => {
       if (!onUpdate) return;
       if (!window.confirm("Remove category?")) return;
       const updatedConfig = {
           ...config,
           breakdownCategories: (config.breakdownCategories || []).filter(c => c !== cat)
       };
       onUpdate(updatedConfig);
   };

   // 3. ADD SHIFT TEAM
   const addTeam = () => {
      if (!onUpdate) return;
      const trimmedTeam = newTeam.trim();
      if (!trimmedTeam) return;

      const currentTeams = config.shiftTeams || [];
      if (currentTeams.some(t => t.toLowerCase() === trimmedTeam.toLowerCase())) {
         setTeamError("Team exists!");
         return;
      }
      
      const updatedConfig = { ...config, shiftTeams: [...currentTeams, trimmedTeam] };
      onUpdate(updatedConfig);
      setNewTeam('');
      setTeamError(''); 
   };

   const deleteTeam = (team: string) => {
       if (!onUpdate) return;
       if (!window.confirm("Remove team?")) return;
       const updatedConfig = {
           ...config,
           shiftTeams: (config.shiftTeams || []).filter(t => t !== team)
       };
       onUpdate(updatedConfig);
   };

   // 4. ADD QA DEFECT
   const addDefect = () => {
      if (!onUpdate) return;
      const trimmedDefect = newDefect.trim();
      if (!trimmedDefect) return;

      const currentDefects = (config as any).qaCategories || [];
      
      if (currentDefects.some((d: string) => d.toLowerCase() === trimmedDefect.toLowerCase())) {
         setDefectError("Defect exists!");
         return;
      }

      // Safe update with type assertion
      const updatedConfig = { 
          ...config, 
          qaCategories: [...currentDefects, trimmedDefect] 
      } as AdminConfig;

      onUpdate(updatedConfig);
      setNewDefect('');
      setDefectError('');
   };

   const deleteDefect = (defect: string) => {
       if (!onUpdate) return;
       if (!window.confirm("Remove defect category?")) return;
       const currentDefects = (config as any).qaCategories || [];
       
       const updatedConfig = { 
           ...config, 
           qaCategories: currentDefects.filter((d: string) => d !== defect) 
       } as AdminConfig;

       onUpdate(updatedConfig);
   };
   
   const filteredItems = (config.productionItems || []).filter(i => i.type === activeMachineType);

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
            </div>
         </div>

         {/* --- ITEMS TAB --- */}
         {activeTab === 'ITEMS' && (
            <div className="space-y-6">
               <div className="flex justify-center">
                  <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <button onClick={() => setActiveMachineType('IM')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeMachineType === 'IM' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>IM Items</button>
                     <button onClick={() => setActiveMachineType('BM')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeMachineType === 'BM' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>BM Items</button>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Create New Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                     <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Machine *</label>
                        <input type="text" placeholder="M01" value={newItem.machine} 
                               onChange={e => handleItemChange('machine', e.target.value)} 
                               className={`w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none uppercase transition-colors ${itemErrors.machine ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-indigo-500'}`} />
                     </div>
                     <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Product Name *</label>
                        <input type="text" placeholder="Name" value={newItem.itemName} 
                               onChange={e => handleItemChange('itemName', e.target.value)} 
                               className={`w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none transition-colors ${itemErrors.itemName ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-indigo-500'}`} />
                     </div>
                     <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Customer</label>
                        <input type="text" placeholder="Client Name" value={newItem.customerName} onChange={e => handleItemChange('customerName', e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Job No</label>
                        <input type="text" placeholder="Job #" value={newItem.jobNo} onChange={e => handleItemChange('jobNo', e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="md:col-span-2">
                         <label className="text-[9px] font-bold text-slate-400 uppercase">Weight (g)</label>
                         <input type="number" placeholder="0.0" value={newItem.unitWeight || ''} onChange={e => handleItemChange('unitWeight', parseFloat(e.target.value))} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     
                     {activeMachineType === 'IM' && (
                         <div className="md:col-span-12">
                            <label className="text-[9px] font-bold text-slate-400 uppercase mr-2">Type:</label>
                            <select value={newItem.productType} onChange={e => handleItemChange('productType', e.target.value as ProductType)} className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold dark:text-white outline-none focus:border-indigo-500">
                                <option value="Preform">Preform</option>
                                <option value="Cap">Cap</option>
                            </select>
                         </div>
                     )}

                     <div className="md:col-span-12 flex justify-end mt-2">
                        <button onClick={addItem} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 shadow-lg active:scale-95"><Plus className="w-4 h-4" /> Add Item</button>
                     </div>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
                        <tr>
                           <th className="p-4 pl-6">Machine</th>
                           <th className="p-4">Product Name</th>
                           <th className="p-4">Customer</th>
                           <th className="p-4 text-center">Job No</th>
                           <th className="p-4 text-center">Weight</th>
                           {activeMachineType === 'IM' && <th className="p-4 text-center">Type</th>}
                           <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs">
                        {filteredItems.length === 0 ? (
                           <tr><td colSpan={7} className="p-10 text-center text-slate-400 uppercase font-bold text-[10px] tracking-widest">No items found.</td></tr>
                        ) : (
                           filteredItems.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                 <td className="p-4 pl-6 font-black">{item.machine}</td>
                                 <td className="p-4 font-bold">{item.itemName}</td>
                                 <td className="p-4 text-slate-500 dark:text-slate-400">{item.customerName}</td>
                                 <td className="p-4 text-center text-slate-500 dark:text-slate-400 font-mono">{item.jobNo}</td>
                                 <td className="p-4 text-center font-mono">{item.unitWeight}g</td>
                                 {activeMachineType === 'IM' && (
                                     <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.productType === 'Preform' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{item.productType || '-'}</span></td>
                                 )}
                                 <td className="p-4 pr-6 text-right"><button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}

         {/* --- TAB 2: BREAKDOWN CATEGORIES --- */}
         {activeTab === 'CATS' && (
            <div className="space-y-6 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Add Breakdown Category</h3>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <input type="text" placeholder="e.g. Machine Fault" value={newCategory} 
                               onChange={e => { setNewCategory(e.target.value); setCategoryError(''); }} 
                               className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none transition-colors ${categoryError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-rose-500'}`} />
                        {categoryError && <p className="text-rose-500 text-xs font-bold mt-2 ml-1">{categoryError}</p>}
                     </div>
                     <button onClick={addCategory} className="px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-500/30 active:scale-95"><Plus className="w-4 h-4" /> Add</button>
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"><h4 className="font-black text-rose-500 uppercase text-xs tracking-widest">Active Categories</h4></div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {(config.breakdownCategories && config.breakdownCategories.length > 0) ? (
                        config.breakdownCategories.map(cat => (
                           <div key={cat} className="flex justify-between items-center p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{cat}</span>
                              <button onClick={() => deleteCategory(cat)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        ))
                     ) : (<div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No categories defined.</div>)}
                  </div>
               </div>
            </div>
         )}

         {/* --- TAB 3: QA DEFECTS (NEW) --- */}
         {activeTab === 'QA' && (
            <div className="space-y-6 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Add Quality Defect</h3>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <input type="text" placeholder="e.g. Scratches" value={newDefect} 
                               onChange={e => { setNewDefect(e.target.value); setDefectError(''); }} 
                               className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none transition-colors ${defectError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-amber-500'}`} />
                        {defectError && <p className="text-rose-500 text-xs font-bold mt-2 ml-1">{defectError}</p>}
                     </div>
                     <button onClick={addDefect} className="px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95"><Plus className="w-4 h-4" /> Add</button>
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"><h4 className="font-black text-amber-500 uppercase text-xs tracking-widest">Active Defect Categories</h4></div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {((config as any).qaCategories && (config as any).qaCategories.length > 0) ? (
                        (config as any).qaCategories.map((def: string) => (
                           <div key={def} className="flex justify-between items-center p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{def}</span>
                              <button onClick={() => deleteDefect(def)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        ))
                     ) : (<div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No defects defined. (Defaults will be used)</div>)}
                  </div>
               </div>
            </div>
         )}

         {/* --- TAB 4: SHIFT TEAMS --- */}
         {activeTab === 'TEAMS' && (
            <div className="space-y-6 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Add Shift Team</h3>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <input type="text" placeholder="e.g. Shift C, Team Alpha" value={newTeam} 
                               onChange={e => { setNewTeam(e.target.value); setTeamError(''); }} 
                               className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none transition-colors ${teamError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-emerald-500'}`} />
                        {teamError && <p className="text-rose-500 text-xs font-bold mt-2 ml-1">{teamError}</p>}
                     </div>
                     <button onClick={addTeam} className="px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95"><UserPlus className="w-4 h-4" /> Add Team</button>
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"><h4 className="font-black text-emerald-500 uppercase text-xs tracking-widest">Active Shift Teams</h4></div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {(config.shiftTeams && config.shiftTeams.length > 0) ? (
                        config.shiftTeams.map(team => (
                           <div key={team} className="flex justify-between items-center p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{team}</span>
                              <button onClick={() => deleteTeam(team)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        ))
                     ) : (<div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No shift teams defined.</div>)}
                  </div>
               </div>
            </div>
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
    };

    return (
        <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${colorClasses[color]}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
        </button>
    );
};

export default AdminTab;