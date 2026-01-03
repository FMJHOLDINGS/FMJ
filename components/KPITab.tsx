
import React, { useMemo } from 'react';
import { DayData } from '../types';
import { calculateMetrics } from '../utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Target, Package, Zap } from 'lucide-react';

interface Props {
  data: Record<string, DayData>;
}

const KPITab: React.FC<Props> = ({ data }) => {
  const chartData = useMemo(() => {
    // Fix: Explicitly cast to DayData[] to avoid "unknown" type errors in subsequent operations
    return (Object.values(data) as DayData[])
      .filter(d => d && d.date) // Safety check for valid data
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10) // Last 10 days
      .map(day => {
        let totalAchieved = 0;
        let totalPlan = 0;
        let totalBd = 0;
        day.rows.forEach(r => {
          const m = calculateMetrics(r);
          totalAchieved += m.achievedKg;
          totalPlan += m.planKg;
          totalBd += m.bdMins;
        });

        return {
          date: day.date,
          achieved: totalAchieved,
          plan: totalPlan,
          downtime: totalBd,
          efficiency: totalPlan > 0 ? (totalAchieved / totalPlan) * 100 : 0
        };
      });
  }, [data]);

  const totals = useMemo(() => {
    return chartData.reduce((acc, curr) => ({
      achieved: acc.achieved + curr.achieved,
      plan: acc.plan + curr.plan,
      downtime: acc.downtime + curr.downtime,
      count: acc.count + 1
    }), { achieved: 0, plan: 0, downtime: 0, count: 0 });
  }, [chartData]);

  const avgEff = totals.plan > 0 ? (totals.achieved / totals.plan) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Output" value={`${totals.achieved.toLocaleString()} kg`} icon={<Package />} color="bg-indigo-600" />
        <StatCard title="Efficiency Score" value={`${avgEff.toFixed(1)}%`} icon={<Target />} color="bg-emerald-500" />
        <StatCard title="Total Downtime" value={`${totals.downtime} min`} icon={<Zap />} color="bg-amber-500" />
        <StatCard title="Trend Analysis" value="+12.4%" icon={<TrendingUp />} color="bg-indigo-900" isTrend />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6">Daily Output (Achieved vs Plan)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={10} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="plan" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Target" />
              <Bar dataKey="achieved" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Produced" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px]">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6">Efficiency Timeline (%)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={10} tick={{ fill: '#94a3b8' }} />
              <YAxis fontSize={10} tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Area type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" name="Efficiency %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string, isTrend?: boolean }> = ({ title, value, icon, color, isTrend }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
    <div className={`p-4 rounded-xl text-white ${color} shadow-lg shadow-${color}/20`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{title}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      {isTrend && <p className="text-[10px] text-green-500 font-bold mt-1">Increasing over 7 days</p>}
    </div>
  </div>
);

export default KPITab;
