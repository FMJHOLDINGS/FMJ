import { useState, useCallback, useMemo } from 'react';
import { calculateMetrics } from '../../utils';
import { generateMonthlyExcel } from './MonthlyProductionExcel';

// 🟢 DEFAULT_REASONS සම්පූර්ණයෙන්ම ඉවත් කර ඇත.

export const useMonthlyLogic = (allData: any, currentDate: string) => {
    
    const [isGenerating, setIsGenerating] = useState(false);
    
    // 🟢 1. Database එකෙන් සෘජුවම Categories (Reasons) ලබා ගැනීම
    const REASONS = useMemo(() => {
        const cats = new Set<string>();
        const [year, month] = currentDate?.split('-') || ['2025', '01'];

        // Database එකේ ඇති සියලුම දින පරීක්ෂා කිරීම
        Object.keys(allData).forEach(key => {
            // තෝරාගත් මාසයට අදාළ දත්ත පමණක් පෙරීම (උදා: 2026-04)
            if (key.startsWith(`${year}-${month}`)) {
                allData[key]?.rows?.forEach((row: any) => {
                    row.breakdowns?.forEach((bd: any) => {
                        // 🟢 Planning නොවන සහ හිස් නොවන Categories පමණක් Set එකට එකතු කිරීම
                        if (bd.category && !bd.category.toLowerCase().includes('planning')) {
                            cats.add(bd.category);
                        }
                    });
                });
            }
        });

        // අකාරාදී පිළිවෙළට (A-Z) සකස් කර Array එකක් ලෙස ලබා දීම
        return Array.from(cats).sort();
    }, [allData, currentDate]);

    // ============================================================================
    // 2. 🧠 CORE METRICS CALCULATION (PLANNING DEDUCTION)
    // ============================================================================
    const getAdjustedMetrics = useCallback((row: any) => {
        const m = calculateMetrics(row);
        let planningLossQty = 0;
        let actualBdLossQty = 0;
        const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;

        (row.breakdowns || []).forEach((bd: any) => {
            if (bd.startTime && bd.endTime && bd.category) {
                const [sh, sm] = bd.startTime.split(':').map(Number);
                const [eh, em] = bd.endTime.split(':').map(Number);
                let mins = (eh * 60 + em) - (sh * 60 + sm);
                if (mins < 0) mins += 1440;

                if (mins > 0) {
                    const bdQty = Math.floor(ratePerMin * mins);
                    if (bd.category.toLowerCase().includes('planning')) planningLossQty += bdQty;
                    else actualBdLossQty += bdQty;
                }
            }
        });

        // Planning නිසා නැතිවූ ප්‍රමාණය Plan එකෙන් අඩු කිරීම
        m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
        m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2));

        // සෘණ (-) අගයන් සඳහා Math.max ඉවත් කර ඇත
        const updatedTotalLoss = m.planQty - (row.achievedQty || 0);
        
        m.efficiencyLossQty = updatedTotalLoss - actualBdLossQty;
        m.efficiencyLossKg = Number(((m.efficiencyLossQty * (row.unitWeight || 0)) / 1000).toFixed(2));

        m.lostQty = updatedTotalLoss;
        m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2));

        return m;
    }, []);

    // ============================================================================
    // 3. 🚀 HIGH-PERFORMANCE SINGLE-PASS DATA PROCESSING
    // ============================================================================
    const getProcessedData = useCallback((activeTab: string) => {
        const isSummary = activeTab === 'Summary';
        const dayIndex = isSummary ? 0 : parseInt(activeTab);

        let data = { im: { dP: 0, dA: 0, nP: 0, nA: 0, effLoss: 0 }, bm: { dP: 0, dA: 0, nP: 0, nA: 0, effLoss: 0 } };
        let breakdownData: any = {};
        REASONS.forEach(r => { breakdownData[r] = { im: 0, bm: 0 }; });

        const [year, month] = currentDate?.split('-') || ['2025', '01'];
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const daysToProcess = isSummary ? Array.from({ length: daysInMonth }, (_, i) => i + 1) : [dayIndex];

        daysToProcess.forEach(d => {
            const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            const processRow = (row: any, type: 'IM' | 'BM') => {
                const m = getAdjustedMetrics(row);
                const t = type.toLowerCase() as 'im' | 'bm';

                if (row.shift === 'day') { data[t].dP += m.planKg; data[t].dA += m.achievedKg; } 
                else { data[t].nP += m.planKg; data[t].nA += m.achievedKg; }
                
                const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
                let rowBdKgTotal = 0;

                (row.breakdowns || []).forEach((bd: any) => {
                    if (bd.category) {
                        const [sh, sm] = (bd.startTime || '00:00').split(':').map(Number);
                        const [eh, em] = (bd.endTime || '00:00').split(':').map(Number);
                        let mins = (eh * 60 + em) - (sh * 60 + sm);
                        if (mins < 0) mins += 1440;
                        
                        if (mins > 0) {
                            const bdQty = Math.floor(ratePerMin * mins);
                            const lKg = Number(((bdQty * (row.unitWeight || 0)) / 1000).toFixed(2));
                            
                            // Database එකට සමාන වීමට සියලුම non-planning අගයන් එකතු කිරීම
                            if (!bd.category.toLowerCase().includes('planning')) {
                                rowBdKgTotal += lKg;
                            }

                            if (breakdownData[bd.category]) {
                                breakdownData[bd.category][t] += lKg;
                            }
                        }
                    }
                });

                // Accuracy එක 100% ක් සමාන කිරීමට
                const exactEffLossKg = m.lostKg - rowBdKgTotal;
                data[t].effLoss += exactEffLossKg;
            };

            (allData[`${dayStr}_IM`]?.rows || []).forEach((r: any) => processRow(r, 'IM'));
            (allData[`${dayStr}_BM`]?.rows || []).forEach((r: any) => processRow(r, 'BM'));
        });

        const calcRow = (base: any, type: 'IM' | 'BM') => {
            const planKg = base.dP + base.nP;
            const prodKg = base.dA + base.nA;
            
            // 1. Lost Kg ගණනය (Plan - Production)
            const lostKg = planKg - prodKg; 
            
            let breakdownSum = 0;
            REASONS.forEach(r => breakdownSum += breakdownData[r][type.toLowerCase()]);
            
            // 🟢 2. ඔබගේ විශිෂ්ට ලොජික් එක: Eff Loss = Lost Kg - Breakdowns
            const exactEffLoss = lostKg - breakdownSum;
            
            // 🟢 3. Accuracy = Breakdowns + Eff Loss (එනම් අනිවාර්යයෙන්ම Lost Kg ම වේ)
            const finalAccuracy = breakdownSum + exactEffLoss;

            return { 
                planKg, prodKg, lostKg, 
                breakdownSum: finalAccuracy,
                effLoss: exactEffLoss, // 🟢 අලුත් නිවැරදි Eff Loss එක යෙදීම
                eff: planKg > 0 ? (prodKg / planKg) * 100 : 0, 
                lostP: planKg > 0 ? (lostKg / planKg) * 100 : 0, 
                ...base 
            };
        };

        

        const imR = calcRow(data.im, 'IM');
        const bmR = calcRow(data.bm, 'BM');
        const globalR = {
            planKg: imR.planKg + bmR.planKg,
            prodKg: imR.prodKg + bmR.prodKg,
            lostKg: (imR.planKg + bmR.planKg) - (imR.prodKg + bmR.prodKg),
            breakdownSum: imR.breakdownSum + bmR.breakdownSum,
            effLoss: imR.effLoss + bmR.effLoss,
            eff: (imR.planKg + bmR.planKg) > 0 ? ((imR.prodKg + bmR.planKg) / (imR.planKg + bmR.planKg)) * 100 : 0
        };

        return { imR, bmR, globalR, breakdownData };
    }, [allData, currentDate, REASONS, getAdjustedMetrics]);

    // ============================================================================
    // 5. EXCEL DOWNLOAD HANDLER
    // ============================================================================
    const downloadSystemReport = async () => {
        setIsGenerating(true);
        await generateMonthlyExcel(allData, currentDate, REASONS);
        setIsGenerating(false);
    };

    return {
        REASONS,
        isGenerating,
        downloadSystemReport,
        getProcessedData
    };
};