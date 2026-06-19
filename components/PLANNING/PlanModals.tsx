import React, { useState, useEffect, useMemo, memo } from 'react';
import { X, Save, Factory, Sun, Moon, Plus, Calendar } from 'lucide-react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'; 
import { db } from '../../firebase'; 
import { useAuth } from '../../context/AuthContext'; 
import { IMJobPlan, DailyCompletion, ProductItem } from './PlanningTypes';



// ============================================================================
// 1. CONFIGURATION & STYLES (Light & Dark Mode Supported & Hardware Accelerated)
// ============================================================================
const MODAL_OVERLAY_CLASS = "fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 transform-gpu";
const GOLD_MODAL_BOX = "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-amber-500/50 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform-gpu transition-all";

// ============================================================================
// 2. REUSABLE UI COMPONENTS
// ============================================================================
const InputGroup = memo(({ label, font, ...props }: any) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase tracking-wide">{label}</label>
        <input className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed read-only:bg-slate-100 dark:read-only:bg-slate-800/50 transition-colors ${font || ''}`} {...props} />
    </div>
));

const SelectGroup = memo(({ label, options, ...props }: any) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase tracking-wide">{label}</label>
        <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" {...props}>
            <option value="">Select {label}</option>
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
));





// 🟢 Searchable Dropdown Component (Ultimate Bug-Free & Advanced Filtering Version)
const SearchableSelectGroup = memo(({ label, options, value, onChange, disabled }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 🟢 1. React DOM හිරවීම (Key Collision) වළක්වා ගැනීමට Duplicate නම් ඉවත් කිරීම
    const safeOptions = Array.isArray(options) ? Array.from(new Set(options)) : [];
    const term = searchTerm.trim().toLowerCase();
    
    let filteredOptions = safeOptions;

    if (term !== '') {
        // 🟢 2. "30ml" සහ "30 ml" වැනි පරතරයන් නොසලකා හැරීමට
        const continuousTerm = term.replace(/\s+/g, '');
        const searchWords = term.split(/\s+/);
        
        filteredOptions = safeOptions.filter((opt: any) => {
            if (!opt) return false;
            const originalName = String(opt).toLowerCase();
            const continuousName = originalName.replace(/\s+/g, '');

            // ක්‍රමය 1: වචන මාරු වී තිබුණත් (උදා: "clear 30ml") අල්ලා ගැනීම
            const matchesWords = searchWords.every(word => originalName.includes(word));
            
            // ක්‍රමය 2: හිස්තැන් නැතුව Type කරත් (උදා: "30ml" Type කළත් "30 ml" යන්න අල්ලා ගැනීම)
            const matchesContinuous = continuousName.includes(continuousTerm);

            return matchesWords || matchesContinuous;
        });
    }

    const displayOptions = filteredOptions.slice(0, 100);

    return (
        <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase tracking-wide">{label}</label>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer transition-colors flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-indigo-500 dark:focus:border-amber-500'}`}
            >
                <span className="truncate">{value || `Select ${label}`}</span>
                <span className="text-slate-400 text-[10px]">▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl max-h-60 flex flex-col overflow-hidden">
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                    />
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                        {displayOptions.length === 0 ? (
                            <div className="px-3 py-3 text-xs text-slate-400 font-bold text-center">
                                No results found for "{searchTerm}"
                            </div>
                        ) : (
                            <>
                                {displayOptions.map((opt: string, index: number) => (
                                    <div 
                                        // 🟢 අනිවාර්ය වෙනස: React Key එකට index එකක් එකතු කිරීම (DOM Update ගැටළු වළක්වයි)
                                        key={`${opt}-${index}`} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange({ target: { name: 'itemName', value: opt } } as any);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className="px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-amber-500/20 cursor-pointer transition-colors"
                                    >
                                        {opt}
                                    </div>
                                ))}
                                {filteredOptions.length > 100 && displayOptions.length === 100 && (
                                    <div className="px-3 py-2 text-[10px] text-center text-slate-400 font-bold italic border-t border-slate-100 dark:border-slate-800/50 mt-1 pt-2">
                                        Type to search more...
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            {isOpen && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setSearchTerm(''); }}></div>}
        </div>
    );
});







// ============================================================================
// 3. MAIN PLAN FORM MODAL (Add & Edit & Duplicate)
// ============================================================================
export const PlanFormModal = ({ onClose, onSave, products, existingPlans, initialData, planType }: { onClose: () => void, onSave: (plan: IMJobPlan) => void, products: ProductItem[], existingPlans: IMJobPlan[], initialData?: IMJobPlan | null, planType: 'IM' | 'BM' }) => {
    const isEditMode = !!initialData;
    const { userData } = useAuth(); 

    const [isDuplicate, setIsDuplicate] = useState(false);
    
    // 🟢 අලුත් States: Duplicate Job No Check සහ Manual Input සඳහා
    const [completedMonthJobs, setCompletedMonthJobs] = useState<any[]>([]);
    const [isManualJobNo, setIsManualJobNo] = useState(false);
    const [isJobNoDuplicate, setIsJobNoDuplicate] = useState(false);

    const [formData, setFormData] = useState<any>(() => {
        if (initialData) return { ...initialData };
        return {
            machine: '', poNo: '', jobNo: '', customer: '', itemName: '', startDate: '', endDate: '',
            cavities: '', cycleTime: '', targetPerHr: '', shiftTarget: '',
            weight: '', orderQty: '', planQty: '', hldMold: '', days: '', cartonQty: '', packingQty: 0
        };
    });

    const uniqueMachines = useMemo(() => {
        const mList = products.flatMap(p => p.compatibleMachines || []);
        return Array.from(new Set(mList)).filter(Boolean).sort();
    }, [products]);

    const filteredItems = useMemo(() => {
        if (!formData.machine) return [];
        return products.filter(p => (p.compatibleMachines || []).includes(formData.machine)).map(p => p.itemName);
    }, [products, formData.machine]);

    // 🟢 1. Auto Generate Job No සහ Archive Jobs ලබා ගැනීම
    useEffect(() => {
        const generateJobNo = async () => {
            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`; 
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; 
            
            let compJobs: any[] = [];
            if (userData?.collectionName) {
                const factoryRef = `PLANNING_${userData.collectionName}`;
                const docRef = doc(db, factoryRef, `${monthKey}_Completed_${planType}`);
                const compDoc = await getDoc(docRef);
                compJobs = compDoc.exists() ? compDoc.data().items || [] : [];
                setCompletedMonthJobs(compJobs);
            }

            // 🟢 Manual type කරලා තියෙනවා නම් Auto-Generate වීම නවතයි
            if (isManualJobNo) return;

            if (isEditMode && !isDuplicate) {
                setFormData((prev: any) => ({ ...prev, jobNo: initialData?.jobNo || '' }));
                return;
            }

            let maxNum = planType === 'IM' ? 0 : 499;

            try {
                existingPlans.forEach(p => {
                    if (p.jobNo && p.jobNo.startsWith(yearMonth)) {
                        const num = parseInt(p.jobNo.replace(yearMonth, ''), 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                });

                compJobs.forEach((p: any) => {
                    if (p.jobNo && p.jobNo.startsWith(yearMonth)) {
                        const num = parseInt(p.jobNo.replace(yearMonth, ''), 10);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                });

                const nextSequence = String(maxNum + 1).padStart(3, '0');
                setFormData((prev: any) => ({ ...prev, jobNo: `${yearMonth}${nextSequence}` }));

            } catch (error) {
                console.error("Error generating Job No:", error);
                setFormData((prev: any) => ({ ...prev, jobNo: `${yearMonth}${String(maxNum + 1).padStart(3, '0')}` }));
            }
        };

        generateJobNo();
    }, [isEditMode, isDuplicate, existingPlans, userData, planType, initialData, isManualJobNo]);

    // 🟢 අලුත් Effect: Duplicate Job No Validation (Active සහ Archive දෙකම බලයි)
    useEffect(() => {
        if (!formData.jobNo) {
            setIsJobNoDuplicate(false);
            return;
        }
        const currentJobNo = String(formData.jobNo).trim();
        const currentId = initialData?.id; 

        // තමන්ගේම Edit එක හැර අනිත් Active Jobs වල තියෙනවද බැලීම
        const isExistInActive = existingPlans.some(p => String(p.jobNo) === currentJobNo && (!isEditMode || isDuplicate || p.id !== currentId));
        
        // අදාළ මාසයේ Archive/Completed Jobs වල තියෙනවද බැලීම
        const isExistInArchive = completedMonthJobs.some(p => String(p.jobNo) === currentJobNo && (!isEditMode || isDuplicate || p.id !== currentId));

        setIsJobNoDuplicate(isExistInActive || isExistInArchive);
    }, [formData.jobNo, existingPlans, completedMonthJobs, isEditMode, isDuplicate, initialData]);



    // 🟢 2. All Auto-Calculations
    useEffect(() => {
        const cyc = Number(formData.cycleTime) || 0;
        const cav = Number(formData.cavities) || 0;
        const pQty = Number(formData.planQty) || 0;
        const cQty = isDuplicate ? 0 : (Number(formData.completedQty) || 0); // Duplicate කරද්දි Comp Qty 0 කරයි
        const packQty = Number(formData.packingQty) || 0;

        const targetPerHr = (cyc > 0 && cav > 0) ? Math.round((3600 / cyc) * cav) : 0;
        const shiftTarget = targetPerHr > 0 ? Math.round((targetPerHr * 12) * 0.85) : 0;
        
        const days = (pQty > 0 && shiftTarget > 0) ? Number((pQty / (shiftTarget * 2)).toFixed(2)) : 0;
        const cartonQty = (pQty > 0 && packQty > 0) ? Math.ceil(pQty / packQty) : 0;
        
        const balance = pQty - cQty;

        if (targetPerHr !== Number(formData.targetPerHr) || shiftTarget !== Number(formData.shiftTarget) || days !== Number(formData.days) || cartonQty !== Number(formData.cartonQty) || balance !== Number(formData.balance)) {
            setFormData((prev: any) => ({ ...prev, targetPerHr, shiftTarget, days, cartonQty, balance }));
        }
    }, [formData.cycleTime, formData.cavities, formData.planQty, formData.packingQty, formData.completedQty, isDuplicate]);

    // 🟢 3. Event Handlers
    const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData((prev: any) => ({ ...prev, machine: e.target.value, itemName: '' }));

    const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const itemName = e.target.value;
        const prod = products.find(p => p.itemName === itemName);
        if (prod) {
            setFormData((prev: any) => ({
                ...prev, itemName, customer: prod.customer || '', weight: prod.weight || '',
                cavities: prod.actualCavities || prod.cavities || prod.stdCavities || prev.cavities,
                cycleTime: prod.actualCycleTime || prod.standardCycleTime || prev.cycleTime,
                packingQty: prod.packingQty || 0
            }));
        } else {
            setFormData((prev: any) => ({ ...prev, itemName }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));

    // 🟢 Handler: Manual Job No Type කිරීම සඳහා
    const handleJobNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsManualJobNo(true);
        handleChange(e);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pQty = Number(formData.planQty) || 0;
        const cQty = isDuplicate ? 0 : (Number(formData.completedQty) || 0);
        
        const finalPlan: any = {
            ...formData,
            id: (isEditMode && !isDuplicate) ? formData.id : `new_${Date.now()}`,
            planQty: pQty,
            completedQty: cQty,
            balance: pQty - cQty,
            status: (pQty - cQty) <= 0 ? 'completed' : 'pending',
            
            isDuplicate: isDuplicate 
        };
        onSave(finalPlan);
        onClose();
    };

    return (
        <div className={MODAL_OVERLAY_CLASS}>
            <div className={GOLD_MODAL_BOX}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-amber-500/30 bg-slate-100 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-4">
                        <h3 className="font-black text-lg text-slate-800 dark:text-amber-500">
                            {isEditMode && !isDuplicate ? 'Edit Production Plan' : 'Add New Production Plan'}
                        </h3>
                        {/* 🟢 Duplicate Checkbox (Edit Mode එකේදී පමණක් පෙන්වයි) */}
                        {isEditMode && (
                            <label className="flex items-center gap-2 cursor-pointer bg-indigo-100 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-amber-500/30 hover:bg-indigo-200 dark:hover:bg-amber-500/20 transition-colors">
                                <input type="checkbox" checked={isDuplicate} onChange={e => setIsDuplicate(e.target.checked)} className="cursor-pointer accent-indigo-600 dark:accent-amber-500 w-4 h-4" />
                                <span className="text-xs font-black text-indigo-700 dark:text-amber-500 uppercase">Duplicate Job</span>
                            </label>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:text-amber-500 dark:hover:text-amber-300 transition-colors"><X size={20} /></button>
                </div>
                
                {/* Form Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0B1121]">
                    <form id="plan-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">


                            {/* Dropdowns */}
                            <SelectGroup label="Machine" name="machine" required value={formData.machine || ''} onChange={handleMachineChange} options={uniqueMachines} />
                            
                            {/* 🟢 Item Name සඳහා Searchable Dropdown එකක් භාවිත කර ඇත */}
                            <SearchableSelectGroup label="Item Name" disabled={!formData.machine} value={formData.itemName || ''} onChange={handleItemChange} options={filteredItems} />
                            
                            {/* 🟢 Weight එක මෙතැනට ගෙනාවා */}
                            <InputGroup label="Weight (g)" name="weight" type="number" step="0.01" value={formData.weight || ''} onChange={handleChange} />
                            
                            {/* 🟢 Editable Job No Field සහ Error Styling */}
                            <div className="space-y-1">
                                <label className={`text-[10px] font-bold uppercase tracking-wide ${isJobNoDuplicate ? 'text-rose-500' : 'text-slate-500 dark:text-amber-500'}`}>
                                    Job No {isJobNoDuplicate ? '(Duplicate!)' : '(Auto / Editable)'}
                                </label>
                                <input 
                                    name="jobNo" 
                                    value={formData.jobNo || ''} 
                                    onChange={handleJobNoChange} 
                                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none transition-colors ${isJobNoDuplicate ? 'border-rose-500 focus:border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-amber-500'}`} 
                                />
                            </div>

                            <InputGroup label="Customer" name="customer" value={formData.customer || ''} onChange={handleChange} />
                            <InputGroup label="Order Qty" name="orderQty" type="number" value={formData.orderQty || ''} onChange={handleChange} />

                            
                            <InputGroup label="Plan Qty" name="planQty" type="number" value={formData.planQty || ''} onChange={handleChange} />
                            <InputGroup label="Comp. Qty" name="completedQty" type="number" value={isDuplicate ? '0' : (formData.completedQty || '0')} readOnly disabled />
                            <InputGroup
                                label="Balance (Auto)" name="balance" type="number"
                                value={formData.balance || '0'} readOnly
                                font={Number(formData.balance) > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}
                            />
                            
                            <InputGroup label="Cavity" name="cavities" type="number" value={formData.cavities || ''} onChange={handleChange} />
                            <InputGroup label="Cycle Time (s)" name="cycleTime" type="number" value={formData.cycleTime || ''} onChange={handleChange} />
                            <InputGroup label="Target / Hr" name="targetPerHr" type="number" value={formData.targetPerHr || ''} readOnly />
                            
                            <InputGroup label="Shift Target" name="shiftTarget" type="number" value={formData.shiftTarget || ''} readOnly />
                            <InputGroup label="PO No" name="poNo" value={formData.poNo || ''} onChange={handleChange} />
                            <InputGroup label="PO Date" name="poDate" type="date" value={formData.poDate || ''} onChange={handleChange} />
                            
                            <InputGroup label="Start Date" name="startDate" type="date" value={formData.startDate || ''} onChange={handleChange} />
                            <InputGroup label="Days (Auto)" name="days" type="number" value={formData.days || ''} readOnly />
                            <InputGroup label="HLD / Changes" name="hldMold" type="number" value={formData.hldMold || ''} onChange={handleChange} />
                            
                            <InputGroup label="Carton Qty (Auto)" name="cartonQty" type="number" value={formData.cartonQty || ''} readOnly font="text-indigo-600 dark:text-amber-400" />
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">Cancel</button>
                    <button 
                        type="submit" 
                        form="plan-form" 
                        disabled={isJobNoDuplicate}
                        className={`px-6 py-2 text-white dark:text-slate-900 text-xs font-black uppercase rounded shadow-md transition-all ${isJobNoDuplicate ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-70' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400'}`}
                    >
                        {isEditMode && !isDuplicate ? 'Update Plan' : 'Add'}
                    </button>
                </div>

                
            </div>
        </div>
    );
};


// ============================================================================
// 4. DAILY COMPLETION LOG MODAL (Editable Plan Qty & Order Qty & Delete Confirm)
// ============================================================================
export const DailyCompletionModal = ({ job, onClose, onSave }: { job: IMJobPlan, onClose: () => void, onSave: (completions: DailyCompletion[], updatedJobData?: any) => void }) => {
    const [entries, setEntries] = useState<DailyCompletion[]>(job.dailyCompletions || []);

    useEffect(() => {
        setEntries(job.dailyCompletions || []);
    }, [job.dailyCompletions]);


    // 🟢 සෑම විටම ඊයේ දවස (Yesterday) ස්වයංක්‍රීයව තේරී තිබීමට
    const [newDate, setNewDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // අද දවසින් 1ක් අඩු කරයි
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    });
    
    const [newShift, setNewShift] = useState<'Day'|'Night'>('Day');
    const [newQty, setNewQty] = useState('');
    
    // Editable States for Plan Qty & Order Qty
    const [editablePlanQty, setEditablePlanQty] = useState(Number(job.planQty) || 0);
    const [editableOrderQty, setEditableOrderQty] = useState(Number(job.orderQty) || 0);
    
    const [isEditingPlan, setIsEditingPlan] = useState(false);
    const [isEditingOrder, setIsEditingOrder] = useState(false);

    // 🟢 අලුත් State එක: Delete Confirmation සඳහා
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

    // Auto Calculations based on entries
    const totalCompleted = entries.reduce((sum, entry) => sum + (Number(entry.qty) || 0), 0);
    const balance = editablePlanQty - totalCompleted;

    const handleAddEntry = () => {
        if (!newDate || !newQty) return;
        setEntries([...entries, { id: Date.now().toString(), date: newDate, shift: newShift, qty: Number(newQty) } as any]);
        setNewQty('');
    };

    const handleSaveClick = () => {
        onSave(entries, {
            planQty: editablePlanQty,
            orderQty: editableOrderQty,
            balance: balance
        });
        onClose();
    };

    return (
        <div className={MODAL_OVERLAY_CLASS}>
            <div className={GOLD_MODAL_BOX}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-amber-500/30 bg-slate-100 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800">
                    <div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-amber-500 flex items-center gap-2"><Factory size={18} /> Daily Log</h3>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{job.jobNo} | {job.itemName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:text-amber-500 dark:hover:text-amber-300 transition-colors"><X size={20} /></button>
                </div>
                
                {/* Body */}
                <div className="p-5 flex-1 overflow-y-auto bg-white dark:bg-[#0B1121] custom-scrollbar">
                    {/* Input Controls */}
                    <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 space-y-1 min-w-[120px]">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase">Date</label>
                            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-amber-500 dark:[color-scheme:dark]" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase text-center block">Shift</label>
                             <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 p-1">
                                <button onClick={() => setNewShift('Day')} className={`p-1.5 rounded-md transition-all ${newShift === 'Day' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white'}`}><Sun size={16} /></button>
                                <button onClick={() => setNewShift('Night')} className={`p-1.5 rounded-md transition-all ${newShift === 'Night' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white'}`}><Moon size={16} /></button>
                             </div>
                        </div>
                        <div className="flex-1 space-y-1 min-w-[100px]">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-amber-500 uppercase">Qty</label>
                            <input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-amber-500" />
                        </div>
                        <button onClick={handleAddEntry} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-900 p-2.5 rounded-lg shadow-md transition-colors flex justify-center"><Plus size={20} strokeWidth={3} /></button>
                    </div>
                    
                    {/* Log List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {entries.length === 0 && <p className="text-center text-xs text-slate-400 font-bold py-4">No records found.</p>}
                        {entries.map((entry: any) => (
                            <div key={entry.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400"><Calendar size={12} className="inline mr-1 text-slate-400 dark:text-slate-500"/> {entry.date}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${entry.shift === 'Day' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>{entry.shift || 'Day'}</span>
                                    {entry.isAuto && <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded uppercase">Auto</span>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-black text-slate-800 dark:text-white tracking-wider">{Number(entry.qty).toLocaleString()}</span>
                                    
                                    {/* 🟢 කෙලින්ම මකන්නේ නැතුව entryToDelete State එකට අංකය ලබා දීම */}
                                    <button onClick={() => setEntryToDelete(entry.id)} className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors"><X size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Footer Dashboard & Action */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
                        {/* Editable ORDER QTY */}
                        <div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase mb-1">Order Qty</span>
                            {isEditingOrder ? (
                                <input 
                                    type="number" autoFocus
                                    value={editableOrderQty} 
                                    onChange={e => setEditableOrderQty(Number(e.target.value))} 
                                    onBlur={() => setIsEditingOrder(false)}
                                    className="w-20 bg-white dark:bg-slate-900 border border-indigo-500 dark:border-amber-500 rounded px-1 py-0.5 text-base font-black text-slate-800 dark:text-white outline-none"
                                />
                            ) : (
                                <span 
                                    onClick={() => setIsEditingOrder(true)} 
                                    className="text-base font-black text-slate-700 dark:text-slate-200 tracking-tight cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded transition-colors"
                                    title="Click to edit"
                                >
                                    {editableOrderQty.toLocaleString()}
                                </span>
                            )}
                        </div>

                        {/* Editable PLAN QTY */}
                        <div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase mb-1">Plan Qty</span>
                            {isEditingPlan ? (
                                <input 
                                    type="number" autoFocus
                                    value={editablePlanQty} 
                                    onChange={e => setEditablePlanQty(Number(e.target.value))} 
                                    onBlur={() => setIsEditingPlan(false)}
                                    className="w-20 bg-white dark:bg-slate-900 border border-indigo-500 dark:border-amber-500 rounded px-1 py-0.5 text-base font-black text-slate-800 dark:text-white outline-none"
                                />
                            ) : (
                                <span 
                                    onClick={() => setIsEditingPlan(true)} 
                                    className="text-base font-black text-slate-700 dark:text-slate-200 tracking-tight cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 px-1 rounded transition-colors"
                                    title="Click to edit"
                                >
                                    {editablePlanQty.toLocaleString()}
                                </span>
                            )}
                        </div>

                        {/* Read-only COMPLETED */}
                        <div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase mb-1">Completed</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight px-1">
                                {totalCompleted.toLocaleString()}
                            </span>
                        </div>

                        {/* Read-only BALANCE */}
                        <div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase mb-1">Balance</span>
                            <span className={`text-base font-black tracking-tight px-1 ${balance < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-amber-600 dark:text-amber-500'}`}>
                                {balance.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    
                    <button onClick={handleSaveClick} className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-900 text-xs font-black uppercase rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors">
                        <Save size={16} /> Save Log
                    </button>
                </div>

                {/* 🟢 CUSTOM CONFIRM DIALOG FOR DELETION */}
                {entryToDelete && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden transform transition-all">
                            <div className="p-6">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Delete Log?</h3>
                                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">Are you sure you want to delete this completed record? This action cannot be undone.</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button 
                                    onClick={() => setEntryToDelete(null)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors outline-none"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        // තහවුරු කළ පසු පමණක් මකා දමයි
                                        setEntries(entries.filter(e => e.id !== entryToDelete));
                                        setEntryToDelete(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-colors outline-none bg-rose-600 hover:bg-rose-700"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};