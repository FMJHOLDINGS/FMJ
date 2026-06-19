import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DayData } from '../types';
import { 
  ShieldAlert, Filter, Calendar, ChevronDown, ChevronUp,
  Layers, Check, Clock, TrendingDown, Activity, BarChart2, LineChart
} from 'lucide-react';
import { calculateTimeDiff, getDatesInRange } from '../utils';
import BreakdownExcelExport from './BreakdownExcelExport';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';

// ============================================================================
// 1. 🎨 THEME & COLOR CONFIGURATION (වර්ණ වෙනස් කිරීමට මෙතැනින් හැක)
// ============================================================================
const THEME = {
    // --- Main Layout ---
    mainBg: "bg-[#F8FAFC] dark:bg-[#020617]",
    cardBg: "bg-white dark:bg-slate-900",
    cardBorder: "border-slate-200 dark:border-slate-800",
    textMain: "text-slate-800 dark:text-white",
    textMuted: "text-slate-500 dark:text-slate-400",

    // --- Header Section ---
    headerBg: "bg-white dark:bg-slate-900",
    headerBorder: "border-slate-200 dark:border-slate-800",
    headerIconBg: "bg-gradient-to-br from-orange-500 to-rose-500",
    inputBg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white",

    // --- Dropdowns ---
    dropdownBtn: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700",
    dropdownMenu: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl",
    dropdownItemHover: "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300",
    dropdownItemActive: "bg-indigo-600 text-white",

    // --- Tables & Accordions ---
    tableHeadBg: "bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400",
    tableRowHover: "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
    accordionHover: "hover:bg-slate-50 dark:hover:bg-slate-800/50",
    accordionActive: "bg-slate-50 dark:bg-slate-900",
    badgeCategory: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800",
    badgePlanning: "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800",
};

interface Props {
  allData: Record<string, any>;
  date: string;
  loadDataForRange?: (start: string, end: string, forceRefresh?: boolean) => void;
}

// ============================================================================
// 2. 🧩 SUB COMPONENTS (Dropdown, Tooltip)
// ============================================================================

// 🟢 CUSTOM DROPDOWN (Planning Categories වෙනම පෙන්වන සහ Confirm කරන Logic එක සහිතව)
const CustomDropdown = ({ label, normalOptions, planningOptions, selected, onChange, icon: Icon, isMulti = false }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggle = (opt: string, isPlanning: boolean = false) => {
        if (isPlanning && isMulti && !selected.includes(opt)) {
            const confirmed = window.confirm("Are you sure you want to include Planning Breakdowns? This will affect standard loss calculations.");
            if (!confirmed) return;
        }

        if (isMulti) {
            // 🟢 'ALL' එබූ විට සියලුම Normal Categories Select/Deselect වීම
            if (opt === 'ALL') onChange(selected.length === normalOptions.length ? [] : normalOptions); 
            else onChange(selected.includes(opt) ? selected.filter((s: string) => s !== opt) : [...selected, opt]);
        } else {
            onChange(opt); setIsOpen(false);
        }
    };

    return (
        <div className="relative shrink-0" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-4 h-10 border rounded-xl text-xs font-bold transition-all min-w-[150px] justify-between ${THEME.dropdownBtn} ${isOpen ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
                    <span className="truncate">{isMulti ? (selected.length === 0 ? label : `${selected.length} Selected`) : (selected === 'ALL' ? label : selected)}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : 'opacity-50'}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full right-0 mt-2 w-64 border rounded-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${THEME.dropdownMenu}`}>
                    <div className="p-1 max-h-72 overflow-y-auto custom-scrollbar transform-gpu will-change-scroll">
                        
                        {/* All Option */}
                        {isMulti && <div onClick={() => toggle('ALL')} className={`p-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${selected.length === normalOptions.length && normalOptions.length > 0 ? THEME.dropdownItemActive : THEME.dropdownItemHover}`}>All Standard Categories</div>}
                        {!isMulti && <div onClick={() => toggle('ALL')} className={`p-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${selected === 'ALL' ? THEME.dropdownItemActive : THEME.dropdownItemHover}`}>{label} (All)</div>}
                        
                        {/* Standard Categories */}
                        {normalOptions.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Standard Breakdowns</div>
                                {normalOptions.map((opt: string) => (
                                    <div key={opt} onClick={() => toggle(opt)} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-bold ${((isMulti ? selected.includes(opt) : selected === opt) ? THEME.dropdownItemActive : THEME.dropdownItemHover)}`}>
                                        {isMulti && <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.includes(opt) ? 'border-white bg-indigo-500' : 'border-slate-400'}`}>{selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}</div>}
                                        <span className="truncate">{opt}</span>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Planning Categories Section (වෙනම පෙන්වයි) */}
                        {planningOptions && planningOptions.length > 0 && (
                            <>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-2"></div>
                                <div className="px-3 py-1.5 text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">Planning (Excluded by Default)</div>
                                {planningOptions.map((opt: string) => (
                                    <div key={opt} onClick={() => toggle(opt, true)} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-bold ${((isMulti ? selected.includes(opt) : selected === opt) ? 'bg-rose-600 text-white' : THEME.dropdownItemHover)}`}>
                                        {isMulti && <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.includes(opt) ? 'border-white bg-rose-500' : 'border-rose-300'}`}>{selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}</div>}
                                        <span className="truncate">{opt}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 🟢 CHART TOOLTIP
const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-sm z-50 ${THEME.cardBg} ${THEME.cardBorder}`}>
                <p className="text-slate-500 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs font-bold">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className={`${THEME.textMain} min-w-[60px]`}>{entry.name}:</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">{entry.value} {entry.name.includes('Downtime') ? 'mins' : 'kg'}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// 🟢 CUSTOM X-AXIS TICK (දිගු නම් කැපී නොයා පේළි කිහිපයකින් පෙන්වීමට)
const CustomXAxisTick = ({ x, y, payload }: any) => {
    const text = payload.value;
    const words = text.split(' ');
    
    // වචන ගොඩක් තිබුණොත් පේළි දෙකකට කැඩීම
    const line1 = words.length > 2 ? words.slice(0, 2).join(' ') : text;
    const line2 = words.length > 2 ? words.slice(2).join(' ') : '';

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="end" fill="#94a3b8" fontSize={9} fontWeight={700} transform="rotate(-35)">
                <tspan x={0} dy="0em">{line1}</tspan>
                {line2 && <tspan x={0} dy="1em">{line2}</tspan>}
            </text>
        </g>
    );
};


// 🟢 අලුතින් එක් කළ MACHINE MULTI-SELECT DROPDOWN
const MachineMultiSelectDropdown = ({ uniqueMachines, selected, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [expandedGroup, setExpandedGroup] = useState<string>('IM'); 

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const imMachines = uniqueMachines.filter((m: string) => m.startsWith('IM'));
    const bmMachines = uniqueMachines.filter((m: string) => m.startsWith('BM'));

    const toggleMachine = (m: string) => {
        if (selected.includes(m)) onChange(selected.filter((s: string) => s !== m));
        else onChange([...selected, m]);
    };

    const toggleGroup = (groupMachines: string[]) => {
        const allSelected = groupMachines.every((m: string) => selected.includes(m));
        if (allSelected) {
            onChange(selected.filter((s: string) => !groupMachines.includes(s)));
        } else {
            const newSelected = [...selected];
            groupMachines.forEach((m: string) => { if (!newSelected.includes(m)) newSelected.push(m); });
            onChange(newSelected);
        }
    };

    const label = selected.length === uniqueMachines.length ? "All Machines" : `${selected.length} Selected`;

    return (
        <div className="relative shrink-0" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-4 h-10 border rounded-xl text-xs font-bold transition-all min-w-[150px] justify-between ${THEME.dropdownBtn} ${isOpen ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span className="truncate">{label}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : 'opacity-50'}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full left-0 mt-2 w-72 border rounded-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${THEME.dropdownMenu} p-3`}>
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter Machines</span>
                        <button onClick={() => onChange([])} className="text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors">Clear</button>
                    </div>

                    {imMachines.length > 0 && (
                        <div className="mb-2">
                            <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === 'IM' ? '' : 'IM')}>
                                <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); toggleGroup(imMachines); }}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${imMachines.every((m: string) => selected.includes(m)) ? 'border-indigo-500 bg-indigo-500' : imMachines.some((m: string) => selected.includes(m)) ? 'border-indigo-500 bg-indigo-500/50' : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-500'}`}>
                                        {imMachines.every((m: string) => selected.includes(m)) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IM Machines</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroup === 'IM' ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {expandedGroup === 'IM' && (
                                <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                    {imMachines.map((m: string) => (
                                        <div key={m} onClick={() => toggleMachine(m)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${selected.includes(m) ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${selected.includes(m) ? 'bg-indigo-500 border-indigo-500' : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-500'}`}>
                                                {selected.includes(m) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="text-xs font-bold">{m}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {bmMachines.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer" onClick={() => setExpandedGroup(expandedGroup === 'BM' ? '' : 'BM')}>
                                <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); toggleGroup(bmMachines); }}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${bmMachines.every((m: string) => selected.includes(m)) ? 'border-indigo-500 bg-indigo-500' : bmMachines.some((m: string) => selected.includes(m)) ? 'border-indigo-500 bg-indigo-500/50' : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-500'}`}>
                                        {bmMachines.every((m: string) => selected.includes(m)) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">BM Machines</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroup === 'BM' ? 'rotate-180' : ''}`} />
                            </div>
                            
                            {expandedGroup === 'BM' && (
                                <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                    {bmMachines.map((m: string) => (
                                        <div key={m} onClick={() => toggleMachine(m)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${selected.includes(m) ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${selected.includes(m) ? 'bg-indigo-500 border-indigo-500' : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-500'}`}>
                                                {selected.includes(m) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="text-xs font-bold">{m}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};




// ============================================================================
// 3. 🚀 MAIN COMPONENT
// ============================================================================
const BreakdownLog: React.FC<Props> = ({ allData, date, loadDataForRange }) => {

    // 🟢 අලුත් මාසය සකසන කොටස
    const [selectedMonth, setSelectedMonth] = useState(date.slice(0, 7)); // "YYYY-MM"

    const { startDate, endDate } = useMemo(() => {
        const [year, month] = selectedMonth.split('-');
        const start = `${year}-${month}-01`;
        const endDay = new Date(Number(year), Number(month), 0).getDate();
        const end = `${year}-${month}-${String(endDay).padStart(2, '0')}`;
        return { startDate: start, endDate: end };
    }, [selectedMonth]);

    // 🟢 මාසය මාරු කරන විට Cloud එකෙන් හරියටම දත්ත Load කිරීම
    useEffect(() => {
        if (loadDataForRange && startDate && endDate) {
            loadDataForRange(startDate, endDate, true); // true = forceRefresh
        }
    }, [startDate, endDate, loadDataForRange]);

    const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
    const [isMachinesInitialized, setIsMachinesInitialized] = useState(false);
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [isCatsInitialized, setIsCatsInitialized] = useState(false);
    const [chartViewMode, setChartViewMode] = useState<'CATEGORY' | 'DAILY'>('CATEGORY');
    const [chartFilterCategory, setChartFilterCategory] = useState('ALL'); 
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    // 🟢 මාසය මාරු කරන විට හෝ Tab Refresh වන විට Filters සියල්ල අලුත් කිරීම (All Selected වීම)
    useEffect(() => {
        setIsMachinesInitialized(false);
        setIsCatsInitialized(false);
    }, [selectedMonth]);

    
    
  

  useEffect(() => { localStorage.setItem('bd_start', startDate); }, [startDate]);
  useEffect(() => { localStorage.setItem('bd_end', endDate); }, [endDate]);
 

  

  // --- 🧠 DATA ENGINE (Memoized for zero-lag performance) ---
  const { groupedData, sortedDates, uniqueMachines, normalCats, planningCats, stats, filteredList, chartData } = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    const machines = new Set<string>();
    const nCats = new Set<string>();
    
    const pCats = new Set<string>(['Planning']);
    
    const bds: any[] = [];
    const grouped: Record<string, any[]> = {};
    let totalMins = 0; let totalLostKg = 0;

    // 1. Data Collection & Planning Logic
    dates.forEach(d => {
        ['IM', 'BM'].forEach(type => {
            const dayData = allData[`${d}_${type}`] as DayData;
            if (dayData && dayData.rows) {
                dayData.rows.forEach(row => {
                    if (row.machine) machines.add(row.machine);
                    if (row.breakdowns && row.breakdowns.length > 0) {
                        row.breakdowns.forEach(bd => {
                            const isPlanning = bd.category && bd.category.toLowerCase().includes('planning');
                            if (isPlanning) pCats.add(bd.category);
                            else if (bd.category) nCats.add(bd.category);

                            // 🟢 Planning Logic: Array හිස් නම් Planning අයින් කරයි. Array එකේ තියෙනවා නම් අදාල ඒවා පමණක් පෙන්වයි.
                            const machineMatch = !isMachinesInitialized ? true : selectedMachines.includes(row.machine);
                            // 🟢 Category Auto-Select & Filter Logic
                            // isCatsInitialized මගින් මුල්ම පාරට සියලුම standard categories auto select වී ඇති බව තහවුරු කරයි.
                            const catMatch = !isCatsInitialized ? !isPlanning : selectedCats.includes(bd.category);

                            if (machineMatch && catMatch) {
                                    const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
                                    const mins = calculateTimeDiff(bd.startTime, bd.endTime);
                                    const lostQty = Math.floor(ratePerMin * mins);
                                     // 🟢 අනිත් ෆයිල් වලට සමාන වීමට මෙහිද .toFixed(2) යොදා රවුම් කරන ලදී
                                    const lostKg = Number(((lostQty * (row.unitWeight || 0)) / 1000).toFixed(2));

                                const item = {
                                    ...bd, date: d, machine: row.machine, shift: row.shift, product: row.product,
                                    unitWeight: row.unitWeight, category: bd.category, reason: bd.description,
                                    startTime: bd.startTime, endTime: bd.endTime, mins,
                                    cycleTime: row.cycleTime, cavity: row.cavities, lostQty, lostKg, isPlanning
                                };

                                bds.push(item);
                                if (!grouped[d]) grouped[d] = [];
                                grouped[d].push(item);
                                totalMins += mins; totalLostKg += lostKg;
                            }
                        });
                    }
                });
            }
        });
    });

    // 🟢 Day/Night සහ IM/BM අනුපිළිවෙලට සැකසීම
    Object.keys(grouped).forEach(d => {
        grouped[d].sort((a, b) => {
            // 1. මුලින්ම Shift එක (Day පළමුව, Night දෙවනුව)
            if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;
            
            // 2. ඊළඟට Machine වර්ගය (IM පළමුව, BM දෙවනුව)
            const aType = (a.machine || '').substring(0, 2);
            const bType = (b.machine || '').substring(0, 2);
            if (aType !== bType) return aType === 'IM' ? -1 : 1;
            
            // 3. අවසානයට Machine අංකයේ පිළිවෙළට (උදා: 01, 02, 03...)
            return (a.machine || '').localeCompare(b.machine || '');
        });
    });

    const sorted = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    if (sorted.length > 0 && Object.keys(expandedDates).length === 0) setExpandedDates({ [sorted[0]]: true });
    

    // 2. Chart Data Generation
    let cData: any[] = [];
    if (chartViewMode === 'CATEGORY') {
        const catMap: Record<string, { loss: number, mins: number }> = {};
        bds.forEach(item => {
            if (!catMap[item.category]) catMap[item.category] = { loss: 0, mins: 0 };
            catMap[item.category].loss += item.lostKg; catMap[item.category].mins += item.mins;
        });
        cData = Object.keys(catMap).map(k => ({ name: k, Loss: Number(catMap[k].loss.toFixed(1)), Downtime: catMap[k].mins })).sort((a, b) => b.Loss - a.Loss);
    } else {
        const dateMap: Record<string, { loss: number, mins: number }> = {};
        dates.forEach(d => dateMap[d] = { loss: 0, mins: 0 }); 
        bds.filter(item => chartFilterCategory === 'ALL' || item.category === chartFilterCategory).forEach(item => {
            dateMap[item.date].loss += item.lostKg; dateMap[item.date].mins += item.mins;
        });
        cData = Object.keys(dateMap).sort().map(d => {
             const shortDate = new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
             return { name: shortDate, fullDate: d, Loss: Number(dateMap[d].loss.toFixed(1)), Downtime: dateMap[d].mins };
        });
    }

    return { 
        groupedData: grouped, sortedDates: sorted, uniqueMachines: Array.from(machines).sort(),
        normalCats: Array.from(nCats).sort(), planningCats: Array.from(pCats).sort(),
        stats: { totalMins, totalLostKg }, chartData: cData, filteredList: bds
    };
// 🟢 මෙහි isMachinesInitialized සහ isCatsInitialized අනිවාර්යයෙන්ම තිබිය යුතුය
}, [allData, startDate, endDate, selectedMachines, selectedCats, chartViewMode, chartFilterCategory, isMachinesInitialized, isCatsInitialized]);

 // 🟢 Categories Load වූ වහාම, Standard ටික ඔක්කොම ඉබේම (Auto) Select කර තැබීම
 useEffect(() => {
    if (!isCatsInitialized && normalCats.length > 0) {
        setSelectedCats(normalCats);
        setIsCatsInitialized(true);
    }
  }, [normalCats, isCatsInitialized]);

  // 🟢 Machines Load වූ වහාම සියල්ලම (Auto) Select කර තැබීම
  useEffect(() => {
    if (!isMachinesInitialized && uniqueMachines.length > 0) {
        setSelectedMachines(uniqueMachines);
        setIsMachinesInitialized(true);
    }
  }, [uniqueMachines, isMachinesInitialized]);

  

const toggleDate = (d: string) => setExpandedDates(prev => ({ ...prev, [d]: !prev[d] }));


  return (
    <div className={`space-y-6 animate-fade-in w-full pb-24 max-w-[1920px] mx-auto ${THEME.mainBg}`}>
        
      {/* ============================================================================
           HEADER & FILTERS (Flex Wrap applied to prevent Dropdown clipping) 
       ============================================================================ */}
       <div className={`p-4 rounded-3xl shadow-sm border flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 w-full ${THEME.headerBg} ${THEME.headerBorder}`}>
            
            {/* Title & Stats */}
            <div className="flex items-center gap-4 shrink-0 px-2">
                <div className={`p-2.5 rounded-xl shadow-md ${THEME.headerIconBg}`}>
                    <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <h2 className={`text-lg font-black uppercase tracking-tight leading-tight ${THEME.textMain}`}>Breakdowns</h2>
                    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest mt-0.5 ${THEME.textMuted}`}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> <span className={THEME.textMain}>{stats.totalMins} min</span></span>
                        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> <span className="text-rose-500 dark:text-rose-400">{stats.totalLostKg.toFixed(1)} kg</span></span>
                    </div>
                </div>
            </div>

            <div className="w-px h-10 shrink-0 bg-slate-200 dark:bg-slate-700"></div>

            {/* Filters */}
            <div className="flex items-center gap-3 shrink-0">
                        <div className={`flex items-center gap-2 px-3 h-10 rounded-xl border ${THEME.inputBg}`}>
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <input 
                                    type="month" 
                                    value={selectedMonth} 
                                    onChange={e => setSelectedMonth(e.target.value)} 
                                    className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:[color-scheme:dark]" 
                                />
                            </div>
                
                {/* අලුත් Machine Dropdown එක */}
                <MachineMultiSelectDropdown uniqueMachines={uniqueMachines} selected={selectedMachines} onChange={setSelectedMachines} />
                
                <CustomDropdown label="Categories" normalOptions={normalCats} planningOptions={planningCats} selected={selectedCats} onChange={setSelectedCats} icon={Layers} isMulti={true} />
                
                <div className="shrink-0">
                    <BreakdownExcelExport 
                        filteredList={filteredList} 
                        startDate={startDate} 
                        endDate={endDate} 
                        // 🟢 අලුත් නිවැරදි Filter Logic එක (දිනය වෙනස් කළත් වරදින්නේ නැත)
                        isCategoryFiltered={!normalCats.every((c: string) => selectedCats.includes(c))} 
                        isMachineFiltered={!uniqueMachines.every((m: string) => selectedMachines.includes(m))} 
                    />
                
                </div>

            
            </div>
       </div>

       {/* ============================================================================
           CHART COMPONENT (Dynamic Width based on items for Month view)
       ============================================================================ */}
       {chartData.length > 0 && (
           <div className={`rounded-[2rem] p-4 md:p-6 border shadow-sm relative ${THEME.cardBg} ${THEME.cardBorder}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <div className="flex flex-col gap-1">
                        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${THEME.textMain}`}>
                            <Activity className="w-4 h-4 text-indigo-500" /> {chartViewMode === 'CATEGORY' ? 'Category Overview' : 'Daily Trend Analysis'}
                        </h3>
                    </div>
                    <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${THEME.inputBg}`}>
                        <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1">
                            <button onClick={() => setChartViewMode('CATEGORY')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${chartViewMode === 'CATEGORY' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm' : THEME.textMuted}`}><BarChart2 className="w-3 h-3" /> Category</button>
                            <button onClick={() => setChartViewMode('DAILY')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${chartViewMode === 'DAILY' ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm' : THEME.textMuted}`}><LineChart className="w-3 h-3" /> Trend</button>
                        </div>
                        
                    </div>
                </div>

                {/* Chart Scroll Container - For fitting 31 days nicely */}
                <div className="h-[280px] w-full overflow-x-auto custom-scrollbar transform-gpu will-change-scroll">
                    <div className="h-full" style={{ minWidth: chartViewMode === 'DAILY' && chartData.length > 15 ? `${chartData.length * 40}px` : '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {/* 🟢 bottom margin එක 20 සිට 0 දක්වා අඩු කර ඇත */}
                            <ComposedChart data={chartData} margin={{top: 20, right: 20, left: 0, bottom: 5}}>
                                <defs>
                                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                                
                                {/* 🟢 height එක 70 සිට 55 දක්වා අඩු කර ඇත */}
                                <XAxis dataKey="name" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} interval={0} height={55} />
                                <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#6366f1', fontWeight: 700}} axisLine={false} tickLine={false} width={40} />
                                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#f43f5e', fontWeight: 700}} axisLine={false} tickLine={false} width={40} />
                                <Tooltip content={<CustomChartTooltip />} cursor={{fill: 'rgba(148, 163, 184, 0.05)'}} />
                                <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8'}}/>
                                <Bar yAxisId="left" dataKey="Loss" name="Loss (Kg)" fill="url(#colorLoss)" radius={[4, 4, 0, 0]} barSize={chartViewMode === 'CATEGORY' ? 30 : 20} />
                                <Line yAxisId="right" type="monotone" dataKey="Downtime" name="Downtime (Min)" stroke="#f43f5e" strokeWidth={3} dot={{r: 3, fill: '#fff', strokeWidth: 2}} activeDot={{r: 5}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
           </div>
       )}

       {/* ============================================================================
           TABLE & CARDS COMPONENT
       ============================================================================ */}
       <div className="space-y-4">
            {sortedDates.map(d => {
                const items = groupedData[d];
                const isExpanded = expandedDates[d];
                const dayMins = items.reduce((s, i) => s + i.mins, 0);
                const dayLoss = items.reduce((s, i) => s + i.lostKg, 0);

                return (
                    <div key={d} className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 transform-gpu ${THEME.cardBg} ${THEME.cardBorder}`}>
                        {/* Card Header (Shorter height - p-3 instead of p-6) */}
                        <div onClick={() => toggleDate(d)} className={`flex items-center justify-between p-3 lg:p-4 cursor-pointer transition-colors ${isExpanded ? THEME.accordionActive : THEME.accordionHover}`}>
                            <div className="flex items-center gap-4">
                                <button className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <div>
                                    <h4 className={`text-base lg:text-lg font-black uppercase tracking-tight ${THEME.textMain}`}>{d}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${THEME.inputBg}`}>{items.length} Events</span>
                                </div>
                            </div>
                            <div className="flex gap-4 lg:gap-8 text-right">
                                <div><span className={`block text-[9px] lg:text-[10px] font-black uppercase tracking-widest mb-0.5 ${THEME.textMuted}`}>Downtime</span><span className="text-base lg:text-xl font-black text-indigo-600 dark:text-indigo-400">{dayMins} <span className="text-xs font-bold opacity-50">min</span></span></div>
                                <div><span className={`block text-[9px] lg:text-[10px] font-black uppercase tracking-widest mb-0.5 ${THEME.textMuted}`}>Loss</span><span className="text-base lg:text-xl font-black text-rose-500 dark:text-rose-400">{dayLoss.toFixed(1)} <span className="text-xs font-bold opacity-50">kg</span></span></div>
                            </div>
                        </div>

                        {/* Details Table (Inline scroll layout) */}
                        {isExpanded && (
                            <div className={`border-t animate-fade-in ${THEME.cardBorder}`}>
                                <div className="overflow-x-auto custom-scrollbar transform-gpu will-change-scroll">
                                    <table className="w-full min-w-[1000px] text-left border-collapse">
                                        <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${THEME.tableHeadBg} ${THEME.cardBorder}`}>
                                            <tr>
                                                <th className="p-3 pl-4">Machine</th>
                                                <th className="p-3 text-center">Shift</th>
                                                <th className="p-3 w-[20%]">Product</th>
                                                <th className="p-3 text-right">Unit Wt</th>
                                                <th className="p-3 text-center">Category</th>
                                                <th className="p-3 w-[25%]">Reason</th>
                                                <th className="p-3 text-center">Time</th>
                                                <th className="p-3 text-center text-indigo-500">Min</th>
                                                <th className="p-3 text-right text-rose-500">Lost Qty</th>
                                                <th className="p-3 pr-4 text-right text-rose-500">Lost Kg</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y divide-slate-300/50 dark:divide-slate-800/30 text-xs font-bold ${THEME.textMain}`}>
                                            {items.map((bd: any, i: number) => (
                                                <tr key={i} className={`transition-colors ${THEME.tableRowHover}`}>
                                                    <td className="p-2.5 pl-4 font-black">{bd.machine}</td>

                                                    <td className="p-2.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${bd.shift === 'day' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                            {bd.shift}
                                                        </span>
                                                    </td>

                                                    <td className="p-2.5 font-medium truncate max-w-[150px] opacity-80" title={bd.product}>{bd.product}</td>
                                                    <td className="p-2.5 text-right font-mono opacity-60">{bd.unitWeight}g</td>
                                                    <td className="p-2.5 text-center">
                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${bd.isPlanning ? THEME.badgePlanning : THEME.badgeCategory}`}>{bd.category}</span>
                                                    </td>
                                                    <td className="p-2.5 truncate max-w-[200px] opacity-80" title={bd.reason}>{bd.reason}</td>
                                                    <td className="p-2.5 text-center font-mono opacity-60">{bd.startTime} - {bd.endTime}</td>
                                                    <td className="p-2.5 text-center font-black text-indigo-600 dark:text-indigo-400">{bd.mins}</td>
                                                    <td className="p-2.5 text-right text-rose-500">{bd.lostQty}</td>
                                                    <td className="p-2.5 pr-4 text-right text-rose-600 dark:text-rose-400 font-black">{bd.lostKg.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
       </div>
    </div>
  );
};

export default BreakdownLog;