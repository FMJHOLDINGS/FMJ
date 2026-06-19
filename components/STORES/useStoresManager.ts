import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StoresService } from './StoresService';
import { StockItem, StockCategory, MasterStockItem, MonthlyStockData } from './StoresTypes';

export const useStoresManager = (currentCategory: StockCategory, selectedMonth: string) => {
  
  // --- 1. STATES ---
  const { userData } = useAuth();
  const collectionName = userData?.collectionName;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- 2. FETCH FUNCTION (Server එකෙන් දත්ත ගෙන ඒම) ---
  const fetchFromServer = useCallback(async () => {
    if (!collectionName || !currentCategory || !selectedMonth) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { masterData, monthlyData } = await StoresService.fetchStockFromServer(collectionName, currentCategory, selectedMonth);
      
      const mergedItems: StockItem[] = masterData.map(master => {
        const monthDetails = monthlyData[master.id] || { openStock: 0, inTrans: [], outTrans: [], returnTrans: [] };
        return { ...master, ...monthDetails };
      });
      
      setStockItems(mergedItems);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data from server");
    } finally {
      setLoading(false);
    }
  }, [collectionName, currentCategory, selectedMonth]);

  // --- 3. AUTO FETCH ON MOUNT / TAB CHANGE ---
  useEffect(() => {
    fetchFromServer();
  }, [fetchFromServer]);

  // --- 4. SAVE FUNCTION ---
  const saveStockData = useCallback(async (newItems: StockItem[]) => {
    if (!collectionName || !currentCategory || !selectedMonth) return;
    
    try {
      setStockItems(newItems); // Optimistic UI Update

      const masterList: MasterStockItem[] = [];
      const monthlyList: Record<string, MonthlyStockData> = {};

      newItems.forEach(item => {
        masterList.push({ id: item.id, item: item.item, weight: item.weight, reorderLevel: item.reorderLevel });
        monthlyList[item.id] = { openStock: item.openStock, inTrans: item.inTrans, outTrans: item.outTrans, returnTrans: item.returnTrans };
      });

      await StoresService.saveStock(collectionName, currentCategory, selectedMonth, masterList, monthlyList);
    } catch (err: any) {
      setError(err.message || "Failed to save data");
    }
  }, [collectionName, currentCategory, selectedMonth]);



 // ============================================================================
  // [NEW] 🔄 SYNC FROM LAST MONTH (Super Fail-Safe Version)
  // ============================================================================
  const syncFromPreviousMonth = useCallback(async () => {
    if (!collectionName || !currentCategory || !selectedMonth) return;
    
    try {
      setLoading(true);
      setError(null);

      // 1. ගිය මාසය ගණනය කිරීම (උදා: "2026-04" -> "2026-03")
      const [year, month] = selectedMonth.split('-').map(Number);
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
      const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

      // 2. ගිය මාසයේ දත්ත Server එකෙන් ලබා ගැනීම
      const { monthlyData: prevMonthlyData } = await StoresService.fetchStockFromServer(
        collectionName, currentCategory, prevMonthStr
      );

      let syncedCount = 0; // කීයක් අප්ඩේට් වුණාද යන්න ගණනය කිරීමට

      // 3. නිවැරදිව ගණනය කිරීම (Super Fail-safe)
      const updatedItems = stockItems.map(currentItem => {
        const prevDetails = prevMonthlyData[currentItem.id];
        
        // ගිය මාසයේ දත්ත නැත්නම් Open Stock 0 ලෙස තබයි
        if (!prevDetails) {
            return { ...currentItem, openStock: 0 };
        }
        
        // Array එකක් නොවුණත් Crash නොවන ලෙස මෙය සකසා ඇත
        let sumIn = 0, sumOut = 0, sumReturn = 0;
        
        if (Array.isArray(prevDetails.inTrans)) {
            sumIn = prevDetails.inTrans.reduce((a, b) => a + (Number(b?.value) || 0), 0);
        }
        if (Array.isArray(prevDetails.outTrans)) {
            sumOut = prevDetails.outTrans.reduce((a, b) => a + (Number(b?.value) || 0), 0);
        }
        if (Array.isArray(prevDetails.returnTrans)) {
            sumReturn = prevDetails.returnTrans.reduce((a, b) => a + (Number(b?.value) || 0), 0);
        }
        
        const prevOpenStock = Number(prevDetails.openStock) || 0;
        const prevClosingStock = prevOpenStock + sumIn - sumOut + sumReturn;

        syncedCount++; // සාර්ථක වූ ගණන වැඩි කරයි

        return { ...currentItem, openStock: prevClosingStock }; // අලුත් අගය යොදයි
      });

      // 4. අලුත් Open Stock අගයන් Database එකේ Save කිරීම
      await saveStockData(updatedItems);

      // හරියටම මොකද වුණේ කියලා පැහැදිලිව පෙන්වන Alert එක
      alert(`සාර්ථකයි! ${prevMonthStr} මාසයෙන් භාණ්ඩ ${syncedCount} ක Closing Stock අගයන්, ${selectedMonth} මාසයේ Open Stock එකට ඇතුළත් කරන ලදී.`);
      
    } catch (err: any) {
      console.error("Sync Error:", err);
      setError(err.message || "Failed to sync from previous month");
      alert(`Error: දත්ත Sync කිරීම අසාර්ථක විය. (${err.message})`);
    } finally {
      setLoading(false);
    }
  }, [collectionName, currentCategory, selectedMonth, stockItems, saveStockData]);



  // ============================================================================
  // 5. 🚀 EXPORT (අනෙක් Component වලට ලබා දෙන දේවල්)
  // ============================================================================
  return { 
    stockItems, 
    loading, 
    error, 
    saveStockData, 
    fetchFromServer,
    syncFromPreviousMonth 
  };
};