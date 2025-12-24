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
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center gap-4 shadow-inner">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isFormMode ? 'bg-indigo-50 text-indigo-300' : 'bg-emerald-50 text-emerald-300'}`}>
          {isFormMode ? <PenLine className="w-7 h-7" /> : <Database className="w-7 h-7" />}
        </div>
        <div>
          <p className="text-slate-600 font-black uppercase text-xs tracking-[0.2em]">{isFormMode ? 'Shift Is Empty' : 'No Data Records'}</p>
          <p className="text-slate-400 text-[10px] font-bold mt-1">Add a new row to this section to start recording</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-[11px] min-w-[2300px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center h-14">
            {/* Shift Column Removed Here */}
            
            <th className="px-2 w-24 bg-orange-50/50 text-orange-800">Start</th>
            <th className="px-2 w-24 bg-orange-50/50 text-orange-800">End</th>
            <th className="px-2 w-28 bg-orange-50/50 text-orange-800">Machine</th>
            <th className="px-2 w-64 bg-orange-50/50 text-orange-800 text-left pl-4">Product</th>
            <th className="px-2 w-20 bg-orange-50/50 text-orange-800">Unit Wt</th>
            <th className="px-2 w-20 bg-orange-50/50 text-orange-800">Qty/Hr</th>
            <th className="px-2 w-16 bg-orange-50/50 text-orange-800">Cav</th>
            
            <th className="px-2 w-20 text-slate-400">Cycle (s)</th>
            <th className="px-2 w-20 text-slate-400">Time Hr</th>
            
            <th className="px-2 w-24 bg-orange-50/50 text-orange-800">Plan Qty</th>
            <th className="px-2 w-24 bg-emerald-50/50 text-emerald-700">Achv Qty</th>
            
            <th className="px-2 w-24 bg-orange-50/50 text-orange-800">Plan Kg</th>
            <th className="px-2 w-24 bg-emerald-50/50 text-emerald-700">Achv Kg</th>
            
            <th className="px-2 w-24 bg-rose-50/30 text-rose-700">Lost Qty</th>
            <th className="px-2 w-24 bg-rose-50/30 text-rose-700">Lost Kg</th>
            
            <th className="px-2 w-24 bg-yellow-50/50 text-amber-700">BD Lost (Kg)</th>
            <th className="px-2 w-24 bg-yellow-50/50 text-amber-700">Eff Los (Kg)</th>
            
            <th className="px-2 w-32">Breakdowns</th>
            <th className="px-2 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-center">
          {rows.map(row => {
            const m = calculateMetrics(row);
            const machineItems = adminConfig.machineMappings.filter(cfg => cfg.machineName === row.machine);
            const cycleTimeDisplay = (row.qtyPerHour > 0 && row.cavities > 0) 
                ? (3600 / (row.qtyPerHour / row.cavities)).toFixed(1) 
                : '0.0';

            return (
              <tr key={row.id} className="hover:bg-slate-50/60 transition-all group/row h-16">
                
                {/* Shift Data Cell Removed Here */}
                
                <td className="p-1"><input type="time" value={row.startTime} onChange={e => onUpdateRow(row.id, { startTime: e.target.value })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow-md rounded-lg py-1" /></td>
                <td className="p-1"><input type="time" value={row.endTime} onChange={e => onUpdateRow(row.id, { endTime: e.target.value })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow-md rounded-lg py-1" /></td>
                
                <td className="p-1">
                  <input type="text" placeholder="M-" value={row.machine} onChange={e => onUpdateRow(row.id, { machine: e.target.value.toUpperCase() })} className="w-full text-center font-black uppercase text-indigo-600 bg-slate-50 border border-transparent focus:bg-white focus:shadow-md rounded-lg py-1 outline-none placeholder:opacity-30" />
                </td>

                <td className="p-1 text-left relative">
                  <div className="relative group/select">
                    <select 
                      value={row.product} 
                      onChange={e => {
                        const selected = machineItems.find(i => i.itemName === e.target.value);
                        onUpdateRow(row.id, { product: e.target.value, unitWeight: selected ? selected.unitWeight : row.unitWeight });
                      }}
                      className="w-full py-2 pl-2 pr-6 font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer appearance-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-700"
                    >
                      <option value="">{row.machine ? `Select Item...` : 'No Machine'}</option>
                      {machineItems.map(item => <option key={item.id} value={item.itemName}>{item.itemName}</option>)}
                      <option value="Manual Entry">Manual Entry</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </td>

                <td className="p-1"><input type="number" placeholder="0.0" value={row.unitWeight || ''} onChange={e => onUpdateRow(row.id, { unitWeight: Number(e.target.value) })} className="w-full text-center font-black bg-transparent outline-none focus:bg-white focus:shadow-md rounded-lg py-1" /></td>
                <td className="p-1"><input type="number" placeholder="0" value={row.qtyPerHour || ''} onChange={e => onUpdateRow(row.id, { qtyPerHour: Number(e.target.value) })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow-md rounded-lg py-1" /></td>
                <td className="p-1"><input type="number" value={row.cavities || ''} onChange={e => onUpdateRow(row.id, { cavities: Number(e.target.value) })} className="w-full text-center font-bold bg-transparent outline-none focus:bg-white focus:shadow-md rounded-lg py-1" /></td>
                
                <td className="px-2 font-mono text-slate-500 font-bold">{cycleTimeDisplay}s</td>
                <td className="px-2 font-bold text-slate-700">{m.timeHr}</td>
                <td className="px-2 font-bold text-slate-600 bg-slate-50/50">{m.planQty}</td>
                
                <td className="p-1">
                  <input type="number" placeholder="0" value={row.achievedQty || ''} onChange={e => onUpdateRow(row.id, { achievedQty: Number(e.target.value) })} className="w-full text-center font-black text-emerald-600 bg-emerald-50/30 outline-none focus:bg-white focus:shadow-md rounded-lg py-1 border border-transparent focus:border-emerald-200" />
                </td>

                <td className="px-2 font-bold text-slate-600 bg-slate-50/50">{m.planKg}</td>
                <td className="px-2 font-black text-emerald-600 bg-emerald-50/30">{m.achievedKg}</td>
                <td className="px-2 font-bold text-rose-400">{m.lostQty}</td>
                <td className="px-2 font-bold text-rose-500">{m.lostKg}</td>
                <td className="px-2 font-bold text-amber-600 bg-amber-50/50">{m.bdLostKg}</td>
                <td className="px-2 font-bold text-amber-600 bg-amber-50/50">{m.efficiencyLossKg}</td>

                <td className="p-1">
                   <button onClick={() => onOpenBreakdowns(row.id)} className={`w-full py-2 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider transition-all ${m.bdMins > 0 ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                     <Activity className="w-3 h-3" /> {m.bdMins > 0 ? `${m.bdMins}m` : 'Log'}
                   </button>
                </td>

                <td className="px-2 text-right">
                  <button onClick={() => onDeleteRow(row.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/row:opacity-100">
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