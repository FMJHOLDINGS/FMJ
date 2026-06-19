import { useState, useMemo, useCallback } from 'react';
import { calculateMetrics } from '../../utils'; 

export const useKPIPlanVsAchLogic = (
    data: Record<string, any>, 
    adminItems: any[] = [], 
    startDateProp?: string, 
    endDateProp?: string    
) => {
  const allData = data || {};

  // ============================================================================
  // 1. 🎛️ UI STATES & FILTERS (තිරයේ පෙනෙන දේවල් පාලනය)
  // ============================================================================
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts'>('overview');
  const [machineFilter, setMachineFilter] = useState<'ALL' | 'IM' | 'BM'>('ALL'); 
  const [includePreform, setIncludePreform] = useState<boolean>(false); 

  const startDate = startDateProp || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
  const endDate = endDateProp || new Date().toLocaleDateString('en-CA');

// ============================================================================
  // 2. 📦 DATA MAPS & HELPERS (භාණ්ඩ විස්තර සහ වර්ග හඳුනාගැනීම)
  // ============================================================================
  
  const getProductType = useCallback((row: any) => {
    // 1. productType සහ භාණ්ඩයේ නම සිම්පල් අකුරු කර ගැනීම
    const pType = (row.productType || '').toString().toLowerCase();
    const logName = (row.product || row.itemName || '').toString().trim().toLowerCase();

    // 2. Type එකේ හෝ නමේ 'preform' හෝ 'p/f' තිබේ නම් එය 'Preform' ලෙස අනිවාර්ය කිරීම
    if (pType.includes('preform') || pType.includes('p/f') || logName.includes('preform') || logName.includes('p/f')) {
        return 'Preform';
    }

    // 3. Type එකේ හෝ නමේ 'cap' තිබේ නම් 'Cap' ලෙස ලබා දීම
    if (pType.includes('cap') || logName.includes('cap')) {
        return 'Cap';
    }

    // 4. ඉහත කිසිවක් ගැලපෙන්නේ නැත්නම් Default අගය ලෙස 'Cap' ලබා දීම
    return 'Preform'; 
}, []); 



  // ============================================================================
  // 3. 🧠 CORE METRICS CALCULATION (PLANNING DEDUCTION LOGIC)
  // ============================================================================
  // Planning විනාඩි නිසා නැතිවූ ප්‍රමාණය Plan එකෙන් ඉවත් කිරීමේ ගණනය කිරීම
  const getAdjustedMetrics = useCallback((row: any) => {
      const m = calculateMetrics(row);
      let planningMins = 0;

      (row.breakdowns || []).forEach((bd: any) => {
          if (bd.startTime && bd.endTime && bd.category) {
              const [sh, sm] = bd.startTime.split(':').map(Number);
              const [eh, em] = bd.endTime.split(':').map(Number);
              let mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins < 0) mins += 1440; // රාත්‍රී මුරය සඳහා හැඩගැස්වීම
              
              if (mins > 0 && bd.category.toLowerCase().includes('planning')) {
                  planningMins += mins;
              }
          }
      });

      const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
      const planningLossQty = Math.floor(ratePerMin * planningMins);

      // Planning ප්‍රමාණය Plan එකෙන් සහ Loss එකෙන් අඩු කිරීම
      m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
      m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2));

      const updatedTotalLoss = Math.max(0, m.planQty - (row.achievedQty || 0));
      m.lostQty = updatedTotalLoss;
      m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2));

      return m;
  }, []);




  // ============================================================================
  // 4. 🚀 HIGH-PERFORMANCE DATA ENGINE (SINGLE-PASS PROCESSING)
  // ============================================================================
  const { chartData, totals, shiftSummaries } = useMemo(() => {
    const initialTotals = { plan: 0, achieved: 0, efficiency: 0, achA: 0, achB: 0 };
    const initialShifts = { shiftA: { plan: 0, ach: 0, eff: 0 }, shiftB: { plan: 0, ach: 0, eff: 0 } };

    if (!allData || Object.keys(allData).length === 0) {
        return { chartData: [], totals: initialTotals, shiftSummaries: initialShifts };
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const dateArray = [];
    for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d).toLocaleDateString('en-CA'));
    }

    let cumPlanA = 0, cumAchA = 0; 
    let cumPlanB = 0, cumAchB = 0; 

    // 🟢 ප්‍රධාන Loop එක (Single-pass හරහා අනවශ්‍ය Arrays සෑදීම නවතා ඇත)
    const processedData = dateArray.map(dateStr => {
      const supKey = `${dateStr}_SUPERVISORS`;
      const supData = allData[supKey] || { day: 'Shift-A', night: 'Shift-B' };

      let dayPlanA = 0, dayAchA = 0;
      let dayPlanB = 0, dayAchB = 0;

      // 🟢 අලුත් වෙනස 1: machineType එක ලබා ගැනීම
      // Row එකෙන් එක ගෙන පෙරහන් කර අගයන් එකතු කිරීමේ Helper Function එක
      const processRow = (row: any, machineType: 'IM' | 'BM') => {
        // 🟢 අලුත් වෙනස 2: IM යන්ත්‍රයේ පමණක් Preform පෙරහන් කරයි. BM යන්ත්‍රයේ කිසිවක් අයින් නොකරයි!
        if (machineType === 'IM' && !includePreform && getProductType(row) === 'Preform') return;

        // Planning අඩුකළ නිවැරදි දත්ත ලබා ගැනීම
        const metrics = getAdjustedMetrics(row);
        const shiftType = row.shift || 'day'; 
        const assignedTeam = shiftType === 'day' ? supData.day : supData.night;

        if (assignedTeam === 'Shift-A') {
            dayPlanA += metrics.planKg;
            dayAchA += metrics.achievedKg;
        } else {
            dayPlanB += metrics.planKg;
            dayAchB += metrics.achievedKg;
        }
    };

    // 🟢 අලුත් වෙනස 3: Loop කරන විට IM සහ BM ලෙස වර්ගය processRow වෙත යැවීම
    // Machine Filter එක අනුව අදාළ Rows පමණක් Loop කිරීම
    if (machineFilter === 'ALL' || machineFilter === 'IM') {
        (allData[`${dateStr}_IM`]?.rows || []).forEach((row: any) => processRow(row, 'IM'));
    }
    if (machineFilter === 'ALL' || machineFilter === 'BM') {
        (allData[`${dateStr}_BM`]?.rows || []).forEach((row: any) => processRow(row, 'BM'));
    }

      // Cumulative අගයන් යාවත්කාලීන කිරීම
      cumPlanA += dayPlanA; cumAchA += dayAchA;
      cumPlanB += dayPlanB; cumAchB += dayAchB;

      const displayDate = new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      return {
        fullDate: dateStr, date: displayDate,
        planA: dayPlanA, achievedA: dayAchA, effA: dayPlanA > 0 ? (dayAchA / dayPlanA) * 100 : 0,
        cumPlanA, cumAchA, cumEffA: cumPlanA > 0 ? (cumAchA / cumPlanA) * 100 : 0,
        planB: dayPlanB, achievedB: dayAchB, effB: dayPlanB > 0 ? (dayAchB / dayPlanB) * 100 : 0,
        cumPlanB, cumAchB, cumEffB: cumPlanB > 0 ? (cumAchB / cumPlanB) * 100 : 0,
        totalPlan: dayPlanA + dayPlanB,
        totalAchieved: dayAchA + dayAchB,
        totalEff: (dayPlanA + dayPlanB) > 0 ? ((dayAchA + dayAchB) / (dayPlanA + dayPlanB)) * 100 : 0
      };
    });

    const grandTotalPlan = cumPlanA + cumPlanB;
    const grandTotalAch = cumAchA + cumAchB;

    return {
      chartData: processedData,
      totals: {
        plan: grandTotalPlan, achieved: grandTotalAch,
        efficiency: grandTotalPlan > 0 ? (grandTotalAch / grandTotalPlan) * 100 : 0,
        achA: cumAchA, achB: cumAchB
      },
      shiftSummaries: {
        shiftA: { plan: cumPlanA, ach: cumAchA, eff: cumPlanA > 0 ? (cumAchA / cumPlanA) * 100 : 0 },
        shiftB: { plan: cumPlanB, ach: cumAchB, eff: cumPlanB > 0 ? (cumAchB / cumPlanB) * 100 : 0 }
      }
    };
  }, [allData, startDate, endDate, machineFilter, includePreform, getProductType, getAdjustedMetrics]); 

  // ============================================================================
  // 5. 📤 RETURN DATA (UI එකට අවශ්‍ය දත්ත පිට කිරීම)
  // ============================================================================
  return {
    activeTab, setActiveTab,
    startDate, endDate,  
    chartData, totals, shiftSummaries,
    machineFilter, setMachineFilter,
    includePreform, setIncludePreform
  };
};