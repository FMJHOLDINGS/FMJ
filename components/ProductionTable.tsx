import React, { useState, useEffect } from 'react';
import { ProductionRow, AdminConfig } from '../types';
import { calculateMetrics } from '../utils';
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  MoreHorizontal,
  Clock,
  Package,
  Target,
  BarChart2,
  TrendingDown,
  Activity
} from 'lucide-react';

interface Props {
  rows: ProductionRow[];
  onUpdateRow: (id: string, updates: Partial<ProductionRow>) => void;
  onDeleteRow: (id: string) => void;
  onOpenBreakdowns: (id: string) => void;
  adminConfig: AdminConfig;
}

// Number Formatter
const formatVal = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val.toFixed(1)).toString();
};

// --- STYLED INPUT COMPONENT ---
const TableInput = ({ 
  value, 
  onSave, 
  placeholder, 
  className, 
  type = 'text', 
  label, 
  icon: Icon, 
  colorClass = 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100',
  readOnly = false
}: any) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setLocalValue(value === 0 ? '' : formatVal(value));
  }, [value, isEditing]);

  const commitChanges = () => {
    if (readOnly) return;
    setIsEditing(false);
    let finalVal = localValue;
    if (type === 'number') {
      if (!finalVal || finalVal === '' || finalVal === '.' || finalVal === '-') finalVal = '0';
      const numVal = parseFloat(finalVal);
      if (numVal !== value) onSave(numVal);
    } else {
      if (finalVal !== value) onSave(finalVal);
    }
  };

  return (
    <div className={`relative group/input w-full h-10 rounded-xl border-2 overflow-hidden transition-all duration-200 flex flex-col justify-center ${colorClass} ${className}`}>
      {/* Label - ENHANCED VISIBILITY */}
      <div className="absolute top-[2px] left-2 flex items-center gap-1 z-10 pointer-events-none">
        {Icon && <Icon size={9} strokeWidth={3} className="opacity-70" />}
        <span className="text-[10px] font-black uppercase tracking-wider leading-none text-slate-600 dark:text-slate-400">
          {label}
        </span>
      </div>
      
      {/* Input Field */}
      <input
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={localValue === 0 && !isEditing ? '' : localValue}
        onChange={(e) => !readOnly && setLocalValue(e.target.value)}
        onBlur={commitChanges}
        onFocus={(e) => { if(!readOnly) { setIsEditing(true); e.target.select(); } }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        readOnly={readOnly}
        className={`w-full h-full bg-transparent text-center font-black text-sm pt-3 outline-none px-1 ${readOnly ? 'cursor-default' : ''}`}
        placeholder={placeholder}
      />
    </div>
  );
};

const ProductionTable: React.FC<Props> = ({
  rows,
  onUpdateRow,
  onDeleteRow,
  onOpenBreakdowns,
  adminConfig,
}) => {
  const allItems = adminConfig?.productionItems || [];
  const uniqueMachines = Array.from(new Set(allItems.map((m) => m.machine))).sort();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => setExpandedRow(expandedRow === id ? null : id);

  // CSS for Electric Button, Time Input & Dropdowns
  const styles = `
    /* Hides the clock icon in time inputs */
    input[type="time"]::-webkit-calendar-picker-indicator { display: none; }
    
    /* Better Dropdown Colors in Dark Mode */
    select option { background-color: #ffffff; color: #334155; }
    :root.dark select option { background-color: #0f172a; color: #e2e8f0; }

    /* Electric Button Animation */
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
  `;

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 pb-10">
      <style>{styles}</style>
      {rows.map((row) => {
        const m = calculateMetrics(row);
        const machineItems = allItems.filter((item) => item.machine === row.machine);
        const isExpanded = expandedRow === row.id;

        return (
          <div key={row.id} className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 animate-fade-in overflow-hidden">
            
            {/* --- HEADER ROW (ALWAYS VISIBLE) --- */}
            <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3">
              
              {/* 1. TIME INPUT (Digital Look) */}
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden h-9 items-center px-1 shadow-inner">
                <Clock size={12} className="text-slate-400 mr-1 shrink-0" />
                <input type="time" value={row.startTime} onChange={(e) => onUpdateRow(row.id, { startTime: e.target.value })} className="w-14 bg-transparent text-center font-black text-xs text-slate-700 dark:text-white outline-none p-0 tracking-tighter" />
                <span className="text-[10px] text-slate-400 mx-0.5 font-bold">-</span>
                <input type="time" value={row.endTime} onChange={(e) => onUpdateRow(row.id, { endTime: e.target.value })} className="w-14 bg-transparent text-center font-black text-xs text-slate-700 dark:text-white outline-none p-0 tracking-tighter" />
              </div>
              
              {/* 2. MACHINE SELECT (High Contrast) */}
              <div className="relative w-20 h-9 shrink-0">
                <select value={row.machine} onChange={(e) => onUpdateRow(row.id, { machine: e.target.value, product: '' })} 
                    className="w-full h-full pl-2 pr-1 bg-indigo-100 dark:bg-indigo-950/50 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg font-black text-indigo-700 dark:text-indigo-300 outline-none text-[10px] uppercase cursor-pointer text-center appearance-none hover:bg-indigo-200 dark:hover:bg-indigo-900/40 transition-colors">
                  <option value="">MC</option>
                  {uniqueMachines.map((mc) => (<option key={mc} value={mc}>{mc}</option>))}
                </select>
              </div>

              {/* 3. PRODUCT SELECTOR (Clear Text) */}
              <div className="flex-grow min-w-[120px] h-9 relative">
                 <Package size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                 <select value={row.product} onChange={(e) => { const selected = machineItems.find((i) => i.itemName === e.target.value); onUpdateRow(row.id, { product: e.target.value, unitWeight: selected ? selected.unitWeight : row.unitWeight }); }} 
                      className="w-full h-full pl-7 pr-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 outline-none text-[11px] truncate cursor-pointer appearance-none hover:border-slate-300 transition-colors">
                    <option value="">Select Product...</option>
                    {machineItems.map((item) => (<option key={item.id} value={item.itemName}>{item.itemName}</option>))}
                    <option value="Manual Entry">Manual Entry</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* 4. METRICS (DESKTOP ONLY) */}
              <div className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-3 py-0.5 rounded-lg border-2 border-slate-100 dark:border-slate-800 h-9 ml-auto">
                 <div className="flex flex-col items-center justify-center min-w-[45px]">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">Plan</span>
                    <span className="text-xs font-black text-slate-700 dark:text-white leading-none">{formatVal(m.planQty)}</span>
                 </div>
                 <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
                 <div className="flex flex-col items-center justify-center min-w-[45px]">
                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-wider leading-none mb-0.5">Done</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatVal(row.achievedQty)}</span>
                 </div>
                 <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
                 <div className="flex flex-col items-center justify-center min-w-[45px]">
                    <span className="text-[7px] font-black text-amber-500 uppercase tracking-wider leading-none mb-0.5">Loss</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 leading-none">{formatVal(m.efficiencyLossQty)}</span>
                 </div>
              </div>

              {/* 5. ACTIONS */}
              <div className="flex items-center gap-1 ml-auto md:ml-0 h-9">
                 <button onClick={() => toggleRow(row.id)} className={`h-9 w-9 flex items-center justify-center rounded-lg border-2 transition-all ${isExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    {isExpanded ? <ChevronUp size={16} strokeWidth={3} /> : <MoreHorizontal size={16} strokeWidth={3} />}
                 </button>
                 <button onClick={() => onDeleteRow(row.id)} className="h-9 w-9 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            {/* --- MOBILE METRICS BAR (ALWAYS VISIBLE ON MOBILE) --- */}
            {/* මෙය Collapsed හෝ Expanded ඕනෑම අවස්ථාවක Mobile එකේ පෙන්වයි */}
            <div className="md:hidden flex border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
               <div className="flex-1 flex items-center justify-between px-4 py-1.5">
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">PLAN</span>
                     <span className="text-xs font-black text-slate-700 dark:text-white">{formatVal(m.planQty)}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-300 dark:border-slate-600"></div>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wide">DONE</span>
                     <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatVal(row.achievedQty)}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-300 dark:border-slate-600"></div>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide">LOSS</span>
                     <span className="text-xs font-black text-amber-600 dark:text-amber-400">{formatVal(m.efficiencyLossQty)}</span>
                  </div>
               </div>
            </div>

            {/* --- EXPANDABLE INPUT AREA --- */}
            {(isExpanded || window.innerWidth >= 1280) && (
               <div className={`px-3 pb-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/50 ${isExpanded ? 'block' : 'hidden xl:block'}`}>
                  
                  <div className="grid grid-cols-12 gap-3">
                    {/* ROW 1: SPECS */}
                    <div className="col-span-12 sm:col-span-6 xl:col-span-3 grid grid-cols-4 gap-2 items-end">
                        <TableInput type="number" value={row.unitWeight} onSave={(v: any) => onUpdateRow(row.id, { unitWeight: v })} placeholder="0" label="Weight" />
                        <TableInput type="number" value={row.cycleTime || 0} onSave={(v: any) => onUpdateRow(row.id, { cycleTime: v })} placeholder="0" label="Cycle" />
                        <TableInput type="number" value={row.cavities} onSave={(v: any) => onUpdateRow(row.id, { cavities: v })} placeholder="1" label="Cavity" />
                        <TableInput type="number" value={row.qtyPerHour} onSave={(v: any) => onUpdateRow(row.id, { qtyPerHour: v })} placeholder="0" label="Q/Hr" colorClass="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" />
                    </div>

                    {/* ROW 2: COUNTS (Colored & Clear) */}
                    <div className="col-span-12 sm:col-span-6 xl:col-span-5 grid grid-cols-4 gap-2 items-end">
                        <div className="col-span-1">
                          <TableInput 
                            type="number" value={row.achievedQty} onSave={(v: any) => onUpdateRow(row.id, { achievedQty: v })} 
                            placeholder="0" label="GROSS" icon={Target}
                            colorClass="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white shadow-sm" 
                          />
                        </div>
                        <div className="col-span-1">
                          <TableInput 
                            type="number" value={row.rejectionQty || 0} onSave={(v: any) => onUpdateRow(row.id, { rejectionQty: v })} 
                            placeholder="0" label="REJECT" icon={AlertTriangle}
                            colorClass="bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400" 
                          />
                        </div>
                        <div className="col-span-1">
                          <TableInput 
                            type="number" value={row.startupQty || 0} onSave={(v: any) => onUpdateRow(row.id, { startupQty: v })} 
                            placeholder="0" label="START" icon={BarChart2}
                            colorClass="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400" 
                          />
                        </div>
                        <div className="col-span-1">
                            <div className="relative w-full h-10 flex flex-col justify-center bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                                <div className="absolute top-[2px] left-2 flex items-center gap-1 opacity-90">
                                    <Activity size={8} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">GOOD</span>
                                </div>
                                <div className="text-center font-black text-sm text-emerald-700 dark:text-emerald-300 pt-3">
                                    {formatVal(m.acceptedQty)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 3: ANALYSIS (Buttons) */}
                    <div className="col-span-12 xl:col-span-4 grid grid-cols-3 gap-2">
                        <button onClick={() => onOpenBreakdowns(row.id)} className="h-10 w-full relative group outline-none">
                          {m.bdMins > 0 ? (
                            <div className="w-full h-full bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30 text-white border-2 border-rose-400 hover:bg-rose-600 transition-all"><AlertTriangle size={12} strokeWidth={3} /><span className="text-[10px] font-black uppercase">{m.bdMins}m Down</span></div>
                          ) : (
                            <div className="electric-btn-container"><span></span><span></span><span></span><span></span><div className="electric-btn-content"><Zap size={12} /> Log BD</div></div>
                          )}
                        </button>

                        <div className="h-10 flex flex-col items-center justify-center px-1 bg-amber-50 dark:bg-amber-900/10 rounded-xl border-2 border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center gap-1 opacity-80 mb-0.5">
                              <TrendingDown size={9} className="text-amber-600 dark:text-amber-400" />
                              <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">EFF LOSS</span>
                            </div>
                            <span className="text-xs font-black text-amber-700 dark:text-amber-300 leading-none">{formatVal(m.efficiencyLossQty)}</span>
                        </div>

                        <div className="h-10 flex flex-col items-center justify-center px-1 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">LOSS KG</span>
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 leading-none">{formatVal(m.lostKg)}</span>
                        </div>
                    </div>
                  </div>
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProductionTable;