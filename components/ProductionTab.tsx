import React, { useState } from 'react';
import { 
  Plus, Download, LayoutGrid, Box, Activity, 
  ClipboardList, Database, Save, Trash2, 
  History, PenTool, BarChart3, Sun, Moon, CalendarDays, ArrowRight
} from 'lucide-react';
import { DayData, ProductionRow, ShiftType, AdminConfig } from '../types';
import ProductionTable from './ProductionTable';
import BreakdownModal from './BreakdownModal';
import BreakdownLog from './BreakdownLog';
import DailySummary from './DailySummary';
import DatabaseView from './DatabaseView';
import { calculateMetrics, exportToCSV } from '../utils';

interface Props {
  date: string; // Keep this for compatibility, but we will assume single date logic updates activeDate
  allData: Record<string, any>;
  onUpdate: (key: string, data: DayData) => void;
  adminConfig: AdminConfig;
}

type SubTab = 'IM_ENTRY' | 'IM_DB' | 'BM_ENTRY' | 'BM_DB' | 'BREAKDOWNS' | 'SUMMARY';

const ProductionTab: React.FC<Props> = ({ date: initialDate, allData, onUpdate, adminConfig }) => {
  const [subTab, setSubTab] = useState<SubTab>('IM_ENTRY');
  
  // Date State: Range for DB, Single for Entry
  const [entryDate, setEntryDate] = useState(initialDate); // For Entry Forms
  const [reportStartDate, setReportStartDate] = useState(initialDate); // For DB View
  const [reportEndDate, setReportEndDate] = useState(initialDate); // For DB View

  const [activeBreakdownRowId, setActiveBreakdownRowId] = useState<string | null>(null);

  // Determine machine type based on sub-tab
  const machineType = subTab.startsWith('BM') ? 'BM' : 'IM';
  
  // Current Key is only for ENTRY mode
  const currentKey = `${entryDate}_${machineType}`;
  const dayData = allData[currentKey] || { id: currentKey, date: entryDate, machineType, rows: [] };

  const handleAddEntry = (shift: ShiftType) => {
    const uniqueId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRow: ProductionRow = {
      id: uniqueId,
      shift,
      startTime: shift === 'day' ? '08:00' : '20:00',
      endTime: shift === 'day' ? '20:00' : '08:00',
      machine: '',
      product: '',
      unitWeight: 0,
      qtyPerHour: 0,
      cavities: 1,
      cycleTime: 0,
      achievedQty: 0,
      breakdowns: []
    };
    onUpdate(currentKey, { ...dayData, rows: [newRow, ...dayData.rows] });
  };

  const updateRow = (rowId: string, updates: Partial<ProductionRow>) => {
    const updatedRows = dayData.rows.map(r => r.id === rowId ? { ...r, ...updates } : r);
    onUpdate(currentKey, { ...dayData, rows: updatedRows });
  };

  const deleteRow = (rowId: string) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      const updatedRows = dayData.rows.filter(r => r.id !== rowId);
      onUpdate(currentKey, { ...dayData, rows: updatedRows });
    }
  };

  const activeRowForBD = dayData.rows.find(r => r.id === activeBreakdownRowId);
  const dayShiftRows = dayData.rows.filter(r => r.shift === 'day');
  const nightShiftRows = dayData.rows.filter(r => r.shift === 'night');

  const isDbMode = subTab === 'IM_DB' || subTab === 'BM_DB';

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Navigation Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-30 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
         
         {/* Sub Tabs */}
         <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 overflow-x-auto no-scrollbar max-w-full">
            <SubNavItem active={subTab === 'IM_ENTRY'} icon={<PenTool className="w-4 h-4" />} label="IM Entry" onClick={() => setSubTab('IM_ENTRY')} color="indigo" />
            <SubNavItem active={subTab === 'IM_DB'} icon={<Database className="w-4 h-4" />} label="IM Report" onClick={() => setSubTab('IM_DB')} color="emerald" />
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <SubNavItem active={subTab === 'BM_ENTRY'} icon={<PenTool className="w-4 h-4" />} label="BM Entry" onClick={() => setSubTab('BM_ENTRY')} color="indigo" />
            <SubNavItem active={subTab === 'BM_DB'} icon={<Database className="w-4 h-4" />} label="BM Report" onClick={() => setSubTab('BM_DB')} color="emerald" />
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <SubNavItem active={subTab === 'BREAKDOWNS'} icon={<Activity className="w-4 h-4" />} label="Logs" onClick={() => setSubTab('BREAKDOWNS')} color="rose" />
            <SubNavItem active={subTab === 'SUMMARY'} icon={<BarChart3 className="w-4 h-4" />} label="Summary" onClick={() => setSubTab('SUMMARY')} color="amber" />
         </div>

         {/* Date Controls */}
         <div className="flex items-center gap-3">
            {isDbMode ? (
               // Date Range Picker for DB Mode
               <div className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-sm">
                  <div className="px-3 flex items-center gap-2 border-r border-slate-200">
                     <CalendarDays className="w-4 h-4 text-emerald-600" />
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">FROM</span>
                     <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none w-28 bg-transparent" />
                  </div>
                  <div className="px-3 flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TO</span>
                     <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none w-28 bg-transparent" />
                  </div>
               </div>
            ) : (
               // Single Date Picker for Entry Mode
               <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 gap-2 shadow-sm">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Entry Date</span>
                  <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="text-sm font-bold text-indigo-900 bg-transparent outline-none" />
               </div>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar pb-32">
         {/* DATA ENTRY FORMS - DAY/NIGHT SEPARATED */}
         {(subTab === 'IM_ENTRY' || subTab === 'BM_ENTRY') && (
           <div className="max-w-[2400px] mx-auto animate-fade-in space-y-12">
              <div className="flex items-center justify-between mb-4">
                 <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                      <PenTool className="text-indigo-600" /> {machineType} Production Entry
                    </h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Record live production for {entryDate}</p>
                 </div>
              </div>

              {/* Day Shift Section */}
              <section className="space-y-4">
                 <div className="flex items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                          <Sun className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Day Shift Section</h3>
                          <p className="text-[10px] font-bold text-amber-700/60 uppercase">08:00 AM - 08:00 PM</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleAddEntry('day')} 
                      className="px-6 py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Day Row
                    </button>
                 </div>
                 <ProductionTable 
                   rows={dayShiftRows} 
                   onUpdateRow={updateRow} 
                   onDeleteRow={deleteRow} 
                   onOpenBreakdowns={setActiveBreakdownRowId}
                   adminConfig={adminConfig}
                   isFormMode={true}
                 />
              </section>

              {/* Night Shift Section */}
              <section className="space-y-4">
                 <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                          <Moon className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Night Shift Section</h3>
                          <p className="text-[10px] font-bold text-indigo-700/60 uppercase">08:00 PM - 08:00 AM</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleAddEntry('night')} 
                      className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Night Row
                    </button>
                 </div>
                 <ProductionTable 
                   rows={nightShiftRows} 
                   onUpdateRow={updateRow} 
                   onDeleteRow={deleteRow} 
                   onOpenBreakdowns={setActiveBreakdownRowId}
                   adminConfig={adminConfig}
                   isFormMode={true}
                 />
              </section>
           </div>
         )}

         {/* DATABASE REPORT LOGS */}
         {(subTab === 'IM_DB' || subTab === 'BM_DB') && (
            <div className="max-w-[2400px] mx-auto animate-fade-in">
               <div className="mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <History className="text-emerald-600" /> {machineType} Production Database
                    </h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                        Report from <span className="text-emerald-600">{reportStartDate}</span> to <span className="text-emerald-600">{reportEndDate}</span>
                    </p>
                  </div>
               </div>
               
               {/* NEW DATABASE VIEW COMPONENT */}
               <DatabaseView 
                  startDate={reportStartDate}
                  endDate={reportEndDate}
                  machineType={machineType}
                  allData={allData}
               />
            </div>
         )}

         {subTab === 'BREAKDOWNS' && <BreakdownLog allData={allData} date={entryDate} />}
         {subTab === 'SUMMARY' && <DailySummary allData={allData} date={entryDate} />}
      </div>

      {activeRowForBD && (
        <BreakdownModal 
          row={activeRowForBD} 
          onClose={() => setActiveBreakdownRowId(null)} 
          onSave={bds => { updateRow(activeRowForBD.id, { breakdowns: bds }); setActiveBreakdownRowId(null); }} 
        />
      )}

      {/* Sticky Metrics Footer (Only for Entry Mode) */}
      {!isDbMode && (
         <div className="bg-white/80 backdrop-blur-md border-t border-slate-200 h-20 px-10 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] fixed bottom-0 left-20 right-0 z-20">
            <div className="flex gap-12">
                <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Production</span>
                <span className="text-xl font-black text-indigo-600 leading-none">{dayData.rows.reduce((a, r) => a + calculateMetrics(r).achievedKg, 0).toLocaleString()} <span className="text-xs">KG</span></span>
                </div>
                <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Waste</span>
                <span className="text-xl font-black text-rose-500 leading-none">{dayData.rows.reduce((a, r) => a + calculateMetrics(r).lostKg, 0).toLocaleString()} <span className="text-xs">KG</span></span>
                </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Status</p>
                  <p className="text-[11px] font-bold text-slate-800">Recording Data...</p>
               </div>
               <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

const SubNavItem: React.FC<{ active: boolean, icon: any, label: string, onClick: () => void, color: string }> = ({ active, icon, label, onClick, color }) => {
  const colorMap: any = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200'
  };

  return (
    <button 
      onClick={onClick} 
      className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-tight transition-all border border-transparent whitespace-nowrap ${active ? colorMap[color] + ' shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-white'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default ProductionTab;