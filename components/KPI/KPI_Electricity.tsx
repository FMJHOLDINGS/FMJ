import React, { useState, useEffect, useCallback } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useElectricityLogic } from './useElectricityLogic';

// ============================================================================
// 🎨 1. THEME CONFIGURATION (අලුත් වර්ණ යොදා ඇත)
// ============================================================================
const THEME = {
    // ප්‍රධාන පසුබිම් වර්ණ
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200 dark:border-slate-800",
    textMain: "text-slate-800 dark:text-white",
    textMuted: "text-slate-500 dark:text-slate-400",
    
    // Table වර්ණ
    tableHeadBg: "bg-slate-100 dark:bg-slate-900",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
    tableBorder: "border-slate-200 dark:border-slate-800",

    // Input Box වර්ණ (මෙය මකා දැමිය නොහැක)
    inputViewBg: "hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-text",
    inputEditBg: "bg-yellow-50 dark:bg-yellow-900/30 text-slate-900 dark:text-white ring-2 ring-indigo-500",

    // Shift වර්ණ 
    shiftA: { 
        name: 'Shift-A', hex: '#6366f1', // Indigo (නිල් පැහැති)
        bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500' 
    },
    shiftB: { 
        name: 'Shift-B', hex: '#10b981',
        bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' 
    },

    targetLine: '#ef4444' // Target line රතු පැහැය
};

interface Props {
  data: any; 
  startDate: string;
  endDate: string;
  collectionName: string;
  readOnly?: boolean; 
}

// ============================================================================
// ⚡ 2. EXCEL-LIKE EDITABLE CELL (Fixed Sync Delay, No Arrows & Delete Key)
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
        if (tempValue !== (value?.toString() || '')) {
            setIsSaving(true);
            onChange(tempValue);
        } else {
            setTempValue(value?.toString() || '');
        }
    }, [tempValue, value, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            setTempValue('');
            setIsSaving(true);
            onChange('');
            setIsEditing(false);
        }


        else if (e.key === 'Enter') {
            finishEdit(); 
        // 🟢 ArrowUp සහ ArrowDown එකතු කර ඇත
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            finishEdit();
            if(onNavigate) onNavigate(e.key, id);
        }
    };

    if (isEditing) {
        return (
            <input 
                id={id} type="number" autoFocus
                className={`w-full h-full min-w-0 min-h-[24px] p-0 m-0 text-center outline-none text-[10px] font-black rounded appearance-none ${THEME.inputEditBg} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)} 
                onBlur={finishEdit} 
                onKeyDown={handleKeyDown} 
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
// 📊 3. OPTIMIZED CHART COMPONENT (අලුත් CHART_COLORS යොදා ඇත)
// ============================================================================
const ElectricityChart = React.memo(({ data, settings }: any) => {
    
    // 🎨 අලුත් Chart වර්ණ
    const CHART_COLORS = {
        barA: '#3b82f6', 
        barB: '#f97316', 
        lineA: '#2563eb', 
        lineB: '#ea580c'  
    };


// 🟢 අලුත් Custom Tooltip එක (Light/Dark ගැලපෙන හා දශමස්ථාන හදන)
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-xs">
            <div className="mb-1.5 text-[10px] font-black text-slate-500 uppercase">Day {label}</div>
            {payload.map((entry: any, i: number) => {
                const val = Number(entry.value);
                // දශම නැත්නම් එලෙසම, ඇත්නම් දශම 1 කට සීමා කරයි
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
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {/* 🟢 Gradients එකතු කිරීම */}
                                <linearGradient id="barGradA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CHART_COLORS.barA} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={CHART_COLORS.barA} stopOpacity={0.4}/>
                                </linearGradient>
                                <linearGradient id="barGradB" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CHART_COLORS.barB} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={CHART_COLORS.barB} stopOpacity={0.4}/>
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={0} />
                            
                            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: THEME.targetLine }} axisLine={false} tickLine={false} width={40} />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />

                            {/* 🟢 Bars සහ Lines වලට අලුත් වර්ණ ලබා දීම */}
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="shiftA" name="Units A (kWh)" fill="url(#barGradA)" radius={[3, 3, 0, 0]} barSize={12} />
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="shiftB" name="Units B (kWh)" fill="url(#barGradB)" radius={[3, 3, 0, 0]} barSize={12} />
                            
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="cumUnitPerKgA" name="Cu. U/kg (A)" stroke={CHART_COLORS.lineA} strokeWidth={2} dot={{r:3}} />
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="cumUnitPerKgB" name="Cu. U/kg (B)" stroke={CHART_COLORS.lineB} strokeWidth={2} dot={{r:3}} />
                            
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="targetLineVal" name="Target Max" stroke={THEME.targetLine} strokeWidth={2} strokeDasharray="4 4" dot={false} />
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
const KPIElectricity: React.FC<Props> = ({ data, startDate, endDate, collectionName, readOnly }) => {
  
    const logic = useElectricityLogic(startDate, endDate, data);
    const elecData = logic.elecData;
    const settings = logic.settings;
    const updateSetting = logic.updateSetting;
    const handleSave = logic.handleSave;
    const metrics: any = logic.metrics; 

    // 🟢 අලුත් වෙනස (Up / Down ඊතල හරහා අලුත් පේළියට යාමට)
    const handleCellNavigate = useCallback((key: string, currentId: string) => {
        const parts = currentId.split('_'); 
        if (parts.length !== 3) return;
        const prefix = parts[0];
        let field = parts[1];
        let idx = parseInt(parts[2]);
        
        if (key === 'ArrowRight') idx++;
        if (key === 'ArrowLeft') idx--;
        if (key === 'ArrowDown') {
            if (field === 'A') field = 'macA';
            if (field === 'B') field = 'macB';
        }
        if (key === 'ArrowUp') {
            if (field === 'macA') field = 'A';
            if (field === 'macB') field = 'B';
        }
        
        const nextId = `${prefix}_${field}_${idx}`;
        const nextEl = document.getElementById(nextId);
        if (nextEl) nextEl.click(); 
    }, []);


  
    // 🟢 1. අනිත් ටැබ් වල වගේ පළල ස්ථිර කරන ෆන්ක්ෂන් එක එකතු කළා
    const getColumnWidth = () => {
        const count = metrics.chartData.length;
        if (count <= 7) return 'w-[70px] min-w-[70px] max-w-[70px]';  
        if (count <= 15) return 'w-[55px] min-w-[55px] max-w-[55px]'; 
        return 'w-[48px] min-w-[48px] max-w-[48px]';                  
    };
    const colWidthClass = getColumnWidth();

    // --- Helper Table Components ---
    const StickyLeft = ({ children, className }: any) => (
      <td className={`py-2 px-3 sticky left-0 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${THEME.cardBorder} ${className}`}>
          {children}
      </td>
  );
  const StickyRight = ({ children, className }: any) => (
      <td className={`py-2 px-2 sticky right-0 z-20 border-l font-black text-center min-w-[70px] ${THEME.cardBorder} ${className}`}>
          {children}
      </td>
  );
  
  // 🟢 2. min-w-[40px] max-w-[48px] වෙනුවට colWidthClass දැමුවා
  const DisplayCell = ({ value, isCurrency = false, isDecimal = false }: any) => (
      <td className={`p-1 text-center text-[10px] font-bold border-r ${colWidthClass} ${THEME.textMuted} ${THEME.cardBorder}`}>
          {value === 0 ? '-' : (isCurrency ? value.toLocaleString() : isDecimal ? value.toFixed(2) : value.toFixed(0))}
      </td>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 w-full animate-fade-in transform-gpu">
      
      {/* HEADER & SETTINGS */}
      <div className={`flex flex-col md:flex-row justify-between items-center p-4 rounded-3xl border shadow-sm gap-4 ${THEME.cardBg} ${THEME.cardBorder}`}>
        <h2 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${THEME.textMain}`}>
          <Zap className="text-yellow-500 fill-yellow-500" /> Electricity Analytics
        </h2>
        <div className="flex gap-3">
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                <span className={`text-[9px] font-black uppercase px-2 ${THEME.textMuted}`}>Target (U/kg)</span>
                <input disabled={readOnly} type="number" defaultValue={settings.targetUnitPerKg} onBlur={(e) => updateSetting('targetUnitPerKg', e.target.value)} onKeyDown={(e)=> {if(e.key === 'Enter') e.currentTarget.blur()}} className={`bg-slate-50 dark:bg-slate-800 text-center font-black outline-none rounded py-1 w-14 text-xs ${THEME.textMain} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
        </div>
      </div>

      {/* CHART */}
      <ElectricityChart data={metrics.chartData} settings={settings} />

      {/* TABLES (Shift A & B) */}
      <div className="space-y-6">
          {/* --- SHIFT A TABLE --- */}
          <div className={`rounded-3xl border shadow-lg overflow-hidden transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
              <div className={`${THEME.shiftA.bg} p-3 border-b ${THEME.cardBorder}`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${THEME.shiftA.text}`}>Shift A Log</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-max pb-2">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className={`border-b-[2px] border-amber-500 ${THEME.tableHeadBg}`}>
                                  <StickyLeft className={`${THEME.tableHeadBg} min-w-[140px] text-[9px] font-black uppercase ${THEME.textMuted}`}>Parameter</StickyLeft>

                                  {/* 🟢 3. min-w-[40px] max-w-[48px] වෙනුවට colWidthClass දැමුවා */}
                                        {metrics.chartData.map((d: any) => (
                                            <th key={d.fullDate} className={`py-1 text-center border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                <div className={`text-[10px] font-black ${THEME.textMain}`}>{d.date}</div>
                                            </th>
                                        ))}

                                  <StickyRight className={`${THEME.tableHeadBg} text-[10px] uppercase ${THEME.shiftA.text}`}>Total</StickyRight>
                              </tr>
                          </thead>
                          <tbody>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Output (Kg)</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.prodShiftA} />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMain}`}>{metrics.grandTotals.prodA?.toFixed(0)}</StickyRight>
                              </tr>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-black ${THEME.shiftA.text}`}>Units (kWh)</StickyLeft>
                                  {metrics.dates.map((date: string, i: number) => (
                                      // 🟢 4. min-w-[40px] max-w-[48px] වෙනුවට colWidthClass දැමුවා
                                      <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                          <EditableCell 
                                              id={`elec_A_${i}`} value={elecData[date]?.shiftA} 
                                              onChange={(v: string) => handleSave(date, "shiftA", v)} colorClass={THEME.shiftA.text}
                                              onNavigate={handleCellNavigate} 
                                              readOnly={readOnly}
                                          />
                                      </td>
                                  ))}
                                  <StickyRight className={`${THEME.shiftA.bg} ${THEME.shiftA.text}`}>{metrics.grandTotals.unitsA}</StickyRight>
                              </tr>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Unit / Kg</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.unitPerKgA} isDecimal />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals.upkA?.toFixed(2)}</StickyRight>
                              </tr>
                              {/* 🟢 Cu. Unit / Kg - (මෙහි border-b එකතු කර ඇත) */}
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu. Unit / Kg</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.cumUnitPerKgA} isDecimal />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals.upkA?.toFixed(2)}</StickyRight>
                              </tr>

                              {/* 🟢 No of Machines පේළිය (අවසාන පේළිය නිසා border-b ඉවත් කර ඇත) */}
                              <tr className={THEME.tableRowHover}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-black ${THEME.shiftA.text}`}>No of Machines</StickyLeft>
                                  {metrics.dates.map((date: string, i: number) => (
                                      <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                          <EditableCell 
                                              id={`elec_macA_${i}`} value={elecData[date]?.machinesA} 
                                              onChange={(v: string) => handleSave(date, "machinesA", v)} colorClass={THEME.shiftA.text}
                                              onNavigate={handleCellNavigate} 
                                              readOnly={readOnly}
                                          />
                                      </td>
                                  ))}
                                  <StickyRight className={`${THEME.shiftA.bg} ${THEME.shiftA.text}`}>{metrics.grandTotals.machinesA}</StickyRight>
                              </tr>



                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* --- SHIFT B TABLE --- */}
          <div className={`rounded-3xl border shadow-lg overflow-hidden transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
              <div className={`${THEME.shiftB.bg} p-3 border-b ${THEME.cardBorder}`}>
                  <h3 className={`text-xs font-black uppercase tracking-widest ${THEME.shiftB.text}`}>Shift B Log</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-max pb-2">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className={`border-b-[2px] border-indigo-500 ${THEME.tableHeadBg}`}>
                                  <StickyLeft className={`${THEME.tableHeadBg} min-w-[140px] text-[9px] font-black uppercase ${THEME.textMuted}`}>Parameter</StickyLeft>

                                  {/* 🟢 5. min-w-[40px] max-w-[48px] වෙනුවට colWidthClass දැමුවා */}
                                        {metrics.chartData.map((d: any) => (
                                            <th key={d.fullDate} className={`py-1 text-center border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                                <div className={`text-[10px] font-black ${THEME.textMain}`}>{d.date}</div>
                                            </th>
                                        ))}

                                  <StickyRight className={`${THEME.tableHeadBg} text-[10px] uppercase ${THEME.shiftB.text}`}>Total</StickyRight>
                              </tr>
                          </thead>
                          <tbody>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Output (Kg)</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.prodShiftB} />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMain}`}>{metrics.grandTotals.prodB?.toFixed(0)}</StickyRight>
                              </tr>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-black ${THEME.shiftB.text}`}>Units (kWh)</StickyLeft>
                                  {metrics.dates.map((date: string, i: number) => (
                                      // 🟢 6. min-w-[40px] max-w-[48px] වෙනුවට colWidthClass දැමුවා
                                      <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                          <EditableCell 
                                              id={`elec_B_${i}`} value={elecData[date]?.shiftB} 
                                              onChange={(v: string) => handleSave(date, "shiftB", v)} colorClass={THEME.shiftB.text}
                                              onNavigate={handleCellNavigate} 
                                              readOnly={readOnly}
                                          />
                                      </td>
                                  ))}
                                  <StickyRight className={`${THEME.shiftB.bg} ${THEME.shiftB.text}`}>{metrics.grandTotals.unitsB}</StickyRight>
                              </tr>
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Unit / Kg</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.unitPerKgB} isDecimal />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals.upkB?.toFixed(2)}</StickyRight>
                              </tr>
                              
                              {/* 🟢 Cu. Unit / Kg - (මෙහි border-b එකතු කර ඇත) */}
                              <tr className={`border-b ${THEME.cardBorder} ${THEME.tableRowHover}`}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-bold ${THEME.textMuted}`}>Cu. Unit / Kg</StickyLeft>
                                  {metrics.chartData.map((d: any, i: number) => <DisplayCell key={i} value={d.cumUnitPerKgB} isDecimal />)}
                                  <StickyRight className={`${THEME.cardBg} ${THEME.textMuted}`}>{metrics.grandTotals.upkB?.toFixed(2)}</StickyRight>
                              </tr>

                              {/* 🟢 No of Machines පේළිය (අවසාන පේළිය නිසා border-b ඉවත් කර ඇත) */}
                              <tr className={THEME.tableRowHover}>
                                  <StickyLeft className={`${THEME.cardBg} text-[10px] font-black ${THEME.shiftB.text}`}>No of Machines</StickyLeft>
                                  {metrics.dates.map((date: string, i: number) => (
                                      <td key={date} className={`p-0.5 border-r ${colWidthClass} ${THEME.cardBorder}`}>
                                          <EditableCell 
                                              id={`elec_macB_${i}`} value={elecData[date]?.machinesB} 
                                              onChange={(v: string) => handleSave(date, "machinesB", v)} colorClass={THEME.shiftB.text}
                                              onNavigate={handleCellNavigate} 
                                              readOnly={readOnly}
                                          />
                                      </td>
                                  ))}
                                  <StickyRight className={`${THEME.shiftB.bg} ${THEME.shiftB.text}`}>{metrics.grandTotals.machinesB}</StickyRight>
                              </tr>
                              
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>

    </motion.div>
  );
};

export default KPIElectricity;