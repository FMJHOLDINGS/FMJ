import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, Calendar, Activity, Target, CheckSquare, Square 
} from 'lucide-react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { AdminConfig } from '../../types';
import useLaborProdLogic from './LaborProdLogic';

// ============================================================================
// 🎨 1. THEME CONFIGURATION (වර්ණ වෙනස් කිරීමට මෙතැනින් හැක)
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

    // Shift වර්ණ (Chart එකේ Bar/Line වලට සහ Table Headers වලට)
    shiftA: { 
        name: 'Shift-A', hex: '#6366f1', // Indigo (නිල් පැහැති)
        bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500' 
    },
    shiftB: { 
        name: 'Shift-B', hex: '#10b981', // Emerald (කොළ පැහැති)
        bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500' 
    }
};

interface Props {
  data: Record<string, any>;
  currentDate?: string;
  config?: AdminConfig;
  startDate?: string;
  endDate?: string;
  readOnly?: boolean;
}



// ============================================================================
// ⚡ EXCEL-LIKE EDITABLE CELL (Fixed Sync Delay & Removed Arrows)
// ============================================================================
const EditableCell = React.memo(({ value, onChange, onNavigate, id, readOnly }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value?.toString() || '');
    const [isSaving, setIsSaving] = useState(false);

    // 🟢 වෙනස 1: useEffect එකෙන් 'isEditing' අයින් කළා. දැන් Database එකෙන් අලුත් අගය ආවම විතරක් Saving එක නවතිනවා.
    useEffect(() => { 
        if (!isEditing) {
            setTempValue(value?.toString() || ''); 
            setIsSaving(false); 
        }
    }, [value]); // 👈 මෙතන [value, isEditing] තිබුණු එක [value] ලෙස හැදුවා

    const finishEdit = useCallback(() => {
        setIsEditing(false);
        if (tempValue !== (value?.toString() || '')) {
            setIsSaving(true); // සේව් වෙනවා කියල සලකුණු කරනවා
            onChange(tempValue);
        } else {
            setTempValue(value?.toString() || ''); // වෙනසක් නැත්නම් reset කරනවා
        }
    }, [tempValue, value, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // 🟢 අලුතින් එකතු කළ කොටස: Delete බොත්තම එබූ විට අගය මකා එකවරම Save වීම
        if (e.key === 'Delete') {
            e.preventDefault();
            setTempValue('');     // අගය හිස් කරයි
            setIsSaving(true);    // සේව් වීම සලකුණු කරයි
            onChange('');         // හිස් අගය Database එකට යවයි
            setIsEditing(false);  // Input එක වසා View mode එකට යයි
        } 
        else if (e.key === 'Enter') { 
            finishEdit(); 
        } 
        else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            finishEdit();
            onNavigate(e.key, id);
        }
    };
    
    // --- Input Mode ---
    if (isEditing) {
        return (
            <input 
                id={id}
                type="number" 
                autoFocus
                // 🟢 වෙනස 2: ඊතල (Arrows) අයින් කිරීමට අදාළ CSS ක්ලාස් (appearance-none...) එකතු කළා
                className="w-full h-full min-w-0 min-h-[28px] p-0 m-0 text-center outline-none text-[11px] font-black rounded-md bg-yellow-50 dark:bg-yellow-900/30 text-slate-900 dark:text-white ring-2 ring-indigo-500 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)} 
                onBlur={finishEdit} 
                onKeyDown={handleKeyDown} 
            />
        );
    }

    // --- View Mode ---
    const displayValue = isSaving ? tempValue : value; 
    
    const hasValue = displayValue !== undefined && displayValue !== null && displayValue !== '' && Number(displayValue) > 0;
    
    return (
        <div 
            id={id}
            onClick={() => { if (!readOnly) setIsEditing(true); }}
            className={`w-full h-full min-w-0 min-h-[28px] overflow-hidden flex items-center justify-center text-[11px] font-black tabular-nums rounded-md cursor-text hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${hasValue ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
        >
            {hasValue ? displayValue : '-'} 
        </div>
    );
});


// ============================================================================
// 📊 3. COMBINED CHART COMPONENT (Axis Tick & Layout Fixes)
// ============================================================================
const CombinedProductionChart = React.memo(({ data, globalTarget }: any) => {
    if (!data || data.length === 0) return null;

    const CHART_COLORS = {
        barA: '#3b82f6', 
        barB: '#f97316', 
        lineA: '#2563eb', 
        lineB: '#ea580c'  
    };

    const chartDataFormatted = useMemo(() => {
        return data.map((d: any) => {
            const dateObj = new Date(d.fullDate || d.date);
            return {
                dayNum: dateObj.getDate().toString(),
                fullDate: d.fullDate || d.date,
                shiftA_prod: d['Shift-A']?.prod || 0,
                shiftB_prod: d['Shift-B']?.prod || 0,
                shiftA_eff: d['Shift-A']?.cumProdPerMH || 0,
                shiftB_eff: d['Shift-B']?.cumProdPerMH || 0,
            };
        });
    }, [data]);

    // 🟢 වෙනස 1: උපරිම අගයන් ලස්සනට රවුම් කිරීම (Rounding to clean numbers)
    const maxProdRaw = Math.max(...chartDataFormatted.map((d: any) => Math.max(d.shiftA_prod, d.shiftB_prod)), 50);
    // 50 න් බෙදෙන ඊළඟ අගයට වටයයි (උදා: 330 -> 350)
    const maxProd = Math.ceil((maxProdRaw * 1.15) / 50) * 50; 

    const maxEffRaw = Math.max(...chartDataFormatted.map((d: any) => Math.max(d.shiftA_eff, d.shiftB_eff)), globalTarget, 5);
    // 5 න් බෙදෙන ඊළඟ අගයට වටයයි (උදා: 12 -> 15)
    const maxEff = Math.ceil((maxEffRaw * 1.2) / 5) * 5; 

    const formatVal = (val: number) => {
        if (!val) return "0";
        return Number.isInteger(val) ? val.toString() : Number(val.toFixed(1)).toString();
    };

    const ChartTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;
        const activeData = chartDataFormatted.find((d: any) => d.dayNum === label);
        const fullDateStr = activeData ? activeData.fullDate : `Day ${label}`;
        return (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-xs font-bold">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">{fullDateStr}</div>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-700 dark:text-slate-200">{entry.name}:</span>
                        <span style={{ color: entry.color }} className="font-black text-sm">{formatVal(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    // 🟢 1. Return එකට හරියටම උඩින් මේ පේළිය දාන්න (දත්ත ගොඩක් තියෙනවා නම් පළල වැඩි කරන්න)
    const dynamicWidth = Math.max(800, chartDataFormatted.length * 40);

    return (
        <div className="p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transform-gpu bg-white dark:bg-slate-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                        <Activity className="w-4 h-4 text-indigo-500" /> Shift Comparison Chart
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-500 dark:text-slate-400">Achievement (Bars) vs Efficiency (Lines)</p>
                </div>
            </div>

            <div className="h-[360px] w-full overflow-x-auto custom-scrollbar transform-gpu will-change-scroll">
                {/* 🟢 2. min-w-[800px] ඉවත් කර, style එක හරහා dynamicWidth එක ලබා දී ඇත */}
                <div style={{ minWidth: `${dynamicWidth}px` }} className="h-full pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartDataFormatted} margin={{ top: 20, right: 10, left: 0, bottom: 10 }}>
                            <defs>
                                <linearGradient id="barGradA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CHART_COLORS.barA} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={CHART_COLORS.barA} stopOpacity={0.4}/>
                                </linearGradient>
                                <linearGradient id="barGradB" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={CHART_COLORS.barB} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={CHART_COLORS.barB} stopOpacity={0.4}/>
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                            <XAxis dataKey="dayNum" tick={{fontSize: 11, fill: '#64748b', fontWeight: '900'}} axisLine={false} tickLine={false} interval={0} dy={10} />
                            
                            {/* 🟢 වෙනස 2: tickCount={6} ලබා දීමෙන් පරතර හරියටම කොටස් 5 කට ලස්සනට බෙදේ */}
                            <YAxis yAxisId="left" orientation="left" domain={[0, maxProd]} tickCount={6} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={45} tickFormatter={formatVal} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, maxEff]} tickCount={6} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={45} tickFormatter={formatVal} />
                            
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '900', paddingTop: '20px', color: '#64748b' }} iconType="circle" />

                            <Bar isAnimationActive={false} yAxisId="left" dataKey="shiftA_prod" name="Achv (Shift A)" fill="url(#barGradA)" barSize={14} radius={[4, 4, 0, 0]} />
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="shiftB_prod" name="Achv (Shift B)" fill="url(#barGradB)" barSize={14} radius={[4, 4, 0, 0]} />
                            
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="shiftA_eff" name="Eff (Shift A)" stroke={CHART_COLORS.lineA} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} activeDot={{r: 6}} />
                            <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="shiftB_eff" name="Eff (Shift B)" stroke={CHART_COLORS.lineB} strokeWidth={3} dot={{r: 4, fill: '#fff', strokeWidth: 2}} activeDot={{r: 6}} />
                            
                            {globalTarget > 0 && <ReferenceLine yAxisId="right" y={globalTarget} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" opacity={0.8} />}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});



// ============================================================================
// 📋 4. TABLE ROW COMPONENT (Performance Optimized)
// ============================================================================
const TableRow = React.memo(({ label, shift, dataKey, highlight, isInput, bgClass, processedData, handleSave, handleCellNavigate, colWidthClass, readOnly }: any) => {
    return (
        <tr className={`transition-colors border-b group ${THEME.tableRowHover} ${THEME.tableBorder}`}>
            <td className={`sticky left-0 z-20 py-2.5 px-3 text-[10px] font-black uppercase tracking-tight border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${THEME.tableBorder} ${THEME.cardBg} ${THEME.textMuted}`}>
                <div className="flex items-center gap-2">
                    <span className={`w-1 h-3 rounded-full ${highlight ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                    {label}
                </div>
            </td>
            {processedData.map((d: any, index: number) => {
                const val = d[shift]?.[dataKey];
                return (
                    <td key={d.date} className={`p-0 ${colWidthClass} border-r text-center align-middle ${THEME.tableBorder} ${bgClass || ''}`}>
                        {isInput ? (
                            <div className="w-full h-full p-1">
                                <EditableCell 
                                    id={`cell___${shift}___${index}`}
                                    value={val || ''}
                                    onChange={(v: string) => handleSave(d.date, shift, v)}
                                    onNavigate={handleCellNavigate}
                                    readOnly={readOnly}
                                />
                            </div>
                        ) : (
                            <span className={`block py-2.5 text-[10px] font-bold tabular-nums tracking-tight ${highlight ? 'text-emerald-600 dark:text-emerald-400' : THEME.textMain}`}>
                                {val > 0 ? Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-'}
                            </span>
                        )}
                    </td>
                )
            })}
        </tr>
    );
});


// ============================================================================
// 🖥️ 5. MAIN UI COMPONENT
// ============================================================================
const LaborProdUiView: React.FC<Props> = ({ data = {}, config, startDate: propStart, endDate: propEnd, readOnly }) => {
    const [withPreform, setWithPreform] = useState(false);
  
    const { shifts, processedData, targets, updateTarget, handleSave } = useLaborProdLogic(
        data, config, propStart, propEnd, withPreform
    );
  
    // 🟢 අලුත් වෙනස: Input එකේ අගය ක්ෂණිකව වෙනස් වීමට Local State එකක් භාවිතය
    const [globalTargetVal, setGlobalTargetVal] = useState<string | number>('');
  
    // Backend එකෙන් දත්ත Load වූ විට එය Local state එකට සමාන කිරීම
    useEffect(() => {
        if (targets && targets.shiftA !== undefined) {
            setGlobalTargetVal(targets.shiftA);
        }
    }, [targets?.shiftA]);
  
    // අගය වෙනස් කරන විට ක්ෂණිකව Chart එක Update කිරීම
    const handleTargetChange = (val: string) => {
        setGlobalTargetVal(val);
        updateTarget('shiftA' as any, val);
        updateTarget('shiftB' as any, val);
    };
  
    const handleCellNavigate = useCallback((key: string, currentId: string) => {
        const parts = currentId.split('___'); 
        if (parts.length !== 3) return;
        const shift = parts[1];
        let idx = parseInt(parts[2]);
        
        if (key === 'ArrowRight') idx++;
        if (key === 'ArrowLeft') idx--;
        
        const nextId = `cell___${shift}___${idx}`;
        const nextEl = document.getElementById(nextId);
        if (nextEl) nextEl.click(); 
    }, []);
  
    const getColumnWidth = () => {
        const count = processedData.length;
        if (count <= 7) return 'w-[70px] min-w-[70px] max-w-[70px]';  
        if (count <= 15) return 'w-[55px] min-w-[55px] max-w-[55px]'; 
        return 'w-[48px] min-w-[48px] max-w-[48px]';                  
    };
    const colWidthClass = getColumnWidth();
  
    return (
      <div className="space-y-6 pb-20 w-full max-w-[100vw] overflow-hidden animate-fade-in transform-gpu">
          
          {/* --- Header Section --- */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-[1.5rem] border shadow-sm relative overflow-hidden ${THEME.cardBg} ${THEME.cardBorder}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                   <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                       <Users size={24} />
                   </div>
                   <div>
                       <h2 className={`text-xl font-black uppercase tracking-tight ${THEME.textMain}`}>Labor Productivity</h2>
                       <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                          <Activity size={12} /> Efficiency Analysis
                       </p>
                   </div>
              </div>
  
              <div className="relative z-10 flex items-center gap-4">
                   {/* 🟢 GLOBAL TARGET INPUT (Real-Time Update) */}
                   <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-sm ${THEME.cardBg} ${THEME.cardBorder}`}>
                       <div className="flex items-center gap-1.5 px-2">
                           <Target size={14} className="text-rose-500" />
                           <span className={`hidden sm:inline text-[10px] font-black uppercase tracking-wider ${THEME.textMuted}`}>Global Target:</span>
                       </div>
                       <input 
                           disabled={readOnly}
                           type="number" 
                           value={globalTargetVal} 
                           onChange={(e) => handleTargetChange(e.target.value)}
                           className={`w-16 text-center text-xs font-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none py-1 bg-slate-50 dark:bg-slate-800 ${THEME.textMain} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                       />
                   </div>
  
                   <button 
                      onClick={() => setWithPreform(!withPreform)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-xs uppercase tracking-wide ${
                          withPreform 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                          : `bg-transparent ${THEME.cardBorder} ${THEME.textMuted} hover:bg-slate-50 dark:hover:bg-slate-800`
                      }`}
                   >
                      {withPreform ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span className="hidden sm:inline">With Preform</span>
                      <span className="sm:hidden">Preform</span>
                   </button>
              </div>
          </div>
  
          {/* --- Combined Chart Section --- */}
          <CombinedProductionChart data={processedData} globalTarget={Number(globalTargetVal) || 0} />

       {/* --- Tables Section (Original Layout with Titles) --- */}
       <div className="flex flex-col gap-6"> 
            {shifts.map((shift) => {
                const shiftTheme = shift === 'Shift-A' ? THEME.shiftA : THEME.shiftB;

                return (
                    <div key={shift} className={`rounded-[1.5rem] border shadow-md overflow-hidden transform-gpu will-change-transform ${THEME.cardBg} ${THEME.cardBorder}`}>
                        
                        {/* 🟢 Table Header (Shift Title එක පැහැදිලිව පෙන්වීම) */}
                        <div className={`px-4 py-1.5 border-b flex justify-start items-center gap-3 ${THEME.tableBorder} ${THEME.tableHeadBg}`}>
                            <div className={`p-2 rounded-lg text-white shadow-sm ${shiftTheme.bg}`}><Calendar size={16} /></div>
                            <h3 className={`text-sm font-black uppercase tracking-widest ${shiftTheme.text}`}>{shift} LOG</h3>
                        </div>

                        {/* Table Content (Scrollable) */}
                        <div className="overflow-x-auto custom-scrollbar flex-1 transform-gpu">
                            <div className="min-w-max pb-2">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className={`border-b-[2px] ${shiftTheme.border} ${THEME.tableHeadBg}`}>
                                            <th className={`sticky left-0 z-30 min-w-[160px] p-2 text-right text-[9px] font-black uppercase border-r shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] ${THEME.tableBorder} ${THEME.tableHeadBg} ${THEME.textMuted}`}>
                                                Parameter / Date
                                            </th>
                                            {processedData.map((d: any) => (
                                                <th key={d.date} className={`py-2 px-0.5 text-center border-r ${colWidthClass} ${THEME.tableBorder}`}>
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${THEME.textMuted}`}>
                                                            {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                        </span>
                                                        <span className={`text-[10px] font-black leading-none ${THEME.textMain}`}>
                                                            {new Date(d.date).getDate()}
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <TableRow label="Output (Kg)" shift={shift} dataKey="prod" highlight processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} />
                                        <TableRow label="Total Workers" shift={shift} dataKey="workers" isInput={true} bgClass="bg-amber-50/30 dark:bg-amber-900/10" processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} readOnly={readOnly} />
                                        <tr className={`h-[2px] ${THEME.tableHeadBg}`}><td colSpan={100}></td></tr>
                                        <TableRow label="Cum. Output" shift={shift} dataKey="cumProd" processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} />
                                        <TableRow label="Cum. MH" shift={shift} dataKey="cumHours" processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} />
                                        <TableRow label="Kg / MH" shift={shift} dataKey="prodPerMH" processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} />
                                        <TableRow label="Cum. Kg/MH" shift={shift} dataKey="cumProdPerMH" highlight bgClass="bg-emerald-50/20 dark:bg-emerald-900/10" processedData={processedData} handleSave={handleSave} handleCellNavigate={handleCellNavigate} colWidthClass={colWidthClass} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default LaborProdUiView;