import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart3, Monitor } from 'lucide-react';

interface MachineLoadSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    planType: 'IM' | 'BM';
    sortedMachines: string[];
    groupedPlans: Record<string, any[]>;
}

const MachineLoadSummaryModal = ({ isOpen, onClose, planType, sortedMachines, groupedPlans }: MachineLoadSummaryModalProps) => {
    if (!isOpen) return null;

    // Unassigned මැෂින් එක ලැයිස්තුවෙන් ඉවත් කිරීම
    const validMachines = sortedMachines.filter(m => m !== 'Unassigned');

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B1121] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col transform-gpu transition-all animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} className={planType === 'IM' ? 'text-indigo-500' : 'text-amber-500'} />
                        <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">
                            {planType} Machine Load Summary
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

               {/* Modal Content */}
               <div className="p-3 overflow-y-auto max-h-[80vh] custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-[#0B1121]">
                    {validMachines.length === 0 ? (
                        <p className="text-center py-4 text-xs font-bold text-slate-400">No active machines found.</p>
                    ) : (
                        validMachines.map((machineId) => {
                            const jobs = groupedPlans[machineId] || [];
                            
                            // Load %
                            const totalDays = jobs.reduce((sum: number, job: any) => sum + (Number(job.days) || 0), 0);
                            const totalHLD = jobs.reduce((sum: number, job: any) => sum + (Number(job.hldMold) || 0), 0);
                            const loadingPercent = Math.round(((totalDays + totalHLD) / 25) * 100);

                            // Progress Bar
                            let barColor = "bg-emerald-500"; 
                            let textColor = "text-emerald-600 dark:text-emerald-400";
                            let bgColor = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50";

                            if (loadingPercent >= 100) {
                                barColor = "bg-rose-500"; // Red color for overloaded
                                textColor = "text-rose-600 dark:text-rose-400";
                                bgColor = "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50";
                            } else if (loadingPercent >= 70) {
                                barColor = "bg-amber-500"; // Yellow color for medium load
                                textColor = "text-amber-600 dark:text-amber-400";
                                bgColor = "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50";
                            }

                            return (
                                <div key={machineId} className={`p-2.5 rounded-lg border ${bgColor} flex flex-col gap-1.5 transition-all`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Monitor size={12} className="text-slate-400" />
                                            <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200">
                                                {machineId}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400">
                                                ({jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'})
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-black tracking-tight ${textColor}`}>
                                            {loadingPercent}% Load
                                        </span>
                                    </div>

                                    {/* Progress Bar Container (Thinner bar) */}
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${Math.min(loadingPercent, 100)}%` }}
                                        />
                                    </div>
                                    
                                    {/* Days details text (Smaller text, less gap) */}
                                    <div className="flex justify-between text-[8.5px] font-bold text-slate-400 uppercase leading-none mt-0.5">
                                        <span>Prod: {totalDays.toFixed(1)} Days</span>
                                        <span>HLD: {totalHLD.toFixed(1)} Days</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>



                {/* Modal Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default memo(MachineLoadSummaryModal);