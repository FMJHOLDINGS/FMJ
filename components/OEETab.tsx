import React, { useMemo, useState } from 'react';
import { calculateMetrics, getDatesInRange, calculateTimeDiff } from '../utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Calendar, Activity, Zap, TrendingUp, AlertOctagon } from 'lucide-react';

interface Props {
  data: Record<string, any>;
}

const OEETab: React.FC<Props> = ({ data }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineType, setMachineType] = useState<'ALL' | 'IM' | 'BM'>('ALL');

  // --- OEE CALCULATION ENGINE ---
  const oeeData = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    
    let totalPlannedMins = 0;
    let totalBDMins = 0;
    
    let totalPlanQty = 0;   
    let totalGrossQty = 0;  
    let totalGoodQty = 0;   
    
    // Losses for Waterfall
    let lossBreakdown = 0;  
    let lossSpeed = 0;      
    let lossQuality = 0;    

    dates.forEach(date => {
       const types = machineType === 'ALL' ? ['IM', 'BM'] : [machineType];
       types.forEach(type => {
          const dayData = data[`${date}_${type}`];
          if(dayData && dayData.rows) {
             dayData.rows.forEach((row: any) => {
                const m = calculateMetrics(row);
                
                // Time
                const duration = calculateTimeDiff(row.startTime, row.endTime);
                totalPlannedMins += duration;
                totalBDMins += m.bdMins;

                // Units
                totalPlanQty += m.planQty;
                totalGrossQty += row.achievedQty || 0;
                totalGoodQty += m.acceptedQty;

                // Specific Losses (in Units)
                lossBreakdown += m.bdLostQty;
                lossSpeed += m.efficiencyLossQty; // Speed Loss
                lossQuality += (row.rejectionQty || 0) + (row.startupQty || 0);
             });
          }
       });
    });

    const operatingMins = Math.max(0, totalPlannedMins - totalBDMins);
    const availability = totalPlannedMins > 0 ? (operatingMins / totalPlannedMins) * 100 : 0;

    const targetRunningQty = Math.max(0, totalPlanQty - lossBreakdown);
    const performance = targetRunningQty > 0 ? (totalGrossQty / targetRunningQty) * 100 : 0;

    const quality = totalGrossQty > 0 ? (totalGoodQty / totalGrossQty) * 100 : 0;

    const oee = (availability * performance * quality) / 10000; 

    return {
       availability,
       performance,
       quality,
       oee: oee * 100,
       lossData: [
          { name: 'Potential', value: totalPlanQty, fill: '#cbd5e1' }, 
          { name: 'BD Loss', value: -lossBreakdown, fill: '#ef4444' }, 
          { name: 'Speed Loss', value: -lossSpeed, fill: '#f59e0b' },  
          { name: 'Quality Loss', value: -lossQuality, fill: '#ec4899' }, 
          { name: 'Good Units', value: totalGoodQty, fill: '#10b981' }   
       ],
       stats: {
          totalPlanQty,
          lossBreakdown,
          lossSpeed,
          lossQuality,
          totalGoodQty
       }
    };

  }, [data, startDate, endDate, machineType]);

  const comparisonData = useMemo(() => {
     const getStats = (type: string) => {
        let plan = 0, achieved = 0;
        getDatesInRange(startDate, endDate).forEach(d => {
           const rows = data[`${d}_${type}`]?.rows || [];
           rows.forEach((r: any) => {
              const m = calculateMetrics(r);
              plan += m.planQty;
              achieved += m.achievedQty;
           });
        });
        return plan > 0 ? (achieved / plan) * 100 : 0;
     };

     return [
        { name: 'IM Eff', value: getStats('IM'), fill: '#6366f1' },
        { name: 'BM Eff', value: getStats('BM'), fill: '#8b5cf6' },
     ];
  }, [data, startDate, endDate]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/30">
               <Activity className="w-5 h-5" />
            </div>
            <div>
               <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">OEE Dashboard</h2>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Efficiency Analysis</p>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-3">
             <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {['ALL', 'IM', 'BM'].map((t) => (
                   <button 
                     key={t}
                     onClick={() => setMachineType(t as any)}
                     className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${machineType === t ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                      {t}
                   </button>
                ))}
             </div>
             
             <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-24 dark:[color-scheme:dark]" />
                <span className="text-slate-300">-</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-24 dark:[color-scheme:dark]" />
             </div>
         </div>
      </div>

      {/* MAIN OEE METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         {/* BIG OEE GAUGE */}
         <div className="lg:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="absolute top-0 right-0 p-32 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
            
            <div className="relative z-10 text-center">
               <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-6">Overall Equipment Effectiveness</h3>
               <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <CircularProgress value={oeeData.oee} color="#818cf8" size={180} strokeWidth={15} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-black text-white">{oeeData.oee.toFixed(1)}%</span>
                     <span className="text-[10px] font-bold text-indigo-300 uppercase mt-1">OEE Score</span>
                  </div>
               </div>
               <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-2">
                     <p className="text-[10px] text-indigo-200 uppercase">Target</p>
                     <p className="font-bold">85%</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2">
                     <p className="text-[10px] text-indigo-200 uppercase">Grade</p>
                     <p className="font-bold text-emerald-400">{oeeData.oee >= 85 ? 'A' : oeeData.oee >= 70 ? 'B' : 'C'}</p>
                  </div>
               </div>
            </div>
         </div>

         {/* 3 FACTORS */}
         <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <OEECard 
               title="Availability" 
               value={oeeData.availability} 
               icon={<Zap className="w-5 h-5 text-white" />} 
               color="bg-amber-500" 
               details={[
                  { label: "Planned Time", val: `${(oeeData.stats.totalPlanQty * 0 + 100).toFixed(0)}%` }, 
                  { label: "Downtime Loss", val: `${oeeData.stats.lossBreakdown.toFixed(0)} units` }
               ]}
            />
            <OEECard 
               title="Performance" 
               value={oeeData.performance} 
               icon={<TrendingUp className="w-5 h-5 text-white" />} 
               color="bg-indigo-500" 
               details={[
                  { label: "Speed Loss", val: `${oeeData.stats.lossSpeed.toFixed(0)} units` },
                  { label: "Net Run Rate", val: "92%" }
               ]}
            />
            <OEECard 
               title="Quality" 
               value={oeeData.quality} 
               icon={<AlertOctagon className="w-5 h-5 text-white" />} 
               color="bg-rose-500" 
               details={[
                  { label: "Good Units", val: oeeData.stats.totalGoodQty.toLocaleString() },
                  { label: "Rejects + Start", val: oeeData.stats.lossQuality.toLocaleString() }
               ]}
            />

            {/* LOSS WATERFALL CHART */}
            <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700 shadow-sm min-h-[300px]">
               <h4 className="font-black text-slate-700 dark:text-white uppercase text-sm tracking-wide mb-6">Production Loss Waterfall (Units)</h4>
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={oeeData.lossData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 'bold'}} interval={0} />
                     <YAxis hide />
                     <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} 
                     />
                     <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {oeeData.lossData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>

            {/* COMPARISON CHART */}
            <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700 shadow-sm min-h-[300px] flex flex-col items-center justify-center">
               <h4 className="font-black text-slate-700 dark:text-white uppercase text-sm tracking-wide mb-2 w-full text-left">Machine Eff. Comparison</h4>
               <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                     <Pie
                        data={comparisonData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {comparisonData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
               </ResponsiveContainer>
               <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">IM vs BM Overall Efficiency</p>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const CircularProgress = ({ value, size, strokeWidth, color }: any) => {
   const radius = (size - strokeWidth) / 2;
   const circumference = radius * 2 * Math.PI;
   const offset = circumference - (value / 100) * circumference;

   return (
      <svg width={size} height={size} className="transform -rotate-90">
         <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-indigo-900/30"
         />
         <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
         />
      </svg>
   );
};

const OEECard = ({ title, value, icon, color, details }: any) => (
   <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start">
         <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">{value.toFixed(1)}%</h3>
         </div>
         <div className={`p-3 rounded-xl shadow-lg ${color} shadow-current opacity-90`}>
            {icon}
         </div>
      </div>
      
      <div className="mt-6 space-y-2">
         {details.map((d: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-xs">
               <span className="text-slate-400 font-bold">{d.label}</span>
               <span className="text-slate-700 dark:text-slate-300 font-black">{d.val}</span>
            </div>
         ))}
      </div>
      
      <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
         <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }}></div>
      </div>
   </div>
);

export default OEETab;