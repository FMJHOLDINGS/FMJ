import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminConfig } from '../../types';

interface Props {
  config: AdminConfig;
  onUpdate: (config: AdminConfig) => void;
}

const AdmBreakdownsAdd: React.FC<Props> = ({ config, onUpdate }) => {
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string>('');

  const addCategory = () => {
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
    if (!window.confirm("Remove category?")) return;
    const updatedConfig = {
        ...config,
        breakdownCategories: (config.breakdownCategories || []).filter(c => c !== cat)
    };
    onUpdate(updatedConfig);
  };

  return (
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
  );
};

export default AdmBreakdownsAdd;