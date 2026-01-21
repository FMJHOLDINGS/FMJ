import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Database, History, PenTool, BarChart3, Filter, Layers, Download, X, 
  LayoutDashboard, Plus
} from 'lucide-react';
import { DayData, ProductionRow, ShiftType, AdminConfig } from '../types';
import ProductionHeader from './ProductionHeader';
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

// --- DATE HELPERS (Auto Select Current Month) ---
const getMonthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA'); 
};

const getMonthEnd = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toLocaleDateString('en-CA');
};

const ProductionTab: React.FC<Props> = ({ date: initialDate, allData, onUpdate, adminConfig }) => {
  const [subTab, setSubTab] = useState<SubTab>('ENTRY');
  
  // --- PERSISTENT STATE ---
  const [entryDate, setEntryDate] = useState(() => localStorage.getItem('fmj_entry_date') || initialDate);
  const [activeShift, setActiveShift] = useState<ShiftType>(() => (localStorage.getItem('fmj_active_shift') as ShiftType) || 'day');
  
  // --- UPDATED LOGIC: Default to Current Month ONLY if localStorage is empty ---
  const [reportStartDate, setReportStartDate] = useState(() => localStorage.getItem('fmj_rep_start') || getMonthStart());
  const [reportEndDate, setReportEndDate] = useState(() => localStorage.getItem('fmj_rep_end') || getMonthEnd());

  useEffect(() => { localStorage.setItem('fmj_entry_date', entryDate); }, [entryDate]);
  useEffect(() => { localStorage.setItem('fmj_active_shift', activeShift); }, [activeShift]);
  useEffect(() => { localStorage.setItem('fmj_rep_start', reportStartDate); }, [reportStartDate]);
  useEffect(() => { localStorage.setItem('fmj_rep_end', reportEndDate); }, [reportEndDate]);

  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeBreakdownRowId, setActiveBreakdownRowId] = useState<string | null>(null);
  const [activeBreakdownMachine, setActiveBreakdownMachine] = useState<'IM'|'BM'|null>(null);
  const [showSwapNotice, setShowSwapNotice] = useState(false);

  // --- SUPERVISOR STORAGE ---
  const supKey = `${entryDate}_SUPERVISORS`;
  const savedSupData = allData[supKey] || { day: 'Shift-A', night: 'Shift-B' };
  const currentDaySup = savedSupData.day;
  const currentNightSup = savedSupData.night;
  const displaySup = activeShift === 'day' ? currentDaySup : currentNightSup;

  const updateSupervisors = (d: Supervisor, n: Supervisor) => {
      onUpdate(supKey, { id: supKey, date: entryDate, day: d, night: n });
  };

  useEffect(() => {
    const sup = allData[supKey];
    if (!sup) return;
    const d = sup.day;
    const n = sup.night;
    const imKey = `${entryDate}_IM`;
    const bmKey = `${entryDate}_BM`;
    const im = allData[imKey];
    if (im && (im.daySupervisor !== d || im.nightSupervisor !== n)) onUpdate(imKey, { ...im, daySupervisor: d, nightSupervisor: n });
    const bm = allData[bmKey];
    if (bm && (bm.daySupervisor !== d || bm.nightSupervisor !== n)) onUpdate(bmKey, { ...bm, daySupervisor: d, nightSupervisor: n });
  }, [allData, entryDate, supKey, onUpdate]);

  useEffect(() => { if (!allData[supKey]) updateSupervisors('Shift-A', 'Shift-B'); }, [entryDate]);

  useEffect(() => {
    if (!isTuesday(entryDate)) { setShowSwapNotice(false); return; }
    const prevKey = `${minusDays(entryDate, 7)}_SUPERVISORS`;
    const prevSup = allData[prevKey];
    if (!prevSup) { setShowSwapNotice(false); return; }
    setShowSwapNotice(currentDaySup === prevSup.day);
  }, [entryDate, allData, currentDaySup]);

  const handleSupervisorChange = (newVal: string) => {
    if (newVal !== 'Shift-A' && newVal !== 'Shift-B') return;
    const selected = newVal as Supervisor;
    if (activeShift === 'day') updateSupervisors(selected, otherSupervisor(selected));
    else updateSupervisors(otherSupervisor(selected), selected);
  };

  const handleSwapNow = () => updateSupervisors(currentNightSup, currentDaySup);

  // --- DATA LOADING ---
  const getKey = (type: 'IM' | 'BM') => `${entryDate}_${type}`;
  const getDayData = (type: 'IM' | 'BM'): DayData => {
     const key = getKey(type);
     return (allData[key] as DayData) || { id: key, date: entryDate, machineType: type, daySupervisor: currentDaySup, nightSupervisor: currentNightSup, rows: [] };
  };

  const imData = getDayData('IM');
  const bmData = getDayData('BM');

  const imConfig = useMemo(() => ({ ...adminConfig, productionItems: adminConfig.productionItems.filter(i => i.type === 'IM') }), [adminConfig]);
  const bmConfig = useMemo(() => ({ ...adminConfig, productionItems: adminConfig.productionItems.filter(i => i.type === 'BM') }), [adminConfig]);

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
      onUpdate(getKey(type), { ...data, daySupervisor: currentDaySup, nightSupervisor: currentNightSup, rows: [newRow, ...(data.rows || [])] });
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

  const clearFilters = () => { setSelectedMachines([]); setSelectedProducts([]); };

  const calculateShiftStats = (rows: ProductionRow[]) => rows.reduce((acc, row) => {
     const m = calculateMetrics(row);
     return { plan: acc.plan + m.planKg, achv: acc.achv + m.achievedKg, lost: acc.lost + m.lostKg };
  }, { plan: 0, achv: 0, lost: 0 });
  const imStats = calculateShiftStats(imRows);
  const bmStats = calculateShiftStats(bmRows);
  const totalStats = { plan: imStats.plan + bmStats.plan, achv: imStats.achv + bmStats.achv, lost: imStats.lost + bmStats.lost };

  // PRESERVED ANIMATION CSS
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
      
      {/* 1. STICKY TOP CONTAINER */}
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm shrink-0 w-full flex flex-col">
        
        {/* ROW A: NAVIGATION TABS (At the Top) */}
        <div className="flex items-center justify-center py-2 px-4 overflow-x-auto w-full border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-1.5 min-w-max">
            <SubNavItem active={subTab === 'ENTRY'} icon={LayoutDashboard} label="Production Entry" onClick={() => setSubTab('ENTRY')} color="indigo" />
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 min-w-[1px]" />
            <SubNavItem active={subTab === 'IM_DB'} icon={Database} label="IM Report" onClick={() => setSubTab('IM_DB')} color="emerald" />
            <SubNavItem active={subTab === 'BM_DB'} icon={Database} label="BM Report" onClick={() => setSubTab('BM_DB')} color="emerald" />
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 min-w-[1px]" />
            <SubNavItem active={subTab === 'BREAKDOWNS'} icon={Activity} label="Breakdowns" onClick={() => setSubTab('BREAKDOWNS')} color="rose" />
            <SubNavItem active={subTab === 'SUMMARY'} icon={BarChart3} label="Summary" onClick={() => setSubTab('SUMMARY')} color="amber" />
          </div>
        </div>

        {/* ROW B: HEADER CONTROLS (Below Tabs - Only on Entry) */}
        {subTab === 'ENTRY' && (
          <ProductionHeader 
            entryDate={entryDate}
            setEntryDate={setEntryDate}
            activeShift={activeShift}
            setActiveShift={setActiveShift}
            displaySup={displaySup}
            handleSupervisorChange={handleSupervisorChange}
            showSwapNotice={showSwapNotice}
            handleSwapNow={handleSwapNow}
          />
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-2 md:p-4 custom-scrollbar bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300 pb-24 w-full">
        
        {/* --- ENTRY --- */}
        {subTab === 'ENTRY' && (
            <div className="animate-fade-in space-y-4 md:space-y-6 w-full">
                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2"><h3 className="text-sm md:text-lg font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2"><PenTool className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Injection Molding (IM)</h3><button onClick={() => handleAddEntry('IM')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"><Plus className="w-3.5 h-3.5" /> Add Row</button></div>
                    <ProductionTable rows={imRows} onUpdateRow={(id, u) => updateRow('IM', id, u)} onDeleteRow={(id) => deleteRow('IM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('IM'); }} adminConfig={imConfig} isFormMode />
                </div>
                <div className="w-full h-px bg-slate-300 dark:bg-slate-700 my-4" />
                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2"><h3 className="text-sm md:text-lg font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2"><PenTool className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> Blow Molding (BM)</h3><button onClick={() => handleAddEntry('BM')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95"><Plus className="w-3.5 h-3.5" /> Add Row</button></div>
                    <ProductionTable rows={bmRows} onUpdateRow={(id, u) => updateRow('BM', id, u)} onDeleteRow={(id) => deleteRow('BM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('BM'); }} adminConfig={bmConfig} isFormMode />
                </div>
            </div>
        )}

        {/* --- DATABASE TAB --- */}
        {(subTab === 'IM_DB' || subTab === 'BM_DB') && (
            <div className="animate-fade-in space-y-6 w-full px-2">
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

        {/* --- BREAKDOWN LOG --- */}
        {subTab === 'BREAKDOWNS' && (
            <div className="w-full px-2">
                <BreakdownLog allData={allData} date={entryDate} />
            </div>
        )}

        {/* --- SUMMARY TAB --- */}
        {subTab === 'SUMMARY' && (
            <div className="w-full">
                <DailySummary allData={allData} date={entryDate} breakdownCategories={adminConfig.breakdownCategories} onUpdate={onUpdate} />
            </div>
        )}

        {activeBDRow && <BreakdownModal row={activeBDRow} onClose={() => { setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }} onSave={(bds) => { if (activeBreakdownMachine && activeBreakdownRowId) { updateRow(activeBreakdownMachine, activeBreakdownRowId, { breakdowns: bds }); setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }}} categories={adminConfig.breakdownCategories} />}
      </div>

      {/* --- BOTTOM BAR --- */}
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