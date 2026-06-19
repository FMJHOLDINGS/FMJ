import { useState, useMemo } from 'react';
import { calculateMetrics, getDatesInRange } from '../../utils';
import { AdminConfig, ProductionRow } from '../../types';
import { useKpiManager } from '../../hooks/useKpiManager';

export const useLaborProdLogic = (
    data: Record<string, any>,        
    config?: AdminConfig,             
    startDateProp?: string,           
    endDateProp?: string,             
    withPreform: boolean = false      
) => {
  
  // ============================================================================
  // 📅 1. DATE RANGE & INITIALIZATION (දින පරාසය සහ මුලික සැකසුම්)
  // ============================================================================
  const startDate = startDateProp || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
  const endDate = endDateProp || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('en-CA');

  const { kpiData, saveKpiCell } = useKpiManager(startDate);

  // ============================================================================
  // 🎯 2. TARGETS MANAGEMENT (ඉලක්ක අගයන් LocalStorage හි තබාගැනීම)
  // ============================================================================
  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('labor_prod_targets');
    return saved ? JSON.parse(saved) : { shiftA: 10, shiftB: 10 }; 
  });

  const updateTarget = (shift: 'shiftA' | 'shiftB', value: string) => {
      const newTargets = { ...targets, [shift]: Number(value) };
      setTargets(newTargets);
      localStorage.setItem('labor_prod_targets', JSON.stringify(newTargets));
  };
  
  // ============================================================================
  // 👥 3. SHIFT CONFIGURATIONS (Shift නම් හඳුනාගැනීම)
  // ============================================================================
  const shifts = useMemo(() => {
    return (config?.shiftTeams && config.shiftTeams.length > 0) 
      ? config.shiftTeams 
      : ['Shift-A', 'Shift-B']; 
  }, [config]);


  // ============================================================================
  // 💾 4. DATA SAVE & EXCEL-LIKE NAVIGATION (දත්ත සේව් කිරීම සහ කොටුවෙන් කොටුවට යෑම)
  // ============================================================================
  const handleSave = async (date: string, shiftName: string, value: string) => {
    const numVal = Number(value);
    await saveKpiCell('labor', date, shiftName, numVal);
  };

  const handleCellNavigate = (key: string, currentId: string) => {
      const parts = currentId.split('__');
      if (parts.length < 3) return;
      const dateStr = parts[1];
      const dates = getDatesInRange(startDate, endDate);
      const currentDateIndex = dates.indexOf(dateStr);
      let nextDateIndex = currentDateIndex;

      if (key === 'ArrowRight' || key === 'ArrowDown') nextDateIndex = currentDateIndex + 1;
      else if (key === 'ArrowLeft' || key === 'ArrowUp') nextDateIndex = currentDateIndex - 1;

      if (nextDateIndex >= 0 && nextDateIndex < dates.length) {
          const nextDate = dates[nextDateIndex];
          const nextId = currentId.replace(dateStr, nextDate);
          const nextEl = document.getElementById(nextId);
          if (nextEl) nextEl.focus(); 
      }
  };

  // ============================================================================
  // 🧠 5. MAIN CALCULATION LOGIC (ප්‍රධාන ගණනය කිරීම් සහ WITH PREFORM ලොජික් එක)
  // ============================================================================
  const processedData = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    
    const accumulators: Record<string, { prod: number, hours: number }> = {};
    shifts.forEach(s => accumulators[s] = { prod: 0, hours: 0 });

    const laborMap = kpiData?.labor || {};

    return dates.map(date => {
        const imData = data[`${date}_IM`]; 
        const bmData = data[`${date}_BM`]; 
        const supData = data[`${date}_SUPERVISORS`];

        const dayRecord = imData || bmData || supData;
        const dayTeamName = dayRecord?.daySupervisor || shifts[0];
        const nightTeamName = dayRecord?.nightSupervisor || shifts[1];

        // 🟢 1. අලුත් වෙනස: IM සහ BM දත්ත වෙන් කර හඳුනා ගැනීමට 'machineType' එකතු කරමින් Array දෙක එකතු කිරීම
        const allRows: any[] = [ 
            ...(imData?.rows || []).map((r: any) => ({ ...r, machineType: 'IM' })), 
            ...(bmData?.rows || []).map((r: any) => ({ ...r, machineType: 'BM' })) 
        ];

        const dailyProd: Record<string, number> = {};
        shifts.forEach(s => dailyProd[s] = 0);

        allRows.forEach((row) => {
            
            // 🟢 Type එක සහ නම සිම්පල් අකුරු කර ගැනීම
            const pType = (row.productType || '').toString().toLowerCase();
            const pName = (row.product || '').toString().toLowerCase();
            
            // 🟢 මේක හරියටම Preform එකක්දැයි පරීක්ෂා කිරීම
            const isCap = pType.includes('cap') || pName.includes('cap');
            const isPreform = !isCap;
            
            // 🔴 [WITH PREFORM LOGIC] - Preform ටික් එක දමා නැතිනම්, 
            // 🟢 2. අලුත් වෙනස: IM යන්ත්‍රයේ පමණක් Preform පෙරහන් කරයි. BM යන්ත්‍රයේ කිසිවක් අයින් නොකරයි!
            if (row.machineType === 'IM' && !withPreform && isPreform) return;
            

            let qty = 0;
            try {
                const metrics = calculateMetrics(row);
                qty = metrics.achievedKg; 
            } catch (e) {
                qty = Number(row.achievedQty || 0);
            }

            if (row.shift === 'day') {
                if (dailyProd[dayTeamName] !== undefined) dailyProd[dayTeamName] += qty;
            } else if (row.shift === 'night') {
                if (dailyProd[nightTeamName] !== undefined) dailyProd[nightTeamName] += qty;
            }
        });

        const rowData: any = { date, day: date.split('-')[2] };

        shifts.forEach(shift => {
            const prod = dailyProd[shift] || 0; 
            const workers = laborMap[date]?.[shift] || 0; 
            const manHours = workers * 12; 

            accumulators[shift].prod += prod;
            accumulators[shift].hours += manHours;

            rowData[shift] = {
                prod,
                workers,
                manHours,
                cumProd: accumulators[shift].prod,
                cumHours: accumulators[shift].hours,
                prodPerMH: manHours > 0 ? prod / manHours : 0,
                cumProdPerMH: accumulators[shift].hours > 0 ? accumulators[shift].prod / accumulators[shift].hours : 0
            };
        });

        return rowData;
    });
  }, [data, kpiData, startDate, endDate, shifts, withPreform]);



  // ============================================================================
  // 📊 6. CHART UI CONFIGURATIONS (චාට් එකට අදාළ පළල ගණනය කිරීම)
  // ============================================================================
  const chartWidth = useMemo(() => {
      const dayCount = processedData.length;
      return dayCount > 20 ? dayCount * 60 : '100%';
  }, [processedData]);

  return {
    startDate,
    endDate,
    shifts,
    processedData,
    chartWidth,
    targets,       
    updateTarget,   
    handleSave,
    handleCellNavigate
  };
};

export default useLaborProdLogic;