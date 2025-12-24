import React from 'react';
import { DayData } from '../types';
import { calculateMetrics } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  allData: Record<string, any>;
  date: string;
}

const DailySummary: React.FC<Props> = ({ allData, date }) => {
  const getSummary = (type: string) => {
    const data = allData[`${date}_${type}`] as DayData;
    if (!data) return { kg: 0, plan: 0, bd: 0 };
    return data.rows.reduce((acc, row) => {
      const m = calculateMetrics(row);
      return { kg: acc.kg + m.achievedKg, plan: acc.plan + m.planKg, bd: acc.bd + m.bdMins };
    }, { kg: 0, plan: 0, bd: 0 });
  };

  const im = getSummary('IM');
  const bm = getSummary('BM');

  const chartData = [
    { name: 'Injection (IM)', produced: im.kg, target: im.plan },
    { name: 'Blow (BM)', produced: bm.kg, target: bm.plan }
  ];

  return (
    <div className="grid grid-cols-2 gap-8 animate-fade-in">
       <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-6">Production Metrics</h3>
          <div className="space-y-6">
             <MetricRow label="Total IM Production" value={`${im.kg.toLocaleString()} kg`} plan={im.plan} />
             <MetricRow label="Total BM Production" value={`${bm.kg.toLocaleString()} kg`} plan={bm.plan} />
             <div className="pt-6 border-t border-slate-100 flex justify-between">
                <div><p className="text-[10px] font-black text-slate-400 uppercase">Total Produced Today</p><p className="text-3xl font-black text-indigo-600">{(im.kg + bm.kg).toLocaleString()} <span className="text-sm">kg</span></p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase text-right">Total Downtime</p><p className="text-3xl font-black text-rose-500 text-right">{(im.bd + bm.bd)} <span className="text-sm">min</span></p></div>
             </div>
          </div>
       </div>

       <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-[400px]">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-6">Produced vs Target</h3>
          <ResponsiveContainer width="100%" height="90%">
             <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={10} tick={{fill: '#94a3b8'}} />
                <YAxis fontSize={10} tick={{fill: '#94a3b8'}} />
                <Tooltip />
                <Bar dataKey="produced" fill="#4f46e5" radius={[6, 6, 0, 0]} />
             </BarChart>
          </ResponsiveContainer>
       </div>
    </div>
  );
};

const MetricRow = ({ label, value, plan }: any) => {
  const eff = plan > 0 ? (parseFloat(value) / plan) * 100 : 0;
  return (
    <div className="flex items-center justify-between">
       <div><p className="text-[10px] font-black text-slate-400 uppercase">{label}</p><p className="text-xl font-black text-slate-800">{value}</p></div>
       <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase">Efficiency</p><p className={`text-xl font-black ${eff >= 85 ? 'text-green-600' : 'text-amber-500'}`}>{eff.toFixed(1)}%</p></div>
    </div>
  );
};

export default DailySummary;