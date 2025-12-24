import React, { useState, useEffect } from 'react';
import { ProductionRow, Breakdown } from '../types';
import { X, Plus, Trash2, Activity, Save, Clock, AlertOctagon } from 'lucide-react';
import { calculateTimeDiff } from '../utils';

interface Props {
  row: ProductionRow;
  onClose: () => void;
  onSave: (breakdowns: Breakdown[]) => void;
}

const CATEGORIES = ['Mold Issue', 'Machine Fault', 'Material', 'Manpower', 'Power', 'Quality', 'Cleaning', 'Other'];

const BreakdownModal: React.FC<Props> = ({ row, onClose, onSave }) => {
  // Ensure there is at least one empty line to start if empty
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

  // Metrics Calculation Helpers
  const getRowMetrics = (bd: Breakdown) => {
    const mins = calculateTimeDiff(bd.startTime, bd.endTime);
    if(mins <= 0) return { mins: 0, lossQty: 0, lossKg: 0 };

    // Calculate Loss based on Production Rate
    // Formula: (QtyPerHour * Cavities) / 60 * MinutesLost
    const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
    const lossQty = Math.floor(ratePerMin * mins);
    const lossKg = Number(((lossQty * (row.unitWeight || 0)) / 1000).toFixed(2));

    return { mins, lossQty, lossKg };
  };

  // Grand Totals
  const totals = breakdowns.reduce((acc, bd) => {
     const m = getRowMetrics(bd);
     return {
         mins: acc.mins + m.mins,
         lossQty: acc.lossQty + m.lossQty,
         lossKg: acc.lossKg + m.lossKg
     };
  }, { mins: 0, lossQty: 0, lossKg: 0 });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <header className="bg-slate-800 text-white p-6 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className="bg-rose-500 p-2.5 rounded-xl shadow-lg shadow-rose-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Breakdown Entry</h2>
                <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><span className="text-white">{row.machine}</span></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span>{row.product || 'No Product'}</span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span className="text-emerald-400">Rate: {((row.qtyPerHour || 0) * (row.cavities || 1)).toLocaleString()}/hr</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
             <X className="w-6 h-6" />
           </button>
        </header>

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 custom-scrollbar">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                      <th className="p-4 w-48">Category</th>
                      <th className="p-4 w-[30%]">Description / Action</th>
                      <th className="p-4 w-32 text-center text-slate-600">Start Time</th>
                      <th className="p-4 w-32 text-center text-slate-600">End Time</th>
                      <th className="p-4 w-24 text-center">Mins</th>
                      <th className="p-4 w-28 text-center bg-rose-50 text-rose-700 border-l border-rose-100">Loss Qty</th>
                      <th className="p-4 w-28 text-center bg-rose-50 text-rose-700">Loss Kg</th>
                      <th className="p-4 w-16 text-center"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {breakdowns.map((bd) => {
                      const m = getRowMetrics(bd);
                      return (
                        <tr key={bd.id} className="hover:bg-slate-50 transition-colors group">
                           <td className="p-2 pl-4">
                              <select 
                                value={bd.category}
                                onChange={(e) => updateLine(bd.id, { category: e.target.value })}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                              >
                                <option value="">Select...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </td>
                           <td className="p-2">
                              <input 
                                type="text" 
                                placeholder="Root cause or details..."
                                value={bd.description} 
                                onChange={(e) => updateLine(bd.id, { description: e.target.value })}
                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                              />
                           </td>
                           <td className="p-2">
                              <div className="relative">
                                <input 
                                  type="time" 
                                  value={bd.startTime} 
                                  onChange={(e) => updateLine(bd.id, { startTime: e.target.value })}
                                  className="w-full p-2.5 text-center bg-white border border-slate-200 rounded-xl text-sm font-black focus:border-indigo-500 outline-none"
                                />
                                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                              </div>
                           </td>
                           <td className="p-2">
                              <div className="relative">
                                <input 
                                  type="time" 
                                  value={bd.endTime} 
                                  onChange={(e) => updateLine(bd.id, { endTime: e.target.value })}
                                  className="w-full p-2.5 text-center bg-white border border-slate-200 rounded-xl text-sm font-black focus:border-indigo-500 outline-none"
                                />
                                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                              </div>
                           </td>
                           <td className="p-2 text-center">
                              <span className={`inline-block min-w-[3rem] py-1 px-2 rounded-lg text-xs font-black ${m.mins > 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                {m.mins > 0 ? `${m.mins}m` : '-'}
                              </span>
                           </td>
                           <td className="p-2 text-center bg-rose-50/30 border-l border-rose-50">
                              <span className={`font-black text-sm ${m.lossQty > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {m.lossQty > 0 ? m.lossQty.toLocaleString() : '-'}
                              </span>
                           </td>
                            <td className="p-2 text-center bg-rose-50/30">
                              <span className={`font-black text-sm ${m.lossKg > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                {m.lossKg > 0 ? m.lossKg.toFixed(2) : '-'}
                              </span>
                           </td>
                           <td className="p-2 text-center">
                              <button 
                                onClick={() => removeLine(bd.id)} 
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
             
             <button 
                onClick={addLine}
                className="w-full py-4 bg-slate-50 border-t border-slate-200 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-center gap-2"
             >
                <Plus className="w-4 h-4" /> Add Breakdown Line
             </button>
          </div>
        </div>

        {/* Footer Totals */}
        <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-between shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
           <div className="flex gap-8">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Downtime</span>
                 <span className="text-2xl font-black text-slate-800 flex items-baseline gap-1">
                    {totals.mins} <span className="text-sm text-slate-400 font-bold">min</span>
                 </span>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Total Lost Kg</span>
                 <span className="text-2xl font-black text-rose-500 flex items-baseline gap-1">
                    {totals.lossKg.toFixed(2)} <span className="text-sm text-rose-300 font-bold">kg</span>
                 </span>
              </div>
           </div>

           <button 
             onClick={() => onSave(breakdowns.filter(b => b.category && b.startTime && b.endTime))}
             className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xl shadow-indigo-600/30 text-sm font-black uppercase tracking-wide flex items-center gap-2 transition-all active:scale-95"
           >
             <Save className="w-4 h-4" /> Save Changes
           </button>
        </div>
      </div>
    </div>
  );
};

export default BreakdownModal;