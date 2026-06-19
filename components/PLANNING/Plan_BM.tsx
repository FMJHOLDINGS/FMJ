import React from 'react';
import { Factory, Plus } from 'lucide-react';

const PlanBM = () => {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                <Factory size={18} />
            </div>
            <div>
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-white">BM Production Plan</h3>
                <p className="text-[10px] font-bold text-slate-400">Manage Blow Molding Schedule</p>
            </div>
         </div>
         <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors">
            <Plus size={14} /> Add Job
         </button>
      </div>

       {/* Content Placeholder (List View) */}
       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                   <th className="p-3">Job ID</th>
                   <th className="p-3">Product</th>
                   <th className="p-3 text-center">Machine</th>
                   <th className="p-3 text-center">Qty</th>
                   <th className="p-3 text-right">Status</th>
                </tr>
             </thead>
             <tbody className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {[1, 2, 3].map((i) => (
                   <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">BM-{2024 + i}</td>
                      <td className="p-3">Bottle 500ml</td>
                      <td className="p-3 text-center">BM-0{i}</td>
                      <td className="p-3 text-center">50,000</td>
                      <td className="p-3 text-right">
                         <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] uppercase">Running</span>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default PlanBM;