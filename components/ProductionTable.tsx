import React from 'react';
import { ProductionRow, AdminConfig } from '../types';
import { calculateMetrics } from '../utils';
import { Trash2, Activity, ChevronDown, PenLine, Database } from 'lucide-react';

interface Props {
  rows: ProductionRow[];
  onUpdateRow: (id: string, updates: Partial<ProductionRow>) => void;
  onDeleteRow: (id: string) => void;
  onOpenBreakdowns: (id: string) => void;
  adminConfig: AdminConfig;
  isFormMode?: boolean;
}

const ProductionTable: React.FC<Props> = ({ rows, onUpdateRow, onDeleteRow, onOpenBreakdowns, adminConfig, isFormMode }) => {
  
  // FIX: Access 'productionItems' instead of 'machineMappings'
  const allItems = adminConfig?.productionItems || [];
  
  // Get Unique Machine list
  const uniqueMachines = Array.from(new Set(allItems.map(m => m.machine))).sort();

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-4 shadow-inner transition-colors">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isFormMode ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-300'}`}>
          {isFormMode ? <PenLine className="w-7 h-7" /> : <Database className="w-7 h-7" />}
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-[0.2em]">{isFormMode ? 'Shift Is Empty' : 'No Data Records'}</p>
          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold mt-1">Add a new row to this section to start recording</p>
        </div>
      </div>
    );
  }

  // UPDATED: No internal scroll (max-h removed), so it scrolls with the page
  return (
    <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-black/40 overflow-hidden overflow-x-auto custom-scrollbar transition-colors duration-300">
      <table className="w-full text-left text-[11px] min-w-[2000px] border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center h-14 transition-colors">
            <th className="px-2 w-24 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Start</th>
            <th className="px-2 w-24 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">End</th>
            <th className="px-2 w-28 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Machine</th>
            <th className="px-2 w-64 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300 text-left pl-4">Product / Job</th>
            <th className="px-2 w-16 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Wt(g)</th>
            <th className="px-2 w-16 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Q/Hr</th>
            <th className="px-2 w-12 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Cav</th>
            
            <th className="px-2 w-16 text-slate-400 dark:text-slate-500">Cycle</th>
            <th className="px-2 w-16 text-slate-400 dark:text-slate-500">Hr</th>
            
            <th className="px-2 w-20 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Plan Qty</th>
            <th className="px-2 w-20 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400">Achv Qty</th>
            
            {!isFormMode && <th className="px-2 w-20 bg-orange-50/50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300">Plan Kg</th>}
            {!isFormMode && <th className="px-2 w-20 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400">Achv Kg</th>}
            
            <th className="px-2 w-20 bg-rose-50/30 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400">Lost Qty</th>
            
            {!isFormMode && <th className="px-2 w-20 bg-rose-50/30 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400">Lost Kg</th>}
            {!isFormMode && <th className="px-2 w-20 bg-yellow-50/50 dark:bg-yellow-900/10 text-amber-700 dark:text-amber-400">BD (Kg)</th>}
            
            <th className="px-2 w-24 bg-yellow-50/50 dark:bg-yellow-900/10 text-amber-700 dark:text-amber-400">
                {isFormMode ? 'Eff Los Qty' : 'Eff Los (Kg)'}
            </th>
            
            <th className="px-2 w-32">Breakdowns</th>
            <th className="px-2 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-center">
          {rows.map(row => {
            const m = calculateMetrics(row);
            const machineItems = allItems.filter(item => item.machine === row.machine);

            return (
              <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all group/row h-14 text-slate-700 dark:text-slate-300">
                
                <td className="p-1"><input type="time" value={row.startTime} onChange={e => onUpdateRow(row.id, { startTime: e.target.value })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1 dark:[color-scheme:dark]" /></td>
                <td className="p-1"><input type="time" value={row.endTime} onChange={e => onUpdateRow(row.id, { endTime: e.target.value })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1 dark:[color-scheme:dark]" /></td>
                
                {/* MACHINE DROPDOWN STYLED */}
                <td className="p-1 relative">
                   <div className="relative group/select">
                      <select 
                        value={row.machine} 
                        onChange={e => onUpdateRow(row.id, { machine: e.target.value })}
                        className="w-full text-center font-black uppercase text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 focus:bg-white dark:focus:bg-slate-950 focus:shadow-md rounded-lg py-1.5 outline-none appearance-none cursor-pointer"
                      >
                         <option value="">MAC</option>
                         {uniqueMachines.length > 0 ? (
                           uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)
                         ) : (
                           ['Select Admin'].map(m => <option key={m} value={m}>{m}</option>)
                         )}
                      </select>
                   </div>
                </td>

                <td className="p-1 text-left relative">
                  <div className="relative group/select">
                    <select 
                      value={row.product} 
                      onChange={e => {
                        const selected = machineItems.find(i => i.itemName === e.target.value);
                        onUpdateRow(row.id, { 
                            product: e.target.value, 
                            unitWeight: selected ? selected.unitWeight : row.unitWeight 
                        });
                      }}
                      className="w-full py-1.5 pl-2 pr-6 font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer appearance-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 text-xs text-slate-700 dark:text-slate-200"
                    >
                      <option value="">{row.machine ? `Select Item...` : 'Select Machine'}</option>
                      {machineItems.map(item => (
                          <option key={item.id} value={item.itemName}>
                              {item.itemName} {item.jobNo ? `(${item.jobNo})` : ''}
                          </option>
                      ))}
                      <option value="Manual Entry">Manual Entry</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </td>

                <td className="p-1"><input type="number" placeholder="0.0" value={row.unitWeight || ''} onChange={e => onUpdateRow(row.id, { unitWeight: Number(e.target.value) })} className="w-full text-center font-black bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1" /></td>
                <td className="p-1"><input type="number" placeholder="0" value={row.qtyPerHour || ''} onChange={e => onUpdateRow(row.id, { qtyPerHour: Number(e.target.value) })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1" /></td>
                <td className="p-1"><input type="number" value={row.cavities || ''} onChange={e => onUpdateRow(row.id, { cavities: Number(e.target.value) })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1" /></td>
                
                <td className="p-1"><input type="number" placeholder="0" value={row.cycleTime || ''} onChange={e => onUpdateRow(row.id, { cycleTime: Number(e.target.value) })} className="w-full text-center font-mono font-bold bg-transparent outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1 placeholder:text-slate-300" /></td>

                <td className="px-2 font-bold text-slate-700 dark:text-slate-300">{m.timeHr}</td>
                <td className="px-2 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">{m.planQty}</td>
                
                <td className="p-1">
                  <input type="number" placeholder="0" value={row.achievedQty || ''} onChange={e => onUpdateRow(row.id, { achievedQty: Number(e.target.value) })} className="w-full text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20 outline-none focus:bg-white dark:focus:bg-slate-800 focus:shadow-md rounded-lg py-1 border border-transparent focus:border-emerald-200 dark:focus:border-emerald-700" />
                </td>

                {!isFormMode && <td className="px-2 font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">{m.planKg}</td>}
                {!isFormMode && <td className="px-2 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20">{m.achievedKg}</td>}
                
                <td className="px-2 font-bold text-rose-400 dark:text-rose-400">{m.lostQty}</td>
                
                {!isFormMode && <td className="px-2 font-bold text-rose-500 dark:text-rose-500">{m.lostKg}</td>}
                {!isFormMode && <td className="px-2 font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-900/20">{m.bdLostKg}</td>}
                
                <td className="px-2 font-bold text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-900/20">
                    {isFormMode ? m.efficiencyLossQty : m.efficiencyLossKg}
                </td>

                <td className="p-1">
                   <button onClick={() => onOpenBreakdowns(row.id)} className={`w-full py-1.5 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all ${m.bdMins > 0 ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                     <Activity className="w-3 h-3" /> {m.bdMins > 0 ? `${m.bdMins}m` : 'Log'}
                   </button>
                </td>

                <td className="px-2 text-right">
                  <button onClick={() => onDeleteRow(row.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all opacity-0 group-hover/row:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductionTable;