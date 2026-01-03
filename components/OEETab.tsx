
import React from 'react';
import { DayData } from '../types';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface Props {
  data: Record<string, DayData>;
}

const OEETab: React.FC<Props> = ({ data }) => {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Overall Equipment Effectiveness</h2>
        <p className="text-slate-500 mb-8">Real-time performance metrics across Availability, Performance, and Quality.</p>

        <div className="grid grid-cols-3 gap-8">
          <OEEMetric label="Availability" value="94.2%" sub="Downtime loss" status="good" />
          <OEEMetric label="Performance" value="88.5%" sub="Speed loss" status="warning" />
          <OEEMetric label="Quality" value="99.8%" sub="Reject loss" status="good" />
        </div>

        <div className="mt-12 bg-slate-900 rounded-3xl p-10 flex flex-col items-center justify-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <div className="w-64 h-64 border-[32px] border-white rounded-full"></div>
          </div>

          <span className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Master OEE Index</span>
          <span className="text-8xl font-black mb-4">83.1%</span>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-indigo-300">Target: 85% - Close to Optimal</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600" />
          Performance Insights
        </h3>
        <div className="space-y-3">
          <InsightItem
            type="positive"
            text="Quality index is maintaining 99%+ consistent with last 48 hours of Blow Molding production."
          />
          <InsightItem
            type="warning"
            text="Machine M05 showed 15% speed reduction between 14:00 and 16:00 today. Recommend inspection."
          />
        </div>
      </div>
    </div>
  );
};

const OEEMetric: React.FC<{ label: string, value: string, sub: string, status: 'good' | 'warning' | 'danger' }> = ({ label, value, sub, status }) => {
  const color = status === 'good' ? 'text-emerald-500' : status === 'warning' ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex flex-col items-center p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-4xl font-black ${color}`}>{value}</span>
      <span className="text-[10px] font-bold text-slate-400 mt-2">{sub}</span>
    </div>
  );
};

const InsightItem: React.FC<{ type: 'positive' | 'warning', text: string }> = ({ type, text }) => (
  <div className={`p-4 rounded-xl flex gap-3 ${type === 'positive' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
    {type === 'positive' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
    <p className="text-sm font-medium leading-snug">{text}</p>
  </div>
);

export default OEETab;
