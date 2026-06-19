import { useState, useEffect, useCallback } from 'react';
import { KpiService } from '../services/KpiService';
import { KPIMonthlyDoc } from '../KPITypes';
import { useAuth } from '../context/AuthContext';

export const useKpiManager = (selectedDate: string) => {
  const [kpiData, setKpiData] = useState<KPIMonthlyDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const { userData } = useAuth();
  const collectionName = userData?.collectionName;
  const [year, month] = selectedDate ? selectedDate.split('-') : ["", ""];

  useEffect(() => {
    if (!collectionName || !year || !month) {
        setLoading(false); 
        return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
        // 🟢 අලුත් fetchMonthlyKPI එකට කතා කිරීම (onSnapshot වෙනුවට)
        const data = await KpiService.fetchMonthlyKPI(collectionName, year, month);
        if (isMounted) {
            setKpiData(data);
            setLoading(false);
        }
    };

    loadData();

    return () => { isMounted = false; };
  }, [collectionName, year, month]);

  // 🟢 අලුත් Save Function එක (Optimistic UI Update සමග)
  const saveKpiCell = useCallback(async (category: string, date: string, shiftPath: string, value: any) => {
    if (!collectionName || !year || !month) return;

    // 1. තිරයේ ගැස්සීම (Flickering) නැවැත්වීමට, Local State එක වහාම යාවත්කාලීන කිරීම
    setKpiData((prev: any) => {
        const newData = prev ? JSON.parse(JSON.stringify(prev)) : {};
        if (!newData[category]) newData[category] = {};
        if (!newData[category][date]) newData[category][date] = {};
        
        const pathParts = shiftPath.split('.');
        if (pathParts.length === 1) {
            newData[category][date][pathParts[0]] = value;
        } else {
            if (!newData[category][date][pathParts[0]]) newData[category][date][pathParts[0]] = {};
            newData[category][date][pathParts[0]][pathParts[1]] = value;
        }
        return newData;
    });

    // 2. පසුබිමෙන් සර්වර් එකට දත්ත යැවීම
    try {
        await KpiService.saveDailyCell(collectionName, year, month, category, date, shiftPath, value);
    } catch (error) {
        console.error("Failed to save KPI cell:", error);
    }
  }, [collectionName, year, month]);

  return { kpiData, saveKpiCell, loading };
};