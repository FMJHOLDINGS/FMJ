// ============================================================================
// 📊 QUALITY ANALYSIS DASHBOARD (FULL CLEAN VERSION)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ComposedChart, Line, LabelList } from 'recharts';
import { Package, AlertCircle, Activity, TrendingUp, Layers, Target, X, CheckCircle, Search } from 'lucide-react';
import { useQualityAnalysisLogic } from './useQualityAnalysisLogic';
import { createPortal } from 'react-dom';


const fmt = (val: number) => Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });



// --- 1. KPI CARDS ---
const KPICards = ({ data }: { data: any }) => (
    <div className="grid grid-cols-5 gap-4 mb-4 min-w-[1600px]">
        {/* Total Production Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-4 transition-all hover:shadow-md cursor-default">
            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl text-blue-600 dark:text-blue-300"><Package size={24} /></div>
            <div className="w-full overflow-hidden">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider">Total Production</p>
                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{fmt(data.totalProd)} <span className="text-sm">kg</span></h3>
                    <span className="text-[11px] font-black text-blue-600/80 dark:text-blue-300/80 uppercase mb-0.5">{fmt(data.totalProdQty)} QTY</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] font-bold text-blue-800/60 dark:text-blue-300/60 uppercase tracking-wide truncate">
                    <span>IM: <span className="text-blue-700 dark:text-blue-300">{fmt(data.imProd)} kg</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-200 dark:bg-blue-800 flex-shrink-0"></span>
                    <span>BM: <span className="text-blue-700 dark:text-blue-300">{fmt(data.bmProd)} kg</span></span>
                </div>
            </div>
        </div>
        
        {/* Rejection Box */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-center gap-4 transition-all hover:shadow-md cursor-default">
            <div className="p-3 bg-red-100 dark:bg-red-800 rounded-xl text-red-600 dark:text-red-300"><AlertCircle size={24} /></div>
            <div className="w-full overflow-hidden">
                <p className="text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Rejection</p>
                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{fmt(data.totalRej)} <span className="text-sm">kg</span></h3>
                    <div className="flex flex-col text-right mb-0.5">
                        <span className="text-[9px] font-black text-red-600/80 dark:text-red-300/80 uppercase leading-none mb-1">IM: {fmt(data.imRejQty)} QTY</span>
                        <span className="text-[9px] font-black text-red-600/80 dark:text-red-300/80 uppercase leading-none">BM: {fmt(data.bmRejQty)} QTY</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] font-bold text-red-800/60 dark:text-red-300/60 uppercase tracking-wide truncate">
                    <span>IM: <span className="text-red-700 dark:text-red-300">{fmt(data.imRej)} kg</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-200 dark:bg-red-800 flex-shrink-0"></span>
                    <span>BM: <span className="text-red-700 dark:text-red-300">{fmt(data.bmRej)} kg</span></span>
                </div>
            </div>
        </div>
        
        {/* Rejection Rate Box */}
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800 flex items-center gap-4 transition-all hover:shadow-md cursor-default">
            <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-xl text-orange-600 dark:text-orange-300"><Activity size={24} /></div>
            <div className="w-full overflow-hidden">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-300 uppercase tracking-wider">Rejection Rate</p>
                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{data.rate}%</h3>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] font-bold text-orange-800/60 dark:text-orange-300/60 uppercase tracking-wide truncate">
                    <span>IM: <span className="text-orange-700 dark:text-orange-300">{data.imRate}%</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-200 dark:bg-orange-800 flex-shrink-0"></span>
                    <span>BM: <span className="text-orange-700 dark:text-orange-300">{data.bmRate}%</span></span>
                </div>
            </div>
        </div>

        {/* Good Qty KG Box */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-4 transition-all hover:shadow-md cursor-default">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-300"><CheckCircle size={24} /></div>
            <div className="w-full overflow-hidden">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">Good Qty Kg</p>
                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{fmt(data.totalGoodKg)} <span className="text-sm">kg</span></h3>
                    <div className="flex flex-col text-right mb-0.5">
                        <span className="text-[9px] font-black text-emerald-600/80 dark:text-emerald-300/80 uppercase leading-none mb-1">IM: {fmt(data.imGoodQty)} QTY</span>
                        <span className="text-[9px] font-black text-emerald-600/80 dark:text-emerald-300/80 uppercase leading-none">BM: {fmt(data.bmGoodQty)} QTY</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-800/60 dark:text-emerald-300/60 uppercase tracking-wide truncate">
                    <span>IM: <span className="text-emerald-700 dark:text-emerald-300">{fmt(data.imGoodKg)} kg</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex-shrink-0"></span>
                    <span>BM: <span className="text-emerald-700 dark:text-emerald-300">{fmt(data.bmGoodKg)} kg</span></span>
                </div>
            </div>
        </div>

        {/* Total Rejection After Sorted Box */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 flex items-center gap-4 transition-all hover:shadow-md cursor-default">
            <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-xl text-purple-600 dark:text-purple-300"><Search size={24} /></div>
            <div className="w-full overflow-hidden">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider whitespace-nowrap">Total Rejection After Sorted</p>
                <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{fmt(data.totalSortedRejKg)} <span className="text-sm">kg</span></h3>
                    <div className="flex flex-col text-right mb-0.5">
                        <span className="text-[9px] font-black text-purple-600/80 dark:text-purple-300/80 uppercase leading-none mb-1">IM: {fmt(data.imSortedRejQty)} QTY</span>
                        <span className="text-[9px] font-black text-purple-600/80 dark:text-purple-300/80 uppercase leading-none">BM: {fmt(data.bmSortedRejQty)} QTY</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] font-bold text-purple-800/60 dark:text-purple-300/60 uppercase tracking-wide truncate">
                    <span>IM: <span className="text-purple-700 dark:text-purple-300">{fmt(data.imSortedRejKg)} kg</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-200 dark:bg-purple-800 flex-shrink-0"></span>
                    <span>BM: <span className="text-purple-700 dark:text-purple-300">{fmt(data.bmSortedRejKg)} kg</span></span>
                </div>
            </div>
        </div>
    </div>
);









// ============================================================================
// --- 2. DAILY TREND CHART ---
// ============================================================================

const DailyTrendChart = ({ data }: { data: any[] }) => {
    // 🟢 Rejection Rate එක data එකට එකතු කිරීම
    const chartData = data.map(item => ({
        ...item,
        RejectionRate: item.Production > 0 ? (item.Rejection / item.Production) * 100 : 0
    }));

    const fmt = (val: any) => (typeof val === 'number' ? val.toFixed(1) : val);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl z-50">
                    <p className="font-bold text-slate-800 dark:text-white mb-1 text-[10px] uppercase tracking-wider">{label}</p>
                    {payload.map((entry: any, i: number) => {
                        const isRate = entry.name === 'Rejection Rate %';
                        return (
                            <div key={i} className="flex items-center gap-2 text-xs mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                                <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">{entry.name}:</span>
                                <span className="font-bold text-slate-900 dark:text-white ml-auto">
                                    {fmt(entry.value)} {isRate ? '%' : 'kg'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="relative bg-white dark:bg-[#1b2130] p-5 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col h-auto transform-gpu transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500"/> Daily Trends
                </h3>
                <div className="flex gap-4 text-xs font-bold text-slate-500 dark:text-slate-300">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Prod</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div> Rej</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500"></div> Rate %</div>
                </div>
            </div>
            
            {/* 🟢 Mobile Scroll Bar එක එකතු කර ඇත: overflow-x-auto */}
            <div className="h-[300px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                {/* 🟢 Mobile වලදී min-width එකක් (800px) ලබා දී ඇත, එවිට කුඩා තිර වලදී ලස්සනට Scroll වේ. විශාල තිර වලදී 100% පළල ගනී. */}
                <div className="h-full min-w-[800px] md:min-w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 15, right: 0, left: -15, bottom: 0 }} barGap={1}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                            
                            {/* 🟢 interval={0} සහ angle={-45} යොදා දින සියල්ලම එකක්වත් නොහැංගී පෙන්වයි */}
                            <XAxis 
                                dataKey="dateLabel" 
                                stroke="#64748b" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false} 
                                interval={0} 
                                tickFormatter={(val) => val.split(' ')[0]} // 🟢 "1 Mar" වලින් පළමු කොටස (අංකය) පමණක් ගනී
                                height={20} // 🟢 ඇල කර නැති නිසා උස නැවත සාමාන්‍ය ගාණට අඩු කර ඇත
                            />
                            
                            <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1).replace('.0', '')}k` : val} />
                            <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={9} tickLine={false} axisLine={false} domain={[0, 600]} allowDataOverflow={true} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1).replace('.0', '')}k` : val} />
                            <YAxis yAxisId="rate" orientation="right" hide={true} domain={[0, 20]} />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)', radius: 4 }} />
                            
                            <Bar yAxisId="left" dataKey="Production" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} minPointSize={0} isAnimationActive={false} />
                            <Bar yAxisId="right" dataKey="Rejection" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={8} minPointSize={2} isAnimationActive={false} />

                            <Line yAxisId="rate" dataKey="RejectionRate" name="Rejection Rate %" type="monotone" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', strokeWidth: 0, r: 3 }} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};




// ============================================================================
// --- 3. MAIN SOURCE CHART ---
// ============================================================================

const MainSourceChart = ({ data }: { data: any[] }) => {
    const [isDark, setIsDark] = useState(false); 
    const [isMobile, setIsMobile] = useState(false); 

    useEffect(() => {
        const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        updateTheme(); 
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize(); window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); observer.disconnect(); };
    }, []);

    const labelMainColor = isDark ? '#ffffff' : '#0f172a'; 
    const labelSubColor  = isDark ? '#cbd5e1' : '#64748b'; 
    const lineColor      = isDark ? '#475569' : '#cbd5e1'; 
    const centerTitleColor = isDark ? '#ffffff' : '#0f172a'; 
    const centerSubColor   = isDark ? '#94a3b8' : '#64748b'; 

    const renderCustomizedLabel = (props: any) => {
        const { cx, cy, midAngle, outerRadius, percent, name, value } = props;
        const RADIAN = Math.PI / 180;
        // 🟢 අකුරු රවුමට මදක් ළං කර ඇත (1.15)
        const radius = outerRadius * 1.15; 
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                <tspan x={x} dy="-0.6em" fill={labelMainColor} fontSize="12px" fontWeight="900" className="uppercase tracking-wide">{name.split(' ')[0]}</tspan>
                <tspan x={x} dy="1.2em" fill={labelSubColor} fontSize="11px" fontWeight="700">{fmt(value)} kg <tspan fill={labelMainColor}>({(percent * 100).toFixed(0)}%)</tspan></tspan>
            </text>
        );
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl z-50">
                    <p className="font-bold text-slate-800 dark:text-white mb-1 text-[10px] uppercase tracking-wider">{payload[0].name}</p>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.color }}></div>
                        <span className="font-bold text-slate-900 dark:text-white">{fmt(payload[0].value)} kg</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="bg-white dark:bg-[#1b2130] p-4 sm:p-5 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col min-h-[450px] transform-gpu transition-colors duration-300">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-blue-500" /> Main Sources Breakdown
            </h3>
            
            <div className="flex-grow flex flex-col w-full h-full justify-center">
                {data.length === 0 ? (
                    <div className="flex items-center justify-center text-xs text-slate-500 w-full h-full">No data</div>
                ) : (
                    <>
                        {/* 🟢 Recharts අනිවාර්යයෙන්ම පෙන්වීම සඳහා h-[300px] යන ස්ථිර උස (Fixed Height) යොදා ඇත */}
                        <div className="relative w-full h-[300px] flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                {/* 🟢 Margin එක 40 ලෙස සකසා ඇත */}
                                <PieChart margin={isMobile ? { top: 10, right: 10, bottom: 10, left: 10 } : { top: 20, right: 40, bottom: 20, left: 40 }}>
                                    <Pie 
                                        data={data} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={80} 
                                        outerRadius={110} 
                                        paddingAngle={2} 
                                        dataKey="value" 
                                        /* 🟢 Mobile වලදී Labels අයින් කර ඇත */
                                        label={isMobile ? false : renderCustomizedLabel} 
                                        labelLine={isMobile ? false : { stroke: lineColor, strokeWidth: 1 }} 
                                        isAnimationActive={false}
                                    >
                                        {data.map((entry, index) => <Cell key={index} fill={entry.color} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                                <span className="text-2xl sm:text-3xl font-black leading-none tracking-tight" style={{ color: centerTitleColor }}>{fmt(totalValue)}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: centerSubColor }}>Total Kg</span>
                            </div>
                        </div>
                        
                        {/* 🟢 Mobile වලදී පමණක් යටින් පෙන්වන Legend එක */}
                        {isMobile && (
                            <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2 w-full px-2">
                                {data.map((entry, index) => {
                                    const percent = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[10px] font-bold uppercase truncate" style={{ color: labelMainColor }}>{entry.name.split(' ')[0]}</span>
                                                <span className="text-[11px] font-semibold truncate" style={{ color: labelSubColor }}>{fmt(entry.value)} kg <span style={{ color: entry.color }}>({percent}%)</span></span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};




// ============================================================================
// 4. SPECIFIC DEFECTS CHART COMPONENT (With Fixed Full-Screen Popup Modal)
// ============================================================================
const SpecificDefectsChart = ({ data }: { data: any[] }) => {
    const [selectedDefect, setSelectedDefect] = useState<any>(null);
    const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value)) : 1;

    return (
        <div className="relative bg-white dark:bg-[#1b2130] p-5 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col h-[450px] transform-gpu transition-colors duration-300">
            
            <h3 className="text-center text-rose-600 dark:text-rose-400 font-black tracking-widest uppercase mb-4 text-sm">Specific Defects</h3>
            
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3.5">
                {data.length === 0 ? (<div className="text-center text-xs text-slate-500 mt-10">No data available</div>) : (
                    data.map((item, index) => {
                        const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                        return (
                            <div key={index} onClick={() => setSelectedDefect(item)} className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1.5 -mx-1.5 rounded-xl transition-colors">
                                <div className="w-20 sm:w-24 flex-shrink-0 text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase break-words whitespace-normal leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {item.name}
                                </div>
                                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-[#2a3441] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(0,0,0,0.2)]" style={{ width: `${pct}%`, backgroundColor: item.color || '#94a3b8' }}></div>
                                </div>
                                <div className="flex flex-col items-end min-w-[45px] sm:min-w-[50px] flex-shrink-0 leading-tight">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white tracking-wide">{item.value.toFixed(1)}kg</span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{item.qty ? `${item.qty} Qty` : '0 Qty'}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 🟢 POPUP MODAL (createPortal භාවිතයෙන් රාමුවෙන් සම්පූර්ණයෙන්ම පිටතට ගෙන ඇත) */}
            {selectedDefect && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setSelectedDefect(null)} 
                >
                    <div 
                        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-[98%] sm:w-full sm:max-w-3xl max-h-[90vh] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transform-gpu animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#1b2130] flex-shrink-0">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">{selectedDefect.name} <span className="text-slate-400 dark:text-slate-500 font-bold text-xs ml-2">Breakdown</span></h3>
                                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Total: {selectedDefect.value} kg | {selectedDefect.qty} Qty</p>
                            </div>
                            <button onClick={() => setSelectedDefect(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"><X size={16} strokeWidth={3} /></button>
                        </div>
                        
                        <div className="p-3 overflow-hidden bg-white dark:bg-[#0f172a] flex flex-col flex-grow">
                            <div className="overflow-x-auto sm:overflow-x-hidden overflow-y-auto custom-scrollbar pr-1 h-full">
                                <table className="w-full text-left text-[11px] sm:text-xs sm:whitespace-normal whitespace-nowrap">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-[#1e293b] shadow-sm z-10 whitespace-nowrap">
                                        <tr>
                                            <th className="py-2.5 px-3 rounded-l-md font-bold text-slate-600 dark:text-slate-300">Date & Shift</th>
                                            <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300">Machine</th>
                                            <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300 w-full">Product Details</th>
                                            <th className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 text-right">Qty</th>
                                            <th className="py-2.5 px-3 rounded-r-md font-bold text-rose-600 dark:text-rose-400 text-right">Weight (Kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {selectedDefect.items?.map((it: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white whitespace-nowrap">{it.dateShift}</td>
                                                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{it.machine}</td>
                                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-normal min-w-[130px] leading-tight">{it.product}</td>
                                                <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white text-right bg-emerald-50/30 dark:bg-emerald-900/10 whitespace-nowrap">{it.qty}</td>
                                                <td className="py-2.5 px-3 font-black text-slate-800 dark:text-white text-right bg-rose-50/30 dark:bg-rose-900/10 whitespace-nowrap">{it.weight} kg</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body // 🟢 Modal එක body එකට attach කිරීම
            )}
            
        </div>
    );
};




// ============================================================================
// --- 5. TOP PRODUCTS CHART ---
// ============================================================================

const TopProductsChart = ({ data, maxVal }: { data: any[], maxVal: number }) => (
    <div className="bg-white dark:bg-[#1b2130] p-4 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col h-[450px] transform-gpu transition-colors duration-300">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-orange-500" /> Top Defective Items</h3>
        <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-3">
                {data.length === 0 ? (<div className="text-center text-xs text-slate-500 mt-10">No items found</div>) : data.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{index + 1}. {item.name}</span>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-slate-900 dark:text-white">{fmt(item.value)} kg</span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">({item.qty || 0} Qty)</span>
                            </div>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full transition-all duration-150 group-hover:bg-orange-400" style={{ width: `${(item.value / (maxVal || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);



// ============================================================================
// --- MAIN DASHBOARD WRAPPER ---
// ============================================================================

const QualityAnalysis = ({ data }: any) => {
    // 🟢 isSettingsLoading යන්න අලුතින් ලබා ගැනීම
    const { kpiData, dailyChartData, mainPieData, specificDefectsData, topItemsData, maxTopItemVal, isSettingsLoading } = useQualityAnalysisLogic(data);

    // 🟢 Data සහ Settings Load වන තුරු ලස්සන Loading එකක් පෙන්වීම
    if (isSettingsLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-10">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Chart Data...</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto overflow-x-auto custom-scrollbar pb-20 transform-gpu will-change-transform space-y-2 px-1">
            <KPICards data={kpiData} />
            
            {/* 🟢 Daily Trend Chart එකේ පළල අවම වශයෙන් 800px කර ඇත (ලොකු තිර වලදී 100% දිග හැරේ) */}
            <div className="min-w-[1300px] w-full">
                <DailyTrendChart data={dailyChartData} />
            </div>
            
            {/* 🟢 Chart 3ම එක පේළියට තැබීමට: flex, gap-4, සහ min-w-[1200px] යොදා ඇත. 
                එවිට කුඩා තිර වලදී පහළට නොවැටී Horizontal Scroll එකක් මගින් 3ම පේළියට පෙන්වයි. */}
            <div className="flex gap-4 mt-2 min-w-[1300px]">
                {/* 🟢 එක් එක් Chart එකට සමාන පළලක් (flex-1) ලබා දී ඇත */}
                <div className="flex-1 min-w-[350px]"><MainSourceChart data={mainPieData} /></div>
                <div className="flex-1 min-w-[350px]"><SpecificDefectsChart data={specificDefectsData} /></div>
                <div className="flex-1 min-w-[350px]"><TopProductsChart data={topItemsData} maxVal={maxTopItemVal} /></div>
            </div>
            
        </div>
    );
};

export default QualityAnalysis;