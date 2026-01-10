import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Activity, Database, History, PenTool, BarChart3, Sun, Moon, Calendar, UserCheck, Filter, Layers, Download, X, ChevronDown, AlertTriangle, RefreshCcw, LayoutDashboard
} from 'lucide-react';
import { DayData, ProductionRow, ShiftType, AdminConfig } from '../types';
import ProductionTable from './ProductionTable';
import BreakdownModal from './BreakdownModal';
import BreakdownLog from './BreakdownLog';
import DailySummary from './DailySummary';
import DatabaseView from './DatabaseView';
import MultiSelectDropdown from './MultiSelectDropdown';
import { exportToExcel, getDatesInRange, calculateMetrics } from '../utils';

interface Props {
  date: string;
  allData: Record<string, any>;
  onUpdate: (key: string, data: any) => void;
  adminConfig: AdminConfig;
}

type SubTab = 'ENTRY' | 'IM_DB' | 'BM_DB' | 'BREAKDOWNS' | 'SUMMARY';
const SUPERVISORS = ['Shift-A', 'Shift-B'] as const;
type Supervisor = (typeof SUPERVISORS)[number];
const otherSupervisor = (s: Supervisor): Supervisor => (s === 'Shift-A' ? 'Shift-B' : 'Shift-A');
const isTuesday = (dateStr: string) => new Date(dateStr).getDay() === 2;
const minusDays = (dateStr: string, days: number) => { const d = new Date(dateStr); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };
const normalizeSupervisor = (v: any, fallback: Supervisor): Supervisor => { if (v === 'Shift-A' || v === 'Shift-B') return v; return fallback; };

const ProductionTab: React.FC<Props> = ({ date: initialDate, allData, onUpdate, adminConfig }) => {
  const [subTab, setSubTab] = useState<SubTab>('ENTRY');
  const [entryDate, setEntryDate] = useState(initialDate);
  const [activeShift, setActiveShift] = useState<ShiftType>('day');
  const [reportStartDate, setReportStartDate] = useState(initialDate);
  const [reportEndDate, setReportEndDate] = useState(initialDate);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeBreakdownRowId, setActiveBreakdownRowId] = useState<string | null>(null);
  const [activeBreakdownMachine, setActiveBreakdownMachine] = useState<'IM'|'BM'|null>(null);
  const [showSwapNotice, setShowSwapNotice] = useState(false);

  const getKey = (type: 'IM' | 'BM') => `${entryDate}_${type}`;
  const getDayData = (type: 'IM' | 'BM'): DayData => {
     const key = getKey(type);
     return (allData[key] as DayData) || { id: key, date: entryDate, machineType: type, daySupervisor: '', nightSupervisor: '', rows: [] };
  };

  const imData = getDayData('IM');
  const bmData = getDayData('BM');

  // --- FILTERED CONFIGS ---
  const imConfig = useMemo(() => ({ ...adminConfig, productionItems: adminConfig.productionItems.filter(i => i.type === 'IM') }), [adminConfig]);
  const bmConfig = useMemo(() => ({ ...adminConfig, productionItems: adminConfig.productionItems.filter(i => i.type === 'BM') }), [adminConfig]);

  // --- SUPERVISOR LOGIC (SYNCED) ---
  const currentDaySup = normalizeSupervisor(imData.daySupervisor, 'Shift-A');
  const currentNightSup = normalizeSupervisor(imData.nightSupervisor, otherSupervisor(currentDaySup));
  const selectedSupervisorInUI = activeShift === 'day' ? currentDaySup : currentNightSup;

  // 1. Update Master (IM) Only
  const updateMasterSupervisors = (d: Supervisor, n: Supervisor) => {
      onUpdate(getKey('IM'), { ...imData, daySupervisor: d, nightSupervisor: n });
  };

  // 2. Auto-Sync BM to match IM (Prevents Race Condition)
  useEffect(() => {
      if (bmData.daySupervisor !== currentDaySup || bmData.nightSupervisor !== currentNightSup) {
          // Sync BM to match IM
          const timer = setTimeout(() => {
              onUpdate(getKey('BM'), { ...bmData, daySupervisor: currentDaySup, nightSupervisor: currentNightSup });
          }, 100); // Small delay to allow IM update to settle
          return () => clearTimeout(timer);
      }
  }, [currentDaySup, currentNightSup, bmData, entryDate]);

  // 3. Initialize if Empty
  useEffect(() => {
     if (!imData.daySupervisor || !imData.nightSupervisor) {
         updateMasterSupervisors('Shift-A', 'Shift-B');
     }
  }, [entryDate]);

  // 4. Tuesday Check
  useEffect(() => {
    if (!isTuesday(entryDate)) { setShowSwapNotice(false); return; }
    const prevKey = `${minusDays(entryDate, 7)}_IM`;
    const prev = allData[prevKey] as DayData | undefined;
    if (!prev?.daySupervisor) { setShowSwapNotice(false); return; }
    const prevDay = normalizeSupervisor(prev.daySupervisor, 'Shift-A');
    setShowSwapNotice(currentDaySup === prevDay);
  }, [entryDate, allData, currentDaySup]);

  const handleSupervisorChange = (newVal: string) => {
    if (newVal !== 'Shift-A' && newVal !== 'Shift-B') return;
    const selected = newVal as Supervisor;
    // Update Master based on current Shift tab
    if (activeShift === 'day') updateMasterSupervisors(selected, otherSupervisor(selected));
    else updateMasterSupervisors(otherSupervisor(selected), selected);
  };

  const handleSwapNow = () => updateMasterSupervisors(currentNightSup, currentDaySup);

  // --- ROW OPERATIONS ---
  const handleAddEntry = (type: 'IM' | 'BM') => {
      const data = type === 'IM' ? imData : bmData;
      const newRow: ProductionRow = {
          id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          shift: activeShift,
          startTime: activeShift === 'day' ? '08:00' : '20:00',
          endTime: activeShift === 'day' ? '20:00' : '08:00',
          machine: '', product: '', unitWeight: 0, qtyPerHour: 0, cavities: 1, cycleTime: 0,
          achievedQty: 0, rejectionQty: 0, startupQty: 0, acceptedQty: 0, breakdowns: []
      };
      onUpdate(getKey(type), { ...data, rows: [newRow, ...(data.rows || [])] });
  };

  const updateRow = (type: 'IM' | 'BM', rowId: string, updates: Partial<ProductionRow>) => {
      const data = type === 'IM' ? imData : bmData;
      const updatedRows = (data.rows || []).map(r => r.id === rowId ? { ...r, ...updates } : r);
      onUpdate(getKey(type), { ...data, rows: updatedRows });
  };

  const deleteRow = (type: 'IM' | 'BM', rowId: string) => {
      if (!window.confirm('Delete row?')) return;
      const data = type === 'IM' ? imData : bmData;
      const updatedRows = (data.rows || []).filter(r => r.id !== rowId);
      onUpdate(getKey(type), { ...data, rows: updatedRows });
  };

  const imRows = (imData.rows || []).filter(r => r.shift === activeShift);
  const bmRows = (bmData.rows || []).filter(r => r.shift === activeShift);
  
  const activeBDRow = activeBreakdownMachine 
      ? (activeBreakdownMachine === 'IM' ? imData.rows : bmData.rows).find(r => r.id === activeBreakdownRowId)
      : null;

  const { availableMachines, availableProducts } = useMemo(() => {
    const machines = new Set<string>(); const products = new Set<string>();
    Object.keys(allData).forEach(k => {
        if (k.includes(subTab === 'IM_DB' ? '_IM' : '_BM')) {
            (allData[k]?.rows || []).forEach((r: any) => { machines.add(r.machine); products.add(r.product); });
        }
    });
    return { availableMachines: Array.from(machines).sort(), availableProducts: Array.from(products).sort() };
  }, [allData, subTab]);

  const handleDownloadReport = async (type: 'IM' | 'BM') => {
      const dates = getDatesInRange(reportStartDate, reportEndDate);
      const rows: any[] = [];
      dates.forEach(d => {
          const dd = allData[`${d}_${type}`];
          if(dd?.rows) dd.rows.forEach((r: any) => {
              if((!selectedMachines.length || selectedMachines.includes(r.machine)) && (!selectedProducts.length || selectedProducts.includes(r.product))) rows.push({...r, date: d});
          });
      });
      if(!rows.length) { alert('No data'); return; }
      await exportToExcel(rows, { machine: selectedMachines, product: selectedProducts, startDate: reportStartDate, endDate: reportEndDate, type });
  };

  const calculateShiftStats = (rows: ProductionRow[]) => rows.reduce((acc, row) => {
     const m = calculateMetrics(row);
     return { plan: acc.plan + m.planKg, achv: acc.achv + m.achievedKg, lost: acc.lost + m.lostKg };
  }, { plan: 0, achv: 0, lost: 0 });
  const imStats = calculateShiftStats(imRows);
  const bmStats = calculateShiftStats(bmRows);
  const totalStats = { plan: imStats.plan + bmStats.plan, achv: imStats.achv + bmStats.achv, lost: imStats.lost + bmStats.lost };

  // --- STYLES FOR ANIMATED TABS ---
  const styles = `
    @keyframes spin-border { 0% { --rotate: 0deg; } 100% { --rotate: 360deg; } }
    @property --rotate { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    .animated-tab-active { position: relative; z-index: 0; overflow: hidden; border: none !important; }
    .animated-tab-active::before { content: ""; position: absolute; z-index: -1; width: 150%; height: 150%; left: -25%; top: -25%; background-image: conic-gradient(from var(--rotate), transparent 0%, var(--tab-color) 40%, var(--tab-color) 50%, transparent 100%); animation: spin-border 3s linear infinite; }
    .animated-tab-active::after { content: ""; position: absolute; z-index: -1; inset: 2px; background: var(--bg-color); border-radius: 0.4rem; }
  `;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 relative w-full">
      <style>{styles}</style>
      
      {/* HEADER */}
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-4 py-2 sticky top-0 z-30 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center transition-colors duration-300 shrink-0 w-full">
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
          <SubNavItem active={subTab === 'ENTRY'} icon={LayoutDashboard} label="Production Entry" onClick={() => setSubTab('ENTRY')} color="indigo" />
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
          <SubNavItem active={subTab === 'IM_DB'} icon={Database} label="IM Report" onClick={() => setSubTab('IM_DB')} color="emerald" />
          <SubNavItem active={subTab === 'BM_DB'} icon={Database} label="BM Report" onClick={() => setSubTab('BM_DB')} color="emerald" />
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
          <SubNavItem active={subTab === 'BREAKDOWNS'} icon={Activity} label="Logs" onClick={() => setSubTab('BREAKDOWNS')} color="rose" />
          <SubNavItem active={subTab === 'SUMMARY'} icon={BarChart3} label="Summary" onClick={() => setSubTab('SUMMARY')} color="amber" />
        </div>
      </div>

      {/* CONTENT (FULL WIDTH) */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 pb-24 w-full">
        {subTab === 'ENTRY' && (
            <div className="animate-fade-in space-y-6 w-full">
                {/* CONTROLS */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Calendar className="w-5 h-5 text-indigo-500" /><input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="bg-transparent font-black text-slate-700 dark:text-white outline-none uppercase text-sm dark:[color-scheme:dark]" />
                        </div>
                        <div className="relative z-20 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCheck className={`w-4 h-4 ${activeShift === 'day' ? 'text-amber-500' : 'text-indigo-500'}`} /></div>
                            <select value={selectedSupervisorInUI} onChange={(e) => handleSupervisorChange(e.target.value)} className="block w-40 pl-10 pr-4 py-2 text-xs font-bold uppercase rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-0 appearance-none cursor-pointer transition-all">
                                <option value="Shift-A">Shift-A</option><option value="Shift-B">Shift-B</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><ChevronDown className="w-4 h-4 text-slate-400" /></div>
                        </div>
                    </div>
                    {showSwapNotice && <button onClick={handleSwapNow} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg animate-pulse"><RefreshCcw className="w-3.5 h-3.5" /> Tuesday Swap</button>}
                </div>
                
                {/* DAY/NIGHT SWITCHER */}
                <div className="flex justify-center">
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-full border border-slate-300 dark:border-slate-700 shadow-inner">
                        <button onClick={() => setActiveShift('day')} className={`px-10 py-2.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${activeShift === 'day' ? 'bg-amber-500 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Sun className="w-4 h-4" /> Day Shift</button>
                        <button onClick={() => setActiveShift('night')} className={`px-10 py-2.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${activeShift === 'night' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Moon className="w-4 h-4" /> Night Shift</button>
                    </div>
                </div>

                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2"><h3 className="text-lg font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2"><PenTool className="w-5 h-5 text-indigo-500" /> Injection Molding (IM)</h3><button onClick={() => handleAddEntry('IM')} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"><Plus className="w-3.5 h-3.5" /> Add IM Row</button></div>
                    <ProductionTable rows={imRows} onUpdateRow={(id, u) => updateRow('IM', id, u)} onDeleteRow={(id) => deleteRow('IM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('IM'); }} adminConfig={imConfig} isFormMode />
                </div>
                <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-4" />
                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2"><h3 className="text-lg font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2"><PenTool className="w-5 h-5 text-emerald-500" /> Blow Molding (BM)</h3><button onClick={() => handleAddEntry('BM')} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"><Plus className="w-3.5 h-3.5" /> Add BM Row</button></div>
                    <ProductionTable rows={bmRows} onUpdateRow={(id, u) => updateRow('BM', id, u)} onDeleteRow={(id) => deleteRow('BM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('BM'); }} adminConfig={bmConfig} isFormMode />
                </div>
            </div>
        )}

        {(subTab === 'IM_DB' || subTab === 'BM_DB') && (
            <div className="animate-fade-in space-y-6 w-full">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                   <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3"><History className="text-indigo-500" /> {subTab === 'IM_DB' ? 'IM' : 'BM'} Database</h2>
                   <div className="flex flex-wrap items-center gap-2">
                       <MultiSelectDropdown label="Machine" selected={selectedMachines} onChange={setSelectedMachines} options={availableMachines} icon={<Filter className="w-3.5 h-3.5" />} />
                       <MultiSelectDropdown label="Product" selected={selectedProducts} onChange={setSelectedProducts} options={availableProducts} icon={<Layers className="w-3.5 h-3.5" />} />
                       <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-white outline-none w-20 dark:[color-scheme:dark]" />
                          <span className="text-slate-400">-</span>
                          <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-white outline-none w-20 dark:[color-scheme:dark]" />
                       </div>
                       <button onClick={() => handleDownloadReport(subTab === 'IM_DB' ? 'IM' : 'BM')} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Export</button>
                       {(selectedMachines.length > 0 || selectedProducts.length > 0) && <button onClick={clearFilters} className="h-10 w-10 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"><X className="w-4 h-4" /></button>}
                   </div>
                </div>
                <DatabaseView startDate={reportStartDate} endDate={reportEndDate} machineType={subTab === 'IM_DB' ? 'IM' : 'BM'} allData={allData} machineFilter={selectedMachines} productFilter={selectedProducts} />
            </div>
        )}

        {subTab === 'BREAKDOWNS' && <BreakdownLog allData={allData} date={entryDate} />}
        {subTab === 'SUMMARY' && <DailySummary allData={allData} date={entryDate} breakdownCategories={adminConfig.breakdownCategories} onUpdate={onUpdate} />}
        {activeBDRow && <BreakdownModal row={activeBDRow} onClose={() => { setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }} onSave={(bds) => { if (activeBreakdownMachine && activeBreakdownRowId) { updateRow(activeBreakdownMachine, activeBreakdownRowId, { breakdowns: bds }); setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }}} categories={adminConfig.breakdownCategories} />}
      </div>

      {subTab === 'ENTRY' && (
        <div className="fixed bottom-0 w-full bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-700 h-12 z-50 flex items-center justify-center shadow-2xl">
          <div className="flex gap-8 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-bold"><span className="text-[10px] uppercase tracking-wider">Plan</span><span className="text-white text-sm font-black">{totalStats.plan.toFixed(0)}</span></div>
              <div className="w-px h-4 bg-slate-700"></div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold"><span className="text-[10px] uppercase tracking-wider">Achieved</span><span className="text-white text-sm font-black">{totalStats.achv.toFixed(0)}</span></div>
              <div className="w-px h-4 bg-slate-700"></div>
              <div className="flex items-center gap-2 text-rose-400 font-bold"><span className="text-[10px] uppercase tracking-wider">Lost</span><span className="text-white text-sm font-black">{totalStats.lost.toFixed(0)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- STYLED SUBNAV ---
const SubNavItem: React.FC<{ active: boolean; icon: any; label: string; onClick: () => void; color: string; }> = ({ active, icon: Icon, label, onClick, color }) => {
  const colorMap: Record<string, string> = { indigo: '#6366f1', emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b' };
  const cssVar = { '--tab-color': colorMap[color], '--bg-color': 'var(--tab-bg-color, #1e293b)' } as React.CSSProperties;
  return (
    <button onClick={onClick} style={cssVar} className={`relative px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap overflow-hidden group ${active ? 'animated-tab-active text-white bg-transparent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent'}`}>
      <span className="relative z-10 flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : ''}`} /><span>{label}</span></span>
      <style>{`.animated-tab-active { --tab-bg-color: #0f172a; } :root:not(.dark) .animated-tab-active { --tab-bg-color: #ffffff; } :root:not(.dark) .animated-tab-active span { color: var(--tab-color); }`}</style>
    </button>
  );
};

export default ProductionTab;