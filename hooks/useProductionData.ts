import { useState, useEffect, useCallback, useRef } from 'react';
import { deleteField } from 'firebase/firestore'; // 🟢 Added for safe deletion
import DataService from '../services/DataService';
import { AdminConfig } from '../types';
import { getDatesInRange } from '../utils';

const DEFAULT_CONFIG: AdminConfig = { shiftTeams: ['Shift-A', 'Shift-B'], breakdownCategories: [], qaCategories: [] };



// 🟢 Firebase හි ඇති Rows, UI එකට Array එකක් ලෙස සකස් කර දීම
const parseRows = (rowsData: any) => {
  if (!rowsData) return [];
  
  const rowsArray = Array.isArray(rowsData) ? rowsData : Object.values(rowsData);
  
  // 🟢 අර කලින් මැකීමට උත්සාහ කර සිරවී ඇති හිස් පේළි (Ghost Rows) ස්වයංක්‍රීයව UI එකෙන් ඉවත් කිරීම
  return rowsArray.filter((row: any) => row !== null && typeof row === 'object' && row.id);
};



export const useProductionData = (dateProp: string, collectionName: string) => {
  const [combinedData, setCombinedData] = useState<Record<string, any>>({});
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(DEFAULT_CONFIG);

  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [localStatus, setLocalStatus] = useState<'success' | 'error'>('success'); 
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const listenersRef = useRef<Record<string, () => void>>({});

  const loadedRangeRef = useRef<{start: string, end: string} | null>(null);

  // 1. Load Admin Config 
  useEffect(() => {
    if (!collectionName) return;
    return DataService.subscribeToConfig(collectionName, (data) => setAdminConfig(data || DEFAULT_CONFIG));
  }, [collectionName]);



  // 2. Load Daily Data & Monthly Summary
  useEffect(() => {
    if (!collectionName || !dateProp) return;

    // 🟢 1. දිනපතා Production දත්ත Load කිරීම
    const unsubscribeDaily = DataService.subscribeToProductionDay(collectionName, dateProp, (docData) => {
      setCombinedData(prev => {
        if (!docData) {
          const newState = { ...prev };
          delete newState[`${dateProp}_IM`];
          delete newState[`${dateProp}_BM`];
          delete newState[`${dateProp}_SUPERVISORS`];
          return newState;
        }

        const prevImDrafts = (prev[`${dateProp}_IM`]?.rows || []).filter((r: any) => !r.machine || !r.product);
        const prevBmDrafts = (prev[`${dateProp}_BM`]?.rows || []).filter((r: any) => !r.machine || !r.product);

        return {
          ...prev,
          [`${dateProp}_IM`]: docData.IM ? { ...docData.IM, rows: [...parseRows(docData.IM.rows), ...prevImDrafts] } : { rows: prevImDrafts }, 
          [`${dateProp}_BM`]: docData.BM ? { ...docData.BM, rows: [...parseRows(docData.BM.rows), ...prevBmDrafts] } : { rows: prevBmDrafts }, 
          [`${dateProp}_SUPERVISORS`]: docData.supervisors || {}
        };
      });
    });

    // 🟢 2. අලුත් ක්‍රමය: මාසයට අදාළ Summary Document එකට සවන් දීම
    const monthStr = dateProp.substring(0, 7);
    const unsubscribeSummary = DataService.subscribeToMonthlySummary(collectionName, monthStr, (summaryData) => {
      if (summaryData) {
        setCombinedData(prev => {
          const newState = { ...prev };
          // මාසයේ සියලුම දිනවල දත්ත අදාළ date_REPORT යටතේ update කිරීම
          Object.keys(summaryData).forEach(dateKey => {
            newState[`${dateKey}_REPORT`] = summaryData[dateKey];
          });
          return newState;
        });
      }
    });

    return () => { unsubscribeDaily(); unsubscribeSummary(); };
  }, [dateProp, collectionName]);



  // 3. Save Data (Smart Diffing - Prevent Overwrite)
  const updateDayData = useCallback(async (arg1: string, arg2: any, arg3?: any) => {
    if (!collectionName) return;

    let date = '';
    let type: 'IM' | 'BM' | 'supervisors' | 'REPORT' = 'IM';
    let newData = null;

    if (arg3 !== undefined) {
       date = arg1;
       type = arg2 === 'SUPERVISORS' ? 'supervisors' : arg2;
       newData = arg3;
    } else {
       const parts = arg1.split('_'); 
       date = parts[0]; 
       const rawType = parts[1];
       if(!date || !rawType) return; 
       type = rawType === 'SUPERVISORS' ? 'supervisors' : rawType as any;
       newData = arg2;
    }

    if (!newData) return;

    const uiKey = `${date}_${type === 'supervisors' ? 'SUPERVISORS' : type}`;
    
    // 🟢 Optimistic Update & Smart Sync
    setCombinedData(prev => {
        const prevData = prev[uiKey];
        const firestorePayload: any = { [type]: {} };
        let hasChanges = false;

        if (type === 'supervisors') {
       firestorePayload[type] = newData;
         hasChanges = true;

        } else if (type === 'REPORT') {
          // 🟢 අලුත් ක්‍රමය: මාසයට අදාළ වෙනම Document එකකට (උදා: 2026-04_SUMMARY) සුරක්ෂිතව සේව් කිරීම
          const monthStr = date.substring(0, 7);
          const mergedData = { ...(prevData || {}), ...newData };
          
          setCloudStatus('syncing');
          DataService.saveSummaryData(collectionName, monthStr, date, mergedData)
            .then(() => {
                setCloudStatus('success');
                setLastSyncTime(new Date().toISOString());
            })
            .catch(() => setCloudStatus('error'));

          return { ...prev, [uiKey]: mergedData };
      } else {



            const oldRows = prevData?.rows || [];
            const newRows = newData.rows || [];
            
            const oldRowsMap = new Map(oldRows.map((r: any) => [r.id, r]));
            const newRowsMap = new Map(newRows.map((r: any) => [r.id, r]));

            firestorePayload[type].rows = {};

            // 🟢 1. දැනට තියෙන සියලුම පේළි අලුත් Map ආකෘතියට සකස් කිරීම
            // (වෙනසක් වුණත් නැතත් සියලු පේළි යැවීමෙන් පරණ Array දත්ත, Map බවට ආරක්ෂිතව හැරවේ)
            newRows.forEach((newRow: any) => {
              if (newRow.machine && newRow.product) {
                  firestorePayload[type].rows[newRow.id] = newRow;
                  hasChanges = true;
              }
            });

            // 🟢 2. මකා දැමූ පේළි සඳහා Firebase අණ (String ලෙස) ලබා දීම
            oldRows.forEach((oldRow: any) => {
                if (!newRowsMap.has(oldRow.id) && oldRow.machine && oldRow.product) {
                    firestorePayload[type].rows[oldRow.id] = "__DELETE_FIELD__";
                    hasChanges = true;
                }
            });
          

            // 3. Supervisor check
            if (newData.daySupervisor !== prevData?.daySupervisor) {
                firestorePayload[type].daySupervisor = newData.daySupervisor;
                hasChanges = true;
            }
            if (newData.nightSupervisor !== prevData?.nightSupervisor) {
                firestorePayload[type].nightSupervisor = newData.nightSupervisor;
                hasChanges = true;
            }
        }

        // වෙනසක් සිදුවී ඇත්නම් පමණක් Firebase වෙත යවයි
        if (hasChanges) {
            setCloudStatus('syncing');
            DataService.saveSmartData(collectionName, date, firestorePayload)
              .then(() => {
                  setCloudStatus('success');
                  setLastSyncTime(new Date().toISOString());
              })
              .catch(() => setCloudStatus('error'));
        }

        return { ...prev, [uiKey]: newData };
    });
    
    setLocalStatus('success');
  }, [collectionName]);

  // 4. Save Admin Config 
  const updateAdminConfig = useCallback(async (newConfig: AdminConfig) => {
    setAdminConfig(newConfig);
    if(collectionName) {
      await DataService.saveConfig(collectionName, newConfig);
    }
  }, [collectionName]);


  
  

// 5. Load Data For a Date Range (🟢 Cache Memory භාවිතය)
const loadDataForRange = useCallback(async (startDate: string, endDate: string, forceRefresh = false) => {
  if (!collectionName) return;

  if (!forceRefresh && loadedRangeRef.current?.start === startDate && loadedRangeRef.current?.end === endDate) {
      return; 
  }

  Object.values(listenersRef.current).forEach(unsub => unsub());
  listenersRef.current = {};

  try {
      // 🟢 1. දින පරාසයට අදාළ Production දත්ත ගැනීම
      const results = await DataService.getProductionDataForRange(collectionName, startDate, endDate);

      // 🟢 2. අලුත් ක්‍රමය: දින පරාසයට අදාළ මාසවල Summary දත්ත ද එකවර ලබාගැනීම
      const months = new Set<string>();
      getDatesInRange(startDate, endDate).forEach(d => months.add(d.substring(0, 7)));
      
      const summaryPromises = Array.from(months).map(m => DataService.getMonthlySummary(collectionName, m));
      const summaryResults = await Promise.all(summaryPromises);
      
      const combinedSummaries: any = {};
      summaryResults.forEach(monthData => {
         if(monthData) Object.assign(combinedSummaries, monthData);
      });

      setCombinedData(prev => {
          const newState = { ...prev };

          results.forEach(({ date, data: docData }) => {
              const prevImDrafts = (newState[`${date}_IM`]?.rows || []).filter((r: any) => !r.machine || !r.product);
              const prevBmDrafts = (newState[`${date}_BM`]?.rows || []).filter((r: any) => !r.machine || !r.product);

              newState[`${date}_IM`] = docData.IM ? { ...docData.IM, rows: [...parseRows(docData.IM.rows), ...prevImDrafts] } : { rows: prevImDrafts };
              newState[`${date}_BM`] = docData.BM ? { ...docData.BM, rows: [...parseRows(docData.BM.rows), ...prevBmDrafts] } : { rows: prevBmDrafts };
              newState[`${date}_SUPERVISORS`] = docData.supervisors || {};
          });

          // 🟢 අදාළ දිනවලට අලුත් Summary දත්ත Set කිරීම
          Object.keys(combinedSummaries).forEach(dateKey => {
              newState[`${dateKey}_REPORT`] = combinedSummaries[dateKey];
          });

          return newState;
      });

      loadedRangeRef.current = { start: startDate, end: endDate };
  } catch (error) {
      console.error("Error loading range data:", error);
  }
}, [collectionName]);






  useEffect(() => {
      return () => { Object.values(listenersRef.current).forEach(unsub => unsub()); };
  }, []);

  return { 
    combinedData, 
    adminConfig, 
    updateDayData, 
    updateAdminConfig, 
    loadDataForRange, 
    cloudStatus, 
    lastSyncTime,
    localStatus,
    isCloudEnabled: true, 
    toggleCloudSync: () => {} 
  };
};