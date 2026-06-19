import React, { useState, useMemo, memo, useCallback } from 'react';
import { Layout, Factory, ChevronDown, ChevronRight, Hash, Package } from 'lucide-react';
import { usePlanningManager } from './usePlanningManager';
import { IMJobPlan } from './PlanningTypes';
import { PlanningService } from './PlanningService';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// 1. THEME & COLORS CONFIGURATION (පහසුවෙන් වර්ණ වෙනස් කිරීමට)
// ============================================================================
const THEME = {
    bgMain: "bg-white dark:bg-[#0B1121]",
    bgTabActive: "bg-slate-800 dark:bg-slate-700",
    bgTabInactive: "bg-slate-100 dark:bg-slate-900",
    bgTableHeader: "bg-slate-100 dark:bg-slate-800",
    
    
    bgRowParent: "bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50", 
    bgRowChild: "bg-slate-50/50 dark:bg-[#0f172a]/50 hover:bg-slate-100 dark:hover:bg-slate-800/80", 
    bgRowOverdue: "bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50", 

    borderTable: "border-slate-300 dark:border-slate-700",
    textPrimary: "text-slate-800 dark:text-slate-200",
    textSecondary: "text-slate-500 dark:text-slate-400",
    textHeader: "text-slate-700 dark:text-slate-300",
    
    qtyText: "text-emerald-600 dark:text-emerald-400",
    balanceText: "text-rose-500 dark:text-rose-400",
    poText: "text-indigo-600 dark:text-indigo-400",
};



// ============================================================================
// 2. DATE & DAYS HELPER FUNCTIONS
// ============================================================================
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }).replace(' ', '-');
};

const calculateDays = (dateStr?: string) => {
    if (!dateStr) return '-';
    const poDate = new Date(dateStr);
    if (isNaN(poDate.getTime())) return '-';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    poDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - poDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
};

// ============================================================================
// 3. EDITABLE PRODUCT NAME COMPONENT (Click to Edit)
// ============================================================================
const EditableProductName = memo(({ initialName, onSave }: { initialName: string, onSave: (val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(initialName);

    const handleBlur = () => {
        setIsEditing(false);
        
        if (val !== initialName) onSave(val.trim());
        else setVal(initialName);
    };

    return isEditing ? (
        <input 
            autoFocus value={val} onChange={e => setVal(e.target.value)} 
            onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} 
            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-indigo-500 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-bold shadow-inner"
        />
    ) : (
        <div 
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setVal(initialName); }} 
            className="cursor-text hover:bg-slate-200 dark:hover:bg-slate-700/60 px-1 -ml-1 rounded transition-colors border-b border-dashed border-slate-400 dark:border-slate-500 inline-block"
            title="Click to edit Display Name"
        >
            {initialName}
        </div>
    );
});



// ============================================================================
// 4. TABLE COMPONENTS
// ============================================================================

// 🟢 අත්වැරදීමකින් මඟහැරුණු Table Header කොටස මෙතනින් දාන්න
const TableHeader = memo(() => (
    <thead>
        <tr className={THEME.bgTableHeader}>
            <th className={`p-2 border ${THEME.borderTable} w-[80px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>PO Date</th>
            <th className={`p-2 border ${THEME.borderTable} w-[60px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Days</th>
            <th className={`p-2 border ${THEME.borderTable} w-[130px] text-left text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>PO Number</th>
            <th className={`p-2 border ${THEME.borderTable} w-[80px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Machine</th>
            <th className={`p-2 border ${THEME.borderTable} min-w-[200px] text-left text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Product Name</th>
            <th className={`p-2 border ${THEME.borderTable} w-[90px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Order Qty</th>
            
            
            <th className={`p-2 border ${THEME.borderTable} w-[90px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Completed</th>
            
            <th className={`p-2 border ${THEME.borderTable} w-[90px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Balance</th>
            <th className={`p-2 border ${THEME.borderTable} w-[90px] text-center text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`}>Delivered</th>
        </tr>
    </thead>
));




// 🟢 Single Job Row
const SingleRow = memo(({ job, isOverdue, onUpdateName }: { job: IMJobPlan, isOverdue: boolean, onUpdateName: (jobs: IMJobPlan[], name: string) => void }) => {
    const tdClass = `p-2 border ${THEME.borderTable} text-[11px] font-bold ${THEME.textPrimary} whitespace-nowrap`;
    const displayName = (job as any).summaryName || job.itemName || ''; 
    const rowBg = isOverdue ? THEME.bgRowOverdue : THEME.bgRowParent; 

    return (
        <tr className={`${rowBg} transition-colors`}>
            <td className={`${tdClass} text-center ${isOverdue ? 'text-rose-600 dark:text-rose-400' : THEME.textSecondary}`}>{formatDate(job.poDate)}</td>
            <td className={`${tdClass} text-center text-amber-600 dark:text-amber-500`}>{calculateDays(job.poDate)}</td>
            <td className={tdClass}>
                <div className="flex items-center gap-2 pl-6"><Hash size={12} className={THEME.textSecondary} /><span className={THEME.poText}>{job.poNo ? job.poNo : 'Not Mention'}</span></div>
            </td>
            <td className={`${tdClass} text-center`}>{job.machine || '-'}</td>
            
            {/* 🟢 වෙනස 1: තනි ජොබ් එකක් ඇති විට Edit කිරීම ඉවත් කර සාමාන්‍ය අකුරු ලෙස පෙන්වීම */}
            <td className={`${tdClass} ${THEME.textPrimary}`}>{displayName}</td>
            
            <td className={`${tdClass} text-center`}>{job.orderQty?.toLocaleString() || '-'}</td>
            
            <td className={`${tdClass} text-center text-emerald-500`}>{job.completedQty?.toLocaleString() || '0'}</td>
            
            <td className={`${tdClass} text-center ${THEME.balanceText}`}>{job.balance?.toLocaleString() || '-'}</td>
            <td className={`${tdClass} text-center text-indigo-600 dark:text-indigo-400`}>-</td>
        </tr>
    );
});




// 🟢 Expandable Row Group
const ExpandableRowGroup = memo(({ poNo, jobs, isOverdue, onUpdateName }: { poNo: string, jobs: IMJobPlan[], isOverdue: boolean, onUpdateName: (jobs: IMJobPlan[], name: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const tdClass = `p-2 border ${THEME.borderTable} text-[11px] font-bold whitespace-nowrap`;
    
    const poDate = jobs[0]?.poDate;
    const combinedName = (jobs[0] as any)?.summaryName || Array.from(new Set(jobs.map(j => j.itemName))).join(' + ');
    
    // 🟢 වෙනස: Totals වලින් planQty ඉවත් කර ඇත
    const totals = jobs.reduce((acc, job) => ({
        order: acc.order + (Number(job.orderQty) || 0), 
        comp: acc.comp + (Number(job.completedQty) || 0), 
        bal: acc.bal + (Number(job.balance) || 0),
    }), { order: 0, comp: 0, bal: 0 });

    const parentBg = isOverdue ? THEME.bgRowOverdue : THEME.bgRowParent;

    return (
        <>
            <tr onClick={() => setIsExpanded(!isExpanded)} className={`${parentBg} cursor-pointer transition-colors`}>
                <td className={`${tdClass} text-center ${isOverdue ? 'text-rose-600 dark:text-rose-400' : THEME.textSecondary}`}>{formatDate(poDate)}</td>
                <td className={`${tdClass} text-center text-amber-600 dark:text-amber-500`}>{calculateDays(poDate)}</td>
                <td className={`${tdClass} ${THEME.textPrimary}`}>
                    <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className={THEME.poText} /> : <ChevronRight size={14} className={THEME.poText} />}
                        <span className={`${THEME.poText} font-black`}>{jobs[0].poNo ? jobs[0].poNo : 'Not Mention'}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>{jobs.length} Jobs</span>
                    </div>
                </td>
                
                <td className={`${tdClass} text-center ${THEME.textPrimary}`}>-</td>
                
                <td className={`${tdClass} ${THEME.textPrimary}`} onClick={e => e.stopPropagation()}>
                    <EditableProductName initialName={combinedName} onSave={(newName) => onUpdateName(jobs, newName)} />
                </td>
                
                {/* 🟢 වෙනස: Parent Row එකට Delivered තීරුව යෙදීම */}
                <td className={`${tdClass} text-center ${THEME.textPrimary}`}>{totals.order.toLocaleString()}</td>
                <td className={`${tdClass} text-center text-emerald-500`}>{totals.comp.toLocaleString()}</td>
                
                <td className={`${tdClass} text-center ${THEME.balanceText}`}>{totals.bal.toLocaleString()}</td>
                <td className={`${tdClass} text-center text-indigo-600 dark:text-indigo-400`}>-</td>
            </tr>

            {/* 🟢 වෙනස: Child Rows වලට Delivered තීරුව යෙදීම */}
            {isExpanded && jobs.map(job => (
                <tr key={job.id} className={`${THEME.bgRowChild} transition-colors`}>
                    <td colSpan={2} className={`${tdClass} border-r-0`}></td>
                    <td className={`${tdClass} pl-8 ${THEME.textSecondary} border-l-0`}>
                        <div className="flex items-center gap-2"><Package size={10} /> {job.jobNo || '-'}</div>
                    </td>
                    <td className={`${tdClass} text-center ${THEME.textSecondary}`}>{job.machine || '-'}</td>
                    <td className={`${tdClass} ${THEME.textSecondary}`}>{job.itemName} {job.customer ? `(${job.customer})` : ''}</td>
                    <td className={`${tdClass} text-center ${THEME.textSecondary}`}>{job.orderQty?.toLocaleString() || '-'}</td>
                    <td className={`${tdClass} text-center ${THEME.textSecondary}`}>{job.completedQty?.toLocaleString() || '0'}</td>
                    
                    <td className={`${tdClass} text-center ${THEME.textSecondary}`}>{job.balance?.toLocaleString() || '-'}</td>
                    <td className={`${tdClass} text-center ${THEME.textSecondary}`}>-</td>
                </tr>
            ))}
        </>
    );
});







// ============================================================================
// 5. MAIN COMPONENT
// ============================================================================
const PlanningSummary = ({ readOnly }: { readOnly?: boolean }) => {
    const { userData } = useAuth();
    const [subTab, setSubTab] = useState<'IM' | 'BM'>('IM');

    // 🟢 අලුත් State: Pending සහ Completed බැලීමට
    const [viewTab, setViewTab] = useState<'pending' | 'completed'>('pending');

    const { plans: imPlans } = usePlanningManager('IM');
    const { plans: bmPlans } = usePlanningManager('BM');

    // 🟢 Grouping & Status Filtering Logic
    const sortedGroupedData = useMemo(() => {
        const activePlans = subTab === 'IM' ? imPlans : bmPlans;
        const groups: Record<string, IMJobPlan[]> = {};
        
        activePlans.forEach(job => {
            const poKey = (job.poNo && job.poNo.trim() !== '') ? job.poNo.trim() : `NO_PO_${job.id}`;
            if (!groups[poKey]) groups[poKey] = [];
            groups[poKey].push(job);
        });

        const todayStr = new Date().toISOString().split('T')[0];

        const filtered = Object.entries(groups).map(([poKey, jobs]) => {
            const poDateStr = jobs[0]?.poDate || '';
            const totalBalance = jobs.reduce((sum, j) => sum + (Number(j.balance) || 0), 0);
            
            // 🟢 අලුත්: Overdue ලොජික් එක (පරණ දිනයක් සහ Balance > 0 නම්)
            const isPast = poDateStr && poDateStr < todayStr;
            const isOverdue = Boolean(isPast && totalBalance > 0);

            // 🟢 අලුත්: PO එකේ සම්පූර්ණ Status එක තීරණය කිරීම
            // මුළු Balance එක 0 ට සමාන හෝ අඩු නම් පමණක් එය Completed වේ.
            const isFullyCompleted = totalBalance <= 0;

            return { poNoKey: poKey, jobs, isOverdue, poDateStr, isFullyCompleted };
        }).filter(group => {
            // 🟢 අලුත්: තෝරාගත් Tab (Pending/Completed) එක අනුව Filter කිරීම
            if (viewTab === 'completed') {
                return group.isFullyCompleted;
            } else {
                return !group.isFullyCompleted;
            }
        }).sort((a, b) => {
            // Pending ටැබ් එකේදී Overdue ඒවා උඩින් පෙන්වයි
            if (viewTab === 'pending') {
                if (a.isOverdue && !b.isOverdue) return -1;
                if (!a.isOverdue && b.isOverdue) return 1;
            }
            return a.poDateStr.localeCompare(b.poDateStr);
        });

        return filtered;
    }, [subTab, imPlans, bmPlans, viewTab]);



    const handleUpdateName = useCallback(async (jobsToUpdate: IMJobPlan[], newName: string) => {
        if (!userData?.collectionName) return;
        try {
            const jobIdsToUpdate = jobsToUpdate.map(j => j.id);
            const activePlans = subTab === 'IM' ? imPlans : bmPlans;

            const updatedPlans = activePlans.map(job => {
                if (jobIdsToUpdate.includes(job.id)) return { ...job, summaryName: newName } as any; 
                return job;
            });

            if (subTab === 'IM') await PlanningService.saveIMPlans(userData.collectionName, updatedPlans);
            else await (PlanningService as any).saveBMPlans(userData.collectionName, updatedPlans);
        } catch (error) {
            console.error("Failed to update summary names: ", error);
        }
    }, [userData?.collectionName, subTab, imPlans, bmPlans]);

    return (
        <div className="h-full w-full flex flex-col gap-3 p-1">
            <div className={`flex flex-col sm:flex-row items-center justify-between shrink-0 ${THEME.bgMain} p-2 rounded-xl border ${THEME.borderTable} shadow-sm gap-3`}>
                <div className="flex items-center gap-3 pl-2 w-full sm:w-auto">
                    <div className={`p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400`}><Layout size={16} /></div>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${THEME.textPrimary}`}>Order Summary</h3>
                </div>



                {/* 🟢 Pending / Completed Switch */}
                <div className={`flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border ${THEME.borderTable}`}>
                    <button 
                        onClick={() => setViewTab('pending')} 
                        className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${viewTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}
                    >
                        Pending PO
                    </button>
                    <button 
                        onClick={() => setViewTab('completed')} 
                        className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${viewTab === 'completed' ? 'bg-emerald-500 text-white shadow-sm' : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}
                    >
                        Completed
                    </button>
                </div>





                <div className={`flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border ${THEME.borderTable}`}>
                    <button onClick={() => setSubTab('IM')} className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${subTab === 'IM' ? `${THEME.bgTabActive} text-white shadow-sm` : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}><Layout size={12} /> IM</button>
                    <button onClick={() => setSubTab('BM')} className={`flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${subTab === 'BM' ? `${THEME.bgTabActive} text-white shadow-sm` : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}><Factory size={12} /> BM</button>
                </div>
            </div>

            <div className={`flex-1 overflow-auto custom-scrollbar ${THEME.bgMain} border ${THEME.borderTable} rounded-xl shadow-sm transform-gpu`} style={{ willChange: 'transform' }}>
                <table className="border-collapse table-fixed w-full min-w-[1050px]">
                    <TableHeader />
                    <tbody>
                    {sortedGroupedData.length === 0 ? (
                            <tr><td colSpan={9} className={`p-8 text-center text-xs font-bold uppercase tracking-widest ${THEME.textSecondary}`}>No Active Jobs Found</td></tr>
                        ) : (
                            sortedGroupedData.map(({ poNoKey, jobs, isOverdue }) => (
                                jobs.length === 1 
                                    ? <SingleRow key={jobs[0].id} job={jobs[0]} isOverdue={isOverdue} onUpdateName={handleUpdateName} />
                                    : <ExpandableRowGroup key={poNoKey} poNo={poNoKey} jobs={jobs} isOverdue={isOverdue} onUpdateName={handleUpdateName} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlanningSummary;