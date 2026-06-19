import { useState, useMemo, useCallback } from 'react';
import { useKpiManager } from '../../hooks/useKpiManager';
import { getDatesInRange, calculateMetrics } from '../../utils';

export const useElectricityLogic = (
    startDate: string, 
    endDate: string, 
    allData: any
) => {
  
  // ============================================================================
  // 1. 🗄️ KPI MANAGER & SETTINGS LOAD
  // ============================================================================
  // 🟢 පරණ updateKpiCategory වෙනුවට saveKpiCell එක ගන්නවා
  const { kpiData, saveKpiCell } = useKpiManager(startDate);
  const elecData = kpiData?.electricity || {};

  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('fmj_elec_settings');
        return saved ? JSON.parse(saved) : { unitRate: 45, targetUnitPerKg: 0.8 }; 
    } catch {
        return { unitRate: 45, targetUnitPerKg: 0.8 };
    }
  });

  // ============================================================================
  // 2. 💾 DATA SAVE LOGIC (Excel-like Save)
  // ============================================================================
  // 🟢 අලුත් ක්‍රමයට Dot Notation මඟින් අදාළ කොටුව පමණක් Save කිරීම
  const handleSave = useCallback(async (date: string, field: 'shiftA' | 'shiftB'| 'machinesA' | 'machinesB', value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    
    // කෙලින්ම saveKpiCell එකට Category එක ('electricity'), දවස, Shift එක සහ අගය දෙනවා
    await saveKpiCell('electricity', date, field, numVal);

  }, [saveKpiCell]);

  const updateSetting = useCallback((key: 'unitRate' | 'targetUnitPerKg', value: string) => {
    const num = parseFloat(value) || 0;
    const newSettings = { ...settings, [key]: num };
    setSettings(newSettings);
    localStorage.setItem('fmj_elec_settings', JSON.stringify(newSettings));
}, [settings]);
  
  // ============================================================================
  // 3. 🚀 HIGH-PERFORMANCE MAIN CALCULATIONS (Single Pass)
  // ============================================================================


  
  const metrics = useMemo(() => {
    if (!startDate || !endDate) return { chartData: [], grandTotals: {} };

    const dates = getDatesInRange(startDate, endDate);
    
    let totalUnitsA = 0, totalUnitsB = 0;
    let totalProdA = 0, totalProdB = 0;
    let totalMachinesA = 0, totalMachinesB = 0;

    const chartData = dates.map(date => {
      const elecDay = elecData[date] || {};
      const elecShiftA = Number(elecDay.shiftA || 0);
      const elecShiftB = Number(elecDay.shiftB || 0);
      const machinesA = Number(elecDay.machinesA || 0);
        const machinesB = Number(elecDay.machinesB || 0);

      // Production Data 
      const imRows = allData[`${date}_IM`]?.rows || [];
      const bmRows = allData[`${date}_BM`]?.rows || [];
      
      // 🟢 අලුත් වෙනස 1: එදිනට අදාළව දහවල්/රාත්‍රී මුරයේ සිටියේ කුමන කණ්ඩායමදැයි සෙවීම
      const supData = allData[`${date}_SUPERVISORS`] || {};
      const dayTeam = supData.day || 'Shift-A';
      const nightTeam = supData.night || 'Shift-B';

      let prodShiftA = 0;
      let prodShiftB = 0;

      const processRow = (row: any) => {
          let kg = 0;
          try { 
              const m = calculateMetrics(row);
              kg = m.achievedKg || 0; 
          } catch { 
              // Error ආවත් හරියටම Kg අගය ගණනය වීමට (Summary එකේ මෙන්)
              const weight = Number(row.unitWeight || row.weight || 0);
              kg = Number(((Number(row.achievedQty || 0) * weight) / 1000).toFixed(2));
          }
          
          // 🟢 අලුත් වෙනස 2: නියම කණ්ඩායම (Shift A හෝ B) හරියටම හඳුනාගැනීම
          let isShiftA = false;
          if (row.shift === 'day') {
              isShiftA = (dayTeam === 'Shift-A');
          } else {
              isShiftA = (nightTeam === 'Shift-A');
          }

          // අදාළ කණ්ඩායමට Kg අගය එකතු කිරීම
          if (isShiftA) {
              prodShiftA += kg;
          } else {
              prodShiftB += kg;
          }
      };

      imRows.forEach(processRow);
      bmRows.forEach(processRow);
      

        totalUnitsA += elecShiftA;
        totalUnitsB += elecShiftB;
        totalProdA += prodShiftA;
        totalProdB += prodShiftB;
        totalMachinesA += machinesA;
        totalMachinesB += machinesB;

        const unitPerKgA = prodShiftA > 0 ? (elecShiftA / prodShiftA) : 0;
        const unitPerKgB = prodShiftB > 0 ? (elecShiftB / prodShiftB) : 0;
        
        // 🟢 NEW: Cumulative Calculations (Cu Unit / Kg)
        const cumUnitPerKgA = totalProdA > 0 ? (totalUnitsA / totalProdA) : 0;
        const cumUnitPerKgB = totalProdB > 0 ? (totalUnitsB / totalProdB) : 0;

        return {
            date: date.split('-')[2],
            fullDate: date,
            shiftA: elecShiftA,
            shiftB: elecShiftB,
            prodShiftA,
            prodShiftB,
            unitPerKgA,
            unitPerKgB,
            cumUnitPerKgA, // 🟢 Added
            cumUnitPerKgB, // 🟢 Added
            // 🟢 Chart එකට Target Line එක පෙන්වීමට
            targetLineVal: settings.targetUnitPerKg 
        };
    });

    const grandTotals = {
        unitsA: totalUnitsA,
        unitsB: totalUnitsB,
        prodA: totalProdA,
        prodB: totalProdB,
        machinesA: totalMachinesA, 
        machinesB: totalMachinesB,
        costA: totalUnitsA * settings.unitRate,
        costB: totalUnitsB * settings.unitRate,
        upkA: totalProdA > 0 ? totalUnitsA / totalProdA : 0,
        upkB: totalProdB > 0 ? totalUnitsB / totalProdB : 0,
    };

    return { chartData, dates, grandTotals };
}, [elecData, startDate, endDate, settings, allData]);

  return {
      elecData,
      settings,
      updateSetting,
      handleSave,
      metrics
  };
};