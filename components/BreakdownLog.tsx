import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DayData } from '../types';
import { 
  ShieldAlert, Download, Filter, Calendar, 
  ChevronDown, ChevronUp, Activity, Layers, Check, X, Clock, TrendingDown 
} from 'lucide-react';
import { calculateTimeDiff, getDatesInRange, exportBreakdownsToExcel } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Cell, Line 
} from 'recharts';

interface Props {
  allData: Record<string, any>;
  date: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- CUSTOM DROPDOWN ---
const CustomDropdown = ({ label, options, selected, onChange, icon: Icon, isMulti = false }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggle = (opt: string) => {
        if (isMulti) {
            onChange(selected.includes(opt) ? selected.filter((s: string) => s !== opt) : [...selected, opt]);
        } else {
            onChange(opt);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white transition-all hover:bg-slate-700 min-w-[160px] justify-between ${isOpen ? 'ring-2 ring-indigo-500' : ''}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon className="w-3.5 h-3.5 text-indigo-400" />}
                    <span className="truncate">
                        {isMulti 
                            ? (selected.length === 0 ? label : `${selected.length} Selected`) 
                            : (selected === 'ALL' ? label : selected)
                        }
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {!isMulti && (
                            <div onClick={() => toggle('ALL')} className="p-2 text-xs font-bold text-slate-300 hover:bg-slate-700 rounded-lg cursor-pointer">{label} (All)</div>
                        )}
                        {options.map((opt: string) => (
                            <div 
                                key={opt} 
                                onClick={() => toggle(opt)} 
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-bold ${
                                    (isMulti ? selected.includes(opt) : selected === opt)
                                        ? 'bg-indigo-600 text-white' 
                                        : 'text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {isMulti && (
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selected.includes(opt) ? 'border-white bg-indigo-500' : 'border-slate-500'}`}>
                                        {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                )}
                                <span className="truncate">{opt}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const BreakdownLog: React.FC<Props> = ({ allData, date }) => {
  const [startDate, setStartDate] = useState(() => localStorage.getItem('bd_start') || date);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('bd_end') || date);
  const [selectedMachine, setSelectedMachine] = useState(() => localStorage.getItem('bd_machine') || 'ALL');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  
  // Chart Logic State
  const [chartCategory, setChartCategory] = useState('ALL'); 

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  useEffect(() => { localStorage.setItem('bd_start', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('bd_end', endDate); }, [endDate]);
  useEffect(() => { localStorage.setItem('bd_machine', selectedMachine); }, [selectedMachine]);

  // --- DATA ENGINE ---
  const { groupedData, sortedDates, uniqueMachines, uniqueCategories, stats, filteredList, chartData } = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    const machines = new Set<string>();
    const categories = new Set<string>();
    
    const bds: any[] = [];
    const grouped: Record<string, any[]> = {};
    
    let totalMins = 0;
    let totalLostKg = 0;

    // 1. Data Collection
    dates.forEach(d => {
        ['IM', 'BM'].forEach(type => {
            const dayData = allData[`${d}_${type}`] as DayData;
            if (dayData && dayData.rows) {
                dayData.rows.forEach(row => {
                    if (row.machine) machines.add(row.machine);
                    
                    if (row.breakdowns && row.breakdowns.length > 0) {
                        row.breakdowns.forEach(bd => {
                            if (bd.category) categories.add(bd.category);

                            const machineMatch = selectedMachine === 'ALL' || row.machine === selectedMachine;
                            const catMatch = selectedCats.length === 0 || selectedCats.includes(bd.category);

                            if (machineMatch && catMatch) {
                                const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
                                const mins = calculateTimeDiff(bd.startTime, bd.endTime);
                                const lostQty = Math.floor(ratePerMin * mins);
                                const lostKg = (lostQty * (row.unitWeight || 0)) / 1000;

                                const item = {
                                    ...bd,
                                    date: d,
                                    machine: row.machine,
                                    product: row.product,
                                    unitWeight: row.unitWeight,
                                    category: bd.category,
                                    reason: bd.description, 
                                    startTime: bd.startTime,
                                    endTime: bd.endTime,
                                    mins,
                                    cycleTime: row.cycleTime,
                                    cavity: row.cavities,
                                    lostQty,
                                    lostKg
                                };

                                bds.push(item);
                                if (!grouped[d]) grouped[d] = [];
                                grouped[d].push(item);

                                totalMins += mins;
                                totalLostKg += lostKg;
                            }
                        });
                    }
                });
            }
        });
    });

    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    if (sorted.length > 0 && Object.keys(expandedDates).length === 0) setExpandedDates({ [sorted[0]]: true });

    // 2. Chart Data Logic (Dynamic)
    let cData: any[] = [];
    
    if (chartCategory === 'ALL') {
        // Mode 1: Compare Categories (Total Loss)
        const catMap: Record<string, number> = {};
        bds.forEach(item => {
            catMap[item.category] = (catMap[item.category] || 0) + item.lostKg;
        });
        cData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] })).sort((a, b) => b.value - a.value);
    } else {
        // Mode 2: Trend Analysis for Specific Category (Date vs Loss)
        const dateMap: Record<string, number> = {};
        dates.forEach(d => dateMap[d] = 0); // Initialize with 0
        
        bds.filter(item => item.category === chartCategory).forEach(item => {
            dateMap[item.date] += item.lostKg;
        });
        
        cData = Object.keys(dateMap).sort().map(d => ({ name: d, value: dateMap[d] }));
    }

    return { 
        groupedData: grouped,
        sortedDates: sorted,
        uniqueMachines: Array.from(machines).sort(),
        uniqueCategories: Array.from(categories).sort(),
        stats: { totalMins, totalLostKg },
        chartData: cData,
        filteredList: bds
    };
  }, [allData, startDate, endDate, selectedMachine, selectedCats, chartCategory]);

  const toggleDate = (d: string) => setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }));
  const handleExport = () => exportBreakdownsToExcel(filteredList, { start: startDate, end: endDate });

  return (
    <div className="space-y-8 animate-fade-in w-full pb-24 max-w-[1920px] mx-auto">
       
       {/* 1. HEADER & CONTROLS */}
       <div className="bg-slate-900 p-3 rounded-[1.5rem] shadow-xl border border-slate-700 flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-6 px-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl shadow-lg">
                    <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Breakdown Dashboard</h2>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Total: <span className="text-white text-xs">{stats.totalMins} min</span></span>
                        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Loss: <span className="text-rose-500 text-xs">{stats.totalLostKg.toFixed(1)} kg</span></span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pr-2">
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none w-24 [color-scheme:dark]" />
                    <span className="text-slate-500 font-bold">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none w-24 [color-scheme:dark]" />
                </div>
                
                <CustomDropdown label="All Machines" options={uniqueMachines} selected={selectedMachine} onChange={setSelectedMachine} icon={Filter} />
                
                {/* NEW BREAKDOWN CATEGORY DROPDOWN */}
                <CustomDropdown 
                    label="All Categories" 
                    options={uniqueCategories} 
                    selected={selectedCats} 
                    onChange={setSelectedCats} 
                    icon={Layers} 
                    isMulti={true}
                />

                <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95">
                    <Download className="w-4 h-4" /> Export
                </button>
            </div>
       </div>

       {/* 2. DYNAMIC CHART (CATEGORY COMPARISON OR TREND) */}
       {chartData.length > 0 && (
           <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                   <div>
                       <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white tracking-widest flex items-center gap-2">
                           <Activity className="w-5 h-5 text-indigo-500" /> 
                           {chartCategory === 'ALL' ? 'Total Loss by Category' : `Daily Loss Trend: ${chartCategory}`}
                       </h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                           {chartCategory === 'ALL' ? 'Compare impact across categories' : 'Monitor performance fluctuation over time'}
                       </p>
                   </div>
                   
                   <CustomDropdown label="Select Chart Category" options={uniqueCategories} selected={chartCategory} onChange={setChartCategory} icon={Layers} />
               </div>

               <div className="h-[350px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                       {chartCategory === 'ALL' ? (
                           <BarChart data={chartData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                               <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40}/>
                               <YAxis tick={{fontSize: 10, fill: '#6366f1', fontWeight: 700}} axisLine={false} tickLine={false} label={{ value: 'Loss (Kg)', angle: -90, position: 'insideLeft', fill: '#6366f1', fontSize: 10 }} />
                               <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff'}} itemStyle={{fontSize: '11px', fontWeight: 'bold'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                               <Bar dataKey="value" name="Loss Kg" radius={[6, 6, 0, 0]} barSize={50}>
                                   {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                               </Bar>
                           </BarChart>
                       ) : (
                           <ComposedChart data={chartData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                               <defs>
                                   <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                   </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                               <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                               <YAxis tick={{fontSize: 10, fill: '#f43f5e', fontWeight: 700}} axisLine={false} tickLine={false} label={{ value: 'Loss (Kg)', angle: -90, position: 'insideLeft', fill: '#f43f5e', fontSize: 10 }} />
                               <Tooltip contentStyle={{backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff'}} itemStyle={{fontSize: '11px', fontWeight: 'bold'}} cursor={{stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3'}} />
                               <Area type="monotone" dataKey="value" name="Loss Kg" stroke="#f43f5e" fill="url(#colorTrend)" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#1e293b'}} />
                           </ComposedChart>
                       )}
                   </ResponsiveContainer>
               </div>
           </div>
       )}

       {/* 3. LOGS TABLE (ALL COLUMNS) */}
       <div className="space-y-5">
          {sortedDates.map(d => {
             const items = groupedData[d];
             const isExpanded = expandedDates[d];
             const dayMins = items.reduce((s, i) => s + i.mins, 0);
             const dayLoss = items.reduce((s, i) => s + i.lostKg, 0);

             return (
                 <div key={d} className="bg-white dark:bg-[#0f172a] rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden transition-all duration-300">
                     <div onClick={() => toggleDate(d)} className={`flex items-center justify-between p-6 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-900' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}>
                        <div className="flex items-center gap-6">
                            <button className={`p-3 rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{d}</h4>
                                <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">{items.length} Events</span>
                            </div>
                        </div>
                        <div className="flex gap-8 text-right">
                            <div><span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Downtime</span><span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{dayMins} <span className="text-sm font-bold text-slate-500">min</span></span></div>
                            <div><span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loss</span><span className="text-xl font-black text-rose-500">{dayLoss.toFixed(1)} <span className="text-sm font-bold text-slate-500">kg</span></span></div>
                        </div>
                     </div>

                     {isExpanded && (
                         <div className="border-t border-slate-200 dark:border-slate-800 animate-fade-in bg-white dark:bg-[#0f172a]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                   <thead className="bg-slate-100 dark:bg-slate-950 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                      <tr>
                                         <th className="p-4 pl-6">Machine</th>
                                         <th className="p-4">Product</th>
                                         <th className="p-4 text-right">Unit Wt</th>
                                         <th className="p-4 text-center">Category</th>
                                         <th className="p-4">Reason</th>
                                         <th className="p-4 text-center">Start</th>
                                         <th className="p-4 text-center">End</th>
                                         <th className="p-4 text-center text-indigo-600 dark:text-indigo-400">Min</th>
                                         <th className="p-4 text-center">Cycle</th>
                                         <th className="p-4 text-center">Cav</th>
                                         <th className="p-4 text-right text-rose-500">Lost Qty</th>
                                         <th className="p-4 text-right text-rose-500 pr-6">Lost Kg</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300">
                                      {items.map((bd, i) => (
                                         <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 pl-6 font-black text-slate-900 dark:text-white">{bd.machine}</td>
                                            <td className="p-4 font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={bd.product}>{bd.product}</td>
                                            <td className="p-4 text-right font-mono text-slate-400">{bd.unitWeight}</td>
                                            <td className="p-4 text-center"><span className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wide border border-indigo-100 dark:border-indigo-800">{bd.category}</span></td>
                                            <td className="p-4 max-w-xs truncate" title={bd.reason}>{bd.reason}</td>
                                            <td className="p-4 text-center font-mono text-xs opacity-70">{bd.startTime}</td>
                                            <td className="p-4 text-center font-mono text-xs opacity-70">{bd.endTime}</td>
                                            <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">{bd.mins}</td>
                                            <td className="p-4 text-center font-mono text-slate-400">{bd.cycleTime}</td>
                                            <td className="p-4 text-center font-mono text-slate-400">{bd.cavity}</td>
                                            <td className="p-4 text-right text-rose-500">{bd.lostQty}</td>
                                            <td className="p-4 pr-6 text-right text-rose-600 font-black">{bd.lostKg.toFixed(2)}</td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                            </div>
                         </div>
                     )}
                 </div>
             );
          })}
       </div>
    </div>
  );
};

export default BreakdownLog;