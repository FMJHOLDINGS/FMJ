import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore'; 
import { 
  Factory, Calendar, Activity, Zap, Scale, 
  ArrowUpRight, Layers, Loader2, AlertTriangle, TrendingUp, TrendingDown, Filter 
} from 'lucide-react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

// --- TYPES ---
export interface ProductionRow {
  achievedQty: number;
  rejectionQty: number;
  unitWeight: number;
  qtyPerHour: number;
  startTime: string;
  endTime: string;
}

interface FactoryAnalytics {
  id: string;
  name: string;
  location: string;
  totalActualKG: number;
  totalTargetKG: number;
  efficiency: number;
  rejectionRate: number;
  activeMachines: number;
  history: { date: string; actualKG: number; targetKG: number; efficiency: number }[]; 
  status: 'Excellent' | 'Good' | 'Critical';
}

// --- HELPER: Shift Duration Calculation ---
const getDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 + m2/60) - (h1 + m1/60);
    if (diff < 0) diff += 24; 
    return diff > 0 ? diff : 0;
};

// --- HELPER: Get Current Month Date Range ---
const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1); 
    const toStr = (d: Date) => d.toISOString().split('T')[0];
    return { start: toStr(start), end: toStr(now) };
};

const SA_Production = () => {
  const [factories, setFactories] = useState<FactoryAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const companySnap = await getDocs(collection(db, "companies"));
        
        const factoryPromises = companySnap.docs.map(async (companyDoc) => {
            const cData = companyDoc.data();
            const collectionName = cData.collectionName;
            
            let historyData: any[] = [];

            if (collectionName) {
                try {
                    const q = query(collection(db, collectionName), limit(100));
                    const prodSnap = await getDocs(q);
                    
                    prodSnap.docs.forEach(doc => {
                        const rawData = doc.data();
                        const dateStr = doc.id; // 🔥 Document ID එක තමයි දිනය
                        
                        let dActualKG = 0;
                        let dTargetKG = 0;
                        let dRejectPcs = 0;
                        let dTotalPcs = 0;
                        let totalRows = 0;

                        // 🔥 අලුත් ක්‍රමය: කෙලින්ම IM සහ BM Object වලින් දත්ත ගැනීම
                        const imRows = rawData.IM?.rows || [];
                        const bmRows = rawData.BM?.rows || [];
                        const allRows = [...imRows, ...bmRows];

                        if (allRows.length > 0) {
                            totalRows = allRows.length;

                            allRows.forEach((row: any) => {
                                const pcs = Number(row.achievedQty) || 0;
                                const rej = Number(row.rejectionQty) || 0;
                                const weight = Number(row.unitWeight) || 0;
                                const rate = Number(row.qtyPerHour) || 0;
                                const hrs = getDuration(row.startTime, row.endTime);

                                // 1. Actual KG
                                dActualKG += (pcs * weight) / 1000;

                                // 2. Target KG
                                const targetPcs = hrs * rate;
                                dTargetKG += (targetPcs * weight) / 1000;

                                dRejectPcs += rej;
                                dTotalPcs += (pcs + rej);
                            });

                            historyData.push({
                                date: dateStr,
                                actualKG: dActualKG,
                                targetKG: dTargetKG,
                                rejection: dTotalPcs > 0 ? (dRejectPcs / dTotalPcs) * 100 : 0,
                                efficiency: dTargetKG > 0 ? Math.round((dActualKG / dTargetKG) * 100) : 0,
                                rows: totalRows
                            });
                        }
                    });

                    // Sort by Date 
                    historyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                } catch (e) { console.error(`Error processing ${cData.name}`, e); }
            }

            return {
                id: companyDoc.id,
                name: cData.name,
                location: cData.location,
                rawHistory: historyData
            };
        });

        const rawFactories = await Promise.all(factoryPromises);

        // --- FILTERING ---
        const processed = rawFactories.map(fac => {
            const filtered = fac.rawHistory.filter((h: any) => h.date >= dateRange.start && h.date <= dateRange.end);

            const totActual = filtered.reduce((acc: number, cur: any) => acc + cur.actualKG, 0);
            const totTarget = filtered.reduce((acc: number, cur: any) => acc + cur.targetKG, 0);
            
            const eff = totTarget > 0 ? Math.round((totActual / totTarget) * 100) : 0;
            const avgRej = filtered.length > 0 ? filtered.reduce((acc: number, cur: any) => acc + cur.rejection, 0) / filtered.length : 0;

            let status: 'Excellent' | 'Good' | 'Critical' = 'Critical';
            if (eff >= 85) status = 'Excellent';
            else if (eff >= 70) status = 'Good';

            return {
                ...fac,
                totalActualKG: totActual,
                totalTargetKG: totTarget,
                efficiency: eff,
                rejectionRate: parseFloat(avgRej.toFixed(2)),
                activeMachines: filtered.length > 0 ? filtered[filtered.length - 1].rows : 0,
                history: filtered,
                status
            };
        });

        setFactories(processed.sort((a, b) => b.efficiency - a.efficiency));
        setLoading(false);

      } catch (error) { console.error(error); setLoading(false); }
    };

    fetchRealData();
  }, [dateRange]); 

  const globalActual = factories.reduce((acc, f) => acc + f.totalActualKG, 0);
  const globalTarget = factories.reduce((acc, f) => acc + f.totalTargetKG, 0);
  const globalEff = globalTarget > 0 ? Math.round((globalActual / globalTarget) * 100) : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#09090b] text-slate-200 font-sans overflow-hidden">
        
        {/* HEADER */}
        <div className="flex-none px-6 py-4 border-b border-white/5 bg-[#09090b] z-20 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Activity className="text-indigo-500" size={20} /> PRODUCTION ANALYTICS
                </h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Real-Time Data | Unit: KG</p>
            </div>
            
            <div className="bg-white/5 p-1 px-3 rounded-xl flex items-center gap-3 border border-white/10 shadow-lg shadow-black/20">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400"><Calendar size={14}/></div>
                <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})} 
                    className="bg-transparent text-white text-xs font-bold uppercase outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                />
                <span className="text-slate-600 text-xs font-bold">TO</span>
                <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})} 
                    className="bg-transparent text-white text-xs font-bold uppercase outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                />
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-48">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-indigo-500 gap-2">
                    <Loader2 className="animate-spin" size={32}/>
                    <span className="text-xs font-bold uppercase animate-pulse">Loading Live Data...</span>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KpiCard title="Total Output" value={`${(globalActual/1000).toFixed(1)}T`} sub={`${globalActual.toLocaleString(undefined, {maximumFractionDigits:0})} KG`} icon={Scale} color="indigo" />
                        <KpiCard title="Avg Efficiency" value={`${globalEff}%`} sub="Performance Rate" icon={Zap} color={globalEff >= 80 ? 'emerald' : 'amber'} />
                        <KpiCard title="Production Gap" value={`${((globalTarget - globalActual)/1000).toFixed(1)}T`} sub={`Target: ${(globalTarget/1000).toFixed(1)}T`} icon={ArrowUpRight} color="red" />
                        <KpiCard title="Active Plants" value={factories.length} sub="Online Facilities" icon={Factory} color="purple" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[350px]">
                        <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col shadow-xl">
                            <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-4"><Layers size={14} className="text-indigo-500"/> Output vs Efficiency</h4>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={factories}>
                                        <defs>
                                            <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="100%" stopColor="#4338ca" stopOpacity={0.5}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#737373', fontWeight:'bold'}} axisLine={false} tickLine={false} dy={5} />
                                        <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#737373'}} axisLine={false} tickLine={false} tickFormatter={(v)=> `${(v/1000).toFixed(0)}k`} />
                                        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#737373'}} axisLine={false} tickLine={false} unit="%" />
                                        <Tooltip contentStyle={{backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px', fontSize:'12px'}} cursor={{fill:'white', opacity:0.05}}/>
                                        <Bar yAxisId="left" dataKey="totalActualKG" name="Output (KG)" fill="url(#barG)" barSize={30} radius={[4,4,4,4]} />
                                        <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Eff %" stroke="#10b981" strokeWidth={2} dot={{r:3, fill:'#171717'}} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center gap-4 shadow-xl">
                            <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase relative z-10">Avg Rejection Rate</p>
                                <h3 className="text-3xl font-black text-white mt-1 relative z-10">{(factories.reduce((acc,f)=> acc+f.rejectionRate,0)/factories.length || 0).toFixed(2)}%</h3>
                                <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 relative z-10">Material Waste</span>
                            </div>
                            <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase relative z-10">Target Completion</p>
                                <h3 className="text-3xl font-black text-white mt-1 relative z-10">{globalTarget > 0 ? Math.round((globalActual/globalTarget)*100) : 0}%</h3>
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 relative z-10">Achieved</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden mb-4 shadow-2xl">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><Filter size={12}/> Detailed Factory Report</h4>
                            <div className="text-[10px] text-slate-500 font-mono bg-black/30 px-2 py-1 rounded">Range: {dateRange.start} • {dateRange.end}</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase text-slate-500 bg-black/20 border-b border-white/5">
                                        <th className="p-4 pl-6">Factory</th>
                                        <th className="p-4 text-center">Trend</th>
                                        <th className="p-4 text-right">Actual (KG)</th>
                                        <th className="p-4 text-right">Target (KG)</th>
                                        <th className="p-4 text-center">Eff %</th>
                                        <th className="p-4 text-center">Rejection</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
                                    {factories.map((fac) => (
                                        <tr key={fac.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 pl-6">
                                                <div className="font-bold text-white">{fac.name}</div>
                                                <div className="text-[10px] text-slate-500">{fac.location}</div>
                                            </td>
                                            <td className="p-2 w-24">
                                                <div className="h-8 w-24 mx-auto">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={fac.history.slice(0,7).reverse()}>
                                                            <Area type="monotone" dataKey="actualKG" stroke="#6366f1" strokeWidth={2} fill="none" />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-white">{fac.totalActualKG.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                            <td className="p-4 text-right font-mono text-slate-500">{fac.totalTargetKG.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className={`font-black ${fac.efficiency>=85?'text-emerald-400':fac.efficiency>=70?'text-amber-400':'text-red-400'}`}>{fac.efficiency}%</span>
                                                    {fac.efficiency >= 80 ? <TrendingUp size={12} className="text-emerald-500"/> : <TrendingDown size={12} className="text-red-500"/>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-slate-400">{fac.rejectionRate}%</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                                    fac.status==='Excellent'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':
                                                    fac.status==='Good'?'bg-amber-500/10 border-amber-500/20 text-amber-400':
                                                    'bg-red-500/10 border-red-500/20 text-red-400'
                                                }`}>{fac.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {factories.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertTriangle size={24} className="opacity-50"/>
                                                    <span>No data found for selected period ({dateRange.start} to {dateRange.end})</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

const KpiCard = ({ title, value, sub, icon: Icon, color }: any) => {
    const colors: any = {
        indigo: 'from-indigo-500/20 to-blue-600/5 border-indigo-500/20 text-indigo-400',
        emerald: 'from-emerald-500/20 to-teal-600/5 border-emerald-500/20 text-emerald-400',
        amber: 'from-amber-500/20 to-orange-600/5 border-amber-500/20 text-amber-400',
        red: 'from-red-500/20 to-rose-600/5 border-red-500/20 text-red-400',
        purple: 'from-purple-500/20 to-violet-600/5 border-purple-500/20 text-purple-400',
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color] || colors.indigo} border p-5 rounded-2xl relative overflow-hidden group shadow-lg`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Icon size={48}/></div>
            <p className="text-[10px] uppercase font-bold opacity-70 mb-1">{title}</p>
            <h3 className="text-2xl font-black text-white">{value}</h3>
            <p className="text-xs opacity-60 mt-1">{sub}</p>
        </div>
    );
};

export default SA_Production;