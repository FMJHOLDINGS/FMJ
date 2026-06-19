import React from 'react';
import { FactoryAnalytics } from './SA_Production';
import { 
  Scale, Zap, ArrowDownRight, Factory, Crown, AlertOctagon, Target, TrendingUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line 
} from 'recharts';

// --- උදව්කාර ෆන්ක්ෂන්: ඉලක්කම් හැඩගැන්වීම ---
const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);

interface Props {
  factories: FactoryAnalytics[];
}

const SA_SimpleView: React.FC<Props> = ({ factories }) => {
  
  // ==========================================================================
  // 1. දත්ත සැකසීම (Factory Level Calculations)
  // ==========================================================================
  const processedData = factories.map(fac => {
      // Rejection KG
      const rejKG = (fac.totalActualKG * fac.rejectionRate) / 100;
      
      // Factory Level Output %
      let rawEff = 0;
      if (fac.totalTargetKG > 0) {
          rawEff = (fac.totalActualKG / fac.totalTargetKG) * 100;
      }

      // Factory Level Net Efficiency (Output % - Rejection %)
      const netEff = Math.max(0, rawEff - fac.rejectionRate);

      return {
          ...fac,
          rejectionKG: rejKG,
          efficiencyScore: netEff, // Individual Factory Score
          rawEfficiency: rawEff
      };
  });

  // ==========================================================================
  // 2. මුළු එකතුවන් (GLOBAL TOTALS)
  // ==========================================================================
  const globalActual = processedData.reduce((acc, f) => acc + f.totalActualKG, 0);
  const globalTarget = processedData.reduce((acc, f) => acc + f.totalTargetKG, 0);
  const globalLost = processedData.reduce((acc, f) => acc + f.totalLostKG, 0);
  const globalRej = processedData.reduce((acc, f) => acc + f.rejectionKG, 0);
  
  // --- GLOBAL PERCENTAGES (කාඩ්පත් වල පෙන්වන අගයන්) ---
  const achievedPct = globalTarget > 0 ? (globalActual / globalTarget) * 100 : 0;
  const lostPct = globalTarget > 0 ? (globalLost / globalTarget) * 100 : 0;
  const rejPct = globalTarget > 0 ? (globalRej / globalTarget) * 100 : 0;

  // --- [FIXED] GLOBAL EFFICIENCY CALCULATION ---
  // දැන් අපි ගන්නේ: (Global Output %) - (Global Rejection %)
  // උදා: 97.7% - 0.6% = 97.1%
  const finalGlobalEfficiency = Math.max(0, achievedPct - rejPct);

  // හොඳම Factory එක තෝරා ගැනීම
  const bestFactory = [...processedData].sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* ========================================================================== */}
        {/* 2. KPI CARDS GRID (CORRECTED MATH) 📊 */}
        {/* ========================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            <KpiCard 
                title="Plan Target" 
                value={`${fmt(globalTarget/1000)} T`} 
                sub="Monthly Goal"
                icon={Target} 
                color="indigo" 
            />
            <KpiCard 
                title="Total Output" 
                value={`${fmt(globalActual/1000)} T`} 
                sub={`${fmt(achievedPct)}% Achieved`} 
                icon={Scale} 
                color="emerald" 
            />
            <KpiCard 
                title="Efficiency" 
                value={`${fmt(finalGlobalEfficiency)}%`} // දැන් හරියටම 97.1% පෙන්වයි
                sub="(Out% - Rej%)" 
                icon={Zap} 
                color={finalGlobalEfficiency >= 80 ? 'emerald' : 'rose'} 
            />
            <KpiCard 
                title="Lost Output" 
                value={`${fmt(globalLost)} Kg`} 
                sub={`${fmt(lostPct)}% Loss`} 
                icon={ArrowDownRight} 
                color="rose" 
            />
            <KpiCard 
                title="Rejection" 
                value={`${fmt(globalRej)} Kg`} 
                sub={`${fmt(rejPct)}% Waste`} 
                icon={AlertOctagon} 
                color="orange" 
            />
            <KpiCard 
                title="Factories" 
                value={factories.length} 
                sub="Active Units" 
                icon={Factory} 
                color="purple" 
            />
        </div>

        {/* ========================================================================== */}
        {/* 3. CHART SECTION (UPDATED COLORS & TOOLTIP) 📈 */}
        {/* ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[400px]">
            
            {/* --- MAIN CHART --- */}
            <div className="lg:col-span-2 bg-[#151e32]/90 border border-amber-500/10 rounded-[1.5rem] p-5 flex flex-col shadow-2xl relative overflow-hidden">
                {/* Header & Legend */}
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h4 className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <span className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400"><TrendingUp size={14}/></span> 
                        Production Analysis
                    </h4>
                    <div className="flex gap-4">
                        <LegendItem color="bg-[#78350f]" label="Plan" />   {/* Bronze */}
                        <LegendItem color="bg-[#10b981]" label="Actual" /> {/* Green */}
                        <LegendItem color="bg-[#f97316]" label="Rej" />    {/* Orange */}
                        <LegendItem color="bg-[#ef4444]" label="Lost" />   {/* Red */}
                    </div>
                </div>
                
                {/* Chart Area */}
                <div className="flex-1 w-full min-h-0 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={processedData} barGap={4}>
                            <defs>
                                {/* COLORS AS REQUESTED */}
                                <linearGradient id="planG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#92400e" stopOpacity={1}/><stop offset="100%" stopColor="#78350f" stopOpacity={0.8}/></linearGradient>
                                <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={1}/><stop offset="100%" stopColor="#059669" stopOpacity={0.8}/></linearGradient>
                                <linearGradient id="rejG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={1}/><stop offset="100%" stopColor="#c2410c" stopOpacity={0.8}/></linearGradient>
                                <linearGradient id="lostG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={1}/><stop offset="100%" stopColor="#991b1b" stopOpacity={0.8}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.15} />
                            
                            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8', fontWeight:'bold'}} axisLine={false} tickLine={false} dy={10} />
                            <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(v)=> `${(v/1000).toFixed(0)}k`} />
                            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#fbbf24'}} axisLine={false} tickLine={false} unit="%" />
                            
                            {/* COLORED DOT TOOLTIP */}
                            <Tooltip content={<CustomTooltip />} cursor={{fill:'white', opacity:0.03}} />

                            {/* BARS */}
                            <Bar yAxisId="left" dataKey="totalTargetKG" name="Plan" fill="url(#planG)" barSize={16} radius={[3,3,0,0]} />
                            <Bar yAxisId="left" dataKey="totalActualKG" name="Actual" fill="url(#actG)" barSize={16} radius={[3,3,0,0]} />
                            <Bar yAxisId="left" dataKey="rejectionKG" name="Rejection" fill="url(#rejG)" barSize={16} radius={[3,3,0,0]} />
                            <Bar yAxisId="left" dataKey="totalLostKG" name="Lost" fill="url(#lostG)" barSize={16} radius={[3,3,0,0]} />
                            
                            {/* EFFICIENCY LINE (Gold) */}
                            <Line yAxisId="right" type="monotone" dataKey="efficiencyScore" name="Efficiency %" stroke="#fbbf24" strokeWidth={3} dot={{r:4, fill:'#1e293b', strokeWidth:2, stroke:'#fbbf24'}} activeDot={{r:6, fill:'#fbbf24'}} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- BEST PERFORMER CARD --- */}
            <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-amber-500/20 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                
                {bestFactory && (
                    <>
                        <div className="relative mb-3">
                            <div className="absolute inset-0 bg-amber-500 blur-[25px] opacity-20 rounded-full animate-pulse"></div>
                            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl shadow-xl relative z-10">
                                <Crown size={28} className="text-white" fill="white" />
                            </div>
                        </div>
                        
                        <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Top Performer</h3>
                        <h2 className="text-xl font-black text-white mb-4 leading-tight truncate max-w-full px-2">{bestFactory.name}</h2>
                        
                        {/* Efficiency Meter */}
                        <div className="w-full bg-[#0B1121] p-3 rounded-xl border border-white/5 relative z-10 mb-3">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Efficiency</span>
                                <span className="text-xl font-black text-amber-400">{fmt(bestFactory.efficiencyScore)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${Math.min(bestFactory.efficiencyScore, 100)}%` }} 
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                ></motion.div>
                            </div>
                        </div>

                        {/* Percent Stats */}
                        <div className="grid grid-cols-3 gap-2 w-full">
                            <MiniStatBox label="Output" val={(bestFactory.totalActualKG/bestFactory.totalTargetKG)*100} color="text-emerald-400" />
                            <MiniStatBox label="Rejection" val={bestFactory.rejectionRate} color="text-orange-400" />
                            <MiniStatBox label="Lost" val={(bestFactory.totalLostKG/bestFactory.totalTargetKG)*100} color="text-rose-400" />
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* ========================================================================== */}
        {/* 4. වගුව (PREMIUM TABLE) 📋 */}
        {/* ========================================================================== */}
        <div className="bg-[#151e32]/80 border border-white/5 rounded-[1.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[11px] font-black uppercase text-slate-400 bg-[#0B1121]/80 border-b border-white/5">
                            <th className="p-4 pl-6"># Factory</th>
                            <th className="p-4 text-right text-amber-700">Plan (KG)</th>
                            <th className="p-4 text-right text-amber-400">Actual (KG)</th>
                            <th className="p-4 text-right text-rose-400">Lost (KG)</th>
                            <th className="p-4 text-right text-rose-300">Lost %</th>
                            <th className="p-4 text-right text-orange-400">Rej (KG)</th>
                            <th className="p-4 text-right text-orange-300">Rej %</th>
                            <th className="p-4 text-center text-emerald-400">Eff %</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-bold text-slate-300"> 
                        <AnimatePresence>
                            {processedData.map((fac, index) => {
                                const lostPerc = fac.totalTargetKG > 0 ? (fac.totalLostKG / fac.totalTargetKG) * 100 : 0;
                                return (
                                    <motion.tr 
                                        key={fac.id} 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        transition={{ delay: index * 0.05 }} 
                                        className="hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                                    {index + 1}
                                                </span>
                                                <div className="font-bold text-white group-hover:text-amber-400 transition-colors text-xs uppercase tracking-wide">{fac.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-400 text-xs">{fmt(fac.totalTargetKG)}</td>
                                        <td className="p-4 text-right font-mono text-white text-sm">{fmt(fac.totalActualKG)}</td>
                                        <td className="p-4 text-right font-mono text-rose-400 text-xs">{fmt(fac.totalLostKG)}</td>
                                        <td className="p-4 text-right font-mono text-rose-300 opacity-70 text-xs">{fmt(lostPerc)}%</td>
                                        <td className="p-4 text-right font-mono text-orange-400 text-xs">{fmt(fac.rejectionKG)}</td>
                                        <td className="p-4 text-right font-mono text-orange-300 opacity-70 text-xs">{fmt(fac.rejectionRate)}%</td>
                                        <td className="p-4 text-center">
                                            <span className={`text-sm font-black ${fac.efficiencyScore>=85?'text-emerald-400':fac.efficiencyScore>=70?'text-amber-400':'text-rose-400'}`}>{fmt(fac.efficiencyScore)}%</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide border ${
                                                fac.status==='Excellent'?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':
                                                fac.status==='Good'?'bg-amber-500/10 border-amber-500/30 text-amber-400':
                                                'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                            }`}>
                                                {fac.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const KpiCard = ({ title, value, sub, icon: Icon, color }: any) => {
    const colors: any = {
        indigo: 'from-indigo-600 to-violet-700 shadow-indigo-500/20 text-indigo-100',
        emerald: 'from-emerald-600 to-teal-700 shadow-emerald-500/20 text-emerald-100',
        amber: 'from-amber-500 to-orange-600 shadow-amber-500/20 text-amber-100', 
        rose: 'from-rose-600 to-pink-700 shadow-rose-500/20 text-rose-100',
        orange: 'from-orange-500 to-red-600 shadow-orange-500/20 text-orange-100',
        purple: 'from-purple-600 to-indigo-700 shadow-purple-500/20 text-purple-100',
    };
    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={`bg-gradient-to-br ${colors[color]} p-4 rounded-[1.5rem] relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[90px]`} 
        >
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[9px] uppercase font-black opacity-80 tracking-[0.1em]">{title}</p>
                    <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-sm mt-1">{value}</h3>
                    <p className="text-[10px] font-bold opacity-70 mt-1 bg-black/20 w-fit px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {sub}
                    </p>
                </div>
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>
        </motion.div>
    );
};

const MiniStatBox = ({ label, val, color }: any) => (
    <div className="bg-[#0B1121] p-2 rounded-xl border border-white/5 flex flex-col items-center justify-center">
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-black ${color}`}>{fmt(val || 0)}%</span>
    </div>
);

const LegendItem = ({ color, label, isLine }: any) => (
    <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${color} ${isLine ? 'h-0.5 w-3' : ''}`}></div>
        <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a]/95 backdrop-blur-xl p-3 rounded-xl border border-slate-700 shadow-2xl text-xs text-white z-50 min-w-[150px]">
          <p className="font-black uppercase mb-2 text-slate-400 border-b border-white/10 pb-1 text-[10px] tracking-widest">{label}</p>
          {payload.map((entry: any, index: number) => {
            // TOOLTIP COLOR MAPPING
            let dotColor = entry.stroke || entry.fill; 
            const name = entry.name.toLowerCase();
            if(name.includes('plan')) dotColor = '#78350f'; // Dark Bronze
            else if(name.includes('actual')) dotColor = '#10b981'; // Green
            else if(name.includes('rejection')) dotColor = '#f97316'; // Orange
            else if(name.includes('lost')) dotColor = '#ef4444'; // Red
            else if(name.includes('eff')) dotColor = '#fbbf24'; // Gold

            return (
                <div key={index} className="flex items-center justify-between gap-4 mb-1.5">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }}></span>
                    <span className="font-bold text-slate-300 capitalize text-[11px]">{entry.name}:</span>
                </span>
                <span className="font-mono font-bold text-white text-[11px]">
                    {fmt(entry.value)}
                    {name.includes('eff') ? '%' : ''}
                </span>
                </div>
            );
          })}
        </div>
      );
    }
    return null;
};

export default SA_SimpleView;