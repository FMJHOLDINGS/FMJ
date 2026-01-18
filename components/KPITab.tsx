import React, { useMemo } from 'react';
import { DayData } from '../types';
import { calculateMetrics } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Line, Cell, PieChart, Pie, Legend
} from 'recharts';
import { TrendingUp, Target, Package, Zap, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface Props {
  data: Record<string, any>; // Changed to allow flexible input, handled safely inside
}

// Custom Colors for beautiful UI
const COLORS = {
  primary: '#6366f1',   // Indigo
  success: '#10b981',   // Emerald
  warning: '#f59e0b',   // Amber
  danger: '#f43f5e',    // Rose
  dark: '#1e293b',      // Slate 800
  grid: 'rgba(148, 163, 184, 0.1)'
};

const KPITab: React.FC<Props> = ({ data }) => {
  
  // --- 1. PERFORMANCE OPTIMIZED DATA PROCESSING ---
  const { chartData, totals, trend } = useMemo(() => {
    const dailyMap: Record<string, { date: string, achieved: number, plan: number, downtime: number, rejection: number }> = {};

    // Only process valid IM or BM data keys
    Object.keys(data).forEach(key => {
        if (!key.endsWith('_IM') && !key.endsWith('_BM')) return; // Check for valid keys
        
        const dayData = data[key] as DayData;
        if (!dayData?.rows) return;

        const dateStr = dayData.date; // e.g., "2024-01-01"
        
        if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { date: dateStr, achieved: 0, plan: 0, downtime: 0, rejection: 0 };
        }

        dayData.rows.forEach(row => {
            const m = calculateMetrics(row);
            // Safety checks for NaN
            dailyMap[dateStr].achieved += m.achievedKg || 0;
            dailyMap[dateStr].plan += m.planKg || 0;
            dailyMap[dateStr].downtime += m.bdMins || 0;
            // Assuming metrics returned rejectionKg, if not calculate rough estimate
            const rejKg = (row.rejectionQty || 0) * (row.unitWeight || 0) / 1000;
            dailyMap[dateStr].rejection += rejKg; 
        });
    });

    // Convert to Array, Sort, and Format for Charts
    const sortedArray = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days for better trend view

    const processedData = sortedArray.map(d => ({
        ...d,
        efficiency: d.plan > 0 ? parseFloat(((d.achieved / d.plan) * 100).toFixed(1)) : 0,
        formattedDate: d.date.substring(5) // Show "MM-DD"
    }));

    // Calculate Totals
    const totalStats = processedData.reduce((acc, curr) => ({
        achieved: acc.achieved + curr.achieved,
        plan: acc.plan + curr.plan,
        downtime: acc.downtime + curr.downtime,
        rejection: acc.rejection + curr.rejection
    }), { achieved: 0, plan: 0, downtime: 0, rejection: 0 });

    // Calculate Trend (Comparing last 3 days vs previous 3 days)
    const len = processedData.length;
    let trendVal = 0;
    if (len >= 6) {
        const last3 = processedData.slice(-3).reduce((s, i) => s + i.achieved, 0);
        const prev3 = processedData.slice(-6, -3).reduce((s, i) => s + i.achieved, 0);
        trendVal = prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : 0;
    }

    return { chartData: processedData, totals: totalStats, trend: trendVal };
  }, [data]);

  const avgEfficiency = totals.plan > 0 ? (totals.achieved / totals.plan) * 100 : 0;
  const rejectionRate = totals.achieved > 0 ? (totals.rejection / totals.achieved) * 100 : 0;

  // --- 2. RENDER ---
  if (chartData.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
              <Activity className="w-12 h-12 mb-2 opacity-50" />
              <p>Not enough data to generate KPIs</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in w-full">
      
      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard 
            title="Total Output" 
            value={`${totals.achieved.toLocaleString()} kg`} 
            icon={Package} 
            trend={trend}
            color="indigo"
        />
        <ModernStatCard 
            title="Avg Efficiency" 
            value={`${avgEfficiency.toFixed(1)}%`} 
            icon={Target} 
            subValue={`Plan: ${totals.plan.toLocaleString()} kg`}
            color="emerald"
        />
        <ModernStatCard 
            title="Total Downtime" 
            value={`${totals.downtime} min`} 
            icon={Zap} 
            isInverse={true} // High downtime is bad
            color="amber"
        />
        <ModernStatCard 
            title="Rejection Rate" 
            value={`${rejectionRate.toFixed(2)}%`} 
            icon={TrendingUp} 
            isInverse={true}
            color="rose"
        />
      </div>

      {/* --- CHARTS AREA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart: Output vs Plan */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> Production Performance
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Achieved vs Planned (Last 14 Days)</p>
                </div>
            </div>
            
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold'}} />
                        
                        <Bar dataKey="achieved" name="Achieved Kg" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="plan" name="Target Plan" stroke={COLORS.warning} strokeWidth={3} dot={false} strokeDasharray="5 5" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Efficiency Trend Area Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Efficiency Trend</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-6">Daily Efficiency Percentage</p>
            
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" tick={{fontSize: 10, fill: '#94a3b8'}} hide />
                        <YAxis domain={[0, 100]} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="efficiency" 
                            stroke={COLORS.success} 
                            strokeWidth={3} 
                            fill="url(#effGradient)" 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

// --- SUB COMPONENTS FOR BEAUTY & PERFORMANCE ---

const ModernStatCard = ({ title, value, icon: Icon, subValue, trend, isInverse, color }: any) => {
    const colorClasses: Record<string, string> = {
        indigo: 'from-indigo-500 to-blue-500 shadow-indigo-500/20 text-indigo-500',
        emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20 text-emerald-500',
        amber: 'from-amber-500 to-orange-500 shadow-amber-500/20 text-amber-500',
        rose: 'from-rose-500 to-pink-500 shadow-rose-500/20 text-rose-500',
    };

    return (
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">{title}</h4>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</div>
                    {subValue && <div className="text-[10px] font-bold text-slate-400 mt-1">{subValue}</div>}
                    
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-[10px] font-black uppercase ${
                            (trend >= 0 && !isInverse) || (trend < 0 && isInverse) ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(trend).toFixed(1)}% vs prev days</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            {/* Background Decoration */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br ${colorClasses[color]} opacity-[0.05] rounded-full blur-2xl group-hover:opacity-[0.1] transition-opacity`} />
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
                {payload.map((p: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-bold mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-300 capitalize">{p.name}:</span>
                        <span className="text-white font-mono">{Number(p.value).toLocaleString()} {p.unit || ''}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default KPITab;