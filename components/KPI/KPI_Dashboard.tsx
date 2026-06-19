import React, { useMemo } from 'react';
import { DayData } from '../../types';
import { calculateMetrics } from '../../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Target, Package, Zap, ArrowUpRight, ArrowDownRight, 
  Activity, PieChart as PieIcon, AlertTriangle, Calendar
} from 'lucide-react';

interface Props {
  data: Record<string, any>;
  startDate?: string;
  endDate?: string;
}

// --- THEME COLORS ---
const COLORS = {
  primary: '#6366f1',   // Indigo
  success: '#10b981',   // Emerald
  warning: '#f59e0b',   // Amber
  danger: '#f43f5e',    // Rose
  info: '#0ea5e9',      // Sky
  dark: '#1e293b',
  grid: 'rgba(148, 163, 184, 0.1)',
  pie: ['#10b981', '#f43f5e', '#f59e0b'] // Good, Rejected, Startup
};

const KPIDashboard: React.FC<Props> = ({ data, startDate, endDate }) => {
  
  // --- DATA PROCESSING ENGINE ---
  const { chartData, totals, trend, pieData } = useMemo(() => {
    const dailyMap: Record<string, { date: string, achieved: number, plan: number, downtime: number, rejection: number, rejectionQty: number }> = {};

    Object.keys(data).forEach(key => {
        // IM සහ BM දත්ත පමණක් පෙරීම
        if (!key.endsWith('_IM') && !key.endsWith('_BM')) return;
        
        const dayData = data[key] as DayData;
        if (!dayData?.rows) return;

        const dateStr = dayData.date; // YYYY-MM-DD

        // --- DATE RANGE FILTER ---
        if (startDate && dateStr < startDate) return;
        if (endDate && dateStr > endDate) return;
        // -------------------------

        if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, achieved: 0, plan: 0, downtime: 0, rejection: 0, rejectionQty: 0 };

        dayData.rows.forEach(row => {
            const m = calculateMetrics(row);
            dailyMap[dateStr].achieved += m.achievedKg || 0;
            dailyMap[dateStr].plan += m.planKg || 0;
            dailyMap[dateStr].downtime += m.bdMins || 0;
            
            const rejKg = (row.rejectionQty || 0) * (row.unitWeight || 0) / 1000;
            dailyMap[dateStr].rejection += rejKg; 
            dailyMap[dateStr].rejectionQty += (row.rejectionQty || 0);
        });
    });

    // ✅ FIX: Error එක එන තැන නිවැරදි කිරීම (Safe Sort)
    const sortedArray = Object.values(dailyMap).sort((a, b) => 
        (a.date || '').localeCompare(b.date || '')
    );
    
    const processedData = sortedArray.map(d => ({
        ...d,
        efficiency: d.plan > 0 ? parseFloat(((d.achieved / d.plan) * 100).toFixed(1)) : 0,
        formattedDate: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }));

    const totalStats = processedData.reduce((acc, curr) => ({
        achieved: acc.achieved + curr.achieved,
        plan: acc.plan + curr.plan,
        downtime: acc.downtime + curr.downtime,
        rejection: acc.rejection + curr.rejection
    }), { achieved: 0, plan: 0, downtime: 0, rejection: 0 });

    // Trend Logic
    const len = processedData.length;
    let trendVal = 0;
    if (len >= 2) {
       const last3 = processedData.slice(-3).reduce((s, i) => s + i.achieved, 0);
       const prev3 = len >= 6 ? processedData.slice(-6, -3).reduce((s, i) => s + i.achieved, 0) : 0;
       if (prev3 > 0) trendVal = ((last3 - prev3) / prev3) * 100;
    }

    // Pie Chart Data (Quality Analysis)
    const qualityData = [
        { name: 'Good Production', value: totalStats.achieved },
        { name: 'Rejected Material', value: totalStats.rejection },
    ];

    return { chartData: processedData, totals: totalStats, trend: trendVal, pieData: qualityData };
  }, [data, startDate, endDate]);

  const avgEfficiency = totals.plan > 0 ? (totals.achieved / totals.plan) * 100 : 0;
  const rejectionRate = totals.achieved > 0 ? (totals.rejection / totals.achieved) * 100 : 0;

  if (chartData.length === 0) return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
        <Activity className="w-12 h-12 mb-3 opacity-50" />
        <span className="text-sm font-bold uppercase tracking-widest">No Data Available</span>
        <span className="text-xs mt-1">Select a date range with production data</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* 1. STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard 
            title="Total Output" 
            value={`${totals.achieved.toLocaleString(undefined, {maximumFractionDigits:0})} kg`} 
            icon={Package} 
            trend={trend} 
            color="indigo" 
            subValue="Production Volume"
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
            isInverse={true} 
            color="amber" 
            subValue="Machine Stoppage"
        />
        <ModernStatCard 
            title="Rejection Rate" 
            value={`${rejectionRate.toFixed(2)}%`} 
            icon={AlertTriangle} 
            isInverse={true} 
            color="rose" 
            subValue={`${totals.rejection.toFixed(1)} kg Lost`}
        />
      </div>

      {/* 2. MAIN CHARTS ROW (Area + Composed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Production Trend */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> Production Performance
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Daily Output vs Target Plan</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - {endDate ? new Date(endDate).toLocaleDateString() : 'End'}
                    </span>
                </div>
            </div>
            
            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'sans-serif'}} />
                        <Bar dataKey="achieved" name="Achieved (kg)" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} animationDuration={1500} />
                        <Line type="monotone" dataKey="plan" name="Target (kg)" stroke={COLORS.warning} strokeWidth={3} dot={{r: 4, fill: COLORS.warning, strokeWidth: 2, stroke: '#fff'}} strokeDasharray="5 5" animationDuration={1500} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Quality Analysis (Pie Chart) - NEW */}
        <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20 flex flex-col">
            <div className="mb-4">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-emerald-500" /> Quality Analysis
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Good vs Rejection Ratio</p>
            </div>

            <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="good" fill={COLORS.success} />
                            <Cell key="bad" fill={COLORS.danger} />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold'}}/>
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Text for Pie Chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-2xl font-black text-slate-700 dark:text-white">{(100 - rejectionRate).toFixed(1)}%</span>
                     <span className="text-[9px] font-bold uppercase text-slate-400">Quality Score</span>
                </div>
            </div>
        </div>
      </div>

      {/* 3. EFFICIENCY TREND ROW */}
      <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-sky-500" /> Efficiency Timeline
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Machine Utilization Efficiency %</p>
                </div>
            </div>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COLORS.info} stopOpacity={0.4}/>
                                <stop offset="100%" stopColor={COLORS.info} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, 110]} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip unit="%" />} />
                        <Area type="monotone" dataKey="efficiency" stroke={COLORS.info} strokeWidth={3} fill="url(#effGradient)" animationDuration={1500} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
      </div>

    </div>
  );
};

// --- CUSTOM COMPONENTS ---

const CustomTooltip = ({ active, payload, label, unit = "" }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
          {payload.map((p: any, index: number) => (
             <div key={index} className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}} />
                 <span className="text-xs font-bold text-white">
                     {p.name}: <span className="text-slate-200">{Number(p.value).toLocaleString()}{unit}</span>
                 </span>
             </div>
          ))}
        </div>
      );
    }
    return null;
};

const ModernStatCard = ({ title, value, icon: Icon, subValue, trend, isInverse, color }: any) => {
    const colorClasses: Record<string, string> = {
        indigo: 'from-indigo-500 to-blue-600 shadow-indigo-500/30 text-indigo-500 ring-indigo-500/20',
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30 text-emerald-500 ring-emerald-500/20',
        amber: 'from-amber-500 to-orange-600 shadow-amber-500/30 text-amber-500 ring-amber-500/20',
        rose: 'from-rose-500 to-pink-600 shadow-rose-500/30 text-rose-500 ring-rose-500/20',
    };

    return (
        <div className={`relative overflow-hidden bg-white dark:bg-[#1e293b] p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 group`}>
            {/* Background Glow */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{title}</h4>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 tracking-tight">{value}</div>
                    {subValue && <div className="text-[10px] font-bold text-slate-400 mt-1 opacity-80">{subValue}</div>}
                    
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-3 text-[10px] font-black uppercase px-2 py-1 rounded-md w-max bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 ${(trend >= 0 && !isInverse) || (trend < 0 && isInverse) ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(trend).toFixed(1)}% vs prev</span>
                        </div>
                    )}
                </div>
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg ring-4 ring-opacity-30`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
};

export default KPIDashboard;