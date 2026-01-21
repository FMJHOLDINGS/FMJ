import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Filter, CalendarDays, ShieldCheck, 
  Rocket, Scale, CheckCircle2, XCircle, ChevronDown, ChevronUp, BarChart3, Check, PenTool, X, Save, PlusCircle, Trash2, Atom
} from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { generateProductionReport, generateItemReport } from './ExcelExportHelper';
import { DefectEntry, AdminConfig } from '../types';

interface Props {
  data?: Record<string, any>;
  allData?: Record<string, any>;
  onUpdate: (key: string, data: any) => void;
  adminConfig?: AdminConfig; 
}

// Interfaces to fix TS error
interface StatBoxProps { label: string; value: string; icon: React.ReactNode; color: string; }
interface DailyViewProps { data: any[]; onEditRow: (r: any) => void; }
interface ExpandableCardProps { date: string; items: any[]; onEditRow: (r: any) => void; }
interface ModalProps { row: any; onClose: () => void; onSave: (id: string, d: string, t: string, defs: DefectEntry[]) => void; categories: string[]; }

const COLORS = {
  primary: '#6366f1',
  danger: '#f43f5e',
  grid: '#94a3b8'
};

// --- NEW DATE HELPERS (CURRENT MONTH LOGIC) ---
const getMonthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-CA'); 
};

const getMonthEnd = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toLocaleDateString('en-CA');
};

const CustomDropdown = ({ options, selected, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);
    return (
        <div className="relative min-w-[180px]" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-white transition-all hover:bg-slate-200 dark:hover:bg-slate-800 ${isOpen ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex items-center gap-2 truncate"><Filter className="w-3.5 h-3.5 text-indigo-500" /><span className="truncate">{selected === 'ALL' ? 'All Products' : selected}</span></div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] max-h-64 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1">
                    <div onClick={() => { onChange('ALL'); setIsOpen(false); }} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${selected === 'ALL' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{selected === 'ALL' && <Check className="w-3 h-3" />}<span>All Products</span></div>
                    {options.map((opt: string) => (
                        <div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${selected === opt ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{selected === opt && <Check className="w-3 h-3" />}<span className="truncate">{opt}</span></div>
                    ))}
                </div>
            )}
        </div>
    );
};

const QualityTab: React.FC<Props> = ({ data, allData, onUpdate, adminConfig }) => { 
  const sourceData = data || allData || {};
  
  // --- UPDATED LOGIC: If localStorage is empty, use getMonthStart/End ---
  const [startDate, setStartDate] = useState(() => localStorage.getItem('quality_start_date') || getMonthStart());
  const [endDate, setEndDate] = useState(() => localStorage.getItem('quality_end_date') || getMonthEnd());
  
  const [selectedItem, setSelectedItem] = useState('ALL');
  const [editingRow, setEditingRow] = useState<any | null>(null);

  useEffect(() => { localStorage.setItem('quality_start_date', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('quality_end_date', endDate); }, [endDate]);

  const processedData = useMemo(() => {
    const rows: any[] = [];
    if (!sourceData || Object.keys(sourceData).length === 0) return [];
    
    Object.keys(sourceData).sort().forEach(key => {
        if (!key.endsWith('_IM') && !key.endsWith('_BM')) return;
        const datePart = key.split('_')[0];
        
        if (datePart >= startDate && datePart <= endDate) {
            const dayData = sourceData[key];
            if(dayData && dayData.rows) {
                dayData.rows.forEach((r: any) => {
                    const qtyTotal = Number(r.achievedQty) || 0;
                    const qtyReject = Number(r.rejectionQty) || 0; 
                    const auditQty = (r.defects || []).reduce((s: number, d: DefectEntry) => s + d.qty, 0);
                    
                    const qtyStartup = Number(r.startupQty) || 0;  
                    const qtyAccept = qtyTotal - qtyReject - qtyStartup;
                    const unitWt = Number(r.unitWeight) || 0;
                    
                    const wgtTotal = (qtyTotal * unitWt) / 1000;
                    const wgtReject = (qtyReject * unitWt) / 1000;
                    const wgtStartup = (qtyStartup * unitWt) / 1000;
                    const wgtAccept = (qtyAccept * unitWt) / 1000;
                    
                    const pctScrap = wgtTotal > 0 ? (wgtReject / wgtTotal) * 100 : 0;
                    const pctStartup = wgtTotal > 0 ? (wgtStartup / wgtTotal) * 100 : 0;
                    const pctAll = wgtTotal > 0 ? ((wgtReject + wgtStartup) / wgtTotal) * 100 : 0;
                    const type = key.endsWith('_IM') ? 'IM' : 'BM';

                    rows.push({
                        id: r.id, 
                        date: datePart, 
                        shift: r.shift, 
                        machine: r.machine || '-', 
                        product: r.product || '-',
                        unitWeight: unitWt, 
                        qtyTotal, qtyAccept, wgtTotal, wgtAccept,
                        qtyReject, wgtReject, auditQty,
                        qtyStartup, wgtStartup, pctScrap, pctStartup, pctAll, 
                        type,
                        defects: r.defects || [] 
                    });
                });
            }
        }
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [sourceData, startDate, endDate]);

  const uniqueItems = useMemo(() => Array.from(new Set(processedData.map(r => r.product))).sort(), [processedData]);

  const filteredData = useMemo(() => {
      return selectedItem === 'ALL' ? processedData : processedData.filter(r => r.product === selectedItem);
  }, [processedData, selectedItem]);

  const stats = useMemo(() => filteredData.reduce((acc, curr) => ({
      totalKg: acc.totalKg + curr.wgtTotal,
      rejKg: acc.rejKg + curr.wgtReject,
      startKg: acc.startKg + curr.wgtStartup,
      goodKg: acc.goodKg + curr.wgtAccept
  }), { totalKg: 0, rejKg: 0, startKg: 0, goodKg: 0 }), [filteredData]);

  const chartData = useMemo(() => {
    const grouped: Record<string, { name: string, production: number, totalRej: number }> = {};
    filteredData.forEach(row => {
        const key = row.date; 
        if (!grouped[key]) grouped[key] = { name: key, production: 0, totalRej: 0 };
        grouped[key].production += row.wgtTotal;
        grouped[key].totalRej += (row.wgtReject + row.wgtStartup);
    });
    return Object.values(grouped).map(item => ({
        ...item,
        damage: item.production > 0 ? parseFloat(((item.totalRej / item.production) * 100).toFixed(2)) : 0,
        production: parseFloat(item.production.toFixed(1))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredData]);

  const handleExport = async () => {
     if (filteredData.length === 0) { alert("No data available to export."); return; }
     if (selectedItem !== 'ALL') {
         await generateItemReport(filteredData, selectedItem, startDate, endDate);
     } else {
         const extraCats = adminConfig?.breakdownCategories || [];
         await generateProductionReport(filteredData, startDate, endDate, extraCats);
     }
  };

  const handleSaveDefects = (rowId: string, date: string, type: string, newDefects: DefectEntry[]) => {
      const dbKey = `${date}_${type}`;
      const dayData = sourceData[dbKey];
      if (!dayData) return;

      const updatedRows = dayData.rows.map((r: any) => {
          if (r.id === rowId) {
             return { ...r, defects: newDefects }; 
          }
          return r;
      });
      onUpdate(dbKey, { ...dayData, rows: updatedRows });
      setEditingRow(null);
  };

  // --- DROPDOWN CATEGORIES FIX ---
  const availableCategories = useMemo(() => {
      const defaults = ["OTHER"];
      const fromConfig = (adminConfig as any)?.qaCategories || [];
      return Array.from(new Set([...defaults, ...fromConfig])).sort();
  }, [adminConfig]);

  return (
    <div className="w-full h-full bg-[#F8FAFC] dark:bg-[#020617] p-2 overflow-hidden flex flex-col transition-colors duration-300 relative">
       
       <div className="bg-white dark:bg-[#0F172A] p-3 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 mb-2 flex-shrink-0">
         <div className="flex flex-col xl:flex-row justify-between items-center gap-3">
           <div className="flex items-center gap-3 w-full xl:w-auto">
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md"><ShieldCheck className="w-5 h-5 text-white"/></div>
             <div><h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Quality Console</h2></div>
           </div>
           
           <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
             <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
                <div className="px-2 flex items-center gap-2 border-r border-slate-300 dark:border-slate-700"><CalendarDays className="w-3 h-3 text-indigo-500" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none dark:[color-scheme:dark] uppercase cursor-pointer" /></div>
                <div className="px-2"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none dark:[color-scheme:dark] uppercase cursor-pointer" /></div>
             </div>
             <CustomDropdown options={uniqueItems} selected={selectedItem} onChange={setSelectedItem} />
             <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md active:scale-95"><FileSpreadsheet className="w-3.5 h-3.5" /> Export</button>
           </div>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
             <StatBoxCompact label="Production" value={`${stats.totalKg.toFixed(1)} kg`} icon={<Scale className="w-4 h-4 text-white"/>} color="from-indigo-500 to-blue-500" />
             <StatBoxCompact label="Accepted" value={`${stats.goodKg.toFixed(1)} kg`} icon={<CheckCircle2 className="w-4 h-4 text-white"/>} color="from-emerald-500 to-teal-500" />
             <StatBoxCompact label="Rejected" value={`${stats.rejKg.toFixed(1)} kg`} icon={<XCircle className="w-4 h-4 text-white"/>} color="from-rose-500 to-pink-500" />
             <StatBoxCompact label="Startup" value={`${stats.startKg.toFixed(1)} kg`} icon={<Rocket className="w-4 h-4 text-white"/>} color="from-amber-500 to-orange-500" />
         </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
            {chartData.length > 0 && (
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 mb-2">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                                <defs><linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} strokeOpacity={0.2} />
                                <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={5} />
                                <YAxis yAxisId="left" tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 9, fill: COLORS.danger, fontWeight: 700}} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '10px'}} itemStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                                <Bar yAxisId="left" dataKey="production" name="Production Kg" fill="url(#colorProd)" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1000} />
                                <Line yAxisId="right" type="monotone" dataKey="damage" name="Damage %" stroke={COLORS.danger} strokeWidth={2} dot={{r: 2}} animationDuration={1500} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            <DailyCardView data={filteredData} onEditRow={setEditingRow} />
       </div>

       {editingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/70 animate-in fade-in zoom-in-95 duration-200">
              <DefectModalContent row={editingRow} onClose={() => setEditingRow(null)} onSave={handleSaveDefects} categories={availableCategories} />
          </div>
       )}
    </div>
  );
};

const StatBoxCompact: React.FC<StatBoxProps> = ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-[#1e293b] p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${color} shadow-sm`}>{icon}</div>
        <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-tight">{label}</span><span className="text-sm font-black text-slate-800 dark:text-white leading-tight">{value}</span></div>
    </div>
);

const DailyCardView: React.FC<DailyViewProps> = ({ data, onEditRow }) => {
    const groupedByDate = useMemo(() => {
        const groups: Record<string, any[]> = {};
        data.forEach(r => { if (!groups[r.date]) groups[r.date] = []; groups[r.date].push(r); });
        return groups;
    }, [data]);
    const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    return <div className="space-y-3 p-1">{dates.map(date => <ExpandableDailyCard key={date} date={date} items={groupedByDate[date]} onEditRow={onEditRow} />)}</div>;
};

const ExpandableDailyCard: React.FC<ExpandableCardProps> = ({ date, items, onEditRow }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dayTotalProd = items.reduce((s, i) => s + i.wgtTotal, 0); 
    const dayTotalRej = items.reduce((s, i) => s + i.wgtReject + i.wgtStartup, 0);
    const dayPct = dayTotalProd > 0 ? (dayTotalRej / dayTotalProd) * 100 : 0;

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div onClick={() => setIsOpen(!isOpen)} className={`p-4 flex flex-col md:flex-row items-center justify-between cursor-pointer transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-900/60' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}`}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><ChevronDown className="w-4 h-4 transition-transform" /></div>
                    <div><h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{new Date(date).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})}</h4><span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">{items.length} Records</span></div>
                </div>
                <div className="flex gap-6 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">Prod</span><span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{dayTotalProd.toFixed(1)} kg</span></div>
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">Waste</span><span className="text-rose-500 font-black text-sm">{dayTotalRej.toFixed(1)} kg</span></div>
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">%</span><span className={`font-black text-sm px-1.5 py-0.5 rounded ${dayPct > 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{dayPct.toFixed(1)}%</span></div>
                </div>
            </div>
            {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
                                <tr>
                                    <th className="p-3 pl-4 rounded-l-lg">M/C & Shift</th>
                                    <th className="p-3 border-r border-slate-200 dark:border-slate-800">Item</th>
                                    <th className="p-3 text-right">Unit Wt</th>
                                    <th className="p-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-slate-200 dark:border-slate-800">Prod (Qty)</th>
                                    <th className="p-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">Acc (Qty)</th>
                                    <th className="p-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">Prod (Kg)</th>
                                    <th className="p-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 border-r border-slate-200 dark:border-slate-800">Acc (Kg)</th>
                                    <th className="p-3 text-right text-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10">Rej (Qty)</th>
                                    <th className="p-3 text-right text-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 border-r border-slate-200 dark:border-slate-800">Rej (Kg)</th>
                                    <th className="p-3 text-right text-amber-500 bg-amber-50/30 dark:bg-amber-900/10">Start (Qty)</th>
                                    <th className="p-3 text-right text-amber-500 bg-amber-50/30 dark:bg-amber-900/10 border-r border-slate-200 dark:border-slate-800">Start (Kg)</th>
                                    <th className="p-3 text-center">% (St)</th>
                                    <th className="p-3 text-center">Scrap %</th>
                                    <th className="p-3 text-center border-r border-slate-200 dark:border-slate-800">Tot %</th>
                                    <th className="p-3 text-center rounded-tr-lg">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-3 pl-4 border-r border-slate-200 dark:border-slate-800"><span className="font-black">{item.machine}</span> <span className="text-[10px] opacity-70">({item.shift})</span></td>
                                        <td className="p-3 truncate max-w-[150px]" title={item.product}>{item.product}</td>
                                        <td className="p-3 text-right font-mono opacity-70 border-r border-slate-200 dark:border-slate-800">{item.unitWeight}g</td>
                                        <td className="p-3 text-right font-black">{item.qtyTotal}</td>
                                        <td className="p-3 text-right">{item.qtyAccept}</td>
                                        <td className="p-3 text-right font-black">{item.wgtTotal.toFixed(1)}</td>
                                        <td className="p-3 text-right border-r border-slate-200 dark:border-slate-800">{item.wgtAccept.toFixed(1)}</td>
                                        <td className="p-3 text-right font-black text-indigo-500">{item.qtyReject}</td>
                                        <td className="p-3 text-right font-black text-indigo-500 border-r border-slate-200 dark:border-slate-800">{item.wgtReject.toFixed(1)}</td>
                                        <td className="p-3 text-right font-black text-amber-500">{item.qtyStartup}</td>
                                        <td className="p-3 text-right font-black text-amber-500 border-r border-slate-200 dark:border-slate-800">{item.wgtStartup.toFixed(1)}</td>
                                        <td className="p-3 text-center text-amber-500">{item.pctStartup.toFixed(1)}%</td>
                                        <td className="p-3 text-center text-indigo-500">{item.pctScrap.toFixed(1)}%</td>
                                        <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800"><span className={`px-1.5 py-0.5 rounded ${item.pctAll > 5 ? 'bg-rose-100 text-rose-600' : 'text-slate-500'}`}>{item.pctAll.toFixed(1)}%</span></td>
                                        <td className="p-3 text-center">
                                            <button 
                                                onClick={() => onEditRow(item)} 
                                                className={`px-3 py-1.5 rounded-lg text-white text-[10px] uppercase font-black tracking-wider whitespace-nowrap min-w-[90px] transition-all flex items-center justify-center mx-auto gap-1 relative overflow-hidden group
                                                    ${item.auditQty > 0 ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40 ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-[#0F172A]' : 'bg-slate-700 hover:bg-indigo-600'}
                                                `}
                                            >
                                                {item.auditQty > 0 && <span className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></span>}
                                                <PenTool className="w-3 h-3 relative z-10" /> 
                                                <span className="relative z-10">Audit {item.auditQty > 0 ? `(${item.auditQty})` : ''}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const DefectModalContent: React.FC<ModalProps> = ({ row, onClose, onSave, categories }) => {
    const [defects, setDefects] = useState<DefectEntry[]>([]);
    const [selectedCat, setSelectedCat] = useState(categories[0] || "");
    const [tempQty, setTempQty] = useState('');

    useEffect(() => {
        if(row.defects) setDefects(row.defects);
        if(categories.length > 0 && !selectedCat) setSelectedCat(categories[0]);
    }, [row, categories]);

    const handleAdd = () => {
        const qty = parseInt(tempQty);
        if (!qty || qty <= 0 || !selectedCat) return;
        
        const exists = defects.find(d => d.defectName === selectedCat);
        if (exists) {
            setDefects(defects.map(d => d.defectName === selectedCat ? { ...d, qty: d.qty + qty } : d));
        } else {
            setDefects([...defects, { defectName: selectedCat, qty }]);
        }
        setTempQty('');
    };

    const handleRemove = (name: string) => setDefects(defects.filter(d => d.defectName !== name));
    const totalAudit = defects.reduce((a, b) => a + b.qty, 0);

    return (
        <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden ring-1 ring-white/20">
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Atom className="w-32 h-32 text-white" /></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div><h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="w-5 h-5"/> QA Audit Entry</h3><p className="text-xs font-bold text-indigo-100 mt-1 opacity-90">{row.machine} • {row.product}</p></div>
                    <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"><X className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                 <div className="flex gap-3">
                     <div className="flex-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5 block">Defect Category</label>
                         <div className="relative">
                             <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-3 pr-8 py-3 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none"/>
                         </div>
                     </div>
                     <div className="w-24"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5 block">Quantity</label><input type="number" placeholder="0" value={tempQty} onChange={e => setTempQty(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center" /></div>
                     <div className="flex items-end"><button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-md active:scale-95"><PlusCircle className="w-5 h-5" /></button></div>
                 </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2.5">
                {defects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-10"><ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" /><span className="text-xs font-bold text-slate-400 uppercase">No defects recorded yet</span></div>
                ) : (
                    defects.map((d, i) => (
                        <div key={i} className="flex justify-between items-center p-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 duration-300 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {d.defectName}</span>
                            <div className="flex items-center gap-4"><span className="text-sm font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md">{d.qty}</span><button onClick={() => handleRemove(d.defectName)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex-shrink-0">
                <div className="flex justify-between items-center mb-4 px-1"><span className="text-xs font-black uppercase text-slate-500">Total Audit Count</span><span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalAudit} <span className="text-xs text-slate-400">units</span></span></div>
                <button onClick={() => onSave(row.id, row.date, row.type, defects)} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"><Save className="w-4 h-4" /> Save Record</button>
            </div>
        </div>
    );
};

export default QualityTab;