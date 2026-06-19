import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Sun, Moon, Layout, Factory, Calendar, Loader2, CloudUpload, CheckCircle2 } from 'lucide-react';

// --- LOGIC & SERVICES IMPORTS ---
import { IMJobPlan } from './PlanningTypes';
import { usePlanningManager } from './usePlanningManager';
import { useAuth } from '../../context/AuthContext';
import { PlanningService } from './PlanningService';

// ============================================================================
// 1. TYPES & INTERFACES (දත්ත ව්‍යුහයන් අර්ථ දැක්වීම)
// ============================================================================
export interface DailyPlanRowData {
    id: string; 
    machine: string; 
    itemName: string; 
    customer: string;
    jobNo: string; 
    remainQty: number; 
    weight: number; 
    targetPerHr: number; 
    planHours: number; 
    planQty: number; 
    planKg: number; 
    labour: number;
    remark: string; 
}

// ============================================================================
// 2. REUSABLE COMPONENTS (නැවත නැවත භාවිතා කරන කුඩා කොටස්)
// ============================================================================

/**
 * @component EditableCell
 * @description Table එක ඇතුළත Click කළ විට Edit කළ හැකි සෛලයක් (Cell) නිර්මාණය කිරීම.
 */
const EditableCell = memo(({ value, onChange, placeholder = "0", isDecimal = false, readOnly }: { value: number; onChange: (val: number) => void; placeholder?: string; isDecimal?: boolean; readOnly?: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());

    const handleBlur = () => {
        setIsEditing(false);
        const numVal = isDecimal ? parseFloat(tempValue) : parseInt(tempValue, 10);
        if (!isNaN(numVal) && numVal !== value) onChange(numVal);
        else setTempValue(value.toString());
    };

    if (isEditing && !readOnly) {
        return (
            <input 
                autoFocus type="number" value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)} 
                onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()} 
                className="w-full bg-slate-800 text-white border border-emerald-500 rounded px-1 text-center text-[11px] font-bold outline-none h-6" 
            />
        );
    }
    return (
        <div onClick={() => { if (!readOnly) setIsEditing(true); }} className={`w-full h-6 flex items-center justify-center rounded transition-colors text-[11px] font-bold text-slate-800 dark:text-slate-200 ${!readOnly ? 'cursor-text hover:bg-slate-200 dark:hover:bg-slate-800' : 'cursor-default opacity-80'}`}>
            {value > 0 ? (isDecimal ? value.toFixed(2) : value.toLocaleString()) : <span className="text-slate-400">{placeholder}</span>}
        </div>
    );
});

// ============================================================================
// 3. TABLE ROW COMPONENT (වගුවේ එක පේළියක් සඳහා අදාළ කේතය)
// ============================================================================

/**
 * @component PlanRow
 * @description අදාළ Machine එක සහ Item එක තේරීමටත්, ගණනය කිරීම් සිදු කිරීමටත් අදාළ පේළිය.
 */
const PlanRow = memo(({ row, jobs, onChange, onDelete, readOnly }: { row: DailyPlanRowData, jobs: IMJobPlan[], onChange: (id: string, fieldOrUpdates: any, value?: any) => void, onDelete: (id: string) => void, readOnly?: boolean }) => {
    
    const availableMachines = useMemo(() => Array.from(new Set(jobs.map(j => j.machine || 'Unassigned'))).sort(), [jobs]);
    const availableItems = useMemo(() => jobs.filter(j => (j.machine || 'Unassigned') === row.machine), [jobs, row.machine]);
    
    // Machine එක වෙනස් කළ විට අදාළ දත්ත Reset කිරීම
    const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(row.id, {
            machine: e.target.value,
            itemName: '', customer: '', weight: 0, targetPerHr: 0,
            jobNo: '', remainQty: 0, planQty: 0, planKg: 0, remark: '' 
        });
    };

    // Product එක වෙනස් කළ විට Qty සහ Kg ස්වයංක්‍රීයව ගණනය කිරීම
    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedItemName = e.target.value;
        const matchingJob = availableItems.find(j => j.itemName === selectedItemName);
        
        if (matchingJob) {
            const tHr = matchingJob.targetPerHr || 0;
            const wgt = matchingJob.weight || 0;
            const pQty = Math.round(tHr * row.planHours);
            const pKg = Number(((pQty * wgt) / 1000).toFixed(2));

            onChange(row.id, {
                itemName: selectedItemName, customer: matchingJob.customer || '',
                weight: wgt, targetPerHr: tHr, jobNo: matchingJob.jobNo || '',
                remainQty: matchingJob.balance || 0, planQty: pQty, planKg: pKg
            });
        } else {
            onChange(row.id, 'itemName', selectedItemName);
        }
    };

    // Hours වෙනස් කළ විට අදාළ Auto fields Update වීම
    const updateAutoFields = (customer: string, weight: number, targetPerHr: number = row.targetPerHr, hours: number = row.planHours, jobNo: string = row.jobNo, remainQty: number = row.remainQty) => {
        const planQty = Math.round(targetPerHr * hours);
        const planKg = Number(((planQty * weight) / 1000).toFixed(2));
        onChange(row.id, { customer, weight, targetPerHr, planHours: hours, planQty, planKg, jobNo, remainQty });
    };

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // CSS Classes (කේතය පැහැදිලි වීමට)
    const tdClasses = "p-1 border-b border-r border-slate-300 dark:border-slate-700 text-[11px] font-bold text-center";
    const selectClasses = "w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-1 py-1 outline-none text-[11px] font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

    return (
        <tr className="bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            {/* Machine Selection */}
            <td className={tdClasses}>
                <select disabled={readOnly} value={row.machine} onChange={handleMachineChange} title={row.machine} className={selectClasses}>
                    <option value="" disabled>Select</option>
                    {availableMachines.map(m => <option key={m} value={m} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{m}</option>)}
                </select>
            </td>
            
            {/* Product Selection */}
            <td className={`${tdClasses} text-left`}>
                <select value={row.itemName} onChange={handleItemChange} disabled={!row.machine || readOnly} title={row.itemName} className={`${selectClasses} text-left`}>
                    <option value="" disabled>Select Product</option>
                    {availableItems.map(j => (
                        <option key={j.id} value={j.itemName} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">
                            {j.itemName} {j.customer ? `(${j.customer})` : ''} 
                        </option>
                    ))}
                </select>
            </td>

            {/* Read-only Data Cells */}
            <td className={`${tdClasses} text-slate-600 dark:text-slate-400`}>{row.jobNo || '-'}</td>
            <td className={`${tdClasses} text-rose-500 font-bold`}>{row.remainQty > 0 ? row.remainQty.toLocaleString() : '-'}</td>
            <td className={`${tdClasses} text-slate-500`}>{row.weight || '-'}</td>
            
            {/* Editable Data Cells */}
            <td className={`${tdClasses} bg-amber-50 dark:bg-amber-900/10`}>
                <EditableCell value={row.planHours} onChange={(h) => updateAutoFields(row.customer, row.weight, row.targetPerHr, h)} isDecimal readOnly={readOnly} />
            </td>
            <td className={`${tdClasses} text-emerald-600 dark:text-emerald-400 font-black`}>{row.planQty > 0 ? row.planQty.toLocaleString() : '-'}</td>
            <td className={`${tdClasses} text-indigo-600 dark:text-indigo-400 font-black`}>{row.planKg > 0 ? row.planKg.toLocaleString() : '-'}</td>
            
            {/* Labour & Remark Cells */}
            <td className={`${tdClasses} bg-rose-50 dark:bg-rose-900/10`}>
                <EditableCell value={row.labour} onChange={(val) => onChange(row.id, 'labour', val)} isDecimal readOnly={readOnly} />
            </td>
            <td className={tdClasses}>
                <input
                    type="text"
                    value={row.remark || ''}
                    onChange={(e) => onChange(row.id, 'remark', e.target.value)}
                    disabled={readOnly}
                    placeholder="Note..."
                    title={row.remark}
                    className="w-full bg-transparent text-slate-800 dark:text-slate-200 border-none outline-none text-[11px] font-normal px-1 text-left placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
            </td>
            
            {/* Delete Action Button */}
            <td className={tdClasses}>
                {!readOnly && (
                    <button onClick={() => setIsConfirmOpen(true)} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><Trash2 size={12} /></button>
                )}

                {/* Delete Confirmation Popup */}
                {isConfirmOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#0B1121] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 transform-gpu transition-all">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 whitespace-normal text-left">Confirm Row Deletion</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 whitespace-normal text-left">Are you sure you want to remove this row from the daily plan?</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsConfirmOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors">Cancel</button>
                                <button onClick={() => { onDelete(row.id); setIsConfirmOpen(false); }} className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-colors">Yes, Delete</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
});

// ============================================================================
// 4. SECTION TABLE COMPONENT (මුළු වගුව සහ Total පෙන්වීම)
// ============================================================================

/**
 * @component PlanSectionTable
 * @description IM හෝ BM සඳහා වෙන් වූ සම්පූර්ණ වගුව සහ එහි Total අගයන් පෙන්වයි.
 */
const PlanSectionTable = ({ title, type, shift, rows, setRows, activeJobs, readOnly }: { title: string, type: 'IM'|'BM', shift?: 'day'|'night', rows: DailyPlanRowData[], setRows: React.Dispatch<React.SetStateAction<DailyPlanRowData[]>>, activeJobs: IMJobPlan[], readOnly?: boolean }) => {
    
    // Add Row & Update Logic
    const addRow = useCallback(() => setRows(prev => [...prev, { id: Date.now().toString() + Math.random(), machine: '', itemName: '', customer: '', jobNo: '', remainQty: 0, weight: 0, targetPerHr: 0, planHours: 12, planQty: 0, planKg: 0, labour: 0, remark: '' }]), [setRows]);
    
    const updateRow = useCallback((id: string, fieldOrUpdates: any, value?: any) => {
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            if (typeof fieldOrUpdates === 'string') return { ...r, [fieldOrUpdates]: value };
            return { ...r, ...fieldOrUpdates };
        }));
    }, [setRows]);

    const deleteRow = useCallback((id: string) => setRows(prev => prev.filter(r => r.id !== id)), [setRows]);

    // Calculate Totals Footer
    const totals = useMemo(() => rows.reduce((acc, row) => ({ qty: acc.qty + (row.planQty || 0), kg: acc.kg + (row.planKg || 0), labour: acc.labour + (row.labour || 0) }), { qty: 0, kg: 0, labour: 0 }), [rows]);
    const thClasses = "p-1.5 border-b border-r border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-center tracking-tight";

    return (
        <div className="flex flex-col border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#0B1121] shadow-sm w-full">
            
            {/* Table Header Section (Title & Badge) */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#121b2f] border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {type === 'IM' ? <Layout size={16} className="text-indigo-500"/> : <Factory size={16} className="text-amber-500"/>}
                        <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200">{title}</h4>
                    </div>
                    
                    {/* Shift Badges */}
                    {shift === 'day' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-amber-400 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-sm">
                            <Sun size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Day</span>
                        </div>
                    )}
                    {shift === 'night' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 shadow-sm">
                            <Moon size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Night</span>
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <button onClick={addRow} className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-[10px] font-black uppercase transition-colors">
                        <Plus size={12} strokeWidth={3} /> Add Row
                    </button>
                )}
            </div>
            
            {/* Data Table */}
            <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full border-collapse table-fixed min-w-[770px]">
                    <thead>
                        <tr>
                            <th className={`${thClasses} min-w-[75px] w-[75px]`}>Machine</th>
                            <th className={`${thClasses} text-left min-w-[165px] w-[165px]`}>Product & Customer</th>
                            <th className={`${thClasses} min-w-[80px] w-[80px]`}>Job No</th>
                            <th className={`${thClasses} min-w-[65px] w-[65px]`}>Rem. Qty</th>
                            <th className={`${thClasses} min-w-[45px] w-[45px]`}>Wg(g)</th>
                            <th className={`${thClasses} min-w-[50px] w-[50px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400`}>Hours</th>
                            <th className={`${thClasses} min-w-[65px] w-[65px] text-emerald-700 dark:text-emerald-400`}>Pln Qty</th>
                            <th className={`${thClasses} min-w-[65px] w-[65px] text-indigo-700 dark:text-indigo-400`}>Pln Kg</th>
                            <th className={`${thClasses} min-w-[45px] w-[45px] bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400`}>Labr</th>
                            <th className={`${thClasses} min-w-[150px] w-[150px]`}>Remark</th>
                            <th className={`${thClasses} min-w-[35px] w-[35px]`}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? <tr><td colSpan={11} className="text-center py-4 text-[10px] font-bold text-slate-400">No records added.</td></tr> : rows.map(row => <PlanRow key={row.id} row={row} jobs={activeJobs} onChange={updateRow} onDelete={deleteRow} readOnly={readOnly} />)}
                    </tbody>
                    
                    {/* Table Footer Totals */}
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-600">
                                <td colSpan={6} className="p-1.5 text-right text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 pr-4">Total :</td>
                                <td className="p-1.5 text-center text-[11px] font-black text-emerald-600 dark:text-emerald-400">{totals.qty.toLocaleString()}</td>
                                <td className="p-1.5 text-center text-[11px] font-black text-indigo-600 dark:text-indigo-400">{totals.kg.toLocaleString()}</td>
                                <td className="p-1.5 text-center text-[11px] font-black text-rose-600 dark:text-rose-400">{Number(totals.labour).toFixed(1).replace(/\.0$/, '')}</td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

// ============================================================================
// 5. MAIN COMPONENT (ප්‍රධාන View එක - State, Fetch, Save මෙහෙයවීම)
// ============================================================================

/**
 * @component DailyPlanView
 * @description දෛනික සැලැස්ම (Daily Plan) පෙන්වන ප්‍රධාන පිටුව. Auto-save සහ Live Sync මෙහෙයවයි.
 */
const DailyPlanView = ({ readOnly }: { readOnly?: boolean }) => {
    const { userData } = useAuth();
    
    // Active jobs fetch කිරීම
    const { plans: imActiveJobs } = usePlanningManager('IM');
    const { plans: bmActiveJobs } = usePlanningManager('BM');

    // UI States
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [isLoading, setIsLoading] = useState(false);
    const [activeShift, setActiveShift] = useState<'day' | 'night'>('day');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    // Data States
    const [dayIMRows, setDayIMRows] = useState<DailyPlanRowData[]>([]);
    const [dayBMRows, setDayBMRows] = useState<DailyPlanRowData[]>([]);
    const [nightIMRows, setNightIMRows] = useState<DailyPlanRowData[]>([]);
    const [nightBMRows, setNightBMRows] = useState<DailyPlanRowData[]>([]);

    // 🟢 Live Sync සහ Auto Save පාලනය සඳහා Ref
    const initialLoadDone = useRef(false);
    const currentDataRef = useRef({ dayIM: [], dayBM: [], nightIM: [], nightBM: [] });
    
    useEffect(() => {
        currentDataRef.current = { dayIM: dayIMRows as any, dayBM: dayBMRows as any, nightIM: nightIMRows as any, nightBM: nightBMRows as any };
    }, [dayIMRows, dayBMRows, nightIMRows, nightBMRows]);

    // 🟢 Fetch Data (අදාළ දිනයට අනුව දත්ත ලබාගැනීම සහ Live Sync වීම)
    useEffect(() => {
        if (!userData?.collectionName) return;
        
        initialLoadDone.current = false; 
        setIsLoading(true);
        setSaveStatus('idle');

        const unsubscribe = PlanningService.subscribeToDailyPlan(userData.collectionName, selectedDate, (data) => {
            if (data) {
                const incomingData = {
                    dayIM: data.dayIM || [], dayBM: data.dayBM || [],
                    nightIM: data.nightIM || [], nightBM: data.nightBM || []
                };
                
                // දත්ත වෙනස් වී ඇත්නම් පමණක් තිරය Update කරයි
                if (JSON.stringify(incomingData) !== JSON.stringify(currentDataRef.current)) {
                    setDayIMRows(incomingData.dayIM); setDayBMRows(incomingData.dayBM);
                    setNightIMRows(incomingData.nightIM); setNightBMRows(incomingData.nightBM);
                }
            } else {
                setDayIMRows([]); setDayBMRows([]); setNightIMRows([]); setNightBMRows([]);
            }
            setIsLoading(false);
            setTimeout(() => { initialLoadDone.current = true; }, 1000);
        });

        return () => { unsubscribe(); initialLoadDone.current = false; };
    }, [selectedDate, userData?.collectionName]);

    // 🟢 Auto Save Logic (දත්ත වෙනස් කළ විට තත්පර 1.5කට පසු ස්වයංක්‍රීයව Save වීම)
    useEffect(() => {
        if (!initialLoadDone.current || !userData?.collectionName) return;
        setSaveStatus('saving');
        
        const timer = setTimeout(async () => {
            const planData = { dayIM: dayIMRows, dayBM: dayBMRows, nightIM: nightIMRows, nightBM: nightBMRows };
            await PlanningService.saveDailyPlan(userData.collectionName, selectedDate, planData);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000); 
        }, 1500);

        return () => clearTimeout(timer); 
    }, [dayIMRows, dayBMRows, nightIMRows, nightBMRows, selectedDate, userData?.collectionName]);

    return (
        <div className="h-full w-full flex flex-col gap-3 p-1">
            
            {/* --- TOP TOOLBAR SECTION --- */}
            <div className="flex items-center justify-between shrink-0 bg-white dark:bg-[#0B1121] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                
                {/* Date Picker & Title */}
                <div className="flex items-center gap-4 pl-2">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-emerald-600 dark:text-emerald-500" />
                        <h3 className="text-sm font-black uppercase text-slate-700 dark:text-white leading-none hidden md:block">Daily Production Plan</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#121b2f] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Date:</span>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-[12px] font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer dark:[color-scheme:dark]" />
                    </div>
                    {isLoading && <Loader2 size={16} className="animate-spin text-emerald-500" />}
                </div>

                {/* Day / Night Shift Toggles */}
                <div className="flex bg-slate-100 dark:bg-[#121b2f] p-1 rounded-lg border border-slate-200 dark:border-slate-700 mx-2">
                    <button onClick={() => setActiveShift('day')} className={`flex items-center gap-2 px-4 md:px-6 py-1.5 rounded-md text-[11px] font-black uppercase transition-all duration-300 ${activeShift === 'day' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Sun size={14} /> <span className="hidden sm:block">Day</span>
                    </button>
                    <button onClick={() => setActiveShift('night')} className={`flex items-center gap-2 px-4 md:px-6 py-1.5 rounded-md text-[11px] font-black uppercase transition-all duration-300 ${activeShift === 'night' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Moon size={14} /> <span className="hidden sm:block">Night</span>
                    </button>
                </div>

                {/* Auto Save Status Indicator */}
                <div className="flex items-center justify-end px-4 w-[100px] md:w-[120px]">
                    {saveStatus === 'saving' && <div className="flex items-center gap-2 text-amber-500 animate-pulse"><CloudUpload size={14} /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Saving...</span></div>}
                    {saveStatus === 'saved' && <div className="flex items-center gap-2 text-emerald-500 animate-in fade-in zoom-in duration-300"><CheckCircle2 size={14} /><span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Saved</span></div>}
                </div>
            </div>

            {/* --- MAIN TABLES SECTION --- */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar transform-gpu" style={{ willChange: 'transform' }}>
                <div className="flex flex-col gap-4 min-w-full pb-4 h-full">
                    
                    {/* ☀️ DAY SHIFT TABLES */}
                    {activeShift === 'day' && (
                        <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-center gap-2 bg-amber-100 dark:bg-amber-900/20 py-2 rounded-lg border border-amber-200 dark:border-amber-800/30 shrink-0">
                                <Sun size={18} className="text-amber-500" />
                                <h2 className="text-sm font-black uppercase text-amber-700 dark:text-amber-500 tracking-widest">Day Shift</h2>
                            </div>
                            <PlanSectionTable title="IM Plan" type="IM" shift="day" rows={dayIMRows} setRows={setDayIMRows} activeJobs={imActiveJobs} readOnly={readOnly} />
                            <PlanSectionTable title="BM Plan" type="BM" shift="day" rows={dayBMRows} setRows={setDayBMRows} activeJobs={bmActiveJobs} readOnly={readOnly} />
                        </div>
                    )}

                    {/* 🌙 NIGHT SHIFT TABLES */}
                    {activeShift === 'night' && (
                        <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/20 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800/30 shrink-0">
                                <Moon size={18} className="text-indigo-500" />
                                <h2 className="text-sm font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-widest">Night Shift</h2>
                            </div>
                            <PlanSectionTable title="IM Plan" type="IM" shift="night" rows={nightIMRows} setRows={setNightIMRows} activeJobs={imActiveJobs} readOnly={readOnly} />
                            <PlanSectionTable title="BM Plan" type="BM" shift="night" rows={nightBMRows} setRows={setNightBMRows} activeJobs={bmActiveJobs} readOnly={readOnly} />
                        </div>
                    )}
                    
                </div>
            </div>
        </div>
    );
};

export default DailyPlanView;