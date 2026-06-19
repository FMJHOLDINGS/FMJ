import React, { useMemo, memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { IMJobPlan } from './PlanningTypes';
import { PlanningService } from './PlanningService';
import { useAuth } from '../../context/AuthContext';

const formatDateDisplay = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '-');
};

interface CompletedPlanViewProps {
    planType: 'IM' | 'BM';
    selectedMonth: string;
    refreshTrigger: number; // 🟢 Data refresh කිරීම සඳහා
    onEditArchived: (plan: IMJobPlan, monthKey: string) => void; // 🟢 Edit Action එක
    onOpenCompletion: (plan: IMJobPlan, monthKey: string) => void;
    readOnly?: boolean;
}




const CompletedTableRow = memo(({ plan, onEdit, onDelete, onOpenCompletion, readOnly }: any) => {
    const tdClasses = "p-1.5 border-b border-r border-slate-300 dark:border-slate-700 text-[11px] whitespace-nowrap font-bold text-slate-800 dark:text-slate-300 text-center";
    
    // 🟢 අලුත් State: Confirmation Popup එක පෙන්වීමට
    const [confirmAction, setConfirmAction] = useState<'edit' | 'delete' | null>(null);

    const handleConfirm = () => {
        if (confirmAction === 'edit') onEdit(plan);
        if (confirmAction === 'delete') onDelete(plan.id);
        setConfirmAction(null);
    };

    return (
        <tr className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-[#0B1121]">
            <td className={`${tdClasses} text-emerald-700 dark:text-emerald-400`}>{plan.machine || 'Unassigned'}</td>
            <td className={`${tdClasses} text-left min-w-[200px] max-w-[200px] truncate`} title={plan.itemName}>
                {plan.itemName}
            </td>
            
            <td className={tdClasses}>{plan.weight || '-'}</td>
            <td className={`${tdClasses} text-left min-w-[120px]`}>{plan.customer || '-'}</td>
            <td className={tdClasses}>{plan.jobNo}</td>
            <td className={tdClasses}>{plan.poNo || '-'}</td>
            <td className={tdClasses}>{formatDateDisplay(plan.poDate)}</td>
            <td className={tdClasses}>{Number(plan.orderQty || 0).toLocaleString()}</td>
            <td className={tdClasses}>{Number(plan.planQty || 0).toLocaleString()}</td>


            <td className={tdClasses}>
                <div className="flex justify-center">
                    <button 
                        onClick={() => { if (!readOnly) onOpenCompletion(plan); }} 
                        className={`text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded transition-colors font-black ${!readOnly ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer' : 'cursor-default'}`}>
                        {Number(plan.completedQty || 0).toLocaleString()}
                    </button>
                </div>
            </td>
            <td className={`${tdClasses} text-rose-500`}>{Number(plan.balance || 0).toLocaleString()}</td>
            <td className={tdClasses}>{formatDateDisplay(plan.startDate)}</td>
            <td className={tdClasses}>{formatDateDisplay(plan.endDate)}</td>
            
            <td className={`${tdClasses} w-[60px] min-w-[60px] relative`}>
                {!readOnly && (
                    <div className="flex justify-center gap-3">
                        <button onClick={() => setConfirmAction('edit')} className="text-slate-400 hover:text-amber-500 transition-colors" title="Edit Plan"><Edit2 size={14} /></button>
                        <button onClick={() => setConfirmAction('delete')} className="text-slate-400 hover:text-rose-500 transition-colors" title="Delete Plan"><Trash2 size={14} /></button>
                    </div>
                )}



                {/* 🟢 CUSTOM CONFIRMATION MODAL (Fixed using React Portal) */}
                {confirmAction && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#0B1121] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 transform-gpu transition-all">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 whitespace-normal text-left">
                                {confirmAction === 'delete' ? 'Confirm Permanent Deletion' : 'Confirm Edit'}
                            </h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 whitespace-normal text-left">
                                {confirmAction === 'delete' 
                                    ? `Are you sure you want to permanently delete Archived Job No: ${plan.jobNo || '-'}? This action cannot be undone.` 
                                    : `Do you want to proceed to edit Archived Job No: ${plan.jobNo || '-'}?`}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleConfirm} className={`px-4 py-2 text-xs font-black text-white rounded-lg shadow-md transition-colors ${confirmAction === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                                    {confirmAction === 'delete' ? 'Yes, Delete' : 'Yes, Edit'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </td>
        </tr>
    );
});




const CompletedPlanView = ({ planType, selectedMonth, refreshTrigger, onEditArchived, onOpenCompletion, readOnly }: CompletedPlanViewProps) => {
    const { userData } = useAuth();
    const collectionName = userData?.collectionName;

    const [archivedPlans, setArchivedPlans] = useState<IMJobPlan[]>([]);
    const [loading, setLoading] = useState(false);

    // 🟢 getDoc වෙනුවට Live Sync (onSnapshot) භාවිතා කිරීම
    useEffect(() => {
        if (!collectionName || !selectedMonth) return;
        setLoading(true);

        const unsubscribe = PlanningService.subscribeToCompletedJobs(collectionName, planType, selectedMonth, (data) => {
            setArchivedPlans(data);
            setLoading(false);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [collectionName, planType, selectedMonth]); 

    
    // 🟢 Delete Logic (Directly deletes from Archive DB)
    const handleDelete = async (jobId: string) => {
        
        if (!collectionName) return;
        await PlanningService.deleteArchivedJob(collectionName, planType, selectedMonth, jobId);
        setArchivedPlans(prev => prev.filter(p => p.id !== jobId));
    };



    const groupedPlans = useMemo(() => {
        const groups: Record<string, IMJobPlan[]> = {};
        archivedPlans.forEach(plan => {
            const machine = plan.machine || 'Unassigned';
            if (!groups[machine]) groups[machine] = [];
            groups[machine].push(plan);
        });
        
        const sortedMachines = Object.keys(groups).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });

        return { groups, sortedMachines };
    }, [archivedPlans]);

    const thClasses = "p-1.5 border-b border-r border-slate-300 dark:border-slate-700 text-xs font-black uppercase text-emerald-900 dark:text-emerald-400 whitespace-nowrap text-center bg-emerald-50 dark:bg-emerald-900/20";

    return (
        <div className="h-full w-full flex flex-col gap-3 p-1">
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10 transform-gpu">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white dark:bg-[#0B1121] rounded-xl border border-slate-200 dark:border-slate-800">
                        <Loader2 size={32} className="animate-spin text-emerald-500 mb-2" />
                        <p className="text-xs font-bold uppercase">Loading Archived Jobs...</p>
                    </div>
                ) : archivedPlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white dark:bg-[#0B1121] rounded-xl border border-slate-200 dark:border-slate-800">
                        <CheckCircle2 size={32} className="opacity-50 mb-2" />
                        <p className="text-xs font-bold uppercase">No completed jobs found for {selectedMonth}.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedPlans.sortedMachines.map(machine => (
                            <div key={machine} className="bg-white dark:bg-[#0B1121] border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-3 py-2 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/80 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{machine}</h4>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600">
                                        {groupedPlans.groups[machine].length} Completed
                                    </span>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar transform-gpu w-full">
                                    <table className="w-full border-collapse table-fixed min-w-max">
                                        <thead>
                                            <tr>
                                                <th className={thClasses}>Machine</th>
                                                <th className={`${thClasses} text-left`}>Item Name</th>
                                                <th className={thClasses}>Weight</th>
                                                <th className={`${thClasses} text-left`}>Customer</th>
                                                <th className={thClasses}>Job No</th>
                                                <th className={thClasses}>PO No</th>
                                                <th className={thClasses}>PO Date</th>
                                                <th className={thClasses}>Order Qty</th>
                                                <th className={thClasses}>Plan Qty</th>
                                                <th className={thClasses}>Comp. Qty</th>
                                                <th className={thClasses}>Balance</th>
                                                <th className={thClasses}>Prod. Start</th>
                                                <th className={thClasses}>Prod. End</th>
                                                <th className={thClasses}>Actions</th>
                                            </tr>
                                        </thead>


                                        
                                        <tbody>
                                            {groupedPlans.groups[machine].map(plan => (
                                                <CompletedTableRow 
                                                    key={plan.id} 
                                                    plan={plan} 
                                                    onEdit={() => onEditArchived(plan, selectedMonth)} 
                                                    onOpenCompletion={() => onOpenCompletion(plan, selectedMonth)}
                                                    onDelete={handleDelete} 
                                                    readOnly={readOnly}
                                                />
                                            ))}
                                        </tbody>


                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompletedPlanView;