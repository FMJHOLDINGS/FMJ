import React, { useState, useEffect, useRef } from 'react';
import { ProductionRow, AdminConfig } from '../types';
import { calculateMetrics } from '../utils';
import {
  Trash2,
  Activity,
  ChevronDown,
  PenLine,
  Database,
  Clock,
  Settings,
  Package,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface Props {
  rows: ProductionRow[];
  onUpdateRow: (id: string, updates: Partial<ProductionRow>) => void;
  onDeleteRow: (id: string) => void;
  onOpenBreakdowns: (id: string) => void;
  adminConfig: AdminConfig;
  isFormMode?: boolean;
}

// --- OPTIMIZED INPUT COMPONENT ---
const TableInput = ({ value, onSave, placeholder, className, type = 'text' }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (type === 'number') {
        if (v === '' || /^\d*\.?\d*$/.test(v)) setLocalValue(v);
    } else {
        setLocalValue(v);
    }
  };

  const commitChanges = () => {
    setIsEditing(false);
    let finalVal = localValue;
    if (type === 'number') {
        if (!finalVal || finalVal === '' || finalVal === '.') finalVal = '0';
        const numVal = parseFloat(finalVal);
        if (numVal !== value) onSave(numVal);
    } else {
        if (finalVal !== value) onSave(finalVal);
    }
  };

  const handleBlur = () => commitChanges();
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    e.target.select();
  };

  return (
    <input
      type="text"
      inputMode={type === 'number' ? 'decimal' : 'text'}
      value={localValue === 0 && !isEditing ? '' : localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
};

const ProductionTable: React.FC<Props> = ({
  rows,
  onUpdateRow,
  onDeleteRow,
  onOpenBreakdowns,
  adminConfig,
  isFormMode,
}) => {
  const allItems = adminConfig?.productionItems || [];
  const uniqueMachines = Array.from(new Set(allItems.map((m) => m.machine))).sort();

  const styles = `
    .electric-btn-container { position: relative; display: inline-block; width: 100%; height: 100%; overflow: hidden; border-radius: 0.5rem; background: #0f172a; }
    .electric-btn-container span { position: absolute; display: block; }
    .electric-btn-container span:nth-child(1) { top: 0; left: -100%; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #00f2ff, #00f2ff); animation: btn-anim1 1.5s linear infinite; }
    .electric-btn-container span:nth-child(2) { top: -100%; right: 0; width: 2px; height: 100%; background: linear-gradient(180deg, transparent, #00f2ff, #00f2ff); animation: btn-anim2 1.5s linear infinite; animation-delay: 0.375s; }
    .electric-btn-container span:nth-child(3) { bottom: 0; right: -100%; width: 100%; height: 2px; background: linear-gradient(270deg, transparent, #00f2ff, #00f2ff); animation: btn-anim3 1.5s linear infinite; animation-delay: 0.75s; }
    .electric-btn-container span:nth-child(4) { bottom: -100%; left: 0; width: 2px; height: 100%; background: linear-gradient(360deg, transparent, #00f2ff, #00f2ff); animation: btn-anim4 1.5s linear infinite; animation-delay: 1.125s; }
    @keyframes btn-anim1 { 0% { left: -100%; } 50%, 100% { left: 100%; } }
    @keyframes btn-anim2 { 0% { top: -100%; } 50%, 100% { top: 100%; } }
    @keyframes btn-anim3 { 0% { right: -100%; } 50%, 100% { right: 100%; } }
    @keyframes btn-anim4 { 0% { bottom: -100%; } 50%, 100% { bottom: 100%; } }
    .electric-btn-content { position: absolute; inset: 2px; background: #1e293b; border-radius: 0.4rem; z-index: 10; display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #38bdf8; font-weight: 900; text-transform: uppercase; font-size: 0.6rem; transition: all 0.3s; }
    .electric-btn-container:hover .electric-btn-content { background: #0f172a; box-shadow: 0 0 10px #00f2ff, 0 0 20px #00f2ff; color: #fff; }
    :root:not(.dark) .electric-btn-content { background: #f8fafc; color: #0284c7; }
    :root:not(.dark) .electric-btn-container:hover .electric-btn-content { background: #e0f2fe; }
    
    /* HIDE DEFAULT SELECT ARROW */
    select.custom-select {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background-image: none; 
    }
    select.custom-select::-ms-expand { display: none; }
    
    select.custom-select option { background-color: #ffffff; color: #1e293b; }
    :root.dark select.custom-select option { background-color: #1e293b; color: #f1f5f9; }
  `;

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-3 animate-fade-in my-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isFormMode ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400'}`}>
          {isFormMode ? <PenLine className="w-6 h-6" /> : <Database className="w-6 h-6" />}
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">{isFormMode ? 'Shift Ready' : 'No Records'}</p>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">Add a row to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-10">
      <style>{styles}</style>
      {rows.map((row) => {
        const m = calculateMetrics(row);
        const machineItems = allItems.filter((item) => item.machine === row.machine);

        return (
          <div key={row.id} className="group relative bg-white dark:bg-[#0F172A] rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in w-full">
            <button onClick={() => onDeleteRow(row.id)} className="absolute top-2 right-2 p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-transparent hover:border-rose-200 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20" title="Delete Row"><Trash2 className="w-3.5 h-3.5" /></button>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
              
              {/* 1. TIMELINE & MACHINE */}
              <div className="xl:col-span-3 space-y-2 xl:border-r border-slate-100 dark:border-slate-800 xl:pr-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-400" /><span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Timeline</span>
                </div>
                <div className="flex gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-1 py-1 flex-1 border border-slate-100 dark:border-slate-700 text-center">
                    <input type="time" value={row.startTime} onChange={(e) => onUpdateRow(row.id, { startTime: e.target.value })} className="w-full bg-transparent text-center font-bold text-slate-700 dark:text-slate-200 outline-none text-xs p-0 dark:[color-scheme:dark]" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-1 py-1 flex-1 border border-slate-100 dark:border-slate-700 text-center">
                    <input type="time" value={row.endTime} onChange={(e) => onUpdateRow(row.id, { endTime: e.target.value })} className="w-full bg-transparent text-center font-bold text-slate-700 dark:text-slate-200 outline-none text-xs p-0 dark:[color-scheme:dark]" />
                  </div>
                </div>
                <div className="relative">
                  {/* MACHINE DROPDOWN - Custom Class Added */}
                  <select value={row.machine} onChange={(e) => onUpdateRow(row.id, { machine: e.target.value, product: '' })} 
                      className="custom-select w-full py-1.5 pl-3 pr-8 bg-indigo-50 dark:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 rounded-lg text-center font-black text-indigo-700 dark:text-indigo-400 outline-none cursor-pointer text-xs uppercase tracking-wide transition-colors">
                    <option value="">SELECT MAC</option>
                    {uniqueMachines.map((mc) => (<option key={mc} value={mc}>{mc}</option>))}
                  </select>
                  <Settings className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 opacity-50 pointer-events-none" />
                </div>
              </div>

              {/* 2. PRODUCT & SPECS */}
              <div className="xl:col-span-4 space-y-2 xl:border-r border-slate-100 dark:border-slate-800 xl:pr-3">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-slate-400" /><span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Product</span>
                </div>
                <div className="relative">
                  {/* PRODUCT DROPDOWN - Custom Class Added */}
                  <select value={row.product} onChange={(e) => { const selected = machineItems.find((i) => i.itemName === e.target.value); onUpdateRow(row.id, { product: e.target.value, unitWeight: selected ? selected.unitWeight : row.unitWeight }); }} 
                      className="custom-select w-full py-1.5 pl-3 pr-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 outline-none text-xs truncate transition-all cursor-pointer">
                    <option value="">{row.machine ? 'Select Product...' : 'Select Machine First'}</option>
                    {machineItems.map((item) => (<option key={item.id} value={item.itemName}>{item.itemName} {item.jobNo ? `(${item.jobNo})` : ''}</option>))}
                    <option value="Manual Entry">Manual Entry</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                   <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-1 border border-slate-100 dark:border-slate-700 text-center hover:border-indigo-200 transition-colors">
                      <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Wt</label>
                      <TableInput type="number" value={row.unitWeight} onSave={(v: number) => onUpdateRow(row.id, { unitWeight: v })} placeholder="0" className="w-full bg-transparent text-center font-bold outline-none text-xs p-0 text-slate-700 dark:text-slate-200" />
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-1 border border-slate-100 dark:border-slate-700 text-center hover:border-indigo-200 transition-colors">
                      <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Cyc</label>
                      <TableInput type="number" value={row.cycleTime || 0} onSave={(v: number) => onUpdateRow(row.id, { cycleTime: v })} placeholder="0" className="w-full bg-transparent text-center font-bold outline-none text-xs p-0 text-slate-700 dark:text-slate-200" />
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-1 border border-slate-100 dark:border-slate-700 text-center hover:border-indigo-200 transition-colors">
                      <label className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Cav</label>
                      <TableInput type="number" value={row.cavities} onSave={(v: number) => onUpdateRow(row.id, { cavities: v })} placeholder="1" className="w-full bg-transparent text-center font-bold outline-none text-xs p-0 text-slate-700 dark:text-slate-200" />
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-1 border border-slate-100 dark:border-slate-700 text-center hover:border-indigo-200 transition-colors">
                      <label className="block text-[7px] font-bold text-indigo-400 uppercase mb-0.5">Q/H</label>
                      <TableInput type="number" value={row.qtyPerHour} onSave={(v: number) => onUpdateRow(row.id, { qtyPerHour: v })} placeholder="0" className="w-full bg-transparent text-center font-bold outline-none text-xs p-0 text-indigo-600 dark:text-indigo-400" />
                   </div>
                </div>
              </div>

              {/* 3. OUTPUT & QUALITY */}
              <div className="xl:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500" /><span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Output</span></div>
                  {isFormMode && (<span className="text-[9px] font-black text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">Plan: {m.planQty}</span>)}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border-b-2 border-slate-300 dark:border-slate-600">
                    <span className="block text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase">Gross</span>
                    <TableInput type="number" value={row.achievedQty} onSave={(v: number) => onUpdateRow(row.id, { achievedQty: v })} placeholder="0" className="w-full bg-transparent font-black text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-300 p-0" />
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/30 rounded-lg p-1.5 border-b-2 border-rose-200 dark:border-rose-800">
                    <span className="block text-[7px] font-black text-rose-400 uppercase">Rej</span>
                    <TableInput type="number" value={row.rejectionQty || 0} onSave={(v: number) => onUpdateRow(row.id, { rejectionQty: v })} placeholder="0" className="w-full bg-transparent font-black text-sm text-rose-600 dark:text-rose-400 outline-none placeholder:text-rose-200 p-0" />
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-1.5 border-b-2 border-amber-200 dark:border-amber-800">
                    <span className="block text-[7px] font-black text-amber-500 uppercase">Start</span>
                    <TableInput type="number" value={row.startupQty || 0} onSave={(v: number) => onUpdateRow(row.id, { startupQty: v })} placeholder="0" className="w-full bg-transparent font-black text-sm text-amber-600 dark:text-amber-400 outline-none placeholder:text-amber-200 p-0" />
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-1.5 border-b-2 border-emerald-300 dark:border-emerald-700 flex flex-col justify-center">
                    <span className="block text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Good</span>
                    <div className="font-black text-sm text-emerald-700 dark:text-emerald-300 truncate">{m.acceptedQty}</div>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="col-span-6 h-8">
                    <button onClick={() => onOpenBreakdowns(row.id)} className="w-full h-full relative group outline-none">
                      {m.bdMins > 0 ? (
                        <div className="w-full h-full bg-rose-500 rounded-lg flex items-center justify-center gap-2 animate-pulse shadow-md text-white"><AlertTriangle className="w-3 h-3" /><span className="text-[9px] font-black uppercase">{m.bdMins}m Down</span></div>
                      ) : (
                        <div className="electric-btn-container"><span></span><span></span><span></span><span></span><div className="electric-btn-content"><Zap className="w-3 h-3" /> Log Breakdown</div></div>
                      )}
                    </button>
                  </div>
                  <div className="col-span-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg px-1 py-0.5 text-center flex flex-col justify-center border border-amber-100 dark:border-amber-900/30"><span className="text-[7px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase">Eff Loss</span><span className="text-xs font-black text-amber-600 dark:text-amber-400 leading-none">{m.efficiencyLossQty}</span></div>
                  <div className="col-span-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg px-1 py-0.5 text-center flex flex-col justify-center border border-rose-100 dark:border-rose-900/30"><span className="text-[7px] font-bold text-rose-600/70 dark:text-rose-400/70 uppercase">Loss Kg</span><span className="text-xs font-black text-rose-600 dark:text-rose-400 leading-none">{m.lostKg}</span></div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductionTable;