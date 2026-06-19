// components/DELIVERY/useDeliveryManager.ts
import { useState, useEffect, useCallback } from 'react';
import { DeliveryService } from './DeliveryService';
import { useAuth } from '../../context/AuthContext';

export const useDeliveryManager = (selectedMonthDate: string) => {
  const [deliveryData, setDeliveryData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const { userData } = useAuth();
  const collectionName = userData?.collectionName;
  const [year, month] = selectedMonthDate ? selectedMonthDate.split('-') : ["", ""];

  useEffect(() => {
    if (!collectionName || !year || !month) {
        setLoading(false); 
        return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
        const data = await DeliveryService.fetchMonthlyDeliveries(collectionName, year, month);
        if (isMounted) {
            setDeliveryData(data || {});
            setLoading(false);
        }
    };

    loadData();

    return () => { isMounted = false; };
  }, [collectionName, year, month]);

  // 🟢 අලුත් Delivery එකක් Save කිරීමේ Function එක (Optimistic UI)
  const saveDeliveryLog = useCallback(async (jobId: string, date: string, qty: number) => {
    if (!collectionName) return;

    // තිරයේ ගැස්සීමක් නොමැතිව වහාම යාවත්කාලීන වීම සඳහා (UI Update)
    setDeliveryData((prev: any) => {
        const newData = prev ? JSON.parse(JSON.stringify(prev)) : {};
        if (!newData[jobId]) newData[jobId] = {};
        
        newData[jobId][date] = qty;
        
        return newData;
    });

    // පසුබිමෙන් Database එකට යැවීම
    try {
        await DeliveryService.saveDeliveryLog(collectionName, jobId, date, qty);
    } catch (error) {
        console.error("Failed to save delivery log:", error);
    }
  }, [collectionName]);

  // 🟢 වැරදුණු Delivery එකක් මකා දැමීමේ Function එක (Optimistic UI)
  const deleteDeliveryLog = useCallback(async (jobId: string, date: string) => {
    if (!collectionName) return;

    // තිරයේ වහාම වෙනස පෙන්වීමට Local State එකෙන් මකා දැමීම
    setDeliveryData((prev: any) => {
        const newData = prev ? JSON.parse(JSON.stringify(prev)) : {};
        if (newData[jobId] && newData[jobId][date]) {
            delete newData[jobId][date];
        }
        return newData;
    });

    // පසුබිමෙන් Database එකෙන් මකා දැමීම
    try {
        await DeliveryService.deleteDeliveryLog(collectionName, jobId, date);
    } catch (error) {
        console.error("Failed to delete delivery log:", error);
    }
  }, [collectionName]);

  return { deliveryData, saveDeliveryLog, deleteDeliveryLog, loading };
};