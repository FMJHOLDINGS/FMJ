import React, { useMemo } from 'react';
import { DayData } from '../types';
import { calculateMetrics } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Line, Legend
} from 'recharts';
import { TrendingUp, Target, Package, Zap, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface Props {
  data: Record<string, any>;
}

const COLORS = {
  primary: '#6366f1', success: '#10b981', warning: '#f59e0b', danger: '#f43f5e',
  dark: '#1e293b', grid: 'rgba(148, 163, 184, 0.1)'
};

const KPIDashboard: React.FC<Props> = ({ data }) => {
  // --- DATA PROCESSING ---
  const { chartData, totals, trend } = useMemo(() => {
    const dailyMap: Record<string, { date: string, achieved: number, plan: number, downtime: number, rejection: number }> = {};

    Object.keys(data).forEach(key => {
        if (!key.endsWith('_IM') && !key.endsWith('_BM')) return;
        const dayData = data[key] as DayData;
        if (!dayData?.rows) return;

        const dateStr = dayData.date; // YYYY-MM-DD
        if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, achieved: 0, plan: 0, downtime: 0, rejection: 0 };

        dayData.rows.forEach(row => {
            const m = calculateMetrics(row);
            dailyMap[dateStr].achieved += m.achievedKg || 0;
            dailyMap[dateStr].plan += m.planKg || 0;
            dailyMap[dateStr].downtime += m.bdMins || 0;
            const rejKg = (row.rejectionQty || 0) * (row.unitWeight || 0) / 1000;
            dailyMap[dateStr].rejection += rejKg; 
        });
    });

    const sortedArray = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
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

  if (chartData.length === 0) return <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">No Data Available</div>;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard title="Total Output" value={`${totals.achieved.toFixed(0)} kg`} icon={Package} trend={trend} color="indigo" />
        <ModernStatCard title="Avg Efficiency" value={`${avgEfficiency.toFixed(1)}%`} icon={Target} subValue={`Plan: ${totals.plan.toFixed(0)} kg`} color="emerald" />
        <ModernStatCard title="Total Downtime" value={`${totals.downtime} min`} icon={Zap} isInverse={true} color="amber" />
        <ModernStatCard title="Rejection Rate" value={`${rejectionRate.toFixed(2)}%`} icon={TrendingUp} isInverse={true} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div><h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Production Performance</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Achieved vs Planned (Last 14 Days)</p></div>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.3}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor: '#0F172A', border:'none', borderRadius:'10px', color:'#fff'}} wrapperStyle={{outline:'none'}} />
                        <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '11px', fontWeight: 'bold'}} />
                        <Bar dataKey="achieved" name="Achieved Kg" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line type="monotone" dataKey="plan" name="Target Plan" stroke={COLORS.warning} strokeWidth={3} dot={false} strokeDasharray="5 5" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Efficiency Trend</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-6">Daily Efficiency %</p>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs><linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis dataKey="formattedDate" hide />
                        <YAxis domain={[0, 120]} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor: '#0F172A', border:'none', borderRadius:'10px', color:'#fff'}} />
                        <Area type="monotone" dataKey="efficiency" stroke={COLORS.success} strokeWidth={3} fill="url(#effGradient)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

const ModernStatCard = ({ title, value, icon: Icon, subValue, trend, isInverse, color }: any) => {
    const colorClasses: Record<string, string> = {
        indigo: 'from-indigo-500 to-blue-500 shadow-indigo-500/20 text-indigo-500',
        emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/20 text-emerald-500',
        amber: 'from-amber-500 to-orange-500 shadow-amber-500/20 text-amber-500',
        rose: 'from-rose-500 to-pink-500 shadow-rose-500/20 text-rose-500',
    };
    return (
        <div className="relative overflow-hidden bg-white dark:bg-[#1e293b] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{title}</h4>
                    <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{value}</div>
                    {subValue && <div className="text-[9px] font-bold text-slate-400 mt-1">{subValue}</div>}
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-[10px] font-black uppercase ${(trend >= 0 && !isInverse) || (trend < 0 && isInverse) ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(trend).toFixed(1)}% vs prev</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}><Icon className="w-5 h-5" /></div>
            </div>
        </div>
    );
};

export default KPIDashboard;