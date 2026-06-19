import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Database, History, PenTool, BarChart3, Filter, Layers, Download,
  LayoutDashboard, Plus, Target, TrendingDown, X 
} from 'lucide-react';
import { DayData, ProductionRow, ShiftType, AdminConfig } from '../types';
import ProductionHeader from './ProductionHeader';
import ProductionTable from './ProductionTable';
import BreakdownModal from './BreakdownModal';
import BreakdownLog from './BreakdownLog';
import DailySummary from './DailySummary';
import DatabaseView from './DatabaseView';
import MultiSelectDropdown from './MultiSelectDropdown';
import { exportToExcel, getDatesInRange, calculateMetrics } from '../utils';
import { usePlanningManager } from './PLANNING/usePlanningManager';

import { useAuth } from '../context/AuthContext';
import { PlanningService } from './PLANNING/PlanningService';

// ============================================================================
// 🎨 1. THEME & COLOR CONFIGURATION (වර්ණ සහ මෝස්තර සැකසුම්)
// ============================================================================
// මෙතැනින් ඔබට මුළු පිටුවේම ඇති වර්ණ ඉතා පහසුවෙන් වෙනස් කරගත හැක.
const THEME = {
  // Main Backgrounds
  mainBg: "bg-[#F8FAFC] dark:bg-[#020617]",
  headerBg: "bg-white dark:bg-[#0F172A]",
  
  // Borders
  borderLight: "border-slate-200 dark:border-slate-800",
  borderDivider: "border-slate-100 dark:border-slate-800/50",
  
  // Text Colors
  textMain: "text-slate-800 dark:text-white",
  textMuted: "text-slate-500 dark:text-slate-400",
  
  // Section Headers (IM & BM)
  imHeaderIcon: "text-indigo-500",
  bmHeaderIcon: "text-emerald-500",
  
  // Action Buttons
  btnImAdd: "bg-indigo-600 hover:bg-indigo-500 text-white",
  btnBmAdd: "bg-emerald-600 hover:bg-emerald-500 text-white",
  btnExport: "bg-indigo-600 hover:bg-indigo-700 text-white",
  btnClear: "bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100",
  
  // Bottom Sticky Footer Stats
  footerBg: "bg-white/95 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800",
  statPlanIcon: "text-slate-400 dark:text-slate-500",
  statPlanText: "text-slate-500 dark:text-slate-400",
  statAchvIcon: "text-emerald-500 dark:text-emerald-400",
  statAchvText: "text-emerald-600 dark:text-emerald-500",
  statLostIcon: "text-rose-500 dark:text-rose-400",
  statLostText: "text-rose-600 dark:text-rose-500",
};

// ============================================================================
// 🛠️ 2. TYPES & UTILITY FUNCTIONS
// ============================================================================
interface Props {
  date: string; 
  allData: Record<string, any>; 
  onUpdate: (key: string, data: any) => void; 
  adminConfig: AdminConfig; 
  loadDataForRange: (start: string, end: string) => void; 
}

type SubTab = 'ENTRY' | 'IM_DB' | 'BM_DB' | 'BREAKDOWNS' | 'SUMMARY';
const SUPERVISORS = ['Shift-A', 'Shift-B'] as const;
type Supervisor = (typeof SUPERVISORS)[number];

const otherSupervisor = (s: Supervisor): Supervisor => (s === 'Shift-A' ? 'Shift-B' : 'Shift-A');
const isTuesday = (dateStr: string) => new Date(dateStr).getDay() === 2;
const minusDays = (dateStr: string, days: number) => { const d = new Date(dateStr); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };

const getMonthStart = () => { 
    const d = new Date(); 
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`; 
};

const getMonthEnd = () => { 
    const d = new Date(); 
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`; 
};


// ============================================================================
// 🚀 3. MAIN COMPONENT: ProductionTab
// ============================================================================
const ProductionTab: React.FC<Props> = ({ date: initialDate, allData, onUpdate, adminConfig, loadDataForRange }) => {
  
 // --- PLANNING MANAGER ---
 const { plans: imActiveJobs, savePlans: saveImPlans } = usePlanningManager('IM');
 const { plans: bmActiveJobs, savePlans: saveBmPlans } = usePlanningManager('BM');

  // 🟢 NEW: Product DB එකෙන් කෙලින්ම Live Data ලබා ගැනීම
  const { userData } = useAuth();
  const [imProductsDB, setImProductsDB] = useState<any[]>([]);
  const [bmProductsDB, setBmProductsDB] = useState<any[]>([]);

  useEffect(() => {
      if (!userData?.collectionName) return;
      
      const unsubIM = PlanningService.subscribeToIMProducts(userData.collectionName, (data) => setImProductsDB(data || []));
      const unsubBM = PlanningService.subscribeToBMProducts(userData.collectionName, (data) => setBmProductsDB(data || []));
      
      return () => { unsubIM(); unsubBM(); };
  }, [userData]);

  // --- STATE MANAGEMENT ---
  const [subTab, setSubTab] = useState<SubTab>('ENTRY'); 
  const [entryDate, setEntryDate] = useState(() => localStorage.getItem('fmj_entry_date') || initialDate);
  const [activeShift, setActiveShift] = useState<ShiftType>(() => (localStorage.getItem('fmj_active_shift') as ShiftType) || 'day');
  
  const [reportStartDate, setReportStartDate] = useState(() => getMonthStart());
  const [reportEndDate, setReportEndDate] = useState(() => getMonthEnd());

  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeBreakdownRowId, setActiveBreakdownRowId] = useState<string | null>(null);
  const [activeBreakdownMachine, setActiveBreakdownMachine] = useState<'IM'|'BM'|null>(null);
  const [showSwapNotice, setShowSwapNotice] = useState(false);
  const [localSup, setLocalSup] = useState<{ day: Supervisor, night: Supervisor }>({ day: 'Shift-A', night: 'Shift-B' });


  // --- CUSTOM CONFIRM DIALOG STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
}>({ isOpen: false, title: '', message: '', confirmText: '', confirmColor: '', onConfirm: () => {} });



  // --- LOCAL STORAGE & DATA SYNC EFFECTS ---
  useEffect(() => { localStorage.setItem('fmj_entry_date', entryDate); }, [entryDate]);
  useEffect(() => { localStorage.setItem('fmj_active_shift', activeShift); }, [activeShift]);
  useEffect(() => { localStorage.setItem('fmj_rep_start', reportStartDate); }, [reportStartDate]);
  useEffect(() => { localStorage.setItem('fmj_rep_end', reportEndDate); }, [reportEndDate]);

  useEffect(() => {
      if ((subTab === 'IM_DB' || subTab === 'BM_DB' || subTab === 'SUMMARY') && loadDataForRange) {
          loadDataForRange(reportStartDate, reportEndDate);
      }
  }, [reportStartDate, reportEndDate, subTab, loadDataForRange]);

  const supKey = `${entryDate}_SUPERVISORS`;
  const dbSupData = allData[supKey]; 



  // 🟢 1. Supervisor Manual වෙනස් කරනකන් දිගටම තබා ගැනීම
  useEffect(() => {
    if (dbSupData && dbSupData.day && dbSupData.night) {
        // අද දවසට දැනටමත් Save කරපු දත්ත තියෙනවා නම් ඒක ගන්නවා
        setLocalSup({ day: dbSupData.day, night: dbSupData.night });
    } else {
        // අදට දත්ත නැත්නම්, පහුගිය දවස් 30 ඇතුළත අන්තිමටම සේව් වෙලා හිටපු Supervisor හොයාගන්නවා
        let foundSup = null;
        for (let i = 1; i <= 30; i++) {
            const pastDate = minusDays(entryDate, i);
            const pastData = allData[`${pastDate}_SUPERVISORS`];
            if (pastData && pastData.day && pastData.night) {
                foundSup = { day: pastData.day, night: pastData.night };
                break;
            }
        }
        
        if (foundSup) {
            // අන්තිමට හිටපු කෙනාවම අදටත් දානවා (Manual මාරු කරනකන් වෙනස් වෙන්නේ නෑ)
            setLocalSup(foundSup);
        } else {
            // කිසිම පරණ දත්තයක් නැත්නම් විතරක් Shift-A දෙනවා
            setLocalSup({ day: 'Shift-A', night: 'Shift-B' });
        }
    }
}, [entryDate, dbSupData, allData]);




  const currentDaySup = localSup.day;
  const currentNightSup = localSup.night;
  const displaySup = activeShift === 'day' ? currentDaySup : currentNightSup;

  const hasExistingData = () => {
      return !!allData[supKey] || !!allData[`${entryDate}_IM`] || !!allData[`${entryDate}_BM`];
  };



 // 🟢 2. අඟහරුවාදා Swap මතක් කිරීම (ඊයේ දවස සමග සසඳා බැලීම)
 useEffect(() => {
    // අඟහරුවාදා නෙමෙයි නම් Button එක පෙන්වන්නේ නෑ
    if (!isTuesday(entryDate)) { 
        setShowSwapNotice(false); 
        return; 
    }

    // අඟහරුවාදා නම්, ඊයේ (සඳුදා) හිටපු Supervisor කවුද කියලා බලනවා
    const yesterday = minusDays(entryDate, 1);
    const yesterdayData = allData[`${yesterday}_SUPERVISORS`];
    
    if (yesterdayData && yesterdayData.day) {
        // ඊයේ දවල් හිටපු කෙනාම අදත් දවල්ට ඉන්නවා නම්, තවම මාරු කරලා නෑ. ඒ නිසා Swap Button එක පෙන්වන්න!
        setShowSwapNotice(currentDaySup === yesterdayData.day);
    } else {
        setShowSwapNotice(false);
    }
  }, [entryDate, allData, currentDaySup]);


  

  // ============================================================================
  // ⚙️ 4. BUSINESS LOGIC & HANDLERS
  // ============================================================================

  const handleSupervisorChange = (newVal: string) => {
    if (newVal !== 'Shift-A' && newVal !== 'Shift-B') return;
    const selected = newVal as Supervisor;

    // 🟢 Shift එක මාරු කරන්න කලින් Confirm Popup එක ගෙන්වීම
    setConfirmDialog({
        isOpen: true,
        title: 'Confirm Shift Change',
        message: `Are you sure you want to change the shift supervisor to ${selected}?`,
        confirmText: 'Yes, Change',
        confirmColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        onConfirm: () => {
            let newDay = currentDaySup;
            let newNight = currentNightSup;

            if (activeShift === 'day') {
                newDay = selected;
                newNight = otherSupervisor(selected);
            } else {
                newNight = selected;
                newDay = otherSupervisor(selected);
            }
            
            setLocalSup({ day: newDay, night: newNight });

            if (hasExistingData()) {
                onUpdate(supKey, { date: entryDate, day: newDay, night: newNight });
                const imKey = `${entryDate}_IM`;
                const bmKey = `${entryDate}_BM`;
                if (allData[imKey]) onUpdate(imKey, { ...allData[imKey], daySupervisor: newDay, nightSupervisor: newNight });
                if (allData[bmKey]) onUpdate(bmKey, { ...allData[bmKey], daySupervisor: newDay, nightSupervisor: newNight });
            }

            // වැඩේ ඉවර වුණාම Popup එක close කිරීම
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handleSwapNow = () => {
    setConfirmDialog({
        isOpen: true,
        title: 'Swap Supervisors?',
        message: 'Are you sure you want to swap the Day and Night shift supervisors?',
        confirmText: 'Swap Now',
        confirmColor: 'bg-indigo-600 hover:bg-indigo-700',
        onConfirm: () => {
            const newDay = currentNightSup;
            const newNight = currentDaySup;
            setLocalSup({ day: newDay, night: newNight });
            if (hasExistingData()) {
                onUpdate(supKey, { date: entryDate, day: newDay, night: newNight });
            }
            setConfirmDialog(prev => ({ ...prev, isOpen: false })); // Popup එක වැසීම
        }
    });
 };

  const getKey = (type: 'IM' | 'BM') => `${entryDate}_${type}`;
  
  const getDayData = (type: 'IM' | 'BM'): DayData => {
     const key = getKey(type);
     return (allData[key] as DayData) || { id: key, date: entryDate, machineType: type, daySupervisor: currentDaySup, nightSupervisor: currentNightSup, rows: [] };
  };

  const imData = getDayData('IM');
  const bmData = getDayData('BM');

  // 🟢 [FIXED] ADD ENTRY LOGIC: New Row added to the BOTTOM
  const handleAddEntry = (type: 'IM' | 'BM') => {
      const data = type === 'IM' ? imData : bmData;
      const selectedDaySup = localSup.day;
      const selectedNightSup = localSup.night;

      const newRow: ProductionRow = {
        id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        shift: activeShift,
        startTime: activeShift === 'day' ? '07:30' : '19:30',
        endTime: activeShift === 'day' ? '19:30' : '07:30',
        machine: '', product: '', unitWeight: 0, qtyPerHour: 0, cavities: 0, cycleTime: 0,
        achievedQty: 0, breakdowns: []
      };
      
      onUpdate(supKey, { date: entryDate, day: selectedDaySup, night: selectedNightSup });

      onUpdate(getKey(type), { 
          ...data, 
          daySupervisor: selectedDaySup, 
          nightSupervisor: selectedNightSup, 
          // 👇 අලුත් Row එක List එකේ අගට (යටින්ම) එකතු වන ලෙස වෙනස් කර ඇත
          rows: [...(data.rows || []), newRow] 
      });
  };



  
  // 🟢 යාවත්කාලීන කළ updateRow ෆන්ක්ෂන් එක
  const updateRow = (type: 'IM' | 'BM', rowId: string, updates: Partial<ProductionRow>) => {
    const data = type === 'IM' ? imData : bmData;
    const currentRow = data.rows.find(r => r.id === rowId);
    
    // 1. දැනට Row එකේ ඇති Product එක අද දවසේ Planning එකේ ඇත්දැයි බැලීම
    const activeJobs = type === 'IM' ? imActiveJobs : bmActiveJobs;
    const isProductInPlanning = activeJobs.some(job => job.itemName === currentRow?.product);





// 2. Update කිරීමේ ප්‍රධාන ක්‍රියාවලිය
const executeUpdate = () => {
    let finalUpdates = { ...updates };

    const productToCheck = finalUpdates.product || currentRow?.product;
    if (productToCheck) {
        const relevantDB = type === 'IM' ? imProductsDB : bmProductsDB;
        const matchedItem = relevantDB.find(
            item => item.itemName?.trim().toLowerCase() === productToCheck.trim().toLowerCase()
        );
        if (matchedItem && matchedItem.productType) {
            finalUpdates.productType = matchedItem.productType; 
        }
    }

    let mergedRowForSync: any = null; 

    const updatedRows = (data.rows || []).map(r => {
        if (r.id !== rowId) return r;
        
        const mergedRow = { ...r, ...finalUpdates };
        mergedRowForSync = mergedRow; // 🟢 Sync කිරීම සඳහා

        let planningMins = 0;
        if (mergedRow.breakdowns && mergedRow.breakdowns.length > 0) {
            mergedRow.breakdowns.forEach((bd: any) => {
                if (bd.startTime && bd.endTime && bd.category && bd.category.toLowerCase().includes('planning')) {
                    const [sh, sm] = bd.startTime.split(':').map(Number);
                    const [eh, em] = bd.endTime.split(':').map(Number);
                    let mins = (eh * 60 + em) - (sh * 60 + sm);
                    if (mins < 0) mins += 1440;
                    if (mins > 0) planningMins += mins;
                }
            });
        }
        
        const ratePerMin = ((mergedRow.qtyPerHour || 0) * (mergedRow.cavities || 1)) / 60;
        const planningLossQty = Math.floor(ratePerMin * planningMins);

        return { ...mergedRow, planningMins, planningLossQty };
    });

    onUpdate(getKey(type), { ...data, rows: updatedRows });

    // 🟢 5. NEW: AUTO SYNC WITH PLANNING MODULE
    if (mergedRowForSync) {
        const runAutoSync = async () => {
            const savePlans = type === 'IM' ? saveImPlans : saveBmPlans;
            const activeJobs = type === 'IM' ? imActiveJobs : bmActiveJobs;
            
            // 🟢 ආරක්ෂිත පියවර: Save Function එක නැතිනම් එය නවතී
            if (typeof savePlans !== 'function') {
                console.error(`Save function is missing for ${type} Plan! Check usePlanningManager imports.`);
                return;
            }
            
            let plansChanged = false;
            let newPlans = [...activeJobs];

            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            let maxNum = type === 'IM' ? 0 : 499;

            newPlans.forEach(p => {
                if (p.jobNo && p.jobNo.startsWith(yearMonth)) {
                    const num = parseInt(p.jobNo.replace(yearMonth, ''), 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });

            if (userData?.collectionName) {
                try {
                    const compJobs = await PlanningService.fetchCompletedJobsByMonth(userData.collectionName, type, monthKey);
                    compJobs.forEach((p: any) => {
                        if (p.jobNo && p.jobNo.startsWith(yearMonth)) {
                            const num = parseInt(p.jobNo.replace(yearMonth, ''), 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    });
                } catch (error) {
                    console.error("Failed to fetch completed jobs for Job No generation", error);
                }
            }

            let currentMaxNum = maxNum; 

            const syncProductToPlan = (prodName: string, jobNo: string, customer: string, accQty: number, sourceRowId: string) => {
                // 🟢 අලුත් කොන්දේසිය: Product Name එක නැත්නම් හෝ Accepted Qty එක 0 (හෝ ඊට අඩු) නම් කිසිවක් නොකර ආපසු හැරෙන්න
                if (!prodName || accQty <= 0) return;
                
                let jobIndex = newPlans.findIndex(j => (jobNo && j.jobNo === jobNo) || (!jobNo && j.itemName === prodName && j.machine === mergedRowForSync.machine));

                if (jobIndex === -1) {
                    currentMaxNum++;
                    const generatedJobNo = `${yearMonth}${String(currentMaxNum).padStart(3, '0')}`;

                    const relevantDB = type === 'IM' ? imProductsDB : bmProductsDB;
                    const dbItem = relevantDB.find(item => item.itemName?.trim().toLowerCase() === prodName.trim().toLowerCase());
                    
                    const weight = dbItem?.weight || dbItem?.unitWeight || mergedRowForSync.unitWeight || 0;
                    const cavities = dbItem?.actualCavities || dbItem?.cavities || dbItem?.stdCavities || mergedRowForSync.cavities || 1;
                    const cycleTime = dbItem?.actualCycleTime || dbItem?.standardCycleTime || mergedRowForSync.cycleTime || 0;

                    let targetPerHr = 0;
                    let shiftTarget = 0;
                    if (cycleTime > 0 && cavities > 0) {
                        const tph = (3600 / cycleTime) * cavities;
                        targetPerHr = Math.round(tph);
                        shiftTarget = Math.round((tph * 12) * 0.85);
                    }

                    const newJob = {
                        id: `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        machine: mergedRowForSync.machine,
                        itemName: prodName,
                        jobNo: jobNo || generatedJobNo, 
                        customer: customer || dbItem?.customerName || dbItem?.customer || '',
                        weight: Number(weight),
                        cavities: Number(cavities),
                        cycleTime: Number(cycleTime),
                        targetPerHr: targetPerHr,
                        shiftTarget: shiftTarget,
                        planQty: 0,  
                        orderQty: 0,
                        completedQty: 0,
                        balance: 0,
                        status: 'pending', 
                        dailyCompletions: [],
                        startDate: entryDate,
                        days: 1
                    } as any;
                    
                    newPlans.push(newJob);
                    jobIndex = newPlans.length - 1;
                    plansChanged = true;
                }

                const job = newPlans[jobIndex];
                const logId = `prod_${sourceRowId}_${prodName.replace(/\s/g, '')}`; 
                let comps = job.dailyCompletions ? [...job.dailyCompletions] : [];
                const existingIdx = comps.findIndex((c: any) => c.id === logId);

                // accQty > 0 කොන්දේසිය කලින්ම පරීක්ෂා කර ඇති බැවින් කෙලින්ම Update කිරීම සිදු කළ හැක
                const newLog = {
                    id: logId,
                    date: entryDate,
                    shift: (activeShift === 'day' ? 'Day' : 'Night') as 'Day' | 'Night',
                    qty: accQty,
                    isAuto: true 
                };
                if (existingIdx >= 0) {
                    if (comps[existingIdx].qty !== accQty || comps[existingIdx].shift !== newLog.shift) {
                        comps[existingIdx] = newLog;
                        plansChanged = true;
                    }
                } else {
                    comps.push(newLog);
                    plansChanged = true;
                }

                if (plansChanged) {
                    const totalComp = comps.reduce((sum, c) => sum + (Number(c.qty) || 0), 0);
                    const pQty = Number(job.planQty) || 0;
                    const bal = pQty - totalComp;
                    
                    let newStatus = job.status;
                    if (pQty > 0 && bal <= 0) newStatus = 'completed';
                    else if (pQty === 0 || bal > 0) newStatus = 'pending';

                    newPlans[jobIndex] = {
                        ...job,
                        dailyCompletions: comps,
                        completedQty: totalComp,
                        balance: bal,
                        status: newStatus
                    };
                }
            };

            syncProductToPlan(mergedRowForSync.product, mergedRowForSync.jobNo, mergedRowForSync.customerName, Number(mergedRowForSync.acceptedQty) || 0, mergedRowForSync.id);

            (mergedRowForSync.subProducts || []).forEach((sp: any) => {
                syncProductToPlan(sp.product, sp.jobNo, sp.customerName, Number(sp.acceptedQty) || 0, sp.id);
            });

            if (plansChanged) {
                console.log("Saving Plans for Type:", type, "Total Jobs:", newPlans.length);
                savePlans(newPlans);
            }
        };

       // runAutoSync(); (plan එක auto update කරන්න ඔනේ නම් මෙ පේලිය "//" ඉවත් කර active කරන්න )
    }
};









    // 3. Popup එක පෙන්වීමේ තීරණය
    // Row එකේ Product එකක් හෝ Machine එකක් දැනටමත් සේව් වී ඇත්නම් සහ,
    // පරිශීලකයා අලුතින් Product එකක් හෝ Machine එකක් වෙනස් කිරීමට උත්සාහ කරන්නේ නම් පමණක් Popup එක පෙන්වයි.

    const isSavedRow = currentRow && currentRow.product && currentRow.machine;
    
    // 🟢 අනු කොටසක් (Sub Product) මැකුවොත් ඒක අඳුරගැනීම
    const isRemovingSubProduct = updates.subProducts !== undefined && currentRow.subProducts && updates.subProducts.length < currentRow.subProducts.length;
    
    // 🟢 ප්‍රධාන එක වෙනස් කළත්, Sub Product එකක් මැකුවත් Confirm එක එනවා
    const isChangingCoreData = updates.product !== undefined || updates.machine !== undefined || isRemovingSubProduct;

    if (isSavedRow && isChangingCoreData) {
        setConfirmDialog({
            isOpen: true,
            title: 'Confirm Data Change',
            message: 'You are about to change or remove a Product from an existing record. Are you sure you want to proceed?',
            confirmText: 'Yes, Change it',
            confirmColor: 'bg-amber-600 hover:bg-amber-700 text-white',
            onConfirm: () => {
                executeUpdate();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    } else {
        executeUpdate();
    }

  };


// 🟢 Tab මාරු කිරීම (දැන් හිස් පේළි මකා දැමීම අවශ්‍ය නැත)
const handleTabChange = (newTab: SubTab) => {
    setSubTab(newTab);
};



  const deleteRow = (type: 'IM' | 'BM', rowId: string) => {
    setConfirmDialog({
        isOpen: true,
        title: 'Delete Row?',
        message: 'Are you sure you want to delete this production row? This action cannot be undone.',
        confirmText: 'Delete',
        confirmColor: 'bg-rose-600 hover:bg-rose-700',
        onConfirm: () => {
            const data = type === 'IM' ? imData : bmData;
            const updatedRows = (data.rows || []).filter(r => r.id !== rowId);
            onUpdate(getKey(type), { ...data, rows: updatedRows });
            setConfirmDialog(prev => ({ ...prev, isOpen: false })); 
        }
    });
};

  // --- DATA FILTERING & CALCULATION ---
  // --- DATA FILTERING & CALCULATION ---
  const imRows = (imData.rows || [])
      .filter(r => r.shift === activeShift)
      .sort((a, b) => {
          const macA = a.machine || 'ZZZ'; // Machine තෝරා නැති අලුත් පේළි යටටම යවයි
          const macB = b.machine || 'ZZZ';
          if (macA === macB) return (a.id || '').localeCompare(b.id || ''); // එකම මැෂින් එකේ පේළි පැණීම වළක්වයි
          return macA.localeCompare(macB);
      });

  const bmRows = (bmData.rows || [])
      .filter(r => r.shift === activeShift)
      .sort((a, b) => {
          const macA = a.machine || 'ZZZ';
          const macB = b.machine || 'ZZZ';
          if (macA === macB) return (a.id || '').localeCompare(b.id || '');
          return macA.localeCompare(macB);
      });
  
  const activeBDRow = activeBreakdownMachine 
      ? (activeBreakdownMachine === 'IM' ? imData.rows : bmData.rows).find(r => r.id === activeBreakdownRowId)
      : null;

  const { availableMachines, availableProducts } = useMemo(() => {
    const machines = new Set<string>(); const products = new Set<string>();
    const typeKeyPart = subTab === 'IM_DB' ? '_IM' : '_BM';
    Object.keys(allData).forEach(k => {
        if (k.endsWith(typeKeyPart)) {
            (allData[k]?.rows || []).forEach((r: any) => { machines.add(r.machine); products.add(r.product); });
        }
    });
    return { availableMachines: Array.from(machines).sort(), availableProducts: Array.from(products).sort() };
  }, [allData, subTab]);

  const handleDownloadReport = async (type: 'IM' | 'BM') => {
      const dates = getDatesInRange(reportStartDate, reportEndDate);
      const rows: any[] = [];
      dates.forEach(d => {
          const dd = allData[`${d}_${type}`];
          if(dd?.rows) dd.rows.forEach((r: any) => {
              if((!selectedMachines.length || selectedMachines.includes(r.machine)) && (!selectedProducts.length || selectedProducts.includes(r.product))) rows.push({...r, date: d});
          });
      });
      if(!rows.length) { alert('No data'); return; }
      await exportToExcel(rows, { machine: selectedMachines, product: selectedProducts, startDate: reportStartDate, endDate: reportEndDate, type });
  };

  const clearFilters = () => { setSelectedMachines([]); setSelectedProducts([]); };





 // --- DATA FILTERING & CALCULATION ---
  // (ඔබ ලබාදුන් PLANNING DEDUCTION ලොජික් එක ඇතුළත් කළ අලුත් ගණනය කිරීම)
  const calculateShiftStats = (rows: ProductionRow[]) => rows.reduce((acc, row) => {
    const m = calculateMetrics(row);
    let planningMins = 0;

    (row.breakdowns || []).forEach((bd: any) => {
        if (bd.startTime && bd.endTime && bd.category && bd.startTime.includes(':') && bd.endTime.includes(':')) {
            const [sh, sm] = bd.startTime.split(':').map(n => Number(n) || 0);
            const [eh, em] = bd.endTime.split(':').map(n => Number(n) || 0);
            let mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins < 0) mins += 1440; // රාත්‍රී මුරය සඳහා හැඩගැස්වීම
            
            if (mins > 0 && bd.category.toLowerCase().includes('planning')) {
                planningMins += mins;
            }
        }
    });

    const ratePerMin = ((Number(row.qtyPerHour) || 0) * (Number(row.cavities) || 1)) / 60;
    const planningLossQty = Math.floor(ratePerMin * planningMins) || 0;

    // Planning ප්‍රමාණය Plan එකෙන් සහ Loss එකෙන් අඩු කිරීම
    m.planQty = Math.max(0, (Number(m.planQty) || 0) - planningLossQty);
    m.planKg = Number(((m.planQty * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;

    const updatedTotalLoss = Math.max(0, m.planQty - (Number(row.achievedQty) || 0));
    m.lostQty = updatedTotalLoss || 0;
    m.lostKg = Number(((updatedTotalLoss * (Number(row.unitWeight) || 0)) / 1000).toFixed(2)) || 0;

    return { 
        plan: (acc.plan || 0) + m.planKg, 
        achv: (acc.achv || 0) + (Number(m.achievedKg) || 0), 
        lost: (acc.lost || 0) + m.lostKg 
    };
  }, { plan: 0, achv: 0, lost: 0 });


  
const imStats = calculateShiftStats(imRows);
const bmStats = calculateShiftStats(bmRows);
const totalStats = { plan: imStats.plan + bmStats.plan, achv: imStats.achv + bmStats.achv, lost: imStats.lost + bmStats.lost };




// 🟢 1. PERMISSION CHECKING 
  // User Data එකෙන් Production Tab එකේ Permission එක ගන්නවා (නැත්නම් 'none' දෙනවා)
  const tabPermission = userData?.permissions?.PRODUCTION || 'none';
  const isReadOnly = tabPermission === 'view';

  // 🟢 2. 'none' නම් මුකුත් පෙන්වන්නේ නෑ, Access Denied පෙන්වනවා
  if (tabPermission === 'none') {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 dark:bg-[#020617]">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl flex flex-col items-center text-center border border-rose-100 dark:border-rose-900/30">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
                      <X className="w-10 h-10 text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Access Denied</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">You don't have permission to access this section.</p>
              </div>
          </div>
      );
  }



  // ============================================================================
  // 🖥️ 5. RENDER (UI)
  // ============================================================================
  const styles = `
    @keyframes spin-border { 0% { --rotate: 0deg; } 100% { --rotate: 360deg; } }
    @property --rotate { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
    .animated-tab-active { position: relative; z-index: 0; overflow: hidden; border: none !important; }
    .animated-tab-active::before { content: ""; position: absolute; z-index: -1; width: 150%; height: 150%; left: -25%; top: -25%; background-image: conic-gradient(from var(--rotate), transparent 0%, var(--tab-color) 40%, var(--tab-color) 50%, transparent 100%); animation: spin-border 3s linear infinite; }
    .animated-tab-active::after { content: ""; position: absolute; z-index: -1; inset: 2px; background: var(--bg-color); border-radius: 0.4rem; }
  `;

  return (
    <div className={`flex flex-col h-full ${THEME.mainBg} transition-colors duration-300 relative w-full`}>
      <style>{styles}</style>
      
      {/* --- HEADER NAVIGATION --- */}
      <div className={`${THEME.headerBg} border-b ${THEME.borderLight} sticky top-0 z-40 shadow-sm shrink-0 w-full flex flex-col`}>
      <div className={`flex items-center justify-center py-2 px-4 overflow-x-auto w-full border-b ${THEME.borderDivider}`}>
          <div className="flex items-center gap-1.5 min-w-max">
            <SubNavItem active={subTab === 'ENTRY'} icon={LayoutDashboard} label="Production Entry" onClick={() => handleTabChange('ENTRY')} color="indigo" />
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 min-w-[1px]" />
            <SubNavItem active={subTab === 'IM_DB'} icon={Database} label="IM Report" onClick={() => handleTabChange('IM_DB')} color="emerald" />
            <SubNavItem active={subTab === 'BM_DB'} icon={Database} label="BM Report" onClick={() => handleTabChange('BM_DB')} color="emerald" />
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1 min-w-[1px]" />
            <SubNavItem active={subTab === 'BREAKDOWNS'} icon={Activity} label="Breakdowns" onClick={() => handleTabChange('BREAKDOWNS')} color="rose" />
            <SubNavItem active={subTab === 'SUMMARY'} icon={BarChart3} label="Summary" onClick={() => handleTabChange('SUMMARY')} color="amber" />
          </div>
        </div>

        {subTab === 'ENTRY' && (
          <ProductionHeader 
            entryDate={entryDate} setEntryDate={setEntryDate} activeShift={activeShift} setActiveShift={setActiveShift}
            displaySup={displaySup} handleSupervisorChange={handleSupervisorChange} showSwapNotice={showSwapNotice} handleSwapNow={handleSwapNow} readOnly={isReadOnly}
          />
        )}
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      {/* 🟢 Performance Fix: Hardware Acceleration (transform-gpu, will-change-scroll) යොදා ඇත */}
      <div className={`flex-1 overflow-auto p-2 md:p-4 custom-scrollbar ${THEME.mainBg} transition-colors duration-300 pb-24 w-full transform-gpu will-change-scroll`} style={{ WebkitOverflowScrolling: 'touch' }}>
        
        {subTab === 'ENTRY' && (
            <div className="animate-fade-in space-y-4 md:space-y-6 w-full">
                
                {/* IM SECTION */}
                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2">
                        <h3 className={`text-sm md:text-lg font-black ${THEME.textMain} uppercase flex items-center gap-2`}>
                            <PenTool className={`w-4 h-4 md:w-5 md:h-5 ${THEME.imHeaderIcon}`} /> Injection Molding (IM)
                        </h3>
                        {/* 🟢 isReadOnly නැත්නම් විතරක් Add Row පෙන්වන්න */}
                        {!isReadOnly && (
                            <button onClick={() => handleAddEntry('IM')} className={`px-3 py-1.5 ${THEME.btnImAdd} rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95`}>
                                <Plus className="w-3.5 h-3.5" /> Add Row
                            </button>
                        )}
                    </div>
                    {/* 🟢 Table එකට isReadOnly කියන එක යවනවා */}
                    <ProductionTable rows={imRows} onUpdateRow={(id, u) => updateRow('IM', id, u)} onDeleteRow={(id) => deleteRow('IM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('IM'); }} products={imProductsDB} isFormMode activeJobs={imActiveJobs} readOnly={isReadOnly} />
                </div>
                
                <div className={`w-full h-px ${THEME.borderLight} my-4`} />
                
                {/* BM SECTION */}
                <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between px-2">
                        <h3 className={`text-sm md:text-lg font-black ${THEME.textMain} uppercase flex items-center gap-2`}>
                            <PenTool className={`w-4 h-4 md:w-5 md:h-5 ${THEME.bmHeaderIcon}`} /> Blow Molding (BM)
                        </h3>
                        {/* 🟢 isReadOnly නැත්නම් විතරක් Add Row පෙන්වන්න */}
                        {!isReadOnly && (
                            <button onClick={() => handleAddEntry('BM')} className={`px-3 py-1.5 ${THEME.btnBmAdd} rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-md transition-all active:scale-95`}>
                                <Plus className="w-3.5 h-3.5" /> Add Row
                            </button>
                        )}
                    </div>
                    {/* 🟢 Table එකට isReadOnly කියන එක යවනවා */}
                    <ProductionTable rows={bmRows} onUpdateRow={(id, u) => updateRow('BM', id, u)} onDeleteRow={(id) => deleteRow('BM', id)} onOpenBreakdowns={(id) => { setActiveBreakdownRowId(id); setActiveBreakdownMachine('BM'); }} products={bmProductsDB} isFormMode activeJobs={bmActiveJobs} readOnly={isReadOnly} />
                </div>
            </div>
        )}

        {(subTab === 'IM_DB' || subTab === 'BM_DB') && (
            <div className="animate-fade-in space-y-6 w-full px-2">
                <div className={`flex flex-col md:flex-row items-center justify-between gap-4 ${THEME.headerBg} p-4 rounded-3xl border ${THEME.borderLight} shadow-sm w-full`}>
                   <h2 className={`text-xl font-black ${THEME.textMain} uppercase flex items-center gap-3`}><History className="text-indigo-500" /> {subTab === 'IM_DB' ? 'IM' : 'BM'} Database</h2>
                   <div className="flex flex-wrap items-center gap-2">
                       <MultiSelectDropdown label="Machine" selected={selectedMachines} onChange={setSelectedMachines} options={availableMachines} icon={<Filter className="w-3.5 h-3.5" />} />
                       <MultiSelectDropdown label="Product" selected={selectedProducts} onChange={setSelectedProducts} options={availableProducts} icon={<Layers className="w-3.5 h-3.5" />} />
                       <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border ${THEME.borderLight}`}>
                          <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className={`bg-transparent text-[10px] font-bold ${THEME.textMain} outline-none w-20 dark:[color-scheme:dark]`} />
                          <span className={THEME.textMuted}>-</span>
                          <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className={`bg-transparent text-[10px] font-bold ${THEME.textMain} outline-none w-20 dark:[color-scheme:dark]`} />
                       </div>
                       <button onClick={() => handleDownloadReport(subTab === 'IM_DB' ? 'IM' : 'BM')} className={`h-10 px-4 ${THEME.btnExport} rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2`}><Download className="w-3.5 h-3.5" /> Export</button>
                       {(selectedMachines.length > 0 || selectedProducts.length > 0) && <button onClick={clearFilters} className={`h-10 w-10 flex items-center justify-center ${THEME.btnClear} rounded-xl transition-all`}><X className="w-4 h-4" /></button>}
                   </div>
                </div>
                <DatabaseView startDate={reportStartDate} endDate={reportEndDate} machineType={subTab === 'IM_DB' ? 'IM' : 'BM'} allData={allData} machineFilter={selectedMachines} productFilter={selectedProducts} />
            </div>
        )}

        {subTab === 'BREAKDOWNS' && (
            <div className="w-full px-2">
                <BreakdownLog allData={allData} date={entryDate} 
                loadDataForRange={loadDataForRange}
                />
            </div>
        )}

{subTab === 'SUMMARY' && (
            <div className="w-full">
                <DailySummary 
                   readOnly={isReadOnly} 
                   allData={allData} 
                   date={entryDate} 
                   breakdownCategories={adminConfig.breakdownCategories} 
                   onUpdate={onUpdate} 
                   loadDataForRange={loadDataForRange} 
                />
            </div>
        )}
        


{activeBDRow && <BreakdownModal readOnly={isReadOnly} row={activeBDRow} onClose={() => { setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }} onSave={(bds) => { if (activeBreakdownMachine && activeBreakdownRowId) { updateRow(activeBreakdownMachine, activeBreakdownRowId, { breakdowns: bds }); setActiveBreakdownRowId(null); setActiveBreakdownMachine(null); }}} categories={adminConfig.breakdownCategories} />}
      </div>

      {/* --- FOOTER STATS --- */}
      {subTab === 'ENTRY' && (
        <div className={`fixed bottom-0 left-0 w-full h-12 z-50 flex items-center justify-center backdrop-blur-md ${THEME.footerBg} border-t shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] transition-colors`}>
          <div className="flex items-center gap-6 md:gap-10 text-xs">
              
              <div className="flex items-center gap-2">
                <Target className={`w-4 h-4 ${THEME.statPlanIcon}`} />
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${THEME.statPlanText}`}>Plan</span>
                  <span className={`text-sm font-black ${THEME.textMain} leading-none`}>{totalStats.plan.toFixed(0)}</span>
                </div>
              </div>
              
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-700"></div>
              
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${THEME.statAchvIcon}`} />
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${THEME.statAchvText}`}>Achieved</span>
                  <span className={`text-sm font-black text-emerald-700 dark:text-emerald-400 leading-none`}>{totalStats.achv.toFixed(0)}</span>
                </div>
              </div>
              
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-700"></div>
              
              <div className="flex items-center gap-2">
                <TrendingDown className={`w-4 h-4 ${THEME.statLostIcon}`} />
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${THEME.statLostText}`}>Lost</span>
                  <span className={`text-sm font-black text-rose-700 dark:text-rose-400 leading-none`}>{totalStats.lost.toFixed(0)}</span>
                </div>
              </div>
              
          </div>
        </div>
      )}


      
    {/* --- CUSTOM CONFIRM DIALOG MODAL --- */}
    {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden transform transition-all">
                  <div className="p-6">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">{confirmDialog.title}</h3>
                      <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{confirmDialog.message}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                      <button 
                          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors outline-none"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDialog.onConfirm}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-colors outline-none ${confirmDialog.confirmColor}`}
                      >
                          {confirmDialog.confirmText}
                      </button>
                  </div>
              </div>
          </div>
      )}




    </div>
  );
};

// ============================================================================
// 🧩 6. SUB-COMPONENTS
// ============================================================================
const SubNavItem: React.FC<{ active: boolean; icon: any; label: string; onClick: () => void; color: string; }> = ({ active, icon: Icon, label, onClick, color }) => {
  const colorMap: Record<string, string> = { indigo: '#6366f1', emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b' };
  const cssVar = { '--tab-color': colorMap[color], '--bg-color': 'var(--tab-bg-color, #1e293b)' } as React.CSSProperties;
  return (
    <button onClick={onClick} style={cssVar} className={`relative px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap overflow-hidden group ${active ? 'animated-tab-active text-white bg-transparent' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent'}`}>
      <span className="relative z-10 flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : ''}`} /><span>{label}</span></span>
      <style>{`.animated-tab-active { --tab-bg-color: #0f172a; } :root:not(.dark) .animated-tab-active { --tab-bg-color: #ffffff; } :root:not(.dark) .animated-tab-active span { color: var(--tab-color); }`}</style>
    </button>
  );
};

export default ProductionTab;