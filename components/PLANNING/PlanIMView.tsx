import React, { useState, useEffect } from 'react';
import { Plus, Layout, Loader2, Factory, Calendar, BarChart3 } from 'lucide-react';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// ============================================================================
// 1. IMPORTS
// ============================================================================
import { usePlanIMLogic } from './PlanIMLogic';
import { IMJobPlan } from './PlanningTypes';
import { PlanFormModal, DailyCompletionModal } from './PlanModals';
import CompletedPlanView from './CompletedPlanView';
import { EXPANDED_COLS, COLLAPSED_COLS, HeaderCell, MachineSection, formatDateDisplay } from './PlanTableComponents';
import { useAuth } from '../../context/AuthContext';
import { PlanningService } from './PlanningService';
import MachineLoadSummaryModal from './MachineLoadSummaryModal';

// ============================================================================
// 2. MAIN VIEW COMPONENT
// ============================================================================
const PlanIMView = ({ planType = 'IM', readOnly }: { planType?: 'IM' | 'BM', readOnly?: boolean }) => {
    const { userData } = useAuth();
  
  const { 
      localPlans, loading, groupedPlans, sortedMachines, completedPlans, products,
      showFormModal, setShowFormModal, editingPlan, setEditingPlan, 
      editingCompletionJob, setEditingCompletionJob, 
      handleSaveNewPlan, handleUpdatePlan, handleCellCommit, handleSaveCompletions, 
      handleOnDragEnd, handleDeletePlan, handleManualComplete 
  } = usePlanIMLogic(planType);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [activeDragItem, setActiveDragItem] = useState<IMJobPlan | null>(null);
  
  const [viewTab, setViewTab] = useState<'active' | 'completed'>('active');
  
  // 🟢 පොදු Toggle State එක (මෙය වෙනස් කළ විට සියලුම Sections වල තීරු Show/Hide වේ)
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const [showLoadModal, setShowLoadModal] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7); 
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingArchivedData, setEditingArchivedData] = useState<{plan: IMJobPlan, monthKey: string} | null>(null);
  const [refreshArchived, setRefreshArchived] = useState(0);
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
      const handleIdle = () => setIsIdle(true);
      const handleResume = () => setIsIdle(false); 
      window.addEventListener('app-idle', handleIdle);
      window.addEventListener('app-resume', handleResume);
      return () => { window.removeEventListener('app-idle', handleIdle); window.removeEventListener('app-resume', handleResume); };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
      const job = localPlans.find(p => p.id === event.active.id);
      if (job) setActiveDragItem(job);
  };

  const handleFormSave = async (plan: IMJobPlan) => {
    if (editingArchivedData) {
        const { monthKey } = editingArchivedData;
        if (plan.status === 'pending') {
            await PlanningService.deleteArchivedJob(userData?.collectionName!, planType, monthKey, plan.id);
            handleSaveNewPlan(plan);
        } else {
            await PlanningService.updateArchivedJob(userData?.collectionName!, planType, monthKey, plan);
        }
        setRefreshArchived(prev => prev + 1);
        setEditingArchivedData(null);
        setEditingPlan(null);
        setShowFormModal(false);
    } else if (editingPlan && !(plan as any).isDuplicate) { 
        
        handleUpdatePlan(plan);
    } else {
        
        handleSaveNewPlan(plan);
    }
};



const handleModalCompletionSave = async (entries: any[], updatedJobData?: any) => {
    if (editingArchivedData && editingCompletionJob) {
        const total = entries.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
        
        const pQty = updatedJobData?.planQty !== undefined ? Number(updatedJobData.planQty) : (Number(editingCompletionJob.planQty) || 0);
        const newBalance = pQty - total;
        
        
        const newStatus = (pQty > 0 && newBalance <= 0) ? 'completed' : 'pending';

        const updatedJob = { 
            ...editingCompletionJob, 
            ...updatedJobData, 
            dailyCompletions: entries, 
            completedQty: total, 
            balance: newBalance, 
            status: newStatus as 'completed' | 'pending' 
        };
        await handleFormSave(updatedJob);
        setEditingCompletionJob(null);
    } else {
        handleSaveCompletions(entries, updatedJobData); 
    }
};




  const themeColor = planType === 'IM' ? 'text-indigo-500' : 'text-amber-500';
  const buttonColor = planType === 'IM' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-500 hover:bg-amber-600';
  const visibleColumns = isAllExpanded ? EXPANDED_COLS : COLLAPSED_COLS;

  return (
    <div className="h-full w-full flex flex-col gap-3 relative overflow-hidden">
      
      {/* MODALS & OVERLAYS */}
      {isIdle && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-300">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm">
                  <Loader2 size={40} className="text-amber-500 mb-4 animate-pulse" />
                  <h2 className="text-xl font-black text-white uppercase tracking-wider mb-2">Session Paused</h2>
                  <p className="text-[11px] font-bold text-slate-400 mb-2 leading-relaxed">To save memory, the connection has been paused.</p>
                  <p className="text-xs font-black text-amber-500 bg-amber-500/10 px-4 py-2 rounded-lg mt-4 animate-bounce">Move mouse to reconnect...</p>
              </div>
          </div>
      )}

      {showFormModal && <PlanFormModal onClose={() => { setShowFormModal(false); setEditingPlan(null); setEditingArchivedData(null); }} onSave={handleFormSave} products={products} existingPlans={localPlans} initialData={editingPlan} planType={planType} />}
      {editingCompletionJob && <DailyCompletionModal job={editingCompletionJob} onClose={() => { setEditingCompletionJob(null); setEditingArchivedData(null); }} onSave={handleModalCompletionSave} />}

      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between shrink-0 bg-white dark:bg-[#0B1121] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-2">
                {planType === 'IM' ? <Layout size={16} className={themeColor} /> : <Factory size={16} className={themeColor} />}
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-white leading-none">{planType} Schedule Input</h3>
                {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewTab('active')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-colors ${viewTab === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Active</button>
                <button onClick={() => setViewTab('completed')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-colors ${viewTab === 'completed' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Completed</button>
            </div>
         </div>

         <div className="flex items-center gap-3">
         {viewTab === 'completed' && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#121b2f] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                    <Calendar size={14} className="text-emerald-600 dark:text-emerald-500" />
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer dark:[color-scheme:dark]" />
                </div>
            )}

            {viewTab === 'active' && (
                <button 
                    onClick={() => setShowLoadModal(true)} 
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm transition-all border border-slate-200 dark:border-slate-700"
                >
                    <BarChart3 size={14} className={themeColor} /> View Load %
                </button>
            )}

            {!readOnly && (
                <button onClick={() => { setEditingPlan(null); setEditingArchivedData(null); setShowFormModal(true); }} className={`flex items-center gap-1 ${buttonColor} text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm hover:shadow-md transition-all`}>
                    <Plus size={14} strokeWidth={3} /> Add Plan
                </button>
            )}
         </div>

      </div>


      {/* MAIN CONTENT AREA - SINGLE TABLE ARCHITECTURE */}
      <div className="flex-1 overflow-auto custom-scrollbar pb-2 pr-1 w-full bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        {viewTab === 'completed' ? (
            <CompletedPlanView planType={planType} selectedMonth={selectedMonth} refreshTrigger={refreshArchived} onEditArchived={(plan, monthKey) => { setEditingArchivedData({ plan, monthKey }); setEditingPlan(plan); setShowFormModal(true); }} onOpenCompletion={(plan, monthKey) => { setEditingArchivedData({ plan, monthKey }); setEditingCompletionJob(plan); }} readOnly={readOnly} />
        ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleOnDragEnd}>
                
                {/* 🟢 මුළු ටැබ් එකටම අදාළ තනි ප්‍රධාන Table එක */}
                <table className="border-separate border-spacing-0 table-fixed w-max min-w-full border-t border-l border-slate-300 dark:border-slate-600">
                    
                    {/* 🟢 පොදු මාතෘකා තීරුව (Table Header) */}
                    <thead>
                        <tr>
                            {visibleColumns.map((col) => <HeaderCell key={col.key} colConfig={col} />)}
                        </tr>
                    </thead>

                    
                    {sortedMachines.map((machineId) => (
                        <MachineSection 
                            key={machineId}
                            machineId={machineId}
                            jobs={groupedPlans[machineId]}
                            visibleColumns={visibleColumns}
                            isAllExpanded={isAllExpanded}
                            onToggle={() => setIsAllExpanded(!isAllExpanded)}
                            planType={planType}
                            onCommit={handleCellCommit} 
                            onOpenCompletion={setEditingCompletionJob} 
                            onDelete={handleDeletePlan} 
                            onEdit={(job: IMJobPlan) => { setEditingPlan(job); setShowFormModal(true); }}
                            onManualComplete={handleManualComplete}
                            readOnly={readOnly}
                        />
                    ))}
                </table>


                {/* DRAG OVERLAY */}
                <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.8' } } }) as any}>
                    {activeDragItem ? (
                       <table className="border-collapse table-fixed min-w-max bg-white dark:bg-[#0B1121] shadow-2xl border border-indigo-500 rounded opacity-90">
                           <tbody>
                               <tr className="bg-indigo-50 dark:bg-slate-800">
                                   {visibleColumns.map((col) => (
                                       <td key={col.key} className={`p-2 border-b border-r border-slate-300 dark:border-slate-700 text-[11px] whitespace-nowrap ${col.width} ${col.align || 'text-center'} font-bold text-slate-900 dark:text-white`}>
                                           {col.type === 'date' ? formatDateDisplay(String(activeDragItem[col.key as keyof IMJobPlan])) : String(activeDragItem[col.key as keyof IMJobPlan] || '-')}
                                       </td>
                                   ))}
                               </tr>
                           </tbody>
                       </table>
                    ) : null}
                </DragOverlay>
            </DndContext>
        )}

        {localPlans.length === 0 && !loading && viewTab === 'active' && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 mt-6 mx-4">
              <p className="text-xs font-bold uppercase">No plans created yet.</p>
              <p className="text-[10px] mt-1">Click "+ ADD PLAN" to start.</p>
          </div>
        )}
      </div>
      {showLoadModal && (
            <MachineLoadSummaryModal 
                isOpen={showLoadModal} 
                onClose={() => setShowLoadModal(false)} 
                planType={planType} 
                sortedMachines={sortedMachines} 
                groupedPlans={groupedPlans} 
            />
        )}
    </div>
  );
};

export default PlanIMView;