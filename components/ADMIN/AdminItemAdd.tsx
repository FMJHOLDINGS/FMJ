import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Filter, Box, Layers, User, Hash, Scale, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminConfig, ProductionItem, MachineType, ProductType } from '../../types';

interface Props {
  config: AdminConfig;
  onUpdate: (config: AdminConfig) => void;
}

const AdminItemAdd: React.FC<Props> = ({ config, onUpdate }) => {
  const [activeMachineType, setActiveMachineType] = useState<MachineType>('IM');
  
  // --- FORM STATE ---
  const [newItem, setNewItem] = useState<Partial<ProductionItem>>({
    machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: '', productType: 'Preform'
  });
  const [itemErrors, setItemErrors] = useState<Record<string, boolean>>({});

  // --- FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterCustomer, setFilterCustomer] = useState('ALL');

  // --- ACTIONS ---
  const addItem = () => {
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
        productionItems: [item, ...(config.productionItems || [])] // Add to top
    };
    
    onUpdate(updatedConfig);
    setNewItem({ machine: '', itemName: '', customerName: '', unitWeight: 0, jobNo: '', productType: 'Preform' });
    setItemErrors({}); 
  };

  const deleteItem = (id: string) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;
    const updatedConfig = {
        ...config,
        productionItems: (config.productionItems || []).filter(i => i.id !== id)
    };
    onUpdate(updatedConfig);
  };

  const handleItemChange = (field: keyof ProductionItem, value: any) => {
    setNewItem(prev => ({ ...prev, [field]: value }));
    if (itemErrors[field]) setItemErrors(prev => ({ ...prev, [field]: false }));
  };

  // --- FILTER LOGIC ---
  const rawItems = (config.productionItems || []).filter(i => i.type === activeMachineType);

  // Get Unique Lists for Dropdowns
  const uniqueMachines = useMemo(() => Array.from(new Set(rawItems.map(i => i.machine))).sort(), [rawItems]);
  const uniqueCustomers = useMemo(() => Array.from(new Set(rawItems.map(i => i.customerName).filter(c => c !== '-'))).sort(), [rawItems]);

  const filteredItems = useMemo(() => {
    return rawItems.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              item.jobNo.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMachine = filterMachine === 'ALL' || item.machine === filterMachine;
        const matchesCustomer = filterCustomer === 'ALL' || item.customerName === filterCustomer;
        
        return matchesSearch && matchesMachine && matchesCustomer;
    });
  }, [rawItems, searchQuery, filterMachine, filterCustomer]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
       
       {/* 1. MACHINE TYPE TOGGLE (Main Switch) */}
       <div className="flex justify-center">
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex relative">
             {/* Animated Background Pill */}
             <motion.div 
                className="absolute top-1.5 bottom-1.5 bg-indigo-600 rounded-xl z-0"
                initial={false}
                animate={{ 
                    left: activeMachineType === 'IM' ? '6px' : '50%', 
                    width: 'calc(50% - 9px)'
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
             />
             
             <button onClick={() => setActiveMachineType('IM')} className={`relative z-10 w-32 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeMachineType === 'IM' ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>IM Items</button>
             <button onClick={() => setActiveMachineType('BM')} className={`relative z-10 w-32 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeMachineType === 'BM' ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>BM Items</button>
          </div>
       </div>

       {/* 2. ADD ITEM FORM (Responsive Grid) */}
       <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5"><LayoutGrid size={120} /></div>
          
          <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white mb-6 flex items-center gap-2 relative z-10">
             <span className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Plus size={18} /></span>
             Create New Product
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
             {/* Machine */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Box size={12} /> Machine No *</label>
                <input type="text" placeholder="e.g. M01" value={newItem.machine} 
                       onChange={e => handleItemChange('machine', e.target.value)} 
                       className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm font-bold dark:text-white outline-none uppercase transition-all focus:ring-2 ${itemErrors.machine ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'}`} />
             </div>

             {/* Product Name */}
             <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Layers size={12} /> Product Name *</label>
                <input type="text" placeholder="Enter product name" value={newItem.itemName} 
                       onChange={e => handleItemChange('itemName', e.target.value)} 
                       className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm font-bold dark:text-white outline-none transition-all focus:ring-2 ${itemErrors.itemName ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'}`} />
             </div>

             {/* Weight */}
             <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Scale size={12} /> Unit Weight (g)</label>
                 <input type="number" placeholder="0.00" value={newItem.unitWeight || ''} onChange={e => handleItemChange('unitWeight', parseFloat(e.target.value))} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
             </div>

             {/* Customer */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><User size={12} /> Customer</label>
                <input type="text" placeholder="Client Name" value={newItem.customerName} onChange={e => handleItemChange('customerName', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
             </div>

             {/* Job No */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Hash size={12} /> Job Number</label>
                <input type="text" placeholder="Job #" value={newItem.jobNo} onChange={e => handleItemChange('jobNo', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
             </div>
             
             {/* IM Specific: Cap vs Preform Selector */}
             {activeMachineType === 'IM' && (
                 <div className="space-y-2 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Product Category</label>
                    <div className="flex gap-4">
                        {['Preform', 'Cap'].map((type) => (
                            <div key={type} onClick={() => handleItemChange('productType', type)} className={`flex-1 cursor-pointer p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${newItem.productType === type ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'}`}>
                                <span className={`w-3 h-3 rounded-full border-2 ${newItem.productType === type ? 'border-indigo-500 bg-indigo-500' : 'border-slate-400'}`}></span>
                                <span className="text-xs font-bold uppercase">{type}</span>
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             {/* Submit Button */}
             <div className="lg:col-span-4 flex justify-end mt-4">
                <button onClick={addItem} className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-95">
                    <Plus className="w-4 h-4" /> Add to Database
                </button>
             </div>
          </div>
       </div>

       {/* 3. FILTER & SEARCH BAR */}
       <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <h3 className="text-lg font-black text-slate-700 dark:text-white flex items-center gap-2">
                <List className="text-slate-400" /> Database Items 
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{filteredItems.length}</span>
            </h3>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                
                {/* Machine Filter Dropdown */}
                <select 
                    value={filterMachine} 
                    onChange={(e) => setFilterMachine(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                >
                    <option value="ALL">All Machines</option>
                    {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                {/* Customer Filter Dropdown */}
                <select 
                    value={filterCustomer} 
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                >
                    <option value="ALL">All Customers</option>
                    {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
       </div>

       {/* 4. DATA DISPLAY (Responsive Switcher) */}
       {/* VIEW FOR DESKTOP (Hidden on small screens) */}
       <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
             <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
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
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
                {filteredItems.length === 0 ? (
                   <tr><td colSpan={7} className="p-10 text-center text-slate-400 uppercase font-bold text-[10px] tracking-widest">No matching items found.</td></tr>
                ) : (
                   filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                         <td className="p-4 pl-6 font-black text-indigo-600 dark:text-indigo-400">{item.machine}</td>
                         <td className="p-4 font-bold">{item.itemName}</td>
                         <td className="p-4 text-slate-500 dark:text-slate-400">{item.customerName}</td>
                         <td className="p-4 text-center font-mono opacity-70">{item.jobNo}</td>
                         <td className="p-4 text-center font-mono">{item.unitWeight}g</td>
                         {activeMachineType === 'IM' && (
                             <td className="p-4 text-center"><span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide ${item.productType === 'Preform' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>{item.productType || '-'}</span></td>
                         )}
                         <td className="p-4 pr-6 text-right"><button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                   ))
                )}
             </tbody>
          </table>
       </div>

       {/* VIEW FOR MOBILE (Hidden on desktop) */}
       <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredItems.length === 0 ? (
                <div className="p-10 text-center text-slate-400 uppercase font-bold text-[10px] tracking-widest bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">No matching items found.</div>
            ) : (
                filteredItems.map(item => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={item.id} 
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden"
                    >
                        <div className={`absolute top-0 left-0 w-1 h-full ${activeMachineType === 'IM' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                        
                        <div className="flex justify-between items-start pl-2">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.machine}</span>
                                <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{item.itemName}</h4>
                            </div>
                            {activeMachineType === 'IM' && (
                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide ${item.productType === 'Preform' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                                    {item.productType}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pl-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <div><span className="block text-[9px] font-bold text-slate-400 uppercase">Customer</span><span className="text-xs font-bold dark:text-slate-300">{item.customerName}</span></div>
                            <div><span className="block text-[9px] font-bold text-slate-400 uppercase">Weight</span><span className="text-xs font-bold dark:text-slate-300">{item.unitWeight}g</span></div>
                            <div><span className="block text-[9px] font-bold text-slate-400 uppercase">Job No</span><span className="text-xs font-bold dark:text-slate-300">{item.jobNo}</span></div>
                        </div>

                        <button 
                            onClick={() => deleteItem(item.id)}
                            className="absolute bottom-3 right-3 p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </motion.div>
                ))
            )}
       </div>

    </div>
  );
};

export default AdminItemAdd;