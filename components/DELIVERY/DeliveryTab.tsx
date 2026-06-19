import React, { useState, useMemo, memo, useCallback } from 'react';
import { Truck, Package, ChevronDown, ChevronRight, Hash, CheckCircle2, Clock, X, Plus, Save, Calendar, Trash2, AlertTriangle, Download } from 'lucide-react';
import { usePlanningManager } from '../PLANNING/usePlanningManager';
import { IMJobPlan } from '../PLANNING/PlanningTypes';
import { useAuth } from '../../context/AuthContext';
// 🟢 අලුතින් හදාගත්තු Delivery Hook එක Import කිරීම
import { useDeliveryManager } from './useDeliveryManager';
import { exportDeliveryToExcel } from './DeliveryExcelExport';

// ============================================================================
// 1. THEME & COLORS CONFIGURATION
// ============================================================================
const THEME = {
    bgMain: "bg-white dark:bg-[#0B1121]",
    bgTabActive: "bg-orange-500 dark:bg-orange-600",
    bgTabInactive: "bg-slate-100 dark:bg-slate-800",
    bgTableHeader: "bg-slate-100 dark:bg-slate-800",
    bgRowParent: "bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50", 
    bgRowChild: "bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50", 
    bgRowOverdue: "bg-white dark:bg-[#0B1121] hover:bg-slate-50 dark:hover:bg-slate-800/50", 
    borderTable: "border-slate-200 dark:border-slate-800",
    textPrimary: "text-slate-800 dark:text-slate-200",
    textSecondary: "text-slate-500 dark:text-slate-400",
    textHeader: "text-slate-700 dark:text-slate-300",
    customerText: "text-sky-600 dark:text-sky-400",
    balanceText: "text-rose-500 dark:text-rose-400",
    poText: "text-indigo-600 dark:text-indigo-400",
    deliveryText: "text-orange-500 dark:text-orange-400"
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }).replace(' ', '-');
};

// ============================================================================
// 2. DELIVERY MODAL COMPONENT
// ============================================================================
const DeliveryModal = memo(({ job, onClose, deliveryData, onSaveLog, onDeleteLog }: { 
    job: IMJobPlan | null, 
    onClose: () => void,
    deliveryData: Record<string, any>,
    onSaveLog: (jobId: string, date: string, qty: number) => void,
    onDeleteLog: (jobId: string, date: string) => void // 🟢 අලුතින් එක් කළා
}) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [dateStr, setDateStr] = useState(todayStr);
    const [qtyStr, setQtyStr] = useState('');
    
    // 🟢 Delete Confirm Popup එක පෙන්වීමට අදාළ State එක
    const [logToDelete, setLogToDelete] = useState<string | null>(null);

    if (!job) return null;

    const jobLogs = deliveryData[job.id] || {};
    const totalDelivered: number = Object.values(jobLogs).reduce<number>((sum, val) => sum + Number(val), 0);
    const orderQty: number = Number(job.orderQty) || 0;
    const currentBalance: number = orderQty - totalDelivered;

    const handleSave = () => {
        const qty = Number(qtyStr);
        if (dateStr && qty > 0) {
            onSaveLog(job.id, dateStr, qty);
            setQtyStr('');
        }
    };

    const confirmDelete = () => {
        if (logToDelete) {
            onDeleteLog(job.id, logToDelete);
            setLogToDelete(null); // මකා දැමූ පසු Popup එක වසයි
        }
    };

    const sortedLogs = Object.entries(jobLogs).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));

    

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* 🟢 Delete Confirmation Overlay (Popup) */}
                {logToDelete && (
                    <div className="absolute inset-0 z-[60] bg-white/90 dark:bg-[#0F172A]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
                        <div className="bg-rose-100 dark:bg-rose-500/20 p-4 rounded-full mb-4">
                            <AlertTriangle className="text-rose-600 dark:text-rose-400 w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 uppercase tracking-wide">Delete Log Entry?</h3>
                        <p className="text-xs font-bold text-slate-500 text-center mb-6 max-w-sm">
                            Are you sure you want to delete the delivery record for <span className="text-rose-500">{logToDelete}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-4 w-full max-w-xs">
                            <button onClick={() => setLogToDelete(null)} className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/30 transition-all active:scale-95">
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-[#131C31]">
                    <div>
                        <div className="flex items-center gap-2 text-orange-500 mb-1">
                            <Truck size={20} />
                            <h2 className="text-lg font-black tracking-wide uppercase">Delivery Log</h2>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {job.poNo || 'NO PO'} | {job.customer || 'No Customer'} | {job.itemName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Input Section */}
                <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-end gap-3 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        {/* ... (Date & Qty Inputs එක එලෙසම ඇත) ... */}
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full bg-white dark:bg-[#0B1121] border border-slate-300 dark:border-slate-600 rounded-lg py-2 pl-9 pr-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" />
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Delivered Qty</label>
                            <input type="number" placeholder="Enter Quantity" value={qtyStr} onChange={(e) => setQtyStr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="w-full bg-white dark:bg-[#0B1121] border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" />
                        </div>

                        <button onClick={handleSave} disabled={!qtyStr || Number(qtyStr) <= 0} className="w-full sm:w-auto px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-white rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* සේව් වූ Logs ලැයිස්තුව */}
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {sortedLogs.length === 0 ? (
                            <p className="text-center text-xs font-bold text-slate-400 py-4 uppercase tracking-widest">No Deliveries Logged Yet</p>
                        ) : (
                            sortedLogs.map(([logDate, logQty]) => (
                                <div key={logDate} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between group transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <Calendar size={12} className="text-slate-400" /> {logDate}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-black text-emerald-500">{Number(logQty).toLocaleString()}</span>
                                        {/* 🟢 අලුත් Delete Button එක */}
                                        <button 
                                            onClick={() => setLogToDelete(logDate)}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-md transition-all opacity-50 group-hover:opacity-100"
                                            title="Delete Log"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131C31] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-6 w-full sm:w-auto">
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Order Qty</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{orderQty.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Delivered</p>
                            <p className="text-sm font-black text-emerald-500">{totalDelivered.toLocaleString()}</p>
                        </div>
                        {/* 🟢 නම වෙනස් කළා */}
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Remain Delivery</p>
                            <p className={`text-sm font-black ${currentBalance <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {currentBalance.toLocaleString()}
                            </p>
                        </div>
                        {/* 🟢 Remain Stock එක Modal එකටත් එක් කළා */}
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Remain Stock</p>
                            <p className={`text-sm font-black ${((Number(job.completedQty) || 0) - totalDelivered) > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                                {((Number(job.completedQty) || 0) - totalDelivered).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30">
                        <CheckCircle2 size={16} /> Done
                    </button>
                </div>

                
            </div>
        </div>
    );
});




// ============================================================================
// 3. TABLE HEADER COMPONENT
// ============================================================================
const TableHeader = memo(() => {
    const thClass = `sticky top-0 z-10 ${THEME.bgTableHeader} p-2 border ${THEME.borderTable} text-[10px] sm:text-[11px] font-black uppercase ${THEME.textHeader}`;

    return (
        <thead>
            <tr>
                <th className={`${thClass} w-[90px] text-center`}>PO Date</th>
                <th className={`${thClass} w-[140px] text-left`}>PO Number</th>
                <th className={`${thClass} w-[150px] text-left`}>Customer</th>
                <th className={`${thClass} min-w-[220px] text-left`}>Product Name</th>
                <th className={`${thClass} w-[90px] text-center`}>Order Qty</th>
                
                <th className={`${thClass} w-[90px] text-center`}>Production Qty</th>
                <th className={`${thClass} w-[90px] text-center`}>Delivered</th>
                
                <th className={`${thClass} w-[100px] text-center`}>Remain Delivery</th>
                
                <th className={`${thClass} w-[100px] text-center`}>Remain Stock</th>
            </tr>
        </thead>
    );
});





// ============================================================================
// 4. SINGLE ROW COMPONENT
// ============================================================================
const SingleRow = memo(({ job, isOverdue, onOpenModal, deliveryData }: { job: IMJobPlan, isOverdue: boolean, onOpenModal: (job: IMJobPlan) => void, deliveryData: Record<string, any> }) => {
    const tdClass = `p-2 border ${THEME.borderTable} text-[11px] font-bold ${THEME.textPrimary} whitespace-nowrap`;
    const displayName = (job as any).summaryName || job.itemName || '-'; 
    const customerName = job.customer || '-';
    const rowBg = isOverdue ? THEME.bgRowOverdue : THEME.bgRowParent; 

    const jobLogs = deliveryData[job.id] || {};
    const totalDelivered: number = Object.values(jobLogs).reduce<number>((sum, val) => sum + Number(val), 0);
    const orderQty: number = Number(job.orderQty) || 0;
    
    // 🟢 Production Qty ලබා ගැනීම
    const productionQty: number = Number(job.completedQty) || 0;
    
    // 🟢 Remain ගණනය කිරීම්
    const remainDelivery: number = orderQty - totalDelivered;
    const remainStock: number = productionQty - totalDelivered; // Production Qty - Delivered

    return (
        <tr className={`${rowBg} transition-colors`}>
            <td className={`${tdClass} text-center ${isOverdue ? 'text-rose-600 dark:text-rose-400' : THEME.textSecondary}`}>{formatDate(job.poDate)}</td>
            <td className={tdClass}>
                <div className="flex items-center gap-2 pl-4">
                    <Hash size={12} className={THEME.textSecondary} />
                    <span className={THEME.poText}>{job.poNo ? job.poNo : 'Not Mention'}</span>
                </div>
            </td>
            <td className={`${tdClass} ${THEME.customerText} truncate`} title={customerName}>{customerName}</td>
            <td className={`${tdClass} ${THEME.textPrimary} truncate`} title={displayName}>{displayName}</td>
            <td className={`${tdClass} text-center`}>{orderQty.toLocaleString()}</td>
            
            {/* 🟢 Production Qty */}
            <td className={`${tdClass} text-center text-emerald-600 dark:text-emerald-400`}>{productionQty.toLocaleString()}</td>
            
            <td 
                onClick={() => onOpenModal(job)}
                className={`${tdClass} text-center ${THEME.deliveryText} cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/30 underline decoration-dashed underline-offset-4 transition-colors`}
            >
                {totalDelivered > 0 ? totalDelivered.toLocaleString() : '-'}
            </td>
            
            {/* 🟢 Remain Delivery */}
            <td className={`${tdClass} text-center ${remainDelivery <= 0 ? 'text-emerald-500' : THEME.balanceText}`}>{remainDelivery.toLocaleString()}</td>
            
            {/* 🟢 Remain Stock */}
            <td className={`${tdClass} text-center ${remainStock > 0 ? 'text-amber-500 font-black' : THEME.textSecondary}`}>{remainStock.toLocaleString()}</td>
        </tr>
    );
});



// ============================================================================
// 5. EXPANDABLE ROW GROUP
// ============================================================================
const ExpandableRowGroup = memo(({ poNo, jobs, isOverdue, onOpenModal, deliveryData }: { poNo: string, jobs: IMJobPlan[], isOverdue: boolean, onOpenModal: (job: IMJobPlan) => void, deliveryData: Record<string, any> }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const tdClass = `p-2 border ${THEME.borderTable} text-[11px] font-bold whitespace-nowrap`;
    
    const poDate = jobs[0]?.poDate;
    const combinedName = (jobs[0] as any)?.summaryName || Array.from(new Set(jobs.map(j => j.itemName))).join(' + ');
    const combinedCustomers = Array.from(new Set(jobs.map(j => j.customer).filter(Boolean))).join(', ') || '-';
    
    // 🟢 Totals සඳහා Production එකතු කිරීම
    const totals = jobs.reduce((acc, job) => {
        const logs = deliveryData[job.id] || {};
        const jobDelivered: number = Object.values(logs).reduce<number>((sum, val) => sum + Number(val), 0);
        return {
            order: acc.order + (Number(job.orderQty) || 0), 
            production: acc.production + (Number(job.completedQty) || 0), // 🟢 
            delivered: acc.delivered + jobDelivered
        };
    }, { order: 0, production: 0, delivered: 0 });

    const parentRemainDelivery: number = totals.order - totals.delivered;
    const parentRemainStock: number = totals.production - totals.delivered; // 🟢 Parent Remain Stock
    const parentBg = isOverdue ? THEME.bgRowOverdue : THEME.bgRowParent;

    return (
        <>
            <tr onClick={() => setIsExpanded(!isExpanded)} className={`${parentBg} cursor-pointer transition-colors`}>
                <td className={`${tdClass} text-center ${isOverdue ? 'text-rose-600 dark:text-rose-400' : THEME.textSecondary}`}>{formatDate(poDate)}</td>
                <td className={`${tdClass} ${THEME.textPrimary}`}>
                    <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={14} className={THEME.poText} /> : <ChevronRight size={14} className={THEME.poText} />}
                        <span className={`${THEME.poText} font-black`}>{jobs[0].poNo ? jobs[0].poNo : 'Not Mention'}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>{jobs.length} Jobs</span>
                    </div>
                </td>
                <td className={`${tdClass} ${THEME.customerText} truncate`} title={combinedCustomers}>{combinedCustomers}</td>
                <td className={`${tdClass} ${THEME.textPrimary} truncate`} title={combinedName}>{combinedName}</td>
                <td className={`${tdClass} text-center ${THEME.textPrimary}`}>{totals.order.toLocaleString()}</td>
                
                {/* 🟢 Parent Production Qty */}
                <td className={`${tdClass} text-center text-emerald-600 dark:text-emerald-400`}>{totals.production.toLocaleString()}</td>
                
                <td className={`${tdClass} text-center ${THEME.deliveryText}`}>{totals.delivered > 0 ? totals.delivered.toLocaleString() : '-'}</td>
                
                {/* 🟢 Parent Remain Delivery */}
                <td className={`${tdClass} text-center ${parentRemainDelivery <= 0 ? 'text-emerald-500' : THEME.balanceText}`}>{parentRemainDelivery.toLocaleString()}</td>
                
                {/* 🟢 Parent Remain Stock */}
                <td className={`${tdClass} text-center ${parentRemainStock > 0 ? 'text-amber-500 font-black' : THEME.textSecondary}`}>{parentRemainStock.toLocaleString()}</td>
            </tr>

            {isExpanded && jobs.map(job => {
                const logs = deliveryData[job.id] || {};
                const jobDelivered: number = Object.values(logs).reduce<number>((sum, val) => sum + Number(val), 0);
                const orderQty: number = Number(job.orderQty) || 0;
                const productionQty: number = Number(job.completedQty) || 0;
                
                const currentRemainDelivery: number = orderQty - jobDelivered;
                const currentRemainStock: number = productionQty - jobDelivered; // 🟢 Child Remain Stock

                return (
                    <tr key={job.id} className={`${THEME.bgRowChild} transition-colors`}>
                        <td className={`${tdClass} border-r-0`}></td>
                        <td className={`${tdClass} pl-8 ${THEME.textSecondary} border-l-0`}>
                            <div className="flex items-center gap-2"><Package size={10} /> {job.jobNo || '-'}</div>
                        </td>
                        <td className={`${tdClass} ${THEME.textSecondary} truncate`} title={job.customer || '-'}>{job.customer || '-'}</td>
                        <td className={`${tdClass} ${THEME.textSecondary} truncate`} title={job.itemName}>{job.itemName}</td>
                        <td className={`${tdClass} text-center ${THEME.textSecondary}`}>{orderQty.toLocaleString()}</td>
                        
                        {/* 🟢 Child Production Qty */}
                        <td className={`${tdClass} text-center text-emerald-600/70 dark:text-emerald-400/70`}>{productionQty.toLocaleString()}</td>
                        
                        <td 
                            onClick={() => onOpenModal(job)}
                            className={`${tdClass} text-center ${THEME.deliveryText} cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/30 underline decoration-dashed underline-offset-4 transition-colors`}
                        >
                            {jobDelivered > 0 ? jobDelivered.toLocaleString() : '-'}
                        </td>
                        
                        {/* 🟢 Child Remain Delivery */}
                        <td className={`${tdClass} text-center ${currentRemainDelivery <= 0 ? 'text-emerald-500' : THEME.textSecondary}`}>{currentRemainDelivery.toLocaleString()}</td>
                        
                        {/* 🟢 Child Remain Stock */}
                        <td className={`${tdClass} text-center ${currentRemainStock > 0 ? 'text-amber-500 font-black' : THEME.textSecondary}`}>{currentRemainStock.toLocaleString()}</td>
                    </tr>
                );
            })}
        </>
    );
});




// ============================================================================
// 6. MAIN COMPONENT (Delivery Module)
// ============================================================================
const DeliveryTab = () => {
    const { userData } = useAuth();
    const [subTab, setSubTab] = useState<'IM' | 'BM'>('IM');
    const [viewTab, setViewTab] = useState<'pending' | 'completed'>('pending');
    const [selectedJobForDelivery, setSelectedJobForDelivery] = useState<IMJobPlan | null>(null);

    // 🟢 අද මාසය ගෙන useDeliveryManager වෙත යැවීම
    const todayMonthStr = new Date().toISOString().substring(0, 7); 
    const { deliveryData, saveDeliveryLog, deleteDeliveryLog } = useDeliveryManager(todayMonthStr); 

    const { plans: imPlans } = usePlanningManager('IM');
    const { plans: bmPlans } = usePlanningManager('BM');

    const sortedGroupedData = useMemo(() => {
        const activePlans = subTab === 'IM' ? imPlans : bmPlans;
        const groups: Record<string, IMJobPlan[]> = {};
        
        activePlans.forEach(job => {
            const poKey = (job.poNo && job.poNo.trim() !== '') ? job.poNo.trim() : `NO_PO_${job.id}`;
            if (!groups[poKey]) groups[poKey] = [];
            groups[poKey].push(job);
        });

        const filtered = Object.entries(groups).map(([poKey, jobs]) => {
            let totalBalanceForGroup = 0;
            
            jobs.forEach(j => {
                const logs = deliveryData[j.id] || {};
                const delivered: number = Object.values(logs).reduce<number>((sum, val) => sum + Number(val), 0);
                totalBalanceForGroup += (Number(j.orderQty) || 0) - delivered;
            });

            
            const isFullyCompleted = totalBalanceForGroup <= 0; 
            const poDateStr = jobs[0]?.poDate || '';
            const isOverdue = false; 

            return { poNoKey: poKey, jobs, isOverdue, poDateStr, isFullyCompleted };
        }).filter(group => {
            return viewTab === 'completed' ? group.isFullyCompleted : !group.isFullyCompleted;
        }).sort((a, b) => {
            const customerA = (a.jobs[0]?.customer || '').toLowerCase();
            const customerB = (b.jobs[0]?.customer || '').toLowerCase();
            return customerA.localeCompare(customerB);
        });

        return filtered;
    }, [subTab, imPlans, bmPlans, viewTab, deliveryData]); // 🟢 deliveryData එකතු කර ඇත


    // 🟢 Excel Export Button Click Handler
    const handleExportExcel = () => {
        exportDeliveryToExcel(sortedGroupedData, deliveryData, subTab, viewTab);
    };


    return (
        <div className="h-full w-full flex flex-col gap-3 p-1 animate-fade-in">
            <div className={`flex flex-col sm:flex-row items-center justify-between shrink-0 ${THEME.bgMain} p-2 rounded-xl border ${THEME.borderTable} shadow-sm gap-3`}>
                <div className="flex items-center gap-3 pl-2 w-full sm:w-auto">
                    <div className={`p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400`}>
                        <Truck size={18} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-wider ${THEME.textPrimary}`}>Delivery Schedule</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Dispatch Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    
                    {/* 🟢 අලුත් Excel Export Button එක */}
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-black uppercase rounded-lg transition-all shadow-sm active:scale-95"
                    >
                        <Download size={14} /> Export Excel
                    </button>

                    {/* Pending / Completed Switch */}
                    <div className={`flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border ${THEME.borderTable}`}>
                        <button onClick={() => setViewTab('pending')} className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${viewTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}>
                            <Clock size={12} /> Pending
                        </button>
                        <button onClick={() => setViewTab('completed')} className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${viewTab === 'completed' ? 'bg-emerald-500 text-white shadow-sm' : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}>
                            <CheckCircle2 size={12} /> Delivered
                        </button>
                    </div>

                    {/* IM / BM Switch */}
                    <div className={`flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border ${THEME.borderTable}`}>
                        <button onClick={() => setSubTab('IM')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${subTab === 'IM' ? `${THEME.bgTabActive} text-white shadow-sm` : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}>IM Orders</button>
                        <button onClick={() => setSubTab('BM')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${subTab === 'BM' ? `${THEME.bgTabActive} text-white shadow-sm` : `${THEME.textSecondary} hover:text-slate-700 dark:hover:text-slate-200`}`}>BM Orders</button>
                    </div>
                </div>
            </div>

            


            <div className={`flex-1 overflow-auto custom-scrollbar ${THEME.bgMain} border ${THEME.borderTable} rounded-xl shadow-sm`}>
                <table className="border-collapse table-fixed w-full min-w-[900px]">
                    <TableHeader />
                    <tbody>
                        {sortedGroupedData.length === 0 ? (
                            <tr><td colSpan={7} className={`p-12 text-center text-xs font-bold uppercase tracking-widest ${THEME.textSecondary}`}>No Deliveries Found</td></tr>
                        ) : (
                            sortedGroupedData.map(({ poNoKey, jobs, isOverdue }) => (
                                jobs.length === 1 
                                    ? <SingleRow key={jobs[0].id} job={jobs[0]} isOverdue={isOverdue} onOpenModal={setSelectedJobForDelivery} deliveryData={deliveryData} />
                                    : <ExpandableRowGroup key={poNoKey} poNo={poNoKey} jobs={jobs} isOverdue={isOverdue} onOpenModal={setSelectedJobForDelivery} deliveryData={deliveryData} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DeliveryModal 
                job={selectedJobForDelivery} 
                onClose={() => setSelectedJobForDelivery(null)} 
                deliveryData={deliveryData}
                onSaveLog={saveDeliveryLog}
                onDeleteLog={deleteDeliveryLog}
            />
        </div>
    );
};

export default DeliveryTab;