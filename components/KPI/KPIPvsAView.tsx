import React, { useRef, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, BarChart, Bar, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  Activity, Target, TrendingUp, Users, 
  LayoutDashboard, Zap, ArrowUpRight, ArrowDownRight, Filter, Check, Square, CheckSquare
} from 'lucide-react';

import { useKPIPlanVsAchLogic } from './KPIPvsALojic';

import { Download } from 'lucide-react';
import { exportPvsAExcel } from './KPIPvsAExcelExport';

// ============================================================================
// 🎨 1. CONFIGURATION (සියලුම වර්ණ මෙතැනින් පහසුවෙන් වෙනස් කරන්න)
// ============================================================================
const CHART_COLORS = {
  planTotal: '#6366f1',       // Total Plan වර්ණය (Indigo)
  achvTotal: '#10b981',       // Total Achieved වර්ණය (Emerald)
  shiftA: '#f59e0b',          // Shift A වර්ණය (Amber/Yellow)
  shiftB: '#8b5cf6',          // Shift B වර්ණය (Purple/Violet)
  textMain: '#94a3b8',        // Chart Text වර්ණය (Slate 400)
  gridLine: '#e2e8f0',        // Chart Grid ඉරි වල වර්ණය
};

// ============================================================================
// 🛠️ 2. HELPER FUNCTIONS & COMPONENTS
// ============================================================================

// 🟢 දින ආකෘතිය "2026-03-01" හෝ "01 Mar" වෙනුවට "1", "2" ලෙස පමණක් පෙන්වීමට
const formatDay = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return parseInt(parts[2], 10).toString(); // "2026-03-05" -> "5"
  const spaceParts = dateStr.split(' ');
  if (spaceParts.length > 1) return parseInt(spaceParts[0], 10).toString(); // "05 Mar" -> "5"
  return dateStr;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl text-xs z-50 transition-colors">
        <p className="font-black uppercase mb-2 text-slate-500 dark:text-slate-400">Day {formatDay(label)}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
              <span className="font-medium text-slate-600 dark:text-slate-300 capitalize">{entry.name}:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : entry.value}
              {entry.name.toLowerCase().includes('eff') ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};



// ============================================================================
// 📊 3. SHIFT DETAIL TABLE COMPONENT
// ============================================================================
const ShiftDetailTable = ({ title, colorClass, dataKeyPrefix, rows, totalStats, tableRef, onScroll, onMouseEnter }: any) => {
  
  // 🟢 ගැස්සීම (Jitter) සම්පූර්ණයෙන්ම නැති කර ඉතාමත් මෘදු ලෙස (Smooth) Scroll වීමට සකස් කළ අලුත් Logic එක
  React.useEffect(() => {
    const el = tableRef?.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Y අක්ෂයට (උඩට/පහළට) Scroll කරන විට පමණක් මෙය ක්‍රියාත්මක වේ
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault(); // Table එක ඇතුළත Scroll වීම සම්පූර්ණයෙන්ම නවතයි

        // ප්‍රධාන ටැබ් එකේ Scroll Container එක හරියටම තෝරාගැනීම
        const mainContainer = document.querySelector('.flex-1.overflow-y-auto');

        if (mainContainer) {
          // 🟢 behavior: 'smooth' යෙදීමෙන් අර ගැස්සෙන ගතිය සම්පූර්ණයෙන්ම නැති වී ලස්සනට ස්වභාවිකව Scroll වේ
          mainContainer.scrollBy({ top: e.deltaY, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: e.deltaY, behavior: 'smooth' });
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [tableRef]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[400px] transform-gpu">
      <div className={`p-5 ${colorClass} text-white shrink-0`}>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-black uppercase flex items-center gap-2">
              <Users size={18} /> {title}
            </h4>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Range Performance</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">{totalStats.ach.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium opacity-70">kg</span></div>
            <div className="text-xs font-bold opacity-90">{totalStats.eff.toFixed(1)}% Eff</div>
          </div>
        </div>
      </div>
      
      <div 
        ref={tableRef}
        onScroll={onScroll}
        onMouseEnter={onMouseEnter}
        onTouchStart={onMouseEnter}
        className="overflow-y-auto overflow-x-auto flex-1 custom-scrollbar pb-2"
      >
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 text-center min-w-[60px]">Date</th>
              <th className="p-3 text-right">Plan</th>
              <th className="p-3 text-right">Achv</th>
              <th className="p-3 text-center">Eff %</th>
              <th className="p-3 text-right text-indigo-500 border-l border-slate-200 dark:border-slate-700">Cum. Plan</th>
              <th className="p-3 text-right text-emerald-500">Cum. Ach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row: any, i: number) => {
                const isZero = row[`plan${dataKeyPrefix}`] === 0 && row[`achieved${dataKeyPrefix}`] === 0;
                return (
                  <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isZero ? 'opacity-40' : ''}`}>
                    <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{formatDay(row.date)}</td>
                    <td className="p-3 text-right font-medium text-slate-500">{row[`plan${dataKeyPrefix}`].toFixed(0)}</td>
                    <td className="p-3 text-right font-black text-slate-800 dark:text-white">{row[`achieved${dataKeyPrefix}`].toFixed(0)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                        isZero ? 'bg-slate-100 text-slate-400' :
                        row[`eff${dataKeyPrefix}`] >= 100 ? 'bg-emerald-100 text-emerald-600' : 
                        row[`eff${dataKeyPrefix}`] >= 80 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {row[`eff${dataKeyPrefix}`].toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-indigo-600/70 dark:text-indigo-400/70 border-l border-slate-100 dark:border-slate-800">
                      {row[`cumPlan${dataKeyPrefix}`].toFixed(0)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {row[`cumAch${dataKeyPrefix}`].toFixed(0)}
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};




// ============================================================================
// 🚀 4. MAIN DASHBOARD COMPONENT
// ============================================================================
interface Props {
  data: Record<string, any>;
  currentDate?: string;
  adminItems?: any[]; 
  startDate?: string; 
  endDate?: string;   
}

const KPIPvsAView: React.FC<Props> = ({ 
  data, 
  adminItems, 
  startDate: propStartDate, 
  endDate: propEndDate 
}) => {
  
  const { 
    activeTab, setActiveTab, 
    startDate, endDate, 
    chartData, totals, shiftSummaries,
    machineFilter, setMachineFilter,
    includePreform, setIncludePreform
  } = useKPIPlanVsAchLogic(data, adminItems, propStartDate, propEndDate);


  // =========================================================================
  // 🟢 අලුතින් එකතු කළ Synchronized Scrolling Logic එක
  // =========================================================================
  const scrollRefA = React.useRef<HTMLDivElement>(null);
  const scrollRefB = React.useRef<HTMLDivElement>(null);
  // දැනට Mouse එක තියෙන්නේ කුමන Table එකේද යන්න හඳුනාගැනීම (Infinite Loop එකක් වළක්වා ගැනීමට)
  const activeScroller = React.useRef<'A' | 'B' | null>(null);

  const handleScrollA = () => {
    if (activeScroller.current !== 'A' || !scrollRefA.current || !scrollRefB.current) return;
    // Table A එක Scroll කරද්දී, Table B එකෙත් Scroll අගය ඊට සමාන කිරීම
    scrollRefB.current.scrollTop = scrollRefA.current.scrollTop;
  };

  const handleScrollB = () => {
    if (activeScroller.current !== 'B' || !scrollRefA.current || !scrollRefB.current) return;
    // Table B එක Scroll කරද්දී, Table A එකෙත් Scroll අගය ඊට සමාන කිරීම
    scrollRefA.current.scrollTop = scrollRefB.current.scrollTop;
  };
  // =========================================================================

  // 🟢 දින 31කට වඩා ඇත්නම් පමණක් Tab එකෙහි පළල වැඩි වී Scroll Bar එකක් සෑදේ
  const dataLen = chartData?.length || 0;
  const dynamicTabMinWidth = dataLen > 31 ? `${Math.max(1000, dataLen * 35)}px` : '1000px';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      // 🟢 Hardware Acceleration යොදා Low Performance Devices වල Lag වීම වළක්වා ඇත
      className="w-full space-y-6 pb-10 transform-gpu"
    >
      {/* ================= HEADER CONTROLS ================= */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-2xl">
                <LayoutDashboard className="text-indigo-500" />
            </div>
            <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Production KPI</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                    <Filter size={12} /> 
                    <span>{startDate} - {endDate}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 custom-scrollbar justify-center xl:justify-end">
            
            {/* 🟢 අලුතින් එකතු කළ Excel Export Button එක */}
            <button
                onClick={() => exportPvsAExcel(chartData, data, startDate, endDate)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase shadow-md transition-all active:scale-95 shrink-0"
            >
                <Download size={14} />
                Export
            </button>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                {['ALL', 'IM', 'BM'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setMachineFilter(type as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            machineFilter === type 
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-amber-500/50' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {machineFilter === type && <Check className="w-3 h-3 text-amber-500" />}
                        {type}
                    </button>
                ))}
            </div>

            {(machineFilter === 'IM' || machineFilter === 'ALL') && (
                <button 
                    onClick={() => setIncludePreform(!includePreform)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 shrink-0 ${
                        includePreform 
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                    }`}
                >
                    {includePreform ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase">With Preform</span>
                </button>
            )}

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Overview</button>
                <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'shifts' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Shift Analysis</button>
            </div>
        </div>
      </div>

      {/* ================= GLOBAL TAB CONTENT WRAPPER ================= */}
      {/* 🟢 Screen එක කුඩා වනවිට මුළු ටැබ් එකටම අදාළව පහළින් Scroll Bar එකක් සෑදීමට මෙය යොදා ඇත */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-6">
        <div style={{ minWidth: dynamicTabMinWidth }} className="flex flex-col gap-6">

          {/* ================= KPI CARDS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-5 rounded-3xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10"><Target size={60} /></div>
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Total Plan (KG)</p>
              <h3 className="text-3xl font-black mt-1">{totals.plan.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-emerald-600 to-emerald-900 p-5 rounded-3xl text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10"><Activity size={60} /></div>
              <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest">Total Output (KG)</p>
              <h3 className="text-3xl font-black mt-1">{totals.achieved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Efficiency</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className={`text-3xl font-black ${totals.efficiency >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {totals.efficiency.toFixed(1)}%
                </h3>
                {totals.efficiency >= 100 ? <ArrowUpRight className="text-emerald-500" size={20}/> : <ArrowDownRight className="text-amber-500" size={20}/>}
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Shift Contribution</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold mb-1"><span style={{ color: CHART_COLORS.shiftA }}>Shift A</span><span>{totals.achieved > 0 ? ((totals.achA / totals.achieved) * 100).toFixed(0) : 0}%</span></div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${totals.achieved > 0 ? (totals.achA / totals.achieved) * 100 : 0}%`, backgroundColor: CHART_COLORS.shiftA }}></div></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold mb-1"><span style={{ color: CHART_COLORS.shiftB }}>Shift B</span><span>{totals.achieved > 0 ? ((totals.achB / totals.achieved) * 100).toFixed(0) : 0}%</span></div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${totals.achieved > 0 ? (totals.achB / totals.achieved) * 100 : 0}%`, backgroundColor: CHART_COLORS.shiftB }}></div></div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
              className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
            >
              <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2 mb-6">
                <TrendingUp className="text-emerald-500" /> Production Trend
              </h3>
              
              {/* 🟢 Chart එක අනිවාර්යයෙන්ම පෙන්වීම සඳහා ස්ථාවර උසක් ලබා දී ඇත */}
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalAch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.achvTotal} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.achvTotal} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTotalPlan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.planTotal} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={CHART_COLORS.planTotal} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.gridLine} className="dark:opacity-10" />
                    <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    {/* 🟢 Lag වීම නතර කිරීමට Animation අක්‍රිය කර ඇත */}
                    <Area isAnimationActive={false} type="monotone" dataKey="totalPlan" name="Total Plan" stroke={CHART_COLORS.planTotal} fill="url(#colorTotalPlan)" strokeWidth={2} />
                    <Area isAnimationActive={false} type="monotone" dataKey="totalAchieved" name="Total Achieved" stroke={CHART_COLORS.achvTotal} fill="url(#colorTotalAch)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ================= SHIFT ANALYSIS TAB ================= */}
          {activeTab === 'shifts' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Shift Output Comparison */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col"
                >
                  <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase mb-4 flex items-center gap-2">
                    <Users className="text-amber-500" /> Shift Output Comparison
                  </h3>
                  
                  <div style={{ height: '280px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.gridLine} className="dark:opacity-10" />
                        <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Legend iconType="circle" />
                        <Bar isAnimationActive={false} dataKey="achievedA" name="Shift A" fill={CHART_COLORS.shiftA} radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar isAnimationActive={false} dataKey="achievedB" name="Shift B" fill={CHART_COLORS.shiftB} radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Chart 2: Efficiency Trend */}
                <motion.div 
                  initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col"
                >
                  <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase mb-4 flex items-center gap-2">
                    <Zap className="text-rose-500" /> Efficiency Trend (%)
                  </h3>

                  <div style={{ height: '280px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.gridLine} className="dark:opacity-10" />
                        <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.textMain, fontWeight: 'bold' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="plainline" />
                        <Line isAnimationActive={false} type="monotone" dataKey="effA" name="Eff Shift A %" stroke={CHART_COLORS.shiftA} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                        <Line isAnimationActive={false} type="monotone" dataKey="effB" name="Eff Shift B %" stroke={CHART_COLORS.shiftB} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ShiftDetailTable 
                  title="Shift A - Performance" 
                  colorClass="bg-gradient-to-r from-amber-500 to-amber-700"
                  dataKeyPrefix="A"
                  rows={chartData}
                  totalStats={shiftSummaries.shiftA}
                  // 🟢 Sync Props for Shift A
                  tableRef={scrollRefA}
                  onScroll={handleScrollA}
                  onMouseEnter={() => { activeScroller.current = 'A'; }}
                />
                <ShiftDetailTable 
                  title="Shift B - Performance" 
                  colorClass="bg-gradient-to-r from-purple-600 to-purple-800"
                  dataKeyPrefix="B"
                  rows={chartData}
                  totalStats={shiftSummaries.shiftB}
                  // 🟢 Sync Props for Shift B
                  tableRef={scrollRefB}
                  onScroll={handleScrollB}
                  onMouseEnter={() => { activeScroller.current = 'B'; }}
                />
              </div>

            </div>
          )}
          
        </div>
      </div>
    </motion.div>
  );
};

export default KPIPvsAView;