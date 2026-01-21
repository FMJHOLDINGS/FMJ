import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  Zap, DollarSign, Leaf, Activity, BarChart3, 
  ArrowUpRight, ArrowDownRight, Table as TableIcon
} from 'lucide-react';

// --- 1. DUMMY DATA GENERATOR ---
const generateElectricityData = () => {
  const data = [];
  const ratePerUnit = 45; // Cost per KWh in Currency
  
  for (let i = 1; i <= 30; i++) {
    // Random KWh for Shift A (Day) and Shift B (Night)
    const shiftA_Kwh = Math.floor(Math.random() * (450 - 300) + 300);
    const shiftB_Kwh = Math.floor(Math.random() * (400 - 250) + 250);
    const totalKwh = shiftA_Kwh + shiftB_Kwh;
    
    data.push({
      id: i,
      date: `Day ${i}`,
      shiftA: shiftA_Kwh,
      shiftB: shiftB_Kwh,
      total: totalKwh,
      cost: (totalKwh * ratePerUnit).toFixed(0),
      // Carbon emission approx 0.4kg per kWh
      co2: (totalKwh * 0.4).toFixed(1),
      status: totalKwh > 800 ? 'High' : totalKwh > 600 ? 'Normal' : 'Low'
    });
  }
  return data;
};

const mockData = generateElectricityData();

const KPIElectricity = () => {
  
  // --- 2. CALCULATE TOTALS ---
  const totals = useMemo(() => {
    const totalKwh = mockData.reduce((acc, curr) => acc + curr.total, 0);
    const totalCost = mockData.reduce((acc, curr) => acc + parseInt(curr.cost), 0);
    const totalCO2 = mockData.reduce((acc, curr) => acc + parseFloat(curr.co2), 0);
    const splitA = mockData.reduce((acc, curr) => acc + curr.shiftA, 0);
    const splitB = mockData.reduce((acc, curr) => acc + curr.shiftB, 0);
    
    return { totalKwh, totalCost, totalCO2, splitA, splitB };
  }, []);

  // --- 3. CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-slate-700 shadow-2xl text-xs text-white">
          <p className="font-black uppercase mb-2 text-slate-400">{label}</p>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-slate-300">Shift A:</span>
            <span className="font-bold">{payload[0].value} kWh</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-slate-300">Shift B:</span>
            <span className="font-bold">{payload[1].value} kWh</span>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between">
            <span className="text-slate-400">Total:</span>
            <span className="font-black text-emerald-400">
              {payload[0].value + payload[1].value} kWh
            </span>
          </div>
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
            <Zap className="text-yellow-500 fill-yellow-500" /> ENERGY CONSUMPTION
          </h2>
          <p className="text-xs text-slate-400 font-bold">Electricity Usage Monitoring Module</p>
        </div>
        <div className="bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl text-xs font-black uppercase">
          Month: October 2026
        </div>
      </div>

      {/* --- TOP ROW: KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL USAGE */}
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-slate-800 to-slate-950 p-5 rounded-3xl text-white shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-all"><Zap size={60} /></div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Consumption</p>
          <h3 className="text-3xl font-black mt-1 text-yellow-400">{totals.totalKwh.toLocaleString()} <span className="text-sm text-white">kWh</span></h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
            <ArrowUpRight className="text-rose-500 w-3 h-3" /> 5% vs last month
          </div>
        </motion.div>

        {/* TOTAL COST */}
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Est. Cost</p>
              <h3 className="text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                ${(totals.totalCost / 1000).toFixed(1)}k
              </h3>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
          </div>
          <div className="mt-4 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[75%] rounded-full"></div>
          </div>
        </motion.div>

        {/* SHIFT COMPARISON */}
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Shift Usage Split</p>
          <div className="flex items-end gap-2 h-16 mt-2">
            <div className="flex-1 flex flex-col justify-end gap-1">
              <span className="text-[10px] font-bold text-amber-500 text-center">A: {((totals.splitA/totals.totalKwh)*100).toFixed(0)}%</span>
              <div className="w-full bg-amber-500 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${(totals.splitA/totals.totalKwh)*100}%` }}></div>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-1">
              <span className="text-[10px] font-bold text-indigo-500 text-center">B: {((totals.splitB/totals.totalKwh)*100).toFixed(0)}%</span>
              <div className="w-full bg-indigo-500 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${(totals.splitB/totals.totalKwh)*100}%` }}></div>
            </div>
          </div>
        </motion.div>

        {/* CARBON FOOTPRINT */}
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-20"><Leaf size={60} /></div>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">Carbon Footprint</p>
          <h3 className="text-3xl font-black mt-1">{totals.totalCO2.toLocaleString()} <span className="text-sm">kg</span></h3>
          <p className="text-[10px] text-emerald-200 mt-2">CO2 Emissions calculated</p>
        </motion.div>
      </div>

      {/* --- MIDDLE: MAIN CHART (Stacked Bar) --- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
            <BarChart3 className="text-indigo-500" /> Daily Consumption Trend
          </h3>
          <div className="flex gap-4 text-xs font-bold">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Shift A</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Shift B</div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
              <Bar dataKey="shiftA" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} barSize={20} />
              <Bar dataKey="shiftB" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- BOTTOM: DETAILED DATA TABLE --- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
            <TableIcon className="text-slate-400" /> Usage Logs
          </h3>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center text-amber-500">Shift A (kWh)</th>
                <th className="py-3 px-4 text-center text-indigo-500">Shift B (kWh)</th>
                <th className="py-3 px-4 text-right">Total (kWh)</th>
                <th className="py-3 px-4 text-right">Cost (Est)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {mockData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs">{row.date}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-400 text-xs">{row.shiftA}</td>
                  <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-400 text-xs">{row.shiftB}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-white text-xs">{row.total}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">${row.cost}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide
                      ${row.status === 'Low' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
                        row.status === 'Normal' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 
                        'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </motion.div>
  );
};

export default KPIElectricity;