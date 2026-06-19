import React, { useState, useEffect, useCallback } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { motion } from 'framer-motion';
import { XCircle, Target } from 'lucide-react';
import { useRejectionsLogic } from './useRejectionsLogic';

// ============================================================================
// 🎨 1. THEME CONFIGURATION (වර්ණ වෙනස් කිරීමට මෙතැනින් හැක)
// ============================================================================
const THEME = {
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200 dark:border-slate-800",
    textMain: "text-slate-800 dark:text-white",
    textMuted: "text-slate-500 dark:text-slate-400",
    
    tableHeadBg: "bg-slate-100 dark:bg-slate-900",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
    tableBorder: "border-slate-200 dark:border-slate-800",

    inputViewBg: "hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-text",
    inputEditBg: "bg-yellow-50 dark:bg-yellow-900/30 text-slate-900 dark:text-white ring-2 ring-indigo-500",

    shiftA: { hex: '#6366f1', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500' },
    shiftB: { hex: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' },

    targetLine: '#ef4444' 
};

// 📊 Chart Specific Colors (අලුත් Lines 4 සඳහා පමණි)
const CHART_COLORS = {
    lineA_IM: '#3b82f6', // Bright Blue (Shift A - IM)
    lineA_BM: '#6366f1', // Indigo (Shift A - BM)
    lineB_IM: '#f97316', // Bright Orange (Shift B - IM)
    lineB_BM: '#f59e0b', // Amber (Shift B - BM)
};

// ============================================================================
// ⚡ 2. AUTO REJECTION CELL (පෙර තිබූ Editable Cell එක වෙනුවට)
// ============================================================================
const AutoRejCell = React.memo(({ value, percentage, colorClass, target }: any) => {
    const hasValue = Number(value) > 0;
    const isOverTarget = percentage > target;

    return (
        <div className={`w-full h-full min-w-0 min-h-[36px] flex flex-col items-center justify-center tabular-nums rounded ${hasValue ? colorClass : THEME.textMuted}`}>
            {hasValue ? (
                <>
                    <span className="text-[11px] font-black leading-none">{Number(value).toFixed(1)}</span>
                    <span className={`text-[8px] font-bold mt-0.5 leading-none ${isOverTarget ? 'text-rose-500 dark:text-rose-400' : 'opacity-60'}`}>
                        ({Number(percentage).toFixed(1)}%)
                    </span>
                </>
            ) : '-'}
        </div>
    );
});


// ============================================================================
// 📊 3. OPTIMIZED CHART COMPONENT (4 Lines, 1 Target Line)
// ============================================================================
const RejectionsChart = React.memo(({ data, globalTarget }: any) => {
    
    // Y අක්ෂයේ උපරිම අගය ස්වයංක්‍රීයව සකසා ගැනීමට
    const maxPer = Math.max(
        ...data.map((d: any) => Math.max(d.cumPerA_IM, d.cumPerA_BM, d.cumPerB_IM, d.cumPerB_BM)),
        globalTarget,
        2 // අවම වශයෙන් 2% ක් දක්වා පෙන්වීමට
    );
    const yDomain = [0, Math.ceil(maxPer * 1.2)]; // චාට් එකට උඩින් පොඩි ඉඩක් තැබීමට (20% headroom)

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-xs">
                <div className="mb-1.5 text-[10px] font-black text-slate-500 uppercase">Day {label}</div>
                {payload.map((entry: any, i: number) => {
                    const val = Number(entry.value);
                    return (
                        <div key={i} className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: entry.color }}></span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{entry.name}:</span>
                            <span className="font-black" style={{ color: entry.color }}>
                                {val.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const dynamicWidth = Math.max(800, data.length * 40); 

return (
    <div className={`p-4 rounded-3xl border shadow-lg h-[400px] transform-gpu will-change-transform ${THEME.cardBg} ${THEME.cardBorder}`}>
        <div className="overflow-x-auto custom-scrollbar h-full w-full transform-gpu">
            {/* 🟢 ස්ථිර පළල ඉවත් කර, අලුත් dynamicWidth එක style එකක් ලෙස දී ඇත */}
            <div style={{ minWidth: `${dynamicWidth}px` }} className="h-full pr-4">
                <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                            
                            {/* සියලුම අගයන් % නිසා එක Y අක්ෂයක් පමණක් යොදා ඇත */}
                            <YAxis yAxisId="left" domain={yDomain} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => `${val}%`} />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />

                            {/* --- 4 LINES (IM & BM for Shift A & B) --- */}
                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerA_IM" name="Cu. Rej IM (A)" stroke={CHART_COLORS.lineA_IM} strokeWidth={2.5} dot={{r: 3, fill: '#fff', strokeWidth: 2}} />
                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerA_BM" name="Cu. Rej BM (A)" stroke={CHART_COLORS.lineA_BM} strokeWidth={2.5} dot={{r: 3, fill: '#fff', strokeWidth: 2}} />
                            
                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerB_IM" name="Cu. Rej IM (B)" stroke={CHART_COLORS.lineB_IM} strokeWidth={2.5} dot={{r: 3, fill: '#fff', strokeWidth: 2}} />
                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerB_BM" name="Cu. Rej BM (B)" stroke={CHART_COLORS.lineB_BM} strokeWidth={2.5} dot={{r: 3, fill: '#fff', strokeWidth: 2}} />
                            
                            {/* Target Line */}
                            {globalTarget > 0 && <ReferenceLine yAxisId="left" y={globalTarget} stroke={THEME.targetLine} strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});

// ============================================================================
// 🖥️ 4. MAIN UI COMPONENT
// ============================================================================
const KPIRejections: React.FC<{ data: any, startDate: string, endDate: string }> = ({ data, startDate, endDate }) => {
  
    const logic = useRejectionsLogic(startDate, endDate, data);
    // 🟢 පරණ handleSave, rejData ඉවත් කර ඇත
    const settings = logic.settings;
    const updateSetting = logic.updateSetting;
    const metrics: any = logic.metrics; 
  
    const [globalTargetVal, setGlobalTargetVal] = useState<string | number>('');
  
    useEffect(() => {
        setGlobalTargetVal(settings.targetRejPer);
    }, [settings.targetRejPer]);
  
  

  const getColumnWidth = () => {
      const count = metrics.chartData.length;
      if (count <= 7) return 'w-[75px] min-w-[75px] max-w-[75px]';  
      if (count <= 15) return 'w-[60px] min-w-[60px] max-w-[60px]'; 
      return 'w-[52px] min-w-[52px] max-w-[52px]';                  
  };
  const colWidthClass = getColumnWidth();

  // --- Helper Table Components ---
  const StickyLeft = ({ children, className }: any) => (
      <td className={`py-1.5 px-3 sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${THEME.cardBorder} ${className}`}>{children}</td>
  );
  const StickyRight = ({ children, className }: any) => (
      <td className={`py-1.5 px-2 sticky right-0 z-20 border-l font-black text-center min-w-[70px] ${THEME.cardBorder} ${className}`}>{children}</td>
  );
  const DisplayCell = ({ value, isDecimal = false, isPercentage = false }: any) => (
      <td className={`p-1 text-center text-[10px] font-bold border-r ${colWidthClass} ${THEME.textMuted} ${THEME.cardBorder}`}>
          {value === 0 ? '-' : (
              <span className={isPercentage && value > Number(globalTargetVal) ? 'text-rose-500' : ''}>
                  {isDecimal || isPercentage ? value.toFixed(2) : value.toFixed(0)}
                  {isPercentage && '%'}
              </span>
          )}
      </td>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 w-full animate-fade-in transform-gpu">
      
      {/* HEADER & SETTINGS */}
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 rounded-3xl border shadow-sm gap-4 ${THEME.cardBg} ${THEME.cardBorder}`}>
        <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${THEME.textMain}`}>
          <XCircle className="text-rose-500" /> Rejections Analytics
        </h2>
        <div className="flex gap-3">
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                <Target size={14} className="text-rose-500 ml-2" />
                <span className={`text-[9px] font-black uppercase ${THEME.textMuted}`}>Target Rej (%)</span>
                <input type="number" value={globalTargetVal} onChange={(e) => { setGlobalTargetVal(e.target.value); updateSetting('targetRejPer', e.target.value); }} onKeyDown={(e)=> {if(e.key === 'Enter') e.currentTarget.blur()}} className={`bg-slate-50 dark:bg-slate-800 text-center font-black outline-none rounded py-1 w-14 text-xs mr-1 ${THEME.textMain}`} />
            </div>
        </div>
      </div>

      {/* CHART */}
      <RejectionsChart data={metrics.chartData} globalTarget={Number(globalTargetVal) || 0} />

      {/* TABLES */}
      <div className="space-y-6">
          {['A', 'B'].map((shiftLetter) => {
              const shift = shiftLetter === 'A' ? 'shiftA' : 'shiftB';
              const theme = shiftLetter === 'A' ? THEME.shiftA : THEME.shiftB;
              
              return (
                  <div key={shiftLetter} className={`rounded-3xl border shadow-lg overflow-hidden transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
                      <div className={`${theme.bg} px-4 py-2 border-b flex justify-start items-center gap-3 ${THEME.cardBorder}`}>
                          <div className={`p-1.5 rounded-lg text-white shadow-sm bg-${shiftLetter === 'A' ? 'indigo' : 'amber'}-500`}><XCircle size={14} /></div>
                          <h3 className={`text-sm font-black uppercase tracking-widest ${theme.text}`}>SHIFT {shiftLetter} LOG</h3>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                          <div className="min-w-max pb-2">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className={`border-b-[2px] ${theme.border} ${THEME.tableHeadBg}`}>
                                          <StickyLeft className={`${THEME.tableHeadBg} min-w-[140px] text-[9px] font-black uppercase ${THEME.textMuted}`}>Parameter</StickyLeft>


                                          {/* 🟢 d.date වෙනුවට d.fullDate යොදා ඇත */}
                                            {metrics.chartData.map((d: any) => (
                                                <th key={d.fullDate} className={`py-1 text-center border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                    <div className={`text-[10px] font-black ${THEME.textMain}`}>{d.date}</div>
                                                </th>
                                            ))}

                                          <StickyRight className={`${THEME.tableHeadBg} text-[10px] uppercase ${theme.text}`}>Total</StickyRight>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {/* 1. Production Kg IM */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Production (IM)</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`prod${shiftLetter}_IM`]} />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMain}`}>{metrics.grandTotals[`prod${shiftLetter}_IM`]?.toFixed(0)}</StickyRight>
                                      </tr>

                                      {/* 2. Rejection Kg IM / Rej % IM (AUTO) */}
                                      <tr className={`border-b ${THEME.cardBorder} ${theme.bg}`}>
                                          <StickyLeft className={`${theme.bg} text-[10px] font-black ${theme.text}`}>Rejection IM</StickyLeft>
                                          {metrics.dates.map((date: string, i: number) => {
                                              const dData = metrics.chartData[i];
                                              return (
                                              <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  {/* 🟢 AutoRejCell යොදා ඇත */}
                                                  <AutoRejCell 
                                                      value={dData[`rej${shiftLetter}_IM`]} 
                                                      percentage={dData[`per${shiftLetter}_IM`]} 
                                                      colorClass={theme.text} 
                                                      target={Number(globalTargetVal)} 
                                                  />
                                              </td>
                                          )})}
                                          <StickyRight className={`${theme.bg} ${theme.text}`}>
                                              <div className="flex flex-col"><span className="text-[11px]">{metrics.grandTotals[`rej${shiftLetter}_IM`]?.toFixed(1)}</span><span className="text-[8px] opacity-60">({metrics.grandTotals[`cumPer${shiftLetter}_IM`]?.toFixed(1)}%)</span></div>
                                          </StickyRight>
                                      </tr>

                                      
                                      {/* 3. Production Kg BM */}
                                      <tr className={`border-b-[2px] ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Production (BM)</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`prod${shiftLetter}_BM`]} />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMain}`}>{metrics.grandTotals[`prod${shiftLetter}_BM`]?.toFixed(0)}</StickyRight>
                                      </tr>

                                      {/* 4. Rejection Kg BM / Rej % BM (AUTO) */}
                                      <tr className={`border-b ${THEME.cardBorder} ${theme.bg}`}>
                                          <StickyLeft className={`${theme.bg} text-[10px] font-black ${theme.text}`}>Rejection BM</StickyLeft>
                                          {metrics.dates.map((date: string, i: number) => {
                                              const dData = metrics.chartData[i];
                                              return (
                                              <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  {/* 🟢 AutoRejCell යොදා ඇත */}
                                                  <AutoRejCell 
                                                      value={dData[`rej${shiftLetter}_BM`]} 
                                                      percentage={dData[`per${shiftLetter}_BM`]} 
                                                      colorClass={theme.text} 
                                                      target={Number(globalTargetVal)} 
                                                  />
                                              </td>
                                          )})}
                                          <StickyRight className={`${theme.bg} ${theme.text}`}>
                                              <div className="flex flex-col"><span className="text-[11px]">{metrics.grandTotals[`rej${shiftLetter}_BM`]?.toFixed(1)}</span><span className="text-[8px] opacity-60">({metrics.grandTotals[`cumPer${shiftLetter}_BM`]?.toFixed(1)}%)</span></div>
                                          </StickyRight>
                                      </tr>
                                      

                                      {/* 5. Cu Rejection % IM */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu. Rej % (IM)</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`cumPer${shiftLetter}_IM`]} isPercentage />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>-</StickyRight>
                                      </tr>
                                      
                                      {/* 6. Cu Rejection % BM */}
                                      <tr className={THEME.tableRowHover}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu. Rej % (BM)</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`cumPer${shiftLetter}_BM`]} isPercentage />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>-</StickyRight>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>
    </motion.div>
  );
};

export default KPIRejections;