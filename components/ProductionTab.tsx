import React, { useState } from 'react';
import { 
  Plus, Activity, Database, History, PenTool, 
  BarChart3, Sun, Moon, Calendar, UserCheck
} from 'lucide-react';
import { DayData, ProductionRow, ShiftType, AdminConfig } from '../types';
import ProductionTable from './ProductionTable';
import BreakdownModal from './BreakdownModal';
import BreakdownLog from './BreakdownLog';
import DailySummary from './DailySummary';
import DatabaseView from './DatabaseView';
import { calculateMetrics } from '../utils';

interface Props {
  date: string;
  allData: Record<string, any>;
  onUpdate: (key: string, data: DayData) => void;
  adminConfig: AdminConfig;
}

type SubTab = 'IM_ENTRY' | 'IM_DB' | 'BM_ENTRY' | 'BM_DB' | 'BREAKDOWNS' | 'SUMMARY';

const SUPERVISORS = ['Parami', 'Dilusha'];

const ProductionTab: React.FC<Props> = ({ date: initialDate, allData, onUpdate, adminConfig }) => {
  const [subTab, setSubTab] = useState<SubTab>('IM_ENTRY');
  
  const [entryDate, setEntryDate] = useState(initialDate);
  const [reportStartDate, setReportStartDate] = useState(initialDate);
  const [reportEndDate, setReportEndDate] = useState(initialDate);

  const [activeBreakdownRowId, setActiveBreakdownRowId] = useState<string | null>(null);

  const machineType = subTab.startsWith('BM') ? 'BM' : 'IM';
  const currentKey = `${entryDate}_${machineType}`;
  
  const dayData = allData[currentKey] || { 
      id: currentKey, 
      date: entryDate, 
      machineType, 
      daySupervisor: '', 
      nightSupervisor: '', 
      rows: [] 
  };

  const handleSupervisorChange = (shift: 'day' | 'night', name: string) => {
      let updates: Partial<DayData> = {};
      
      if (shift === 'day') {
          updates.daySupervisor = name;
          updates.nightSupervisor = SUPERVISORS.find(s => s !== name) || '';
      } else {
          updates.nightSupervisor = name;
          updates.daySupervisor = SUPERVISORS.find(s => s !== name) || '';
      }
      onUpdate(currentKey, { ...dayData, ...updates });
  };

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

  const calculateShiftTotals = (rows: ProductionRow[]) => {
    return rows.reduce((acc, row) => {
      const m = calculateMetrics(row);
      return {
        planKg: acc.planKg + m.planKg,
        achvKg: acc.achvKg + m.achievedKg,
        lostKg: acc.lostKg + m.lostKg
      };
    }, { planKg: 0, achvKg: 0, lostKg: 0 });
  };

  const dayTotals = calculateShiftTotals(dayShiftRows);
  const nightTotals = calculateShiftTotals(nightShiftRows);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300">
      <div className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-0 z-30 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center transition-colors duration-300">
         
         <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
            <SubNavItem active={subTab === 'IM_ENTRY'} icon={<PenTool className="w-4 h-4" />} label="IM Entry" onClick={() => setSubTab('IM_ENTRY')} color="indigo" />
            <SubNavItem active={subTab === 'IM_DB'} icon={<Database className="w-4 h-4" />} label="IM Report" onClick={() => setSubTab('IM_DB')} color="emerald" />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <SubNavItem active={subTab === 'BM_ENTRY'} icon={<PenTool className="w-4 h-4" />} label="BM Entry" onClick={() => setSubTab('BM_ENTRY')} color="indigo" />
            <SubNavItem active={subTab === 'BM_DB'} icon={<Database className="w-4 h-4" />} label="BM Report" onClick={() => setSubTab('BM_DB')} color="emerald" />
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <SubNavItem active={subTab === 'BREAKDOWNS'} icon={<Activity className="w-4 h-4" />} label="Logs" onClick={() => setSubTab('BREAKDOWNS')} color="rose" />
            <SubNavItem active={subTab === 'SUMMARY'} icon={<BarChart3 className="w-4 h-4" />} label="Summary" onClick={() => setSubTab('SUMMARY')} color="amber" />
         </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 custom-scrollbar pb-32 bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-300">
         {(subTab === 'IM_ENTRY' || subTab === 'BM_ENTRY') && (
           <div className="max-w-[2400px] mx-auto animate-fade-in space-y-12">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
                        <PenTool className="text-indigo-600 dark:text-indigo-400" /> {machineType} Production Entry
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <input 
                                    type="date" 
                                    value={entryDate} 
                                    onChange={(e) => setEntryDate(e.target.value)} 
                                    className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer dark:[color-scheme:dark]" 
                                />
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              <section className="space-y-4">
                 <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/50 transition-colors">
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                              <Sun className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Day Shift</h3>
                              <p className="text-[10px] font-bold text-amber-700/60 dark:text-amber-400/60 uppercase">08:00 AM - 08:00 PM</p>
                           </div>
                       </div>
                       
                       <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm">
                          <UserCheck className="w-4 h-4 text-amber-500" />
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider leading-none">Supervisor</span>
                             <select value={dayData.daySupervisor || ''} onChange={(e) => handleSupervisorChange('day', e.target.value)} className="bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-w-[100px] border-none focus:ring-0">
                                <option value="">Select...</option>
                                <option value="Parami">Parami</option>
                                <option value="Dilusha">Dilusha</option>
                             </select>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => handleAddEntry('day')} className="px-6 py-2.5 bg-amber-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-2"><Plus className="w-4 h-4" /> Add Row</button>
                 </div>
                 <ProductionTable rows={dayShiftRows} onUpdateRow={updateRow} onDeleteRow={deleteRow} onOpenBreakdowns={setActiveBreakdownRowId} adminConfig={adminConfig} isFormMode={true} />
              </section>

              <section className="space-y-4">
                 <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 transition-colors">
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                              <Moon className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Night Shift</h3>
                              <p className="text-[10px] font-bold text-indigo-700/60 dark:text-indigo-400/60 uppercase">08:00 PM - 08:00 AM</p>
                           </div>
                       </div>
                       <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                          <UserCheck className="w-4 h-4 text-indigo-500" />
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider leading-none">Supervisor</span>
                             <select value={dayData.nightSupervisor || ''} onChange={(e) => handleSupervisorChange('night', e.target.value)} className="bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer min-w-[100px] border-none focus:ring-0">
                                <option value="">Select...</option>
                                <option value="Parami">Parami</option>
                                <option value="Dilusha">Dilusha</option>
                             </select>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => handleAddEntry('night')} className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"><Plus className="w-4 h-4" /> Add Row</button>
                 </div>
                 <ProductionTable rows={nightShiftRows} onUpdateRow={updateRow} onDeleteRow={deleteRow} onOpenBreakdowns={setActiveBreakdownRowId} adminConfig={adminConfig} isFormMode={true} />
              </section>
           </div>
         )}
         
         {(subTab === 'IM_DB' || subTab === 'BM_DB') && (
            <div className="max-w-[2400px] mx-auto animate-fade-in">
               <div className="mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
                        <History className="text-emerald-600 dark:text-emerald-400" /> {machineType} Production Database
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Report Database</p>
                  </div>
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-1 shadow-sm">
                      <div className="px-3 flex items-center gap-2 border-r border-slate-200 dark:border-slate-600">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">FROM</span>
                          <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="text-xs font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent dark:[color-scheme:dark]" />
                      </div>
                      <div className="px-3 flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">TO</span>
                          <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="text-xs font-bold text-slate-700 dark:text-slate-200 outline-none bg-transparent dark:[color-scheme:dark]" />
                      </div>
                  </div>
               </div>
               <DatabaseView startDate={reportStartDate} endDate={reportEndDate} machineType={machineType} allData={allData} />
            </div>
         )}

         {subTab === 'BREAKDOWNS' && <BreakdownLog allData={allData} date={entryDate} />}
         {subTab === 'SUMMARY' && <DailySummary allData={allData} date={entryDate} />}
      </div>

      {activeRowForBD && <BreakdownModal row={activeRowForBD} onClose={() => setActiveBreakdownRowId(null)} onSave={bds => { updateRow(activeRowForBD.id, { breakdowns: bds }); setActiveBreakdownRowId(null); }} />}

      {!isDbMode && (
         <div className="bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-16 w-full fixed bottom-0 z-40 transition-colors duration-300">
            <div className="h-full max-w-[2000px] mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">Day</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Plan</span><span className="font-black text-slate-700 dark:text-slate-300">{dayTotals.planKg.toFixed(1)}</span></div>
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Done</span><span className="font-black text-emerald-600 dark:text-emerald-400">{dayTotals.achvKg.toFixed(1)}</span></div>
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Waste</span><span className="font-black text-rose-500 dark:text-rose-400">{dayTotals.lostKg.toFixed(1)}</span></div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">Night</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Plan</span><span className="font-black text-slate-700 dark:text-slate-300">{nightTotals.planKg.toFixed(1)}</span></div>
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Done</span><span className="font-black text-emerald-600 dark:text-emerald-400">{nightTotals.achvKg.toFixed(1)}</span></div>
                            <div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-slate-400 uppercase">Waste</span><span className="font-black text-rose-500 dark:text-rose-400">{nightTotals.lostKg.toFixed(1)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

const SubNavItem: React.FC<{ active: boolean, icon: any, label: string, onClick: () => void, color: string }> = ({ active, icon, label, onClick, color }) => {
  const colorMap: any = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    rose: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
    amber: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
  };

  return (
    <button onClick={onClick} className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-tight transition-all border border-transparent whitespace-nowrap ${active ? colorMap[color] + ' shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default ProductionTab;