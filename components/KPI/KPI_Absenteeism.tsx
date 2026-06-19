import React, { useState, useEffect, useCallback } from 'react';
import { 
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { motion } from 'framer-motion';
import { Users, Target } from 'lucide-react';
import { useAbsenteeismLogic } from './useAbsenteeismLogic';

// ============================================================================
// 🎨 1. THEME CONFIGURATION
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

// ============================================================================
// ⚡ 2. EXCEL-LIKE EDITABLE CELL
// ============================================================================
const EditableCellAbs = React.memo(({ value, onChange, id, colorClass, onNavigate, readOnly }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value?.toString() || '');

    useEffect(() => { if (!isEditing) setTempValue(value?.toString() || ''); }, [value, isEditing]);

    const finishEdit = useCallback(() => {
        setIsEditing(false);
        const finalVal = Math.max(0, Number(tempValue) || 0); 
        if (finalVal.toString() !== (value?.toString() || '0')) onChange(finalVal.toString());
    }, [tempValue, value, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
        if (e.key === 'Enter') finishEdit(); 
        else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            finishEdit();
            if(onNavigate) onNavigate(e.key, id);
        }
    };

    if (isEditing) {
        return (
            <input 
                id={id} type="number" autoFocus min="0" step="any"
                className={`w-full h-full min-w-0 min-h-[28px] p-0 m-0 text-center outline-none text-[10px] font-black rounded appearance-none ${THEME.inputEditBg} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                value={tempValue} onChange={(e) => setTempValue(e.target.value)} 
                onBlur={finishEdit} onKeyDown={handleKeyDown} 
            />
        );
    }

    const hasValue = value > 0;
    return (
        <div 
            id={id} onClick={() => { if (!readOnly) setIsEditing(true); }} 
            className={`w-full h-full min-w-0 min-h-[28px] flex items-center justify-center tabular-nums rounded transition-colors ${hasValue ? colorClass : THEME.textMuted} ${!readOnly ? THEME.inputViewBg : 'cursor-default opacity-80'}`}
        >
            {hasValue ? <span className="text-[11px] font-black">{Number(value).toFixed(0)}</span> : '-'}
        </div>
    );
});

// ============================================================================
// 📊 3. OPTIMIZED CHART COMPONENT (Dynamic Width + Lines Only)
// ============================================================================
const AbsenteeismChart = React.memo(({ data, globalTarget }: any) => {
    
    // Dynamic width for scrollbar
    const dynamicWidth = Math.max(800, data.length * 40);
    
    const maxPer = Math.max(...data.map((d: any) => Math.max(d.cumPerA, d.cumPerB)), globalTarget, 5);
    const yDomain = [0, Math.ceil(maxPer * 1.2)]; 

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
                            <span className="font-black" style={{ color: entry.color }}>{val.toFixed(1)}%</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`p-4 rounded-3xl border shadow-lg h-[400px] transform-gpu will-change-transform ${THEME.cardBg} ${THEME.cardBorder}`}>
            <div className="overflow-x-auto custom-scrollbar h-full w-full transform-gpu">
                <div style={{ minWidth: `${dynamicWidth}px` }} className="h-full pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                            
                           {/* 🟢 tickCount={6} ලබා දීමෙන් Y අක්ෂයේ අගයන් සමාන පරතර 5කින් අලංකාරව බෙදී යයි */}
                           <YAxis yAxisId="left" domain={yDomain} tickCount={6} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => `${val}%`} />


                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />

                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerA" name="Cu. Absent % (A)" stroke={THEME.shiftA.hex} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} />
                            <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="cumPerB" name="Cu. Absent % (B)" stroke={THEME.shiftB.hex} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} />
                            
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
const KPIAbsenteeism: React.FC<{ data: any, startDate: string, endDate: string, readOnly?: boolean }> = ({ data, startDate, endDate, readOnly }) => {
  
  const logic = useAbsenteeismLogic(startDate, endDate);
  const absData = logic.absData;
  const settings = logic.settings;
  const updateSetting = logic.updateSetting;
  const handleSave = logic.handleSave;
  const metrics: any = logic.metrics; 

  const [globalTargetVal, setGlobalTargetVal] = useState<string | number>('');

  useEffect(() => {
      setGlobalTargetVal(settings.targetAbsentPer);
  }, [settings.targetAbsentPer]);

  // 🟢 Arrow Navigation (Up/Down/Left/Right)
  const handleCellNavigate = useCallback((key: string, currentId: string) => {
      const parts = currentId.split('_'); // format: abs_A_absent_0
      if (parts.length !== 4) return;
      const shift = parts[1];
      let field = parts[2];
      let idx = parseInt(parts[3]);
      
      if (key === 'ArrowRight') idx++;
      if (key === 'ArrowLeft') idx--;
      if (key === 'ArrowDown' && field === 'absent') field = 'allocated';
      if (key === 'ArrowUp' && field === 'allocated') field = 'absent';
      
      const nextId = `abs_${shift}_${field}_${idx}`;
      const nextEl = document.getElementById(nextId);
      if (nextEl) nextEl.click(); 
  }, []);

  const getColumnWidth = () => {
      const count = metrics.chartData.length;
      if (count <= 7) return 'min-w-[75px] max-w-[75px]';  
      if (count <= 15) return 'min-w-[60px] max-w-[60px]'; 
      return 'min-w-[52px] max-w-[52px]';                  
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
          <Users className="text-purple-500" /> Absenteeism Analytics
        </h2>
        <div className="flex gap-3">
        <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                <Target size={14} className="text-rose-500 ml-2" />
                <span className={`text-[9px] font-black uppercase ${THEME.textMuted}`}>Target Absent (%)</span>
                <input disabled={readOnly} type="number" value={globalTargetVal} onChange={(e) => { setGlobalTargetVal(e.target.value); updateSetting('targetAbsentPer', e.target.value); }} onKeyDown={(e)=> {if(e.key === 'Enter') e.currentTarget.blur()}} className={`bg-slate-50 dark:bg-slate-800 text-center font-black outline-none rounded py-1 w-14 text-xs mr-1 ${THEME.textMain} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
        </div>
      </div>

      {/* CHART */}
      <AbsenteeismChart data={metrics.chartData} globalTarget={Number(globalTargetVal) || 0} />

      {/* TABLES */}
      <div className="space-y-6">
          {['A', 'B'].map((shiftLetter) => {
              const shift = shiftLetter === 'A' ? 'shiftA' : 'shiftB';
              const theme = shiftLetter === 'A' ? THEME.shiftA : THEME.shiftB;
              
              return (
                  <div key={shiftLetter} className={`rounded-3xl border shadow-lg overflow-hidden transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
                      <div className={`${theme.bg} px-4 py-2 border-b flex justify-start items-center gap-3 ${THEME.cardBorder}`}>
                          <div className={`p-1.5 rounded-lg text-white shadow-sm bg-${shiftLetter === 'A' ? 'indigo' : 'amber'}-500`}><Users size={14} /></div>
                          <h3 className={`text-sm font-black uppercase tracking-widest ${theme.text}`}>SHIFT {shiftLetter} LOG</h3>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                          <div className="min-w-max pb-2">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className={`border-b-[2px] ${theme.border} ${THEME.tableHeadBg}`}>
                                          <StickyLeft className={`${THEME.tableHeadBg} min-w-[150px] text-[9px] font-black uppercase ${THEME.textMuted}`}>Parameter</StickyLeft>
                                          {metrics.chartData.map((d: any) => (
                                              <th key={d.fullDate} className={`py-1 text-center border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  <div className={`text-[10px] font-black ${THEME.textMain}`}>{d.date}</div>
                                              </th>
                                          ))}
                                          <StickyRight className={`${THEME.tableHeadBg} text-[10px] uppercase ${theme.text}`}>Total</StickyRight>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {/* 1. No of absent (EDITABLE) */}
                                      <tr className={`border-b ${THEME.cardBorder} ${theme.bg}`}>
                                          <StickyLeft className={`${theme.bg} text-[10px] font-black ${theme.text}`}>No Of Absent</StickyLeft>
                                          {metrics.dates.map((date: string, i: number) => (
                                              <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  <EditableCellAbs id={`abs_${shiftLetter}_absent_${i}`} value={absData[date]?.[shift]?.absent} onChange={(v: string) => handleSave(date, shift as any, 'absent', v)} colorClass={theme.text} onNavigate={handleCellNavigate} readOnly={readOnly} />
                                              </td>
                                          ))}
                                          <StickyRight className={`${theme.bg} ${theme.text}`}>{metrics.grandTotals[`absent${shiftLetter}`]}</StickyRight>
                                      </tr>
                                      
                                      {/* 2. No of Employees Allocated (EDITABLE) */}
                                      <tr className={`border-b-[2px] ${THEME.cardBorder} ${theme.bg}`}>
                                          <StickyLeft className={`${theme.bg} text-[10px] font-black ${theme.text}`}>Emp. Allocated</StickyLeft>
                                          {metrics.dates.map((date: string, i: number) => (
                                              <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  <EditableCellAbs id={`abs_${shiftLetter}_allocated_${i}`} value={absData[date]?.[shift]?.allocated} onChange={(v: string) => handleSave(date, shift as any, 'allocated', v)} colorClass={theme.text} onNavigate={handleCellNavigate} readOnly={readOnly} />
                                              </td>
                                          ))}
                                          <StickyRight className={`${theme.bg} ${theme.text}`}>{metrics.grandTotals[`alloc${shiftLetter}`]}</StickyRight>
                                      </tr>

                                      {/* 3. Absent % */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Absent %</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`per${shiftLetter}`]} isPercentage />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>-</StickyRight>
                                      </tr>
                                      
                                      {/* 4. Cu Absent % */}
                                      <tr className={THEME.tableRowHover}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu. Absent %</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`cumPer${shiftLetter}`]} isPercentage />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMain}`}>{metrics.grandTotals[`cumPer${shiftLetter}`]?.toFixed(2)}%</StickyRight>
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

export default KPIAbsenteeism;