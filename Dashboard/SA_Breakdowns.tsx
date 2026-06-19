import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { 
  AlertOctagon, Clock, Activity, Factory, Filter, 
  ArrowUpRight, AlertTriangle, Timer, Database, Calendar, ChevronDown, Check, X, Scale 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Sector 
} from 'recharts';

// --- TYPES ---
interface BreakdownItem {
  id: string;
  factoryId: string;
  factoryName: string;
  date: string;
  machine: string;
  category: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  lostKg: number;
  planKg: number; 
}

// --- COLORS (Gold Premium Theme) ---
const COLORS = ['#f59e0b', '#ef4444', '#10b981', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#3b82f6', '#14b8a6', '#84cc16', '#eab308'];

// --- HELPER FUNCTIONS ---
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

const calculateTimeDiff = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return diff;
};

// මාසයේ දින පරාසය
const getMonthRange = (offsetMonths = 0) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
    
    const toStr = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };
    return { start: toStr(start), end: toStr(end) };
};

// Pie Chart Custom Label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 2.1; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const lineEndRadius = outerRadius + 10; 
  const xLine = cx + lineEndRadius * Math.cos(-midAngle * RADIAN);
  const yLine = cy + lineEndRadius * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      <path d={`M${cx + outerRadius * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * Math.sin(-midAngle * RADIAN)} L${xLine},${yLine} L${x},${y}`} stroke="#cbd5e1" strokeWidth={1} fill="none" opacity={0.5} />
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">{name}</text>
      <text x={x} y={y + 12} fill="#fbbf24" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>{(percent * 100).toFixed(0)}%</text>
    </g>
  );
};

const SA_Breakdowns = () => {
  const [loading, setLoading] = useState(true);
  const [allBreakdowns, setAllBreakdowns] = useState<BreakdownItem[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState(getMonthRange(0)); 
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uniqueFactories, setUniqueFactories] = useState<string[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const companySnap = await getDocs(collection(db, "companies"));
        let accumulatedBDs: BreakdownItem[] = [];

        const promises = companySnap.docs.map(async (doc) => {
          const cData = doc.data();
          if (!cData.collectionName) return;

          try {
            const q = query(collection(db, cData.collectionName), limit(150));
            const snap = await getDocs(q);

            snap.docs.forEach(d => {
              const rawData = d.data();
              const entries = rawData.entries || {};

              Object.values(entries).forEach((entry: any) => {
                if (entry && entry.rows && Array.isArray(entry.rows)) {
                  entry.rows.forEach((row: any) => {
                    const unitWeight = Number(row.unitWeight) || 0;
                    const qtyPerHour = Number(row.qtyPerHour) || 0;
                    const cavities = Number(row.cavities) || 1;
                    
                    const rowDurationMins = calculateTimeDiff(row.startTime, row.endTime);
                    const rowPlanQty = (rowDurationMins / 60) * qtyPerHour * cavities;
                    const rowPlanKg = (rowPlanQty * unitWeight) / 1000;

                    if (row.breakdowns && row.breakdowns.length > 0) {
                      const ratePerMin = (qtyPerHour * cavities) / 60;

                      row.breakdowns.forEach((bd: any) => {
                        const mins = calculateTimeDiff(bd.startTime, bd.endTime);
                        const lostQty = mins * ratePerMin;
                        const lostKg = (lostQty * unitWeight) / 1000;

                        accumulatedBDs.push({
                          id: bd.id || Math.random().toString(),
                          factoryId: doc.id,
                          factoryName: cData.name,
                          date: entry.date || d.id,
                          machine: row.machine,
                          category: bd.category || 'Uncategorized',
                          description: bd.description || '-',
                          startTime: bd.startTime,
                          endTime: bd.endTime,
                          durationMins: mins,
                          lostKg: lostKg,
                          planKg: rowPlanKg 
                        });
                      });
                    }
                  });
                }
              });
            });
          } catch (err) { console.error(`Error: ${cData.name}`, err); }
        });

        await Promise.all(promises);
        
        const uFac = Array.from(new Set(accumulatedBDs.map(b => b.factoryName))).sort();
        const uCat = Array.from(new Set(accumulatedBDs.map(b => b.category))).sort();
        setUniqueFactories(uFac);
        setUniqueCategories(uCat);
        
        if(selectedFactories.length === 0) setSelectedFactories(uFac);
        if(selectedCategories.length === 0) setSelectedCategories(uCat);

        setAllBreakdowns(accumulatedBDs);

      } catch (error) { console.error("Fetch Error", error); }
      setLoading(false);
    };

    fetchData();
  }, []);

  // --- FILTER LOGIC ---
  const { currentData, prevMonthLoss, currentMonthLoss } = useMemo(() => {
    const filtered = allBreakdowns.filter(bd => 
        bd.date >= dateRange.start && 
        bd.date <= dateRange.end &&
        (selectedFactories.length === 0 || selectedFactories.includes(bd.factoryName)) &&
        (selectedCategories.length === 0 || selectedCategories.includes(bd.category))
    );

    const prevRange = getMonthRange(-1);
    const currRange = getMonthRange(0);

    const calcLoss = (start: string, end: string) => 
        allBreakdowns
            .filter(bd => bd.date >= start && bd.date <= end)
            .reduce((acc, curr) => acc + curr.lostKg, 0);

    return { 
        currentData: filtered, 
        prevMonthLoss: calcLoss(prevRange.start, prevRange.end),
        currentMonthLoss: calcLoss(currRange.start, currRange.end)
    };
  }, [allBreakdowns, dateRange, selectedFactories, selectedCategories]);

  // --- KPI CALCULATIONS ---
  const totalMins = currentData.reduce((acc, curr) => acc + curr.durationMins, 0);
  const totalLostKg = currentData.reduce((acc, curr) => acc + curr.lostKg, 0);
  const totalPlanKg = currentData.reduce((acc, curr) => acc + curr.planKg, 0);
  const totalHours = totalMins / 60;

  let lossChangePct = 0;
  if (prevMonthLoss > 0) {
      lossChangePct = ((currentMonthLoss - prevMonthLoss) / prevMonthLoss) * 100;
  }

  const breakdownLossPct = totalPlanKg > 0 ? (totalLostKg / totalPlanKg) * 100 : 0;

  // --- AGGREGATED STATS (FACTORY WISE) ---
  const factoryStats = useMemo(() => {
    const stats: Record<string, { mins: number, lostKg: number, planKg: number }> = {};
    currentData.forEach(bd => {
      if (!stats[bd.factoryName]) stats[bd.factoryName] = { mins: 0, lostKg: 0, planKg: 0 };
      stats[bd.factoryName].mins += (bd.durationMins / 60); // Aggregating Hours
      stats[bd.factoryName].lostKg += bd.lostKg;
      stats[bd.factoryName].planKg += bd.planKg;
    });
    return Object.keys(stats).map(k => ({ name: k, ...stats[k] }));
  }, [currentData]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, {mins: number, lostKg: number}> = {};
    currentData.forEach(bd => {
      if (!stats[bd.category]) stats[bd.category] = {mins:0, lostKg:0};
      stats[bd.category].mins += bd.durationMins;
      stats[bd.category].lostKg += bd.lostKg;
    });
    return Object.keys(stats)
      .map(k => ({ name: k, value: stats[k].mins, lostKg: stats[k].lostKg }))
      .sort((a, b) => b.value - a.value);
  }, [currentData]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0B1121] text-slate-200 font-sans overflow-hidden relative">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-900/10 rounded-full blur-[120px]" />
      </div>

      {/* --- HEADER --- */}
      <div className="flex-none p-4 border-b border-amber-500/10 bg-[#0B1121]/90 backdrop-blur-xl z-20 flex flex-wrap justify-between items-center gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  <AlertOctagon className="text-rose-500" size={24} />
              </div>
              <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">Breakdowns</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Fault Analysis</p>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
              {/* Date Picker */}
              <div className="bg-[#151e32] p-1 px-3 rounded-xl flex items-center gap-2 border border-white/5 shadow-inner">
                  <Calendar size={14} className="text-amber-500"/>
                  <div className="flex items-center gap-2">
                      <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-white text-[10px] font-bold uppercase outline-none cursor-pointer [color-scheme:dark]" />
                      <span className="text-slate-500 text-[10px]">-</span>
                      <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-white text-[10px] font-bold uppercase outline-none cursor-pointer [color-scheme:dark]" />
                  </div>
              </div>

              {/* Multi Select Filters */}
              <div className="flex items-center gap-2">
                  <MultiSelectDropdown label="Factories" options={uniqueFactories} selected={selectedFactories} onChange={setSelectedFactories} icon={Factory}/>
                  <MultiSelectDropdown label="Categories" options={uniqueCategories} selected={selectedCategories} onChange={setSelectedCategories} icon={Filter}/>
              </div>
          </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-32 relative z-10">
        
        {loading ? (
           <div className="h-full flex flex-col items-center justify-center text-rose-500 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500/30 border-t-rose-500"></div>
              <span className="text-[10px] font-black uppercase animate-pulse tracking-[0.2em]">Analyzing Data...</span>
           </div>
        ) : (
           <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. KPI CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard title="Total Downtime" value={`${fmt(totalHours)} Hrs`} sub={`${fmt(totalMins)} Mins`} icon={Clock} color="rose" />
                  
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[90px]">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><ArrowUpRight size={60} /></div>
                      <div className="relative z-10">
                          <p className="text-[9px] uppercase font-black opacity-80 tracking-[0.1em]">Breakdown Loss</p>
                          <div className="flex items-end gap-2 mt-1">
                              <h3 className="text-2xl font-black text-white">{fmt(totalLostKg)} Kg</h3>
                              <span className="text-[10px] font-bold bg-black/20 px-1.5 py-0.5 rounded text-white flex items-center gap-1 mb-1">
                                  {fmt(breakdownLossPct)}% of Plan
                              </span>
                          </div>
                          <p className="text-[9px] font-bold opacity-60 mt-1">Material Wasted</p>
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-4 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[90px]">
                      <div className="absolute top-0 right-0 p-3 opacity-10"><Activity size={60} /></div>
                      <div className="relative z-10">
                          <p className="text-[9px] uppercase font-black opacity-80 tracking-[0.1em]">Vs Last Month</p>
                          <div className="flex items-end gap-2 mt-1">
                              <h3 className="text-2xl font-black text-white">{Math.abs(lossChangePct).toFixed(1)}%</h3>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 flex items-center gap-1 ${lossChangePct > 0 ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                                  {lossChangePct > 0 ? '↑ Increased' : '↓ Decreased'}
                              </span>
                          </div>
                          <p className="text-[9px] font-bold opacity-60 mt-1">Loss Trend</p>
                      </div>
                  </div>

                  <KpiCard title="Top Issue" value={categoryStats[0]?.name || '-'} sub={`${fmt(categoryStats[0]?.value / 60 || 0)} Hrs Lost`} icon={AlertTriangle} color="purple" />
              </div>

              {/* 2. CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[420px]">
                  
                  {/* Mixed Chart: Plan vs Loss (Factory Comparison) */}
                  <div className="lg:col-span-2 bg-[#151e32]/80 border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col h-[320px] lg:h-full">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Factory size={14} className="text-amber-500"/> Plan vs Loss Analysis
                      </h3>
                      <div className="flex-1 w-full min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={factoryStats} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                  <XAxis dataKey="name" tick={{fill:'#94a3b8', fontSize:10, fontWeight:'bold'}} axisLine={false} tickLine={false} dy={5} />
                                  <YAxis yAxisId="left" tick={{fill:'#10b981', fontSize:10}} axisLine={false} tickLine={false} />
                                  <YAxis yAxisId="right" orientation="right" tick={{fill:'#f43f5e', fontSize:10}} axisLine={false} tickLine={false} />
                                  
                                  <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'white', opacity: 0.05}} />
                                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{fontSize:'10px', color:'#94a3b8'}}/>

                                  {/* [UPDATED] Plan Bar = Green */}
                                  <Bar yAxisId="left" dataKey="planKg" name="Plan (KG)" fill="#10b981" radius={[4,4,0,0]} barSize={20} />
                                  {/* Downtime Bar = Rose */}
                                  <Bar yAxisId="right" dataKey="mins" name="Downtime (Hrs)" fill="#f43f5e" radius={[4,4,0,0]} barSize={20} />
                                  {/* Loss Line = Gold */}
                                  <Line yAxisId="right" type="monotone" dataKey="lostKg" name="Lost KG" stroke="#fbbf24" strokeWidth={3} dot={{r:4, fill:'#1e293b', strokeWidth:2, stroke:'#fbbf24'}} />
                              </ComposedChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Donut Chart */}
                  <div className="bg-[#151e32]/80 border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col h-[320px] lg:h-full">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Database size={14} className="text-rose-500"/> Fault Categories
                      </h3>
                      <div className="flex-1 w-full min-h-0 flex justify-center items-center">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                    data={categoryStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                  >
                                    {categoryStats.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <RechartsTooltip content={<CustomTooltip />} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* 3. AGGREGATED SUMMARY TABLE (FACTORY WISE) */}
              <div className="bg-[#151e32]/90 border border-white/5 rounded-3xl overflow-hidden shadow-xl mb-10">
                  <div className="p-3 border-b border-white/5 bg-[#0B1121]/50 flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Timer size={14} className="text-rose-500"/> Factory Performance Summary
                      </h3>
                      <span className="text-[9px] font-bold bg-white/5 px-2 py-0.5 rounded text-slate-400">{factoryStats.length} Factories</span>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-[#0B1121] text-[10px] font-black uppercase text-slate-500">
                              <tr>
                                  <th className="p-3 pl-5">Factory</th>
                                  <th className="p-3 text-right text-emerald-500">Plan (KG)</th>
                                  <th className="p-3 text-right text-white">Downtime (Hrs)</th>
                                  <th className="p-3 text-right text-amber-500">Loss (KG)</th>
                                  <th className="p-3 text-right pr-5 text-rose-400">Loss %</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-sm font-medium text-slate-300">
                              <AnimatePresence>
                                  {factoryStats.map((fac, i) => {
                                      // Loss % = Lost / Plan
                                      const rowLossPct = fac.planKg > 0 ? (fac.lostKg / fac.planKg) * 100 : 0;
                                      return (
                                          <motion.tr 
                                            key={fac.name}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="hover:bg-white/5 transition-colors group"
                                          >
                                              <td className="p-3 pl-5 font-bold text-white text-xs uppercase tracking-wide">{fac.name}</td>
                                              <td className="p-3 text-right font-mono font-bold text-emerald-500">{fmt(fac.planKg)}</td>
                                              <td className="p-3 text-right font-mono font-bold text-white">{fmt(fac.mins)}</td>
                                              <td className="p-3 text-right font-mono font-bold text-amber-500">{fmt(fac.lostKg)}</td>
                                              <td className="p-3 text-right pr-5 font-mono font-bold text-rose-400">{fmt(rowLossPct)}%</td>
                                          </motion.tr>
                                      );
                                  })}
                              </AnimatePresence>
                              {factoryStats.length === 0 && (
                                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 uppercase font-bold tracking-widest text-[10px]">No records found.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

           </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTS ---
const MultiSelectDropdown = ({ label, options, selected, onChange, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const toggleOption = (opt: string) => { if (selected.includes(opt)) onChange(selected.filter((s: string) => s !== opt)); else onChange([...selected, opt]); };
    const toggleAll = () => { if (selected.length === options.length) onChange([]); else onChange([...options]); };
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 bg-[#151e32] border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white hover:border-amber-500/50 transition-all shadow-sm"><Icon size={12} className="text-amber-500"/>{label} ({selected.length})<ChevronDown size={12} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}/></button>
            {isOpen && (<div className="absolute top-full right-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"><div className="p-2 border-b border-white/5 bg-[#0B1121]"><div onClick={toggleAll} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"><div className={`w-3 h-3 rounded border flex items-center justify-center ${selected.length === options.length ? 'bg-amber-500 border-amber-500' : 'border-slate-500'}`}>{selected.length === options.length && <Check size={8} className="text-black" strokeWidth={4}/>}</div><span className="text-[10px] font-bold text-white uppercase">Select All</span></div></div><div className="max-h-48 overflow-y-auto custom-scrollbar p-1">{options.map((opt: string) => (<div key={opt} onClick={() => toggleOption(opt)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"><div className={`w-3 h-3 rounded border flex items-center justify-center ${selected.includes(opt) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>{selected.includes(opt) && <Check size={8} className="text-white" strokeWidth={4}/>}</div><span className="text-[10px] font-medium text-slate-300 truncate">{opt}</span></div>))}</div></div>)}
        </div>
    );
};

const KpiCard = ({ title, value, sub, icon: Icon, color }: any) => {
    const colors: any = { rose: 'from-rose-600 to-pink-700 shadow-rose-500/20 text-rose-100', amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-100', indigo: 'from-indigo-600 to-violet-700 shadow-indigo-500/20 text-indigo-100', purple: 'from-purple-600 to-fuchsia-700 shadow-purple-500/20 text-purple-100' };
    return (<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`bg-gradient-to-br ${colors[color]} p-4 rounded-2xl relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[90px]`}>
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-25 transition-opacity transform group-hover:scale-110 duration-500"><Icon size={60} strokeWidth={1.5}/></div>
        <div className="relative z-10"><div className="flex justify-between items-start mb-1"><p className="text-[9px] uppercase font-black opacity-80 tracking-[0.1em]">{title}</p></div><h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm mt-1">{value}</h3><p className="text-[10px] font-bold opacity-80 mt-0.5 bg-black/20 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm">{sub}</p></div></motion.div>);
};

// [FIXED] Tooltip Logic with Plan KG Support
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a]/95 backdrop-blur-xl p-3 rounded-xl border border-slate-700 shadow-2xl text-xs text-white z-50 min-w-[140px]">
          <p className="font-black uppercase mb-2 text-amber-500 border-b border-white/10 pb-1 text-[10px] tracking-widest">{label}</p>
          {payload.map((entry: any, index: number) => {
            let valStr = fmt(entry.value);
            if(entry.name.includes('Downtime')) valStr = `${(entry.value).toFixed(1)} hrs`;
            if(entry.name.includes('KG')) valStr = `${fmt(entry.value)} Kg`;
            
            // Pie Chart Special Handling
            if(entry.payload && entry.payload.lostKg !== undefined && entry.payload.planKg === undefined) {
               return (
                 <div key={index} className="mb-1">
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-300 capitalize text-[10px]">{entry.name}:</span>
                        <span className="font-mono font-bold text-amber-400 text-[11px]">{fmt(entry.value / 60)} hrs</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-400 capitalize text-[9px]">Loss:</span>
                        <span className="font-mono font-bold text-rose-400 text-[10px]">{fmt(entry.payload.lostKg)} Kg</span>
                    </div>
                 </div>
               );
            }

            return (
                <div key={index} className="flex items-center justify-between gap-4 mb-1">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}></span>
                    <span className="font-bold text-slate-300 capitalize text-[10px]">{entry.name}:</span>
                </span>
                <span className="font-mono font-bold text-amber-400 text-[11px]">{valStr}</span>
                </div>
            );
          })}
        </div>
      );
    }
    return null;
};

export default SA_Breakdowns;