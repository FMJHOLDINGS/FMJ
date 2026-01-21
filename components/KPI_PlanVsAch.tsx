import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, BarChart, Bar, Legend, ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  Activity, Target, TrendingUp, Users, Calendar, 
  BarChart2, Zap, LayoutDashboard 
} from 'lucide-react';

// --- 1. DATA GENERATOR (SHIFT A vs SHIFT B) ---
const generateMonthData = () => {
  const data = [];
  for (let i = 1; i <= 30; i++) {
    // Shift A
    const planA = Math.floor(Math.random() * (800 - 600) + 600);
    const achA = Math.floor(planA * (Math.random() * (1.1 - 0.85) + 0.85));
    
    // Shift B
    const planB = Math.floor(Math.random() * (800 - 600) + 600);
    const achB = Math.floor(planB * (Math.random() * (1.1 - 0.80) + 0.80));

    data.push({
      date: `Day ${i}`,
      planA,
      achievedA: achA,
      planB,
      achievedB: achB,
      totalPlan: planA + planB,
      totalAchieved: achA + achB,
      effA: ((achA / planA) * 100).toFixed(1),
      effB: ((achB / planB) * 100).toFixed(1),
    });
  }
  return data;
};

const mockData = generateMonthData();

const KPIPlanVsAch = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts'>('overview');

  // --- 2. CALCULATE TOTALS ---
  const totals = useMemo(() => {
    const totalPlan = mockData.reduce((acc, curr) => acc + curr.totalPlan, 0);
    const totalAchieved = mockData.reduce((acc, curr) => acc + curr.totalAchieved, 0);
    const totalEff = (totalAchieved / totalPlan) * 100;
    
    const achA = mockData.reduce((acc, curr) => acc + curr.achievedA, 0);
    const achB = mockData.reduce((acc, curr) => acc + curr.achievedB, 0);

    return { totalPlan, totalAchieved, totalEff, achA, achB };
  }, []);

  // --- 3. CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-slate-700 shadow-2xl text-xs text-white">
          <p className="font-black uppercase mb-2 text-slate-400">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="font-medium text-slate-300 capitalize">{entry.name}:</span>
              </span>
              <span className="font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="w-full space-y-6 pb-10"
    >
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-500" /> PRODUCTION DASHBOARD
          </h2>
          <p className="text-xs text-slate-400 font-bold">Monthly Performance Overview</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Overview</button>
          <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'shifts' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Shift Analysis</button>
        </div>
      </div>

      {/* --- KPI CARDS ROW --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plan */}
        <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-5 rounded-3xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10"><Target size={60} /></div>
          <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Total Target</p>
          <h3 className="text-3xl font-black mt-1">{totals.totalPlan.toLocaleString()}</h3>
          <div className="mt-4 h-1 bg-white/20 rounded-full"><div className="h-full bg-white/80 w-full rounded-full"></div></div>
        </motion.div>

        {/* Total Achieved */}
        <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-emerald-600 to-emerald-900 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10"><Activity size={60} /></div>
          <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">Total Output</p>
          <h3 className="text-3xl font-black mt-1">{totals.totalAchieved.toLocaleString()}</h3>
          <div className="mt-4 h-1 bg-white/20 rounded-full"><div className="h-full bg-emerald-300 rounded-full" style={{ width: `${Math.min(totals.totalEff, 100)}%` }}></div></div>
        </motion.div>

        {/* Efficiency */}
        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Efficiency</p>
              <h3 className={`text-3xl font-black mt-1 ${totals.totalEff >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {totals.totalEff.toFixed(1)}%
              </h3>
            </div>
            <div className={`p-3 rounded-2xl ${totals.totalEff >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
              <Zap size={24} fill="currentColor" />
            </div>
          </div>
        </motion.div>

        {/* Shift Split */}
        <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Shift Contribution</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-amber-500">Shift A</span><span>{((totals.achA / totals.totalAchieved) * 100).toFixed(0)}%</span></div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${(totals.achA / totals.totalAchieved) * 100}%` }}></div></div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold mb-1"><span className="text-purple-500">Shift B</span><span>{((totals.achB / totals.totalAchieved) * 100).toFixed(0)}%</span></div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{ width: `${(totals.achB / totals.totalAchieved) * 100}%` }}></div></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- CHART SECTION 1: MAIN TREND --- */}
      {activeTab === 'overview' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
          className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
              <TrendingUp className="text-emerald-500" /> Overall Monthly Trend
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotalAch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTotalPlan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="totalPlan" name="Total Plan" stroke="#6366f1" fill="url(#colorTotalPlan)" strokeWidth={2} />
                <Area type="monotone" dataKey="totalAchieved" name="Total Achieved" stroke="#10b981" fill="url(#colorTotalAch)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* --- CHART SECTION 2: SHIFT COMPARISON --- */}
      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shift Comparison Chart */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase mb-4 flex items-center gap-2">
              <Users className="text-amber-500" /> Shift A vs Shift B (Output)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="achievedA" name="Shift A" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="achievedB" name="Shift B" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Efficiency Trend Chart */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase mb-4 flex items-center gap-2">
              <Zap className="text-rose-500" /> Efficiency Trend (%)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="effA" name="Eff Shift A %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="effB" name="Eff Shift B %" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default KPIPlanVsAch;