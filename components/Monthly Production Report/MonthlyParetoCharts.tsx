import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// 1. 🎨 THEME & COLOR CONFIGURATION 
// ============================================================================
const THEME = {
    cardBorder: "border-slate-200 dark:border-slate-700",
    tableRowBg: "bg-white dark:bg-slate-800",
    tableBorder: "border-slate-100 dark:border-slate-700",
    textMain: "text-slate-800 dark:text-slate-200",
    chartGrid: "rgba(148, 163, 184, 0.1)",
    chartTick: "#94a3b8",
    tooltipBg: "bg-white dark:bg-slate-800",

    // --- IM Machine Theme ---
    imHeaderBg: "bg-gradient-to-r from-emerald-600 to-teal-600",
    imTableHead: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
    imBarHex: "#10b981", 
    imLineHex: "#f97316", 
    imTextBar: "text-emerald-600 dark:text-emerald-400",
    imTextLine: "text-amber-600 dark:text-orange-500",

    // --- BM Machine Theme ---
    bmHeaderBg: "bg-gradient-to-r from-amber-500 to-orange-500",
    bmTableHead: "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
    bmBarHex: "#f59e0b", 
    bmLineHex: "#dc2626", 
    bmTextBar: "text-amber-600 dark:text-amber-400",
    bmTextLine: "text-rose-600 dark:text-red-500",
};

interface ChartProps {
    breakdownData: any;
    REASONS: string[];
}

// 🟢 Helper Function (Component එකෙන් එළියට ගෙන ඇත)
const formatChartVal = (val: number) => {
    if (val === undefined || val === null) return "0";
    return Number.isInteger(val) ? val.toString() : Number(val.toFixed(1)).toString();
};

// ============================================================================
// 🟢 2. CHART BLOCK COMPONENT (වෙනම Component එකක් ලෙස සකසා ඇත)
// (මෙමඟින් Chart එක එකපාරට Draw වී නැති වී යන ගැටලුව 100% ක් විසඳේ)
// ============================================================================
const ParetoChartBlock = React.memo(({ title, data, type }: { title: string, data: any[], type: 'IM' | 'BM' }) => {
    const isIM = type === 'IM';
    const barColor = isIM ? THEME.imBarHex : THEME.bmBarHex;
    const lineColor = isIM ? THEME.imLineHex : THEME.bmLineHex;
    const headerBg = isIM ? THEME.imHeaderBg : THEME.bmHeaderBg;
    const tableHeadBg = isIM ? THEME.imTableHead : THEME.bmTableHead;
    const textBar = isIM ? THEME.imTextBar : THEME.bmTextBar;
    const textLine = isIM ? THEME.imTextLine : THEME.bmTextLine;

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border-2 shadow-lg overflow-hidden transform-gpu will-change-transform ${THEME.cardBorder}`}>
            <div className={`text-white px-4 py-3 font-bold text-sm uppercase tracking-wider ${headerBg}`}>
                {title}
            </div>
            
            {/* 🟢 items-stretch එකතු කර ඇත */}
            <div className="p-4 flex flex-col lg:flex-row gap-6 items-stretch">
                {/* SIDE TABLE */}
                <div className="lg:w-1/3">
                    <table className="w-full text-xs border-collapse">
                        <thead className={`sticky top-0 z-10 ${tableHeadBg}`}>
                            <tr>
                                <th className="p-2 text-left font-black uppercase tracking-wider">Reason</th>
                                <th className="p-2 text-right font-black uppercase tracking-wider">KG</th>
                                <th className="p-2 text-right font-black uppercase tracking-wider">%</th>
                                <th className="p-2 text-right font-black uppercase tracking-wider">Cum %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row: any, i: number) => (
                                <tr key={i} className={`border-b transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${THEME.tableRowBg} ${THEME.tableBorder} ${THEME.textMain}`}>
                                    <td className="p-2 font-medium truncate max-w-[120px]" title={row.name}>{row.name}</td>
                                    <td className="p-2 text-right font-bold">{row.kg.toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${textBar}`}>{row.pkg.toFixed(1)}%</td>
                                    <td className={`p-2 text-right font-black ${textLine}`}>{row.cumulativePkg.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* THE CHART */}
                {/* 🟢 h-[500px] ඉවත් කර flex, flex-col සහ min-h-[400px] යොදා ඇත */}
                <div className="lg:w-2/3 flex flex-col min-h-[400px] overflow-x-auto custom-scrollbar transform-gpu">
                    {/* 🟢 h-full වෙනුවට flex-1 යොදා ඇත. එවිට මෙය Table එකේ උසට සමානව ඇදේ. */}
                    <div className="min-w-[600px] flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            
                            <ComposedChart data={data} margin={{ top: 20, right: 40, left: 0, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME.chartGrid} />
                                
                                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: THEME.chartTick, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" stroke={barColor} label={{ value: 'KG', angle: -90, position: 'insideLeft', fill: barColor, fontSize: 12, fontWeight: 'bold' }} tick={{ fill: THEME.chartTick, fontSize: 10 }} tickFormatter={formatChartVal} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke={lineColor} domain={[0, 100]} label={{ value: 'Cum %', angle: 90, position: 'insideRight', fill: lineColor, fontSize: 12, fontWeight: 'bold' }} tick={{ fill: THEME.chartTick, fontSize: 10 }} tickFormatter={formatChartVal} axisLine={false} tickLine={false} />
                                
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #334155', fontWeight: 'bold' }} 
                                    formatter={(value: number) => formatChartVal(value)}
                                    labelStyle={{ color: '#64748b', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                                
                                {/* 🟢 isAnimationActive={false} කිරීම මඟින් අනවශ්‍ය ලෙස Animate වීම නතර වේ */}
                                <Bar isAnimationActive={false} yAxisId="left" dataKey="kg" fill={barColor} name="Loss (KG)" barSize={25} radius={[4, 4, 0, 0]} />
                                <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="cumulativePkg" stroke={lineColor} name="Cumulative %" strokeWidth={3} dot={{ fill: lineColor, r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
});

// ============================================================================
// 3. 🚀 MAIN COMPONENT
// ============================================================================
const MonthlyParetoCharts: React.FC<ChartProps> = ({ breakdownData, REASONS }) => {

    const { imChartData, bmChartData } = useMemo(() => {
        // --- IM Data ---
        const paretoIMData = REASONS.map(r => ({ name: r, kg: breakdownData[r]?.im || 0 })).sort((a, b) => b.kg - a.kg);
        const totalIMKg = paretoIMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeIM = 0;
        const imData = paretoIMData.map(item => {
            cumulativeIM += item.kg;
            return { 
                ...item, 
                cumulativePkg: totalIMKg > 0 ? (cumulativeIM / totalIMKg) * 100 : 0, 
                pkg: totalIMKg > 0 ? (item.kg / totalIMKg) * 100 : 0 
            };
        });

        // --- BM Data ---
        const paretoBMData = REASONS.map(r => ({ name: r, kg: breakdownData[r]?.bm || 0 })).sort((a, b) => b.kg - a.kg);
        const totalBMKg = paretoBMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeBM = 0;
        const bmData = paretoBMData.map(item => {
            cumulativeBM += item.kg;
            return { 
                ...item, 
                cumulativePkg: totalBMKg > 0 ? (cumulativeBM / totalBMKg) * 100 : 0, 
                pkg: totalBMKg > 0 ? (item.kg / totalBMKg) * 100 : 0 
            };
        });

        return { imChartData: imData, bmChartData: bmData };
    }, [breakdownData, REASONS]);

    return (
        <div className="space-y-8 animate-fade-in transform-gpu">
            <ParetoChartBlock title="📊 IM Machine - Loss Reason Analysis" data={imChartData} type="IM" />
            <ParetoChartBlock title="📊 BM Machine - Loss Reason Analysis" data={bmChartData} type="BM" />
        </div>
    );
};

export default MonthlyParetoCharts;


