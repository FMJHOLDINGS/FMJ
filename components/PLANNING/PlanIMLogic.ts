import { useState, useEffect, useCallback, useRef } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { usePlanningManager } from './usePlanningManager';
import { PlanningService } from './PlanningService'; 
import { useAuth } from '../../context/AuthContext'; 
import { IMJobPlan, DailyCompletion, ProductItem } from './PlanningTypes';

const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const day = parseInt(parts[2], 10);
    if(isNaN(year) || isNaN(month) || isNaN(day)) return ''; 

    const date = new Date(year, month, day);
    date.setDate(date.getDate() + Math.floor(Number(days) || 0)); 
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const recalculateMachineDates = (machineJobs: IMJobPlan[]): IMJobPlan[] => {
    let previousEndDate = '';
    let isFirstActiveFound = false;
    const todayStr = new Date().toISOString().split('T')[0];

    return machineJobs.map((job) => {
        if (job.status === 'completed') return job; 

        const currentBalance = job.balance !== undefined ? Number(job.balance) : (Number(job.planQty) || 0);
        const shiftTgt = Number(job.shiftTarget) || 0;
        const hldDays = (job.hldMold === '' || job.hldMold === null || job.hldMold === undefined) ? 0 : Number(job.hldMold) || 0;

        let calculatedDays = 0;
        if (shiftTgt > 0) calculatedDays = Number((currentBalance / (shiftTgt * 2)).toFixed(2));
        else calculatedDays = Number(job.days) || 0;

        const totalDuration = calculatedDays + hldDays;

        let newStart = job.startDate || '';
        if (!isFirstActiveFound) {
            isFirstActiveFound = true; 
            newStart = todayStr; 
        } else {
            newStart = previousEndDate; 
        }

        let newEnd = '';
        if (newStart) newEnd = addDaysToDate(newStart, totalDuration);
        
        previousEndDate = newEnd || newStart; 

        return { ...job, startDate: newStart, endDate: newEnd, days: calculatedDays };
    });
};

export const usePlanIMLogic = (planType: 'IM' | 'BM') => {
  const { userData } = useAuth();
  const { plans: localPlans, savePlans, deletePlan, loading } = usePlanningManager(planType);
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  const latestPlansRef = useRef<IMJobPlan[]>([]);
  
  useEffect(() => {
      latestPlansRef.current = localPlans;
  }, [localPlans]);

  // 🟢 මෙහි තිබූ Auto-update (Infinite Loop) Effect එක මුළුමනින්ම ඉවත් කර ඇත.

  useEffect(() => {
      if (!userData?.collectionName) return;
      let unsub: () => void;
      const callback = (data: ProductItem[]) => setProducts(data);
      if (planType === 'IM') unsub = PlanningService.subscribeToIMProducts(userData.collectionName, callback);
      else unsub = PlanningService.subscribeToBMProducts(userData.collectionName, callback);
      return () => { if (unsub) unsub(); };
  }, [userData, planType]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IMJobPlan | null>(null);
  const [editingCompletionJob, setEditingCompletionJob] = useState<IMJobPlan | null>(null);

  const groupAndSortPlans = (currentPlans: IMJobPlan[]) => {
      const grouped: Record<string, IMJobPlan[]> = {};
      const machines: string[] = [];

      for (const plan of currentPlans) {
          const mach = (!plan.machine || plan.machine.trim() === '') ? 'Unassigned' : plan.machine;
          if (!grouped[mach]) {
              grouped[mach] = [];
              machines.push(mach);
          }
          grouped[mach].push(plan);
      }
      
      machines.sort((a, b) => {
          if (a === 'Unassigned') return 1;
          if (b === 'Unassigned') return -1;
          return a.localeCompare(b);
      });

      // Database එකට Save නොකර, තිරයේ පෙන්වීමට පෙර අද දිනයට Dates ස්වයංක්‍රීයව සකස් කිරීම.
      for (const mach of machines) {
        grouped[mach] = recalculateMachineDates(grouped[mach]);
    }
    
      return { grouped, machines };
  };

  const activePlans = localPlans.filter(p => p.status !== 'completed');
  const completedPlans = localPlans.filter(p => p.status === 'completed');
  const { grouped: groupedPlans, machines: sortedMachines } = groupAndSortPlans(activePlans);

  const handleSaveNewPlan = useCallback((newPlan: IMJobPlan) => {
      const tempAllPlans = [...latestPlansRef.current, newPlan];
      const targetMachine = newPlan.machine || 'Unassigned';
      
      const machineJobs = tempAllPlans.filter(p => (p.machine || 'Unassigned') === targetMachine);
      const recalculatedMachineJobs = recalculateMachineDates(machineJobs);
      
      const recalcMap = new Map(recalculatedMachineJobs.map(j => [j.id, j]));
      const finalPlans = tempAllPlans.map(p => {
          if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) return recalcMap.get(p.id)!;
          return p;
      });

      latestPlansRef.current = finalPlans;
      savePlans(finalPlans);
      setShowFormModal(false);
  }, [savePlans]);

 const handleDeletePlan = useCallback((id: string) => {
    const currentPlans = latestPlansRef.current;
    const planToDelete = currentPlans.find(p => p.id === id);
    const remainingPlans = currentPlans.filter(p => p.id !== id);
    
    if (planToDelete) {
        const docId = String(planToDelete.jobNo || planToDelete.id);
        deletePlan(docId);

        const targetMachine = planToDelete.machine || 'Unassigned';
        const machineJobs = remainingPlans.filter(p => (p.machine || 'Unassigned') === targetMachine);
        const recalculated = recalculateMachineDates(machineJobs);
        
        const recalcMap = new Map(recalculated.map(j => [j.id, j]));
        const finalPlans = remainingPlans.map(p => {
            if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) return recalcMap.get(p.id)!;
            return p;
        });
        latestPlansRef.current = finalPlans;
        savePlans(finalPlans);
    } else {
        latestPlansRef.current = remainingPlans;
        savePlans(remainingPlans);
    }
  }, [savePlans, deletePlan]);
  
  const handleUpdatePlan = useCallback((updatedPlan: IMJobPlan) => {
    const pQty = Number(updatedPlan.planQty) || 0;
    const cQty = Number(updatedPlan.completedQty) || 0;
    updatedPlan.balance = pQty - cQty;
    updatedPlan.status = 'pending';

    const currentPlans = latestPlansRef.current;
    const updatedList = currentPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p);
    const targetMachine = updatedPlan.machine || 'Unassigned';
    
    const machineJobs = updatedList.filter(p => (p.machine || 'Unassigned') === targetMachine);
    const recalculated = recalculateMachineDates(machineJobs);
    
    const recalcMap = new Map(recalculated.map(j => [j.id, j]));
    const finalPlans = updatedList.map(p => {
        if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) return recalcMap.get(p.id)!;
        return p;
    });
    
    latestPlansRef.current = finalPlans;
    savePlans(finalPlans);
    setEditingPlan(null);
    setShowFormModal(false);
  }, [savePlans]);

  const handleCellCommit = useCallback((id: string, field: keyof IMJobPlan, value: any) => {
    const currentPlans = latestPlansRef.current;
    const targetPlanIndex = currentPlans.findIndex(p => p.id === id);
    if (targetPlanIndex === -1) return;

    const targetPlan = currentPlans[targetPlanIndex];
    if (targetPlan[field] === value) return; 

    let cleanValue = value;
    const numFields = ['weight', 'orderQty', 'planQty', 'completedQty', 'balance', 'days', 'cavities', 'cycleTime', 'targetPerHr', 'shiftTarget', 'hldMold'];
    if (numFields.includes(field)) cleanValue = (value === '' || value === null || value === undefined) ? '' : parseFloat(value);

    const updatedPlan = { ...targetPlan, [field]: cleanValue };

    if (field === 'cycleTime' || field === 'cavities') {
        const cyc = Number(updatedPlan.cycleTime) || 0;
        const cav = Number(updatedPlan.cavities) || 0;
        if (cyc > 0) {
            const tph = (3600 / cyc) * cav;
            updatedPlan.targetPerHr = Math.round(tph);
            updatedPlan.shiftTarget = Math.round((tph * 12) * 0.85);
        }
    }

    const pQty = Number(updatedPlan.planQty) || 0;
    const cQty = Number(updatedPlan.completedQty) || 0;
    updatedPlan.balance = pQty - cQty;
    updatedPlan.status = 'pending';

    const newPlans = [...currentPlans];
    newPlans[targetPlanIndex] = updatedPlan;

    let finalPlans = newPlans;
    const triggeringFields = ['startDate', 'days', 'hldMold', 'planQty', 'cycleTime', 'cavities', 'shiftTarget'];
    
    if (triggeringFields.includes(field)) {
        const targetMachine = updatedPlan.machine || 'Unassigned';
        const machineJobs = newPlans.filter(p => (p.machine || 'Unassigned') === targetMachine);
        const recalculatedMachineJobs = recalculateMachineDates(machineJobs);
        
        const recalcMap = new Map(recalculatedMachineJobs.map(j => [j.id, j]));
        finalPlans = newPlans.map(p => {
            if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) {
                const r = recalcMap.get(p.id)!;
                if (r.id === id) return { ...r, status: updatedPlan.status };
                return r;
            }
            return p;
        });
    }

    latestPlansRef.current = finalPlans;
    savePlans(finalPlans);
  }, [savePlans]);

  const handleSaveCompletions = useCallback((dailyRecords: DailyCompletion[], updatedJobData?: any) => {
    if (!editingCompletionJob) return;
    const currentPlans = latestPlansRef.current;
    const total = dailyRecords.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
    
    const updatedList = currentPlans.map(plan => {
        if (plan.id === editingCompletionJob.id) {
            const pQty = updatedJobData?.planQty !== undefined ? Number(updatedJobData.planQty) : (Number(plan.planQty) || 0);
            const newBalance = pQty - total;
            return { 
                ...plan, 
                ...updatedJobData, 
                dailyCompletions: dailyRecords, 
                completedQty: total, 
                balance: newBalance, 
                status: 'pending' 
            };
        }
        return plan;
    });

    const changedPlan = updatedList.find(p => p.id === editingCompletionJob.id);
    let finalPlans = updatedList;

    if (changedPlan) {
        const targetMachine = changedPlan.machine || 'Unassigned';
        const machineJobs = updatedList.filter(p => (p.machine || 'Unassigned') === targetMachine);
        const recalculated = recalculateMachineDates(machineJobs);
        
        const recalcMap = new Map(recalculated.map(j => [j.id, j]));
        finalPlans = updatedList.map(p => {
            if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) return recalcMap.get(p.id)!;
            return p;
        });
    } 
    
    latestPlansRef.current = finalPlans;
    savePlans(finalPlans);
    setEditingCompletionJob(null);
  }, [editingCompletionJob, savePlans]);

  const handleOnDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const currentPlans = latestPlansRef.current;
      const activeId = active.id as string;
      const overId = over.id as string;
      const activeJob = currentPlans.find(j => j.id === activeId);
      if (!activeJob) return;

      const sourceMachine = activeJob.machine || 'Unassigned';
      const overJob = currentPlans.find(j => j.id === overId);
      const destMachine = overJob ? (overJob.machine || 'Unassigned') : overId; 

      let finalPlans = currentPlans;

      if (sourceMachine === destMachine) {
          const machineJobs = currentPlans.filter(j => (j.machine || 'Unassigned') === sourceMachine);
          const oldIndex = machineJobs.findIndex(j => j.id === activeId);
          const newIndex = machineJobs.findIndex(j => j.id === overId);
          
          if (oldIndex !== newIndex) {
              const reordered = arrayMove(machineJobs, oldIndex, newIndex);
              const recalculated = recalculateMachineDates(reordered);
              const otherJobs = currentPlans.filter(j => (j.machine || 'Unassigned') !== sourceMachine);
              finalPlans = [...otherJobs, ...recalculated];
          }
      } else {
          const updatedActiveJob = { ...activeJob, machine: destMachine === 'Unassigned' ? '' : destMachine };
          const sourceJobs = currentPlans.filter(j => (j.machine || 'Unassigned') === sourceMachine && j.id !== activeId);
          const destJobs = currentPlans.filter(j => (j.machine || 'Unassigned') === destMachine);
          
          if (overJob) {
              const overIndex = destJobs.findIndex(j => j.id === overId);
              destJobs.splice(overIndex, 0, updatedActiveJob);
          } else {
              destJobs.push(updatedActiveJob);
          }

          const finalSource = recalculateMachineDates(sourceJobs);
          const finalDest = recalculateMachineDates(destJobs);
          const otherJobs = currentPlans.filter(j => (j.machine || 'Unassigned') !== sourceMachine && (j.machine || 'Unassigned') !== destMachine);
          finalPlans = [...otherJobs, ...finalSource, ...finalDest];
      }

      latestPlansRef.current = finalPlans;
      savePlans(finalPlans);
  }, [savePlans]);

  const handleManualComplete = useCallback((id: string) => {
      const currentPlans = latestPlansRef.current;
      const targetPlan = currentPlans.find(p => p.id === id);
      if (!targetPlan) return;

      const docId = String(targetPlan.jobNo || targetPlan.id);
      deletePlan(docId);

      const updatedPlan = { ...targetPlan, status: 'completed' as const };
      const updatedList = currentPlans.map(p => p.id === id ? updatedPlan : p);

      const targetMachine = updatedPlan.machine || 'Unassigned';
      const machineJobs = updatedList.filter(p => (p.machine || 'Unassigned') === targetMachine);
      const recalculated = recalculateMachineDates(machineJobs);
      
      const recalcMap = new Map(recalculated.map(j => [j.id, j]));
      const finalPlans = updatedList.map(p => {
          if ((p.machine || 'Unassigned') === targetMachine && recalcMap.has(p.id)) return recalcMap.get(p.id)!;
          return p;
      });

      latestPlansRef.current = finalPlans;
      savePlans(finalPlans);
  }, [savePlans, deletePlan]); 

  return { 
      localPlans, loading, groupedPlans, sortedMachines, completedPlans, products,
      showFormModal, setShowFormModal, editingCompletionJob, setEditingCompletionJob, editingPlan, setEditingPlan,
      handleSaveNewPlan, handleUpdatePlan, handleCellCommit, handleSaveCompletions, handleOnDragEnd, handleDeletePlan,
      handleManualComplete
  };
};
