import React, { useState } from 'react';
import { AdminConfig, ProductionItem, MachineType } from '../types';
import { Plus, Trash2, Database, AlertOctagon, Settings, Layers, Search, Save } from 'lucide-react';

interface Props {
   config: AdminConfig;
   onUpdate: (config: AdminConfig) => void;
}

const AdminTab: React.FC<Props> = ({ config, onUpdate }) => {
   const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATS'>('ITEMS');
   const [activeMachineType, setActiveMachineType] = useState<MachineType>('IM'); // For IM/BM Subtabs

   // --- ITEM MANAGEMENT STATE ---
   const [newItem, setNewItem] = useState<Partial<ProductionItem>>({
      machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: ''
   });

   // --- CATEGORY MANAGEMENT STATE ---
   const [newCategory, setNewCategory] = useState('');

   // Handle Add Item
   const addItem = () => {
      if (!newItem.machine || !newItem.itemName) return;
      const item: ProductionItem = {
         id: `itm_${Date.now()}`,
         machine: newItem.machine.toUpperCase(),
         itemName: newItem.itemName,
         customerName: newItem.customerName || '-',
         unitWeight: Number(newItem.unitWeight) || 0,
         jobNo: newItem.jobNo || '-',
         type: activeMachineType
      };

      // Ensure productionItems exists (Backward compatibility)
      const currentItems = config.productionItems || [];
      onUpdate({ ...config, productionItems: [...currentItems, item] });

      setNewItem({ machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: '' });
   };

   const deleteItem = (id: string) => {
      if (!window.confirm("Remove this item?")) return;
      const currentItems = config.productionItems || [];
      onUpdate({ ...config, productionItems: currentItems.filter(i => i.id !== id) });
   };

   // Handle Add Category
   const addCategory = () => {
      if (!newCategory.trim()) return;
      const currentCats = config.breakdownCategories || [];
      if (currentCats.includes(newCategory)) { alert("Category exists!"); return; }

      onUpdate({ ...config, breakdownCategories: [...currentCats, newCategory] });
      setNewCategory('');
   };

   const deleteCategory = (cat: string) => {
      if (!window.confirm("Remove this category?")) return;
      onUpdate({ ...config, breakdownCategories: config.breakdownCategories.filter(c => c !== cat) });
   };

   // Filter Items for View
   const filteredItems = (config.productionItems || []).filter(i => i.type === activeMachineType);

   return (
      <div className="p-8 space-y-8 animate-fade-in pb-20">

         {/* Top Header & Tabs */}
         <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2.5 rounded-xl">
                  <Settings className="w-5 h-5" />
               </div>
               <div>
                  <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">System Admin</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Manage Master Data</p>
               </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
               <button onClick={() => setActiveTab('ITEMS')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'ITEMS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                  <Database className="w-4 h-4" /> Production Items
               </button>
               <button onClick={() => setActiveTab('CATS')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'CATS' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                  <AlertOctagon className="w-4 h-4" /> Breakdown Cats
               </button>
            </div>
         </div>

         {/* --- TAB 1: PRODUCTION ITEMS --- */}
         {activeTab === 'ITEMS' && (
            <div className="space-y-6">

               {/* Sub Tabs (IM / BM) */}
               <div className="flex justify-center">
                  <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <button onClick={() => setActiveMachineType('IM')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeMachineType === 'IM' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Injection Molding (IM)</button>
                     <button onClick={() => setActiveMachineType('BM')} className={`px-8 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeMachineType === 'BM' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Blow Molding (BM)</button>
                  </div>
               </div>

               {/* Add Form */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Add New {activeMachineType} Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                     <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Machine No</label>
                        <input type="text" placeholder="e.g. M01" value={newItem.machine} onChange={e => setNewItem({ ...newItem, machine: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500 uppercase" />
                     </div>
                     <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Item Name</label>
                        <input type="text" placeholder="Product Name" value={newItem.itemName} onChange={e => setNewItem({ ...newItem, itemName: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Job No</label>
                        <input type="text" placeholder="J-123" value={newItem.jobNo} onChange={e => setNewItem({ ...newItem, jobNo: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Weight (g)</label>
                        <input type="number" placeholder="0.0" value={newItem.unitWeight || ''} onChange={e => setNewItem({ ...newItem, unitWeight: parseFloat(e.target.value) })} className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="col-span-1 flex items-end">
                        <button onClick={addItem} className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                           <Plus className="w-4 h-4" /> Add
                        </button>
                     </div>
                  </div>
               </div>

               {/* Items List Table */}
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-xs font-black">
                        <tr>
                           <th className="p-4 w-24">Machine</th>
                           <th className="p-4">Item Name</th>
                           <th className="p-4 w-32">Job No</th>
                           <th className="p-4 w-32">Weight</th>
                           <th className="p-4 w-16"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                        {filteredItems.length === 0 ? (
                           <tr><td colSpan={5} className="p-8 text-center text-slate-400">No {activeMachineType} items configured yet.</td></tr>
                        ) : (
                           filteredItems.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                 <td className="p-4 font-black">{item.machine}</td>
                                 <td className="p-4">{item.itemName}</td>
                                 <td className="p-4 font-mono text-xs">{item.jobNo}</td>
                                 <td className="p-4">{item.unitWeight}g</td>
                                 <td className="p-4 text-right">
                                    <button onClick={() => deleteItem(item.id)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                 </td>
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
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
                  <h3 className="text-sm font-black uppercase text-slate-400 mb-4 tracking-widest">Add New Category</h3>
                  <div className="flex gap-4">
                     <input type="text" placeholder="e.g. Machine Fault" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-rose-500" />
                     <button onClick={addCategory} className="px-6 bg-rose-500 text-white rounded-xl font-bold uppercase text-xs hover:bg-rose-600 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Category
                     </button>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                     <h4 className="font-black text-rose-500 uppercase text-sm tracking-ridest">Active Categories</h4>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                     {(config.breakdownCategories && config.breakdownCategories.length > 0) ? (
                        config.breakdownCategories.map(cat => (
                           <div key={cat} className="flex justify-between items-center p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                              <button onClick={() => deleteCategory(cat)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        ))
                     ) : (
                        <div className="p-8 text-center text-slate-400">No categories defined. Please add one.</div>
                     )}
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default AdminTab;