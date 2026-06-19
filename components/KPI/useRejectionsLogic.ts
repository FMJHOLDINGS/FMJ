import { useState, useMemo, useCallback } from 'react';
import { getDatesInRange, calculateMetrics } from '../../utils';

export const useRejectionsLogic = (
    startDate: string, 
    endDate: string, 
    allData: any
) => {
  
  // 1. Settings පැටවීම (Target Rejection %)
  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('fmj_rej_settings');
        return saved ? JSON.parse(saved) : { targetRejPer: 2.0 }; 
    } catch {
        return { targetRejPer: 2.0 };
    }
  });

  const updateSetting = useCallback((key: 'targetRejPer', value: string) => {
    const num = parseFloat(value) || 0;
    const newSettings = { ...settings, [key]: num };
    setSettings(newSettings);
    localStorage.setItem('fmj_rej_settings', JSON.stringify(newSettings));
  }, [settings]);


  // 2. 🚀 HIGH-PERFORMANCE MAIN CALCULATIONS (Auto Fetching Rejections)
  const metrics = useMemo(() => {
      if (!startDate || !endDate) return { chartData: [], grandTotals: {} };

      const dates = getDatesInRange(startDate, endDate);
      
      let cumProdA_IM = 0, cumProdA_BM = 0, cumProdB_IM = 0, cumProdB_BM = 0;
      let cumRejA_IM = 0, cumRejA_BM = 0, cumRejB_IM = 0, cumRejB_BM = 0;

      const chartData = dates.map(date => {
        // Production Data 
        const imRows = allData[`${date}_IM`]?.rows || [];
        const bmRows = allData[`${date}_BM`]?.rows || [];
        
        // එදිනට අදාළව දහවල්/රාත්‍රී මුරයේ සිටියේ කුමන කණ්ඩායමදැයි සෙවීම
        const supData = allData[`${date}_SUPERVISORS`] || {};
        const dayTeam = supData.day || 'Shift-A';
        const nightTeam = supData.night || 'Shift-B';

        let prodA_IM = 0, prodA_BM = 0;
        let prodB_IM = 0, prodB_BM = 0;
        let rejA_IM = 0, rejA_BM = 0;
        let rejB_IM = 0, rejB_BM = 0;

        // 🟢 අලුත් වෙනස: Production සහ Rejection දෙකම එකවර ස්වයංක්‍රීයව ගණනය කිරීම
        const processProduction = (row: any, isIM: boolean) => {
            let kg = 0;
            try { 
                kg = calculateMetrics(row).achievedKg || 0; 
            } catch { 
                const weight = Number(row.unitWeight || row.weight || 0);
                kg = Number(((Number(row.achievedQty || 0) * weight) / 1000).toFixed(2));
            }

            // Quality Tab එකේ හෝ Production Log එකේ ඇති Rej සහ Start Qty ගෙන Rejection Kg සෑදීම
            const rQty = Number(row.qaRejQty !== undefined ? row.qaRejQty : row.qtyReject || 0);
            const sQty = Number(row.qaStartQty !== undefined ? row.qaStartQty : row.qtyStartup || 0);
            const unitWt = Number(row.unitWeight || row.weight || 0);
            const rowRejKg = ((rQty + sQty) * unitWt) / 1000;

            // නියම කණ්ඩායම (Shift A හෝ B) හඳුනාගැනීම
            let isShiftA = false;
            if (row.shift === 'day') isShiftA = (dayTeam === 'Shift-A');
            else isShiftA = (nightTeam === 'Shift-A');

            // අදාළ යන්ත්‍ර වර්ගයට සහ කණ්ඩායමට Kg එකතු කිරීම
            if (isIM) {
                if (isShiftA) { prodA_IM += kg; rejA_IM += rowRejKg; } 
                else { prodB_IM += kg; rejB_IM += rowRejKg; }
            } else {
                if (isShiftA) { prodA_BM += kg; rejA_BM += rowRejKg; } 
                else { prodB_BM += kg; rejB_BM += rowRejKg; }
            }
        };

        imRows.forEach((row: any) => processProduction(row, true));
        bmRows.forEach((row: any) => processProduction(row, false));

        // Cumulative Updates
        cumProdA_IM += prodA_IM; cumProdA_BM += prodA_BM;
        cumProdB_IM += prodB_IM; cumProdB_BM += prodB_BM;

        cumRejA_IM += rejA_IM; cumRejA_BM += rejA_BM;
        cumRejB_IM += rejB_IM; cumRejB_BM += rejB_BM;

        // Daily %
        const perA_IM = prodA_IM > 0 ? (rejA_IM / prodA_IM) * 100 : 0;
        const perA_BM = prodA_BM > 0 ? (rejA_BM / prodA_BM) * 100 : 0;
        const perB_IM = prodB_IM > 0 ? (rejB_IM / prodB_IM) * 100 : 0;
        const perB_BM = prodB_BM > 0 ? (rejB_BM / prodB_BM) * 100 : 0;

        // Cumulative % 
        const cumPerA_IM = cumProdA_IM > 0 ? (cumRejA_IM / cumProdA_IM) * 100 : 0;
        const cumPerA_BM = cumProdA_BM > 0 ? (cumRejA_BM / cumProdA_BM) * 100 : 0;
        const cumPerB_IM = cumProdB_IM > 0 ? (cumRejB_IM / cumProdB_IM) * 100 : 0;
        const cumPerB_BM = cumProdB_BM > 0 ? (cumRejB_BM / cumProdB_BM) * 100 : 0;

        // Chart Line සඳහා
        const combCumProdA = cumProdA_IM + cumProdA_BM;
        const combCumRejA = cumRejA_IM + cumRejA_BM;
        const combCumPerA = combCumProdA > 0 ? (combCumRejA / combCumProdA) * 100 : 0;

        const combCumProdB = cumProdB_IM + cumProdB_BM;
        const combCumRejB = cumRejB_IM + cumRejB_BM;
        const combCumPerB = combCumProdB > 0 ? (combCumRejB / combCumProdB) * 100 : 0;

        return {
            date: date.split('-')[2], fullDate: date,
            prodA_IM, prodA_BM, prodB_IM, prodB_BM,
            rejA_IM, rejA_BM, rejB_IM, rejB_BM,
            perA_IM, perA_BM, perB_IM, perB_BM,
            cumPerA_IM, cumPerA_BM, cumPerB_IM, cumPerB_BM,
            combCumPerA, combCumPerB,
            targetLineVal: settings.targetRejPer 
        };
      });

      const grandTotals = {
          prodA_IM: cumProdA_IM, prodA_BM: cumProdA_BM,
          prodB_IM: cumProdB_IM, prodB_BM: cumProdB_BM,
          rejA_IM: cumRejA_IM, rejA_BM: cumRejA_BM,
          rejB_IM: cumRejB_IM, rejB_BM: cumRejB_BM,
          cumPerA_IM: cumProdA_IM > 0 ? (cumRejA_IM / cumProdA_IM) * 100 : 0,
          cumPerA_BM: cumProdA_BM > 0 ? (cumRejA_BM / cumProdA_BM) * 100 : 0,
          cumPerB_IM: cumProdB_IM > 0 ? (cumRejB_IM / cumProdB_IM) * 100 : 0,
          cumPerB_BM: cumProdB_BM > 0 ? (cumRejB_BM / cumProdB_BM) * 100 : 0,
      };

      return { chartData, dates, grandTotals };
  }, [startDate, endDate, settings, allData]);

  return { settings, updateSetting, metrics };
};