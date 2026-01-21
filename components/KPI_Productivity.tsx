import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  Zap, Clock, Award, AlertTriangle, Settings, 
  TrendingUp, Activity, CheckCircle2, XCircle 
} from 'lucide-react';

// --- 1. DUMMY DATA GENERATOR (OEE DATA) ---
const generateProductivityData = () => {
  const data = [];
  for (let i = 1; i <= 30; i++) {
    // Generate realistic OEE components
    const availability = Math.floor(Math.random() * (98 - 85) + 85); // 85-98%
    const performance = Math.floor(Math.random() * (100 - 90) + 90); // 90-100%
    const quality = Math.floor(Math.random() * (99.9 - 95) + 95);    // 95-99.9%
    
    // OEE Calculation
    const oee = (availability * performance * quality) / 10000;

    data.push({
      date: `Day ${i}`,
      availability,
      performance,
      quality,
      oee: parseFloat(oee.toFixed(1)),
    });
  }
  return data;
};

// Downtime Reasons Data
const downtimeData = [
  { name: 'Mold Change', value: 120, color: '#f59e0b' },
  { name: 'Machine Breakdown', value: 85, color: '#ef4444' },
  { name: 'No Material', value: 45, color: '#8b5cf6' },
  { name: 'Quality Check', value: 30, color: '#10b981' },
  { name: 'Other', value: 20, color: '#64748b' },
];

const mockData = generateProductivityData();

const KPIProductivity = () => {
  
  // --- 2. CALCULATE AVERAGES ---
  const averages = useMemo(() => {
    const total = mockData.reduce((acc, curr) => ({
      avail: acc.avail + curr.availability,
      perf: acc.perf + curr.performance,
      qual: acc.qual + curr.quality,
      oee: acc.oee + curr.oee
    }), { avail: 0, perf: 0, qual: 0, oee: 0 });

    const len = mockData.length;
    return {
      avgAvail: (total.avail / len).toFixed(1),
      avgPerf: (total.perf / len).toFixed(1),
      avgQual: (total.qual / len).toFixed(1),
      avgOEE: (total.oee / len).toFixed(1)
    };
  }, []);

  // --- 3. CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-xl p-3 rounded-xl border border-slate-700 shadow-2xl text-xs text-white">
          <p className="font-black uppercase mb-2 text-slate-400">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="capitalize text-slate-300">{entry.name}:</span>
              <span className="font-bold">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="w-full space-y-6 pb-10"
    >
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" /> PRODUCTIVITY & OEE
          </h2>
          <p className="text-xs text-slate-400 font-bold">Overall Equipment Effectiveness Analysis</p>
        </div>
        <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2">
          <CheckCircle2 size={16} /> System Healthy
        </div>
      </div>

      {/* --- TOP ROW: OEE METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* MAIN OEE SCORE */}
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-violet-600 to-indigo-900 rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/30 relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Activity size={80} /></div>
          <div>
            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest">OEE Score</p>
            <h3 className="text-4xl font-black mt-1">{averages.avgOEE}%</h3>
          </div>
          <div>
            <div className="text-[10px] font-bold text-indigo-200 mb-1 flex justify-between">
              <span>Target: 85%</span>
              <span>+4.2% vs Last Month</span>
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${averages.avgOEE}%` }} 
                transition={{ duration: 1.5 }}
                className="h-full bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
              />
            </div>
          </div>
        </motion.div>

        {/* AVAILABILITY */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group h-40 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Availability</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{averages.avgAvail}%</h3>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500"><Clock size={20} /></div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-medium">Run Time vs Planned Time</div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${averages.avgAvail}%` }} transition={{ duration: 1 }} className="h-full bg-amber-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group h-40 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Performance</p>
              <h3 className="text-3xl font-black text-blue-500 mt-1">{averages.avgPerf}%</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500"><Settings size={20} /></div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-medium">Actual Speed vs Target</div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${averages.avgPerf}%` }} transition={{ duration: 1 }} className="h-full bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* QUALITY */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group h-40 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Quality</p>
              <h3 className="text-3xl font-black text-emerald-500 mt-1">{averages.avgQual}%</h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500"><Award size={20} /></div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 font-medium">Good Count vs Total</div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${averages.avgQual}%` }} transition={{ duration: 1 }} className="h-full bg-emerald-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* --- MIDDLE ROW: OEE TREND CHART --- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
            <TrendingUp className="text-violet-500" /> OEE Monthly Trend
          </h3>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAvail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="oee" name="OEE Score" stroke="#8b5cf6" fill="url(#colorOee)" strokeWidth={3} />
              <Area type="monotone" dataKey="availability" name="Availability" stroke="#f59e0b" fill="url(#colorAvail)" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- BOTTOM ROW: DOWNTIME ANALYSIS & STATS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DOWNTIME CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase mb-4 flex items-center gap-2">
            <AlertTriangle className="text-rose-500" /> Top Downtime Reasons (Mins)
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={downtimeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {downtimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SUMMARY LIST */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner">
          <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase mb-4 tracking-widest">Key Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><CheckCircle2 size={18} /></div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Highest OEE Recorded</p>
                <p className="text-[10px] text-slate-400">Day 14 - 94.5% Efficiency</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg"><XCircle size={18} /></div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Major Loss Factor</p>
                <p className="text-[10px] text-slate-400">Mold Change - 120 Mins Lost</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><Activity size={18} /></div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Avg Performance</p>
                <p className="text-[10px] text-slate-400">Stable at {averages.avgPerf}%</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default KPIProductivity;