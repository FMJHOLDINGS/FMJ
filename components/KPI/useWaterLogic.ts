import { useState, useMemo, useCallback } from 'react';
import { useKpiManager } from '../../hooks/useKpiManager';
import { getDatesInRange, calculateMetrics } from '../../utils';

export const useWaterLogic = (
    startDate: string, 
    endDate: string, 
    allData: any
) => {
  
  // ============================================================================
  // 1. 🗄️ KPI MANAGER & SETTINGS LOAD
  // ============================================================================
  // 🟢 පරණ updateKpiCategory වෙනුවට saveKpiCell එක ගන්නවා
  const { kpiData, saveKpiCell } = useKpiManager(startDate);
  const waterData = kpiData?.water || {};

  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('fmj_water_settings');
        return saved ? JSON.parse(saved) : { litersPerUnit: 1000, targetLtrPerKg: 2.5 }; 
    } catch {
        return { litersPerUnit: 1000, targetLtrPerKg: 2.5 };
    }
  });

  // ============================================================================
  // 2. 💾 DATA SAVE LOGIC (Excel-like Save)
  // ============================================================================
  // 🟢 අලුත් ක්‍රමයට Dot Notation මඟින් අදාළ කොටුව පමණක් Save කිරීම
  const handleSave = useCallback(async (date: string, field: 'shiftA' | 'shiftB', value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    
    // මෙහි Category එක 'water' ලෙස ලබා දෙයි
    await saveKpiCell('water', date, field, numVal);

  }, [saveKpiCell]);

  const updateSetting = useCallback((key: 'litersPerUnit' | 'targetLtrPerKg', value: string) => {
    const num = parseFloat(value) || 0;
    const newSettings = { ...settings, [key]: num };
    setSettings(newSettings);
    localStorage.setItem('fmj_water_settings', JSON.stringify(newSettings));
}, [settings]);


  // ============================================================================
  // 3. 🚀 HIGH-PERFORMANCE MAIN CALCULATIONS (Single Pass)
  // ============================================================================
  const metrics = useMemo(() => {
      if (!startDate || !endDate) return { chartData: [], grandTotals: {} };

      const dates = getDatesInRange(startDate, endDate);
      
      let totalUnitsA = 0, totalUnitsB = 0;
      let totalProdA = 0, totalProdB = 0;

      const chartData = dates.map(date => {
        const dayData = waterData[date] || {};
        const unitsA = Number(dayData.shiftA || 0);
        const unitsB = Number(dayData.shiftB || 0);

        // Production Data 
        const imRows = allData[`${date}_IM`]?.rows || [];
        const bmRows = allData[`${date}_BM`]?.rows || [];
        
        // 🟢 අලුත් වෙනස 1: එදිනට අදාළව දහවල්/රාත්‍රී මුරයේ සිටියේ කුමන කණ්ඩායමදැයි සෙවීම
        const supData = allData[`${date}_SUPERVISORS`] || {};
        const dayTeam = supData.day || 'Shift-A';
        const nightTeam = supData.night || 'Shift-B';

        let prodA = 0;
        let prodB = 0;

        // Loop එකක් මඟින් Production එකතුවීම (Fast)
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
            if (isShiftA) prodA += kg;
            else prodB += kg;
        };

        imRows.forEach(processRow);
        bmRows.forEach(processRow);

          // Cumulative Units Update
          totalUnitsA += unitsA;
          totalUnitsB += unitsB;
          
          // Cumulative Production Update
          totalProdA += prodA;
          totalProdB += prodB;

          // Liters Calculation (Day)
          const ltrA = unitsA * settings.litersPerUnit;
          const ltrB = unitsB * settings.litersPerUnit;

          // Liters Calculation (Cumulative)
          const cumLtrA = totalUnitsA * settings.litersPerUnit;
          const cumLtrB = totalUnitsB * settings.litersPerUnit;

          // Ltr per Kg Calculation (Day)
          const ltrPerKgA = prodA > 0 ? (ltrA / prodA) : 0;
          const ltrPerKgB = prodB > 0 ? (ltrB / prodB) : 0;

          // 🟢 CU Ltr per Kg Calculation (Cumulative)
          const cumLtrPerKgA = totalProdA > 0 ? (cumLtrA / totalProdA) : 0;
          const cumLtrPerKgB = totalProdB > 0 ? (cumLtrB / totalProdB) : 0;

          return {
              date: date.split('-')[2],
              fullDate: date,
              unitsA, unitsB,
              cumUnitsA: totalUnitsA, cumUnitsB: totalUnitsB,
              prodA, prodB,
              ltrA, ltrB,
              ltrPerKgA, ltrPerKgB,
              cumLtrPerKgA, cumLtrPerKgB
          };
      });

      const grandTotals = {
          unitsA: totalUnitsA, unitsB: totalUnitsB,
          prodA: totalProdA, prodB: totalProdB,
          ltrA: totalUnitsA * settings.litersPerUnit,
          ltrB: totalUnitsB * settings.litersPerUnit,
          upkA: totalProdA > 0 ? (totalUnitsA * settings.litersPerUnit) / totalProdA : 0,
          upkB: totalProdB > 0 ? (totalUnitsB * settings.litersPerUnit) / totalProdB : 0,
      };

      return { chartData, dates, grandTotals };
  }, [waterData, startDate, endDate, settings, allData]);

  return { waterData, settings, updateSetting, handleSave, metrics };
};