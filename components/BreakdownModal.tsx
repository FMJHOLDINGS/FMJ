import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ProductionRow, Breakdown } from '../types';
import { X, Plus, Trash2, Activity, Save } from 'lucide-react';
import { calculateTimeDiff } from '../utils';

// ============================================================================
// 1. INTERFACES & DEFAULTS
// ============================================================================
interface Props {
  row: ProductionRow;
  onClose: () => void;
  onSave: (breakdowns: Breakdown[]) => void;
  categories: string[];
  readOnly?: boolean; // 🟢 අලුතින් එකතු කළා
}

const DEFAULT_CATS = ['Mold Issue', 'Machine Fault', 'Material', 'Manpower', 'Power', 'Quality', 'Cleaning', 'Other'];

// ============================================================================
// 2. 🎨 THEME CONFIGURATION
// ============================================================================
const THEME = {
  backdrop: "bg-slate-900/60 backdrop-blur-sm",
  modalBase: "bg-white dark:bg-slate-900 shadow-2xl",
  header: "bg-slate-800 text-white",
  headerIcon: "bg-rose-500 shadow-rose-500/20",
  bodyBg: "bg-slate-50 dark:bg-slate-950/50",
  tableWrapper: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  tableHead: "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  tableRow: "hover:bg-slate-50 dark:hover:bg-slate-800/50 divide-slate-100 dark:divide-slate-700",
  input: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-100 dark:focus:ring-indigo-900",
  metricMinsOff: "bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500",
  metricMinsOn: "bg-slate-800 dark:bg-slate-600 text-white",
  metricQty: "text-amber-600 dark:text-amber-400",
  metricKg: "text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10",
  btnDelete: "text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20",
  btnAddLine: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
  btnSave: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30",
  footer: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]",
};

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================
const BreakdownModal: React.FC<Props> = ({ row, onClose, onSave, categories, readOnly }) => { // 🟢 readOnly ගත්තා
  
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>(
    row.breakdowns.length > 0 
      ? [...row.breakdowns] 
      : [{ id: `bd_${Date.now()}`, category: '', description: '', startTime: '', endTime: '' }]
  );

  const catList = (categories && categories.length > 0) ? categories : DEFAULT_CATS;

  const addLine = useCallback(() => {
    setBreakdowns(prev => [
      ...prev, 
      { id: `bd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, category: '', description: '', startTime: '', endTime: '' }
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setBreakdowns(prev => prev.filter(b => b.id !== id));
  }, []);

  const updateLine = useCallback((id: string, updates: Partial<Breakdown>) => {
    setBreakdowns(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const getRowMetrics = useCallback((bd: Breakdown) => {
    const mins = calculateTimeDiff(bd.startTime, bd.endTime);
    if(mins <= 0) return { mins: 0, lossQty: 0, lossKg: 0 };
    
    const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
    const lossQty = Math.floor(ratePerMin * mins);
    const lossKg = Number(((lossQty * (row.unitWeight || 0)) / 1000).toFixed(2));
    
    return { mins, lossQty, lossKg };
  }, [row.qtyPerHour, row.cavities, row.unitWeight]);

  const totals = useMemo(() => {
    return breakdowns.reduce((acc, bd) => {
       const m = getRowMetrics(bd);
       return { mins: acc.mins + m.mins, lossQty: acc.lossQty + m.lossQty, lossKg: acc.lossKg + m.lossKg };
    }, { mins: 0, lossQty: 0, lossKg: 0 });
  }, [breakdowns, getRowMetrics]);

  if (typeof document === 'undefined') return null; // 🟢 Safety check

  return createPortal( // 🟢 createPortal යොදා ඇත
    
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 transform-gpu">
      
      <div className={`absolute inset-0 transition-opacity will-change-opacity ${THEME.backdrop}`} onClick={onClose}></div>
      
      {/* 🟢 max-w-4xl වෙනුවට max-w-6xl දමා ඇත (දිග/පළල වැඩි වීමට) */}
      <div className={`relative w-full max-w-6xl rounded-2xl sm:rounded-3xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh] sm:max-h-[90vh] will-change-transform transform-gpu ${THEME.modalBase}`}>
        
        <header className={`p-4 sm:p-6 flex items-center justify-between shrink-0 ${THEME.header}`}>
           <div className="flex items-center gap-3 sm:gap-4">
              <div className={`p-2 sm:p-2.5 rounded-xl shadow-lg hidden sm:block ${THEME.headerIcon}`}>
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Breakdown Entry</h2>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1"><span className="text-white">{row.machine}</span></span>
                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                  <span className="truncate max-w-[150px] sm:max-w-none">{row.product || 'No Product'}</span>
                </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
        </header>

        <div className={`flex-1 overflow-auto p-2 sm:p-6 custom-scrollbar transform-gpu will-change-scroll ${THEME.bodyBg}`}>
          <div className={`border rounded-xl sm:rounded-2xl shadow-sm overflow-x-auto custom-scrollbar ${THEME.tableWrapper}`}>
             
             <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                   <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${THEME.tableHead}`}>
                      <th className="p-3 sm:p-4 w-40 sm:w-48">Category</th>
                      <th className="p-3 sm:p-4 w-[25%]">Description</th>
                      <th className="p-3 sm:p-4 w-24 sm:w-28 text-center">Start Time</th>
                      <th className="p-3 sm:p-4 w-24 sm:w-28 text-center">End Time</th>
                      <th className="p-3 sm:p-4 w-16 sm:w-20 text-center">Mins</th>
                      <th className={`p-3 sm:p-4 w-20 sm:w-24 text-center ${THEME.metricQty}`}>Loss Qty</th>
                      <th className={`p-3 sm:p-4 w-20 sm:w-24 text-center ${THEME.metricKg}`}>Loss Kg</th>
                      <th className="p-3 sm:p-4 w-12 sm:w-14 text-center"></th>
                   </tr>
                </thead>
                <tbody className={`divide-y ${THEME.tableRow}`}>
                   {breakdowns.map((bd) => {
                      const m = getRowMetrics(bd);
                      return (
                        <tr key={bd.id} className="transition-colors group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                           <td className="p-1.5 sm:p-2 pl-3 sm:pl-4">
                              <select 
                                disabled={readOnly} // 🟢 Inputs disabled if readOnly
                                value={bd.category} onChange={(e) => updateLine(bd.id, { category: e.target.value })}
                                className={`w-full p-2 sm:p-2.5 border rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold outline-none cursor-pointer ${THEME.input}`}
                              >
                                <option value="">Select...</option>
                                {catList.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </td>
                           <td className="p-1.5 sm:p-2">
                              <input 
                                disabled={readOnly} // 🟢 Inputs disabled if readOnly
                                type="text" placeholder="Root cause..." value={bd.description} 
                                onChange={(e) => updateLine(bd.id, { description: e.target.value })}
                                className={`w-full p-2 sm:p-2.5 border rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium outline-none placeholder:text-slate-400 ${THEME.input}`}
                              />
                           </td>
                           <td className="p-1.5 sm:p-2">
                              <input 
                                disabled={readOnly} // 🟢 Inputs disabled if readOnly
                                type="time" lang="en-GB" value={bd.startTime} onChange={(e) => updateLine(bd.id, { startTime: e.target.value })}
                                className={`w-full p-2 sm:p-2.5 text-center border rounded-lg sm:rounded-xl text-xs sm:text-sm font-black outline-none cursor-pointer dark:[color-scheme:dark] ${THEME.input}`}
                              />
                           </td>
                           <td className="p-1.5 sm:p-2">
                              <input 
                                disabled={readOnly} // 🟢 Inputs disabled if readOnly
                                type="time" lang="en-GB" value={bd.endTime} onChange={(e) => updateLine(bd.id, { endTime: e.target.value })}
                                className={`w-full p-2 sm:p-2.5 text-center border rounded-lg sm:rounded-xl text-xs sm:text-sm font-black outline-none cursor-pointer dark:[color-scheme:dark] ${THEME.input}`}
                              />
                           </td>
                           <td className="p-1.5 sm:p-2 text-center">
                              <span className={`inline-block min-w-[2.5rem] sm:min-w-[3rem] py-1 px-1.5 sm:px-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black ${m.mins > 0 ? THEME.metricMinsOn : THEME.metricMinsOff}`}>
                                {m.mins > 0 ? `${m.mins}m` : '-'}
                              </span>
                           </td>
                           <td className="p-1.5 sm:p-2 text-center">
                              <span className={`font-black text-xs sm:text-sm ${m.lossQty > 0 ? THEME.metricQty : 'text-slate-300 dark:text-slate-600'}`}>
                                {m.lossQty > 0 ? m.lossQty.toLocaleString() : '-'}
                              </span>
                           </td>
                           <td className={`p-1.5 sm:p-2 text-center ${THEME.metricKg.split(' ').slice(1).join(' ')}`}>
                              <span className={`font-black text-xs sm:text-sm ${m.lossKg > 0 ? THEME.metricKg.split(' ')[0] : 'text-slate-300 dark:text-slate-600'}`}>
                                {m.lossKg > 0 ? m.lossKg.toFixed(2) : '-'}
                              </span>
                           </td>
                           <td className="p-1.5 sm:p-2 text-center">
                              {/* 🟢 readOnly නැත්නම් පමණක් Delete Button එක පෙන්වන්න */}
                              {!readOnly && (
                                <button onClick={() => removeLine(bd.id)} className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${THEME.btnDelete}`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </td>
                        </tr>
                      );
                   })}
                </tbody>
             </table>
             
             {/* 🟢 readOnly නැත්නම් පමණක් Add Line Button එක පෙන්වන්න */}
             {!readOnly && (
                <button 
                  onClick={addLine}
                  className={`w-full py-3 sm:py-4 border-t text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${THEME.btnAddLine}`}
                >
                  <Plus className="w-4 h-4" /> Add Breakdown Line
                </button>
             )}
          </div>
        </div>

        <div className={`p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-10 ${THEME.footer}`}>
           <div className="flex gap-4 sm:gap-8 w-full sm:w-auto justify-center sm:justify-start">
              <div className="flex flex-col items-center sm:items-start">
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Total Down</span>
                 <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                    {totals.mins} <span className="text-xs sm:text-sm text-slate-400 font-bold">min</span>
                 </span>
              </div>
              <div className="w-px h-8 sm:h-10 bg-slate-200 dark:bg-slate-700"></div>
              
              <div className="flex flex-col items-center sm:items-start">
                 <span className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5 sm:mb-1">Total Qty</span>
                 <span className={`text-xl sm:text-2xl font-black flex items-baseline gap-1 ${THEME.metricQty}`}>
                    {totals.lossQty.toLocaleString()} <span className="text-xs sm:text-sm text-amber-500/50 font-bold">pcs</span>
                 </span>
              </div>
              
              <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
              <div className="hidden sm:flex flex-col items-start">
                 <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Total Lost Kg</span>
                 <span className={`text-2xl font-black flex items-baseline gap-1 ${THEME.metricKg.split(' ')[0]}`}>
                    {totals.lossKg.toFixed(2)} <span className="text-sm text-rose-300 font-bold">kg</span>
                 </span>
              </div>
           </div>

           {/* 🟢 readOnly නැත්නම් පමණක් Save Button එක පෙන්වන්න */}
           {!readOnly && (
              <button 
                onClick={() => onSave(breakdowns.filter(b => b.category && b.startTime && b.endTime))}
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl shadow-xl text-xs sm:text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 ${THEME.btnSave}`}
              >
                <Save className="w-4 h-4" /> Save
              </button>
           )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default BreakdownModal;