import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { motion } from 'framer-motion';
import { Droplets, Target } from 'lucide-react';
import { useWaterLogic } from './useWaterLogic';

// ============================================================================
// 🎨 1. THEME CONFIGURATION (Electricity Theme Colors)
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

    // Shift A (Indigo/Blue)
    shiftA: { 
        name: 'Shift-A', hex: '#6366f1', 
        bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500' 
    },
    // Shift B (Amber/Orange)
    shiftB: { 
        name: 'Shift-B', hex: '#f59e0b', 
        bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' 
    },

    targetLine: '#ef4444' 
};

// ============================================================================
// ⚡ 2. EXCEL-LIKE EDITABLE CELL (No Negative Values, Fixed Sync Delay, Delete Key)
// ============================================================================
const EditableCell = React.memo(({ value, onChange, id, colorClass, onNavigate, readOnly }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value?.toString() || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { 
        if (!isEditing) {
            setTempValue(value?.toString() || ''); 
            setIsSaving(false);
        }
    }, [value]);

    const finishEdit = useCallback(() => {
        setIsEditing(false);
        const finalVal = Math.max(0, Number(tempValue) || 0); 
        if (finalVal.toString() !== (value?.toString() || '0')) {
            setIsSaving(true);
            onChange(finalVal.toString());
        } else {
            setTempValue(value?.toString() || '');
        }
    }, [tempValue, value, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
            e.preventDefault();
        }
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            setTempValue('');
            setIsSaving(true);
            onChange('');
            setIsEditing(false);
        }
        else if (e.key === 'Enter') {
            finishEdit(); 
        } 
        else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            finishEdit();
            if(onNavigate) onNavigate(e.key, id);
        }
    };

    if (isEditing) {
        return (
            <input 
                id={id} type="number" autoFocus min="0" step="any"
                className={`w-full h-full min-w-0 min-h-[24px] p-0 m-0 text-center outline-none text-[10px] font-black rounded appearance-none ${THEME.inputEditBg} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                value={tempValue} onChange={(e) => setTempValue(e.target.value)} 
                onBlur={finishEdit} onKeyDown={handleKeyDown} 
            />
        );
    }

    const displayValue = isSaving ? tempValue : value;
    const hasValue = displayValue !== undefined && displayValue !== null && displayValue !== '' && Number(displayValue) > 0;
    
    return (
        <div 
            id={id} onClick={() => { if (!readOnly) setIsEditing(true); }} 
            className={`w-full h-full min-w-0 min-h-[24px] overflow-hidden flex items-center justify-center text-[10px] font-bold tabular-nums rounded transition-colors ${hasValue ? colorClass : THEME.textMuted} ${!readOnly ? THEME.inputViewBg : 'cursor-default opacity-80'}`}
        >
            {hasValue ? displayValue : '-'}
        </div>
    );
});

// ============================================================================
// 📊 3. OPTIMIZED CHART COMPONENT
// ============================================================================
const WaterChart = React.memo(({ data, globalTarget }: any) => {
    const maxUsageRaw = Math.max(...data.map((d: any) => Math.max(d.ltrA, d.ltrB)), 1000);
    const maxUsage = Math.ceil((maxUsageRaw * 1.15) / 500) * 500; 

    const maxEffRaw = Math.max(...data.map((d: any) => Math.max(d.cumLtrPerKgA, d.cumLtrPerKgB)), globalTarget, 5);
    const maxEff = Math.ceil((maxEffRaw * 1.2) / 2) * 2; 

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-xs">
                <div className="mb-1.5 text-[10px] font-black text-slate-500 uppercase">Day {label}</div>
                {payload.map((entry: any, i: number) => {
                    const val = Number(entry.value);
                    const displayVal = Number.isInteger(val) ? val : val.toFixed(1);
                    return (
                        <div key={i} className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: entry.color }}></span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{entry.name}:</span>
                            <span className="font-black" style={{ color: entry.color }}>{displayVal}</span>
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
                        <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                        <defs>
                                <linearGradient id="barGradWA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                </linearGradient>
                                <linearGradient id="barGradWB" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.4}/>
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                            
                            <YAxis yAxisId="left" domain={[0, maxUsage]} tickCount={6} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, maxEff]} tickCount={6} tick={{ fontSize: 10, fill: THEME.targetLine }} axisLine={false} tickLine={false} width={45} />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />

                            <Bar isAnimationActive={false} yAxisId="left" dataKey="ltrA" name="Usage A (Ltr)" fill="url(#barGradWA)" radius={[3, 3, 0, 0]} barSize={12} />
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="ltrB" name="Usage B (Ltr)" fill="url(#barGradWB)" radius={[3, 3, 0, 0]} barSize={12} />
                            
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="cumLtrPerKgA" name="Cu. Ltr/Kg (A)" stroke={THEME.shiftA.hex} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} />
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="cumLtrPerKgB" name="Cu. Ltr/Kg (B)" stroke={THEME.shiftB.hex} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} />
                            
                            {globalTarget > 0 && <ReferenceLine yAxisId="right" y={globalTarget} stroke={THEME.targetLine} strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />}
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
const KPIWater: React.FC<{ data: any, startDate: string, endDate: string, readOnly?: boolean }> = ({ data, startDate, endDate, readOnly }) => {
  
  const logic = useWaterLogic(startDate, endDate, data);
  const waterData = logic.waterData;
  const settings = logic.settings;
  const updateSetting = logic.updateSetting;
  const handleSave = logic.handleSave;
  const metrics: any = logic.metrics; 

  const [globalTargetVal, setGlobalTargetVal] = useState<string | number>('');

  useEffect(() => {
      setGlobalTargetVal(settings.targetLtrPerKg);
  }, [settings.targetLtrPerKg]);

  const handleCellNavigate = useCallback((key: string, currentId: string) => {
      const parts = currentId.split('_'); 
      if (parts.length !== 3) return;
      const shift = parts[1];
      let idx = parseInt(parts[2]);
      
      if (key === 'ArrowRight') idx++;
      if (key === 'ArrowLeft') idx--;
      
      const nextId = `water_${shift}_${idx}`;
      const nextEl = document.getElementById(nextId);
      if (nextEl) nextEl.click(); 
  }, []);

  const getColumnWidth = () => {
      const count = metrics.chartData.length;
      if (count <= 7) return 'w-[70px] min-w-[70px] max-w-[70px]';  
      if (count <= 15) return 'w-[55px] min-w-[55px] max-w-[55px]'; 
      return 'w-[48px] min-w-[48px] max-w-[48px]';                  
  };
  const colWidthClass = getColumnWidth();

  // --- Helper Table Components ---
  const StickyLeft = ({ children, className }: any) => (
      <td className={`py-1 px-2 sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${THEME.cardBorder} ${className}`}>{children}</td>
  );
  const StickyRight = ({ children, className }: any) => (
      <td className={`py-1 px-2 sticky right-0 z-20 border-l font-black text-center min-w-[70px] ${THEME.cardBorder} ${className}`}>{children}</td>
  );
  const DisplayCell = ({ value, isDecimal = false }: any) => (
      <td className={`p-1 text-center text-[10px] font-bold border-r ${colWidthClass} ${THEME.textMuted} ${THEME.cardBorder}`}>
          {value === 0 ? '-' : (isDecimal ? value.toFixed(2) : value.toFixed(0))}
      </td>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 w-full animate-fade-in transform-gpu">
      
      {/* HEADER & SETTINGS */}
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 rounded-3xl border shadow-sm gap-4 ${THEME.cardBg} ${THEME.cardBorder}`}>
        <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${THEME.textMain}`}>
          <Droplets className="text-sky-500 fill-sky-500" /> Water Analytics
        </h2>
        <div className="flex gap-3">
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                <span className={`text-[9px] font-black uppercase px-2 ${THEME.textMuted}`}>Liters/Unit</span>
                <input disabled={readOnly} type="number" defaultValue={settings.litersPerUnit} onBlur={(e) => updateSetting('litersPerUnit', e.target.value)} onKeyDown={(e)=> {if(e.key === 'Enter') e.currentTarget.blur()}} className={`bg-slate-50 dark:bg-slate-800 text-center font-black outline-none rounded py-1 w-14 text-xs ${THEME.textMain} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                <Target size={14} className="text-rose-500 ml-2" />
                <span className={`text-[9px] font-black uppercase ${THEME.textMuted}`}>Global Target (Ltr/Kg)</span>
                <input disabled={readOnly} type="number" value={globalTargetVal} onChange={(e) => { setGlobalTargetVal(e.target.value); updateSetting('targetLtrPerKg', e.target.value); }} onKeyDown={(e)=> {if(e.key === 'Enter') e.currentTarget.blur()}} className={`bg-slate-50 dark:bg-slate-800 text-center font-black outline-none rounded py-1 w-14 text-xs mr-1 ${THEME.textMain} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
        </div>
      </div>

      {/* CHART */}
      <WaterChart data={metrics.chartData} globalTarget={Number(globalTargetVal) || 0} />

      {/* TABLES */}
      <div className="space-y-6">
          {['A', 'B'].map((shiftLetter) => {
              const shift = shiftLetter === 'A' ? 'shiftA' : 'shiftB';
              const theme = shiftLetter === 'A' ? THEME.shiftA : THEME.shiftB;
              
              return (
                  <div key={shiftLetter} className={`rounded-3xl border shadow-lg overflow-hidden transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
                      <div className={`${theme.bg} px-4 py-2 border-b flex justify-start items-center gap-3 ${THEME.cardBorder}`}>

                          {/* 🟢 Icon එකේ පසුබිම අදාළ Shift එකේ වර්ණයට ගැලපෙන ලෙස සකසා ඇත */}
                            <div className={`p-1.5 rounded-lg text-white shadow-sm ${shiftLetter === 'A' ? 'bg-indigo-500' : 'bg-amber-500'}`}><Droplets size={14} /></div>
                            
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
                                      {/* 1. No Of Units (EDITABLE) */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-black ${theme.text}`}>No Of Units</StickyLeft>
                                          {metrics.dates.map((date: string, i: number) => (
                                              <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                  <EditableCell id={`water_${shiftLetter}_${i}`} value={waterData[date]?.[shift]} onChange={(v: string) => handleSave(date, shift as any, v)} colorClass={theme.text} onNavigate={handleCellNavigate} readOnly={readOnly} />
                                              </td>
                                          ))}
                                          <StickyRight className={`${theme.bg} ${theme.text}`}>{metrics.grandTotals[`units${shiftLetter}`]}</StickyRight>
                                      </tr>

                                      
                                      {/* 2. Cu No of Unit */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu No of Unit</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`cumUnits${shiftLetter}`]} />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>-</StickyRight>
                                      </tr>
                                      {/* 3. Total production (kg) */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Total Prod. (Kg)</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`prod${shiftLetter}`]} />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals[`prod${shiftLetter}`]?.toFixed(0)}</StickyRight>
                                      </tr>
                                      {/* 4. No Of Ltr Per Day */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>No Of Ltr Per Day</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`ltr${shiftLetter}`]} />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals[`ltr${shiftLetter}`]?.toFixed(0)}</StickyRight>
                                      </tr>
                                      {/* 5. No Of Ltr per KG */}
                                      <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>No Of Ltr per KG</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`ltrPerKg${shiftLetter}`]} isDecimal />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>-</StickyRight>
                                      </tr>
                                      {/* 6. CU no of ltr per kg */}
                                      <tr className={THEME.tableRowHover}>
                                          <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>CU Ltr per KG</StickyLeft>
                                          {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d[`cumLtrPerKg${shiftLetter}`]} isDecimal />)}
                                          <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals[`upk${shiftLetter}`]?.toFixed(2)}</StickyRight>
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

export default KPIWater;