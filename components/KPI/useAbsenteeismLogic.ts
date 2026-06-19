import { useState, useMemo, useCallback } from 'react';
import { useKpiManager } from '../../hooks/useKpiManager';
import { getDatesInRange } from '../../utils';

export const useAbsenteeismLogic = (
    startDate: string, 
    endDate: string
) => {
  
  // ============================================================================
  // 1. 🗄️ KPI MANAGER & SETTINGS LOAD
  // ============================================================================
  const { kpiData, saveKpiCell } = useKpiManager(startDate);
  const absData = (kpiData as any)?.absenteeism || {};

  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('fmj_abs_settings');
        return saved ? JSON.parse(saved) : { targetAbsentPer: 5.0 }; 
    } catch {
        return { targetAbsentPer: 5.0 };
    }
  });

  // ============================================================================
  // 2. 💾 DATA SAVE LOGIC (Excel-like Save via Dot Notation)
  // ============================================================================
  const handleSave = useCallback(async (date: string, shift: 'shiftA' | 'shiftB', field: 'absent' | 'allocated', value: string) => {
    const numVal = Math.max(0, parseFloat(value) || 0); 
    
    // Dot Notation මඟින් උදාහරණයක් ලෙස "shiftA.absent" කියන තැන පමණක් යාවත්කාලීන කරයි
    const fieldPath = `${shift}.${field}`; 
    await saveKpiCell('absenteeism', date, fieldPath, numVal);

  }, [saveKpiCell]);

  const updateSetting = useCallback((key: 'targetAbsentPer', value: string) => {
      const num = parseFloat(value) || 0;
      const newSettings = { ...settings, [key]: num };
      setSettings(newSettings);
      localStorage.setItem('fmj_abs_settings', JSON.stringify(newSettings));
  }, [settings]);

  // ============================================================================
  // 3. 🚀 HIGH-PERFORMANCE MAIN CALCULATIONS (Single Pass)
  // ============================================================================
  const metrics = useMemo(() => {
      if (!startDate || !endDate) return { chartData: [], grandTotals: {} };

      const dates = getDatesInRange(startDate, endDate);
      
      let cumAbsentA = 0, cumAllocA = 0;
      let cumAbsentB = 0, cumAllocB = 0;

      const chartData = dates.map(date => {
          const dayData = absData[date] || {};
          
          // Daily Values
          const absentA = Number(dayData.shiftA?.absent || 0);
          const allocA = Number(dayData.shiftA?.allocated || 0);
          
          const absentB = Number(dayData.shiftB?.absent || 0);
          const allocB = Number(dayData.shiftB?.allocated || 0);

          // Cumulative Updates
          cumAbsentA += absentA; cumAllocA += allocA;
          cumAbsentB += absentB; cumAllocB += allocB;

          // Daily %
          const perA = allocA > 0 ? (absentA / allocA) * 100 : 0;
          const perB = allocB > 0 ? (absentB / allocB) * 100 : 0;

          // Cumulative %
          const cumPerA = cumAllocA > 0 ? (cumAbsentA / cumAllocA) * 100 : 0;
          const cumPerB = cumAllocB > 0 ? (cumAbsentB / cumAllocB) * 100 : 0;

          return {
              date: date.split('-')[2], 
              fullDate: date,
              absentA, allocA, absentB, allocB,
              perA, perB,
              cumPerA, cumPerB,
              targetLineVal: settings.targetAbsentPer 
          };
      });

      const grandTotals = {
          absentA: cumAbsentA, allocA: cumAllocA,
          absentB: cumAbsentB, allocB: cumAllocB,
          cumPerA: cumAllocA > 0 ? (cumAbsentA / cumAllocA) * 100 : 0,
          cumPerB: cumAllocB > 0 ? (cumAbsentB / cumAllocB) * 100 : 0,
      };

      return { chartData, dates, grandTotals };
  }, [absData, startDate, endDate, settings]);

  return { absData, settings, updateSetting, handleSave, metrics };
};