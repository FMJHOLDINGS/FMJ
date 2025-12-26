import React, { useState } from 'react';
import { ProductionRow, Breakdown } from '../types';
import { X, Plus, Trash2, Activity, Save, Clock } from 'lucide-react';
import { calculateTimeDiff } from '../utils';

interface Props {
  row: ProductionRow;
  onClose: () => void;
  onSave: (breakdowns: Breakdown[]) => void;
}

const CATEGORIES = ['Mold Issue', 'Machine Fault', 'Material', 'Manpower', 'Power', 'Quality', 'Cleaning', 'Other'];

const BreakdownModal: React.FC<Props> = ({ row, onClose, onSave }) => {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>(
    row.breakdowns.length > 0 
      ? [...row.breakdowns] 
      : [{ id: `bd_${Date.now()}`, category: '', description: '', startTime: '', endTime: '' }]
  );

  const addLine = () => {
    setBreakdowns([
      ...breakdowns, 
      {
        id: `bd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: '',
        description: '',
        startTime: '',
        endTime: ''
      }
    ]);
  };

  const removeLine = (id: string) => {
    setBreakdowns(breakdowns.filter(b => b.id !== id));
  };

  const updateLine = (id: string, updates: Partial<Breakdown>) => {
    setBreakdowns(breakdowns.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const getRowMetrics = (bd: Breakdown) => {
    const mins = calculateTimeDiff(bd.startTime, bd.endTime);
    if(mins <= 0) return { mins: 0, lossQty: 0, lossKg: 0 };
    const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
    const lossQty = Math.floor(ratePerMin * mins);
    const lossKg = Number(((lossQty * (row.unitWeight || 0)) / 1000).toFixed(2));
    return { mins, lossQty, lossKg };
  };

  const totals = breakdowns.reduce((acc, bd) => {
     const m = getRowMetrics(bd);
     return {
         mins: acc.mins + m.mins,
         lossKg: acc.lossKg + m.lossKg
     };
  }, { mins: 0, lossKg: 0 });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        <header className="bg-slate-800 text-white p-6 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className="bg-rose-500 p-2.5 rounded-xl shadow-lg shadow-rose-500/20"><Activity className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Breakdown Entry</h2>
                <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><span className="text-white">{row.machine}</span></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span>{row.product || 'No Product'}</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </header>

        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-100 dark:bg-slate-900 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4 w-48">Category</th>
                      <th className="p-4 w-[30%]">Description / Action</th>
                      <th className="p-4 w-32 text-center text-slate-600 dark:text-slate-400">Start</th>
                      <th className="p-4 w-32 text-center text-slate-600 dark:text-slate-400">End</th>
                      <th className="p-4 w-24 text-center">Mins</th>
                      <th className="p-4 w-28 text-center bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400">Loss Kg</th>
                      <th className="p-4 w-16 text-center"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                   {breakdowns.map((bd) => {
                      const m = getRowMetrics(bd);
                      return (
                        <tr key={bd.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <td className="p-2 pl-4">
                              <select 
                                value={bd.category}
                                onChange={(e) => updateLine(bd.id, { category: e.target.value })}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
                              >
                                <option value="">Select...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </td>
                           <td className="p-2">
                              <input 
                                type="text" placeholder="Details..." value={bd.description} 
                                onChange={(e) => updateLine(bd.id, { description: e.target.value })}
                                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium dark:text-slate-200 outline-none"
                              />
                           </td>
                           <td className="p-2">
                              <input type="time" value={bd.startTime} onChange={(e) => updateLine(bd.id, { startTime: e.target.value })} className="w-full p-2.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-black outline-none dark:text-slate-200 dark:[color-scheme:dark]" />
                           </td>
                           <td className="p-2">
                              <input type="time" value={bd.endTime} onChange={(e) => updateLine(bd.id, { endTime: e.target.value })} className="w-full p-2.5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-black outline-none dark:text-slate-200 dark:[color-scheme:dark]" />
                           </td>
                           <td className="p-2 text-center">
                              <span className="text-xs font-black dark:text-slate-300">{m.mins > 0 ? `${m.mins}m` : '-'}</span>
                           </td>
                           <td className="p-2 text-center bg-rose-50/30 dark:bg-rose-900/10">
                              <span className="font-black text-sm text-rose-600 dark:text-rose-400">{m.lossKg > 0 ? m.lossKg.toFixed(2) : '-'}</span>
                           </td>
                           <td className="p-2 text-center">
                              <button onClick={() => removeLine(bd.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
             <button onClick={addLine} className="w-full py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Breakdown Line</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between shrink-0 z-10">
           <div className="flex gap-8">
              <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase">Total Downtime</span><span className="text-2xl font-black text-slate-800 dark:text-white">{totals.mins} <span className="text-sm">min</span></span></div>
              <div className="flex flex-col"><span className="text-[10px] font-black text-rose-300 uppercase">Total Loss</span><span className="text-2xl font-black text-rose-500">{totals.lossKg.toFixed(2)} <span className="text-sm">kg</span></span></div>
           </div>
           <button onClick={() => onSave(breakdowns.filter(b => b.category && b.startTime && b.endTime))} className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700"><Save className="w-4 h-4 inline mr-2"/> Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default BreakdownModal;