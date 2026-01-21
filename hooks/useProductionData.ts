import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminConfig, DayData } from '../types';

// ============================================================================
// ⚙️ SYSTEM SETTINGS (මෙන්න ඔබ පාලනය කළ යුතු තැන්)
// ============================================================================

// 1. DB VERSION: ඔබ DB Structure එක වෙනස් කරන හැම වෙලාවෙම මේ අංකය 1කින් වැඩි කරන්න.
// එවිට සියලුම Devices වල පරණ Cache එක මැකී, අලුත් දත්ත Cloud එකෙන් එයි.
const CURRENT_DB_VERSION = 1; 

// 2. AUTO PURGE DAYS: දත්තයක් Delete කර දින කීයකට පසුද එය සදහටම මැකෙන්න ඕනේ?
const DAYS_TO_KEEP_DELETED = 30; // දින 30ක් (ඔබට අවශ්‍ය නම් වෙනස් කරන්න)

// ============================================================================

const StorageEngine = {
  // --- VERSION CONTROLLED MIGRATION ---
  checkAndMigrate: () => {
    try {
      const storedVersion = parseInt(localStorage.getItem('fmj_db_version') || '0');

      // Version එක වෙනස් නම් හෝ නැත්නම් -> Full Reset (Smart Fix)
      if (storedVersion !== CURRENT_DB_VERSION) {
        console.log(`System Update Detected! (v${storedVersion} -> v${CURRENT_DB_VERSION})`);
        console.log('Cleaning up old local data to prevent conflicts...');
        
        // 1. Clear all FMJ data from Local Storage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('fmj_')) {
                localStorage.removeItem(key);
            }
        });

        // 2. Set new version
        localStorage.setItem('fmj_db_version', CURRENT_DB_VERSION.toString());
        
        // 3. Keep Cloud Sync Enabled Default
        localStorage.setItem('fmj_cloud_enabled', 'true');
        
        return true; // Indicates a reset happened
      }
    } catch (e) { console.error("Migration Check Failed", e); }
    return false;
  },

  loadMonth: (monthStr: string) => {
    try {
      const s = localStorage.getItem(`fmj_data_${monthStr}`);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  },

  saveMonth: (monthStr: string, data: Record<string, any>) => {
    try { 
        localStorage.setItem(`fmj_data_${monthStr}`, JSON.stringify(data)); 
    } 
    catch (e) { console.error("Storage Full?", e); }
  },

  loadSettings: () => {
    try {
      const s = localStorage.getItem('fmj_settings');
      return s ? JSON.parse(s) : { productionItems: [], breakdownCategories: [], shiftTeams: [] };
    } catch { return { productionItems: [], breakdownCategories: [], shiftTeams: [] }; }
  },

  saveSettings: (config: AdminConfig) => {
    localStorage.setItem('fmj_settings', JSON.stringify(config));
  }
};

export type CloudStatus = 'syncing' | 'success' | 'error' | 'disabled';

export const useProductionData = (selectedDate: string) => {
  const currentMonthDocId = useMemo(() => selectedDate.substring(0, 7), [selectedDate]);
  
  const prevMonthDocId = useMemo(() => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 7);
  }, [selectedDate]);

  const [activeData, setActiveData] = useState<Record<string, any>>({});
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({ productionItems: [], breakdownCategories: [], shiftTeams: [] });
  const [isCloudEnabled, setIsCloudEnabled] = useState(() => localStorage.getItem('fmj_cloud_enabled') !== 'false');
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('syncing');
  const [localStatus, setLocalStatus] = useState<CloudStatus>('success');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Initial Load & Version Check
  useEffect(() => {
    // 1. Check Version & Wipe if needed
    const wasReset = StorageEngine.checkAndMigrate();
    
    // 2. Load Settings
    setAdminConfig(StorageEngine.loadSettings());

    // 3. Load Active Data
    const curr = StorageEngine.loadMonth(currentMonthDocId);
    const prev = StorageEngine.loadMonth(prevMonthDocId);
    
    // Filter out deleted items for display
    const cleanData: Record<string, any> = {};
    const rawData = { ...prev, ...curr };
    Object.keys(rawData).forEach(k => {
        if (!rawData[k].deleted) {
            cleanData[k] = rawData[k];
        }
    });

    setActiveData(cleanData);

    // If reset happened, we might want to trigger a visual refresh or log
    if(wasReset) console.log("Local database rebuilt successfully.");

  }, [currentMonthDocId, prevMonthDocId]);

  // --- SMART SYNC LOGIC + AUTO CLEANUP ---
  const handleSmartSync = useCallback((snap: any, docType: 'settings' | 'data', targetMonthId?: string) => {
      if (!snap.exists()) return;
      const cloudEntries = snap.data().entries || {};
      const cloudSyncTime = snap.data().last_sync;

      if (docType === 'settings') {
          setAdminConfig(currentConfig => {
              const cloudTS = cloudEntries.adminConfig?.lastModified || 0;
              const localTS = currentConfig.lastModified || 0;
              
              if (cloudTS > localTS) {
                  StorageEngine.saveSettings(cloudEntries.adminConfig);
                  return cloudEntries.adminConfig;
              } else if (localTS > cloudTS) {
                  const ref = doc(db, 'production_data', 'settings');
                  updateDoc(ref, { [`entries.adminConfig`]: currentConfig, last_sync: new Date().toISOString() }).catch(() => {});
              }
              return currentConfig;
          });
      } else if (docType === 'data' && targetMonthId) {
          setActiveData(current => {
             const localMonthData = StorageEngine.loadMonth(targetMonthId);
             let hasLocalChanges = false;
             let hasAutoPurge = false;
             const updatesPushToCloud: Record<string, any> = {};
             const updatesDeleteFromCloud: Record<string, any> = {};
             const mergedMonthData = { ...localMonthData };
             const now = Date.now();
             const PURGE_MS = DAYS_TO_KEEP_DELETED * 24 * 60 * 60 * 1000;

             // 1. Process Cloud Data (The Source of Truth)
             Object.keys(cloudEntries).forEach(key => {
                 const cloudVal = cloudEntries[key];
                 const localVal = localMonthData[key];
                 
                 // --- AUTO PURGE CHECK (Cloud side) ---
                 if (cloudVal.deleted && (now - cloudVal.lastModified > PURGE_MS)) {
                     delete mergedMonthData[key]; // Remove from local
                     updatesDeleteFromCloud[`entries.${key}`] = deleteField(); // Remove from cloud
                     hasLocalChanges = true;
                     hasAutoPurge = true;
                     return; 
                 }

                 const cloudTS = cloudVal.lastModified || 0;
                 const localTS = localVal?.lastModified || 0;

                 // Logic: Cloud Wins if newer OR if Local is missing/reset
                 if (cloudTS > localTS) {
                     mergedMonthData[key] = cloudVal;
                     hasLocalChanges = true;
                 } else if (localTS > cloudTS) {
                     updatesPushToCloud[`entries.${key}`] = localVal;
                 }
             });

             // 2. Identify Local Changes
             Object.keys(localMonthData).forEach(key => {
                 if (!cloudEntries[key]) {
                     // Auto Purge Check (Local side)
                     if (localMonthData[key].deleted && (now - localMonthData[key].lastModified > PURGE_MS)) {
                         delete mergedMonthData[key];
                         hasLocalChanges = true;
                     } else {
                         // Push to Cloud
                         updatesPushToCloud[`entries.${key}`] = localMonthData[key];
                     }
                 }
             });

             // 3. Save to Local
             if (hasLocalChanges) {
                 StorageEngine.saveMonth(targetMonthId, mergedMonthData);
             }

             // 4. Push to Cloud
             if (Object.keys(updatesPushToCloud).length > 0 && isCloudEnabled) {
                 const ref = doc(db, 'production_data', targetMonthId);
                 updateDoc(ref, { ...updatesPushToCloud, last_sync: new Date().toISOString() })
                   .catch(async (e) => {
                      if (e.code === 'not-found') {
                          const initial: any = { entries: {}, last_sync: new Date().toISOString() };
                          Object.keys(updatesPushToCloud).forEach(k => initial.entries[k.replace('entries.', '')] = updatesPushToCloud[k]);
                          await setDoc(ref, initial, { merge: true });
                      }
                   });
             }

             // 5. Execute Auto Purge
             if (hasAutoPurge && isCloudEnabled) {
                 const ref = doc(db, 'production_data', targetMonthId);
                 updateDoc(ref, updatesDeleteFromCloud).catch(e => console.error("Auto purge failed", e));
             }

             // 6. Update UI (Hide deleted items)
             if (targetMonthId === currentMonthDocId || targetMonthId === prevMonthDocId) {
                 setLocalStatus('success');
                 if(cloudSyncTime) setLastSyncTime(new Date(cloudSyncTime).toLocaleString());
                 setCloudStatus('success');
                 
                 const uiData: Record<string, any> = { ...current };
                 Object.keys(mergedMonthData).forEach(k => {
                     if (mergedMonthData[k].deleted) {
                         delete uiData[k];
                     } else {
                         uiData[k] = mergedMonthData[k];
                     }
                 });
                 return uiData;
             }
             return current;
          });
      }
  }, [currentMonthDocId, prevMonthDocId, isCloudEnabled]);

  useEffect(() => {
    if (!isCloudEnabled) return;
    return onSnapshot(doc(db, 'production_data', 'settings'), (snap) => handleSmartSync(snap, 'settings'));
  }, [isCloudEnabled, handleSmartSync]);

  useEffect(() => {
      if (!isCloudEnabled) { setCloudStatus('disabled'); return; }
      setCloudStatus('syncing');
      return onSnapshot(doc(db, 'production_data', currentMonthDocId), (snap) => handleSmartSync(snap, 'data', currentMonthDocId), () => setCloudStatus('error'));
  }, [currentMonthDocId, isCloudEnabled, handleSmartSync]);

  const saveSpecificKey = useCallback(async (key: string, data: any) => {
      const dataWithTS = { ...data, lastModified: Date.now(), deleted: false };
      
      if (key === 'adminConfig') {
          setAdminConfig(dataWithTS);
          StorageEngine.saveSettings(dataWithTS);
      } else {
          setActiveData(prev => ({ ...prev, [key]: dataWithTS }));
          const match = key.match(/^(\d{4}-\d{2})/);
          const targetMonth = match ? match[1] : currentMonthDocId;
          const currentMonthData = StorageEngine.loadMonth(targetMonth);
          currentMonthData[key] = dataWithTS;
          StorageEngine.saveMonth(targetMonth, currentMonthData);
      }
      
      setLocalStatus('success');
      
      if (isCloudEnabled) {
          try {
            setCloudStatus('syncing');
            const now = new Date().toISOString();
            const targetDocId = key === 'adminConfig' ? 'settings' : (key.match(/^(\d{4}-\d{2})/) ? key.substring(0, 7) : currentMonthDocId);
            const ref = doc(db, 'production_data', targetDocId);
            const fieldKey = key === 'adminConfig' ? 'adminConfig' : key;
            
            await updateDoc(ref, { [`entries.${fieldKey}`]: dataWithTS, last_sync: now })
                .catch(async (err) => { 
                    if (err.code === 'not-found') await setDoc(ref, { entries: { [fieldKey]: dataWithTS }, last_sync: now }, { merge: true }); 
                });
            setCloudStatus('success');
            setLastSyncTime(new Date(now).toLocaleString());
          } catch (e) { console.error(e); setCloudStatus('error'); }
      }
  }, [isCloudEnabled, currentMonthDocId]);

  const deleteSpecificKey = useCallback(async (key: string) => {
      // Soft Delete: Mark as deleted
      const tombstone = { deleted: true, lastModified: Date.now() };

      setActiveData(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
      });

      const match = key.match(/^(\d{4}-\d{2})/);
      const targetMonth = match ? match[1] : currentMonthDocId;
      const currentMonthData = StorageEngine.loadMonth(targetMonth);
      currentMonthData[key] = tombstone;
      StorageEngine.saveMonth(targetMonth, currentMonthData);
      
      if (isCloudEnabled) {
          try {
              const now = new Date().toISOString();
              const targetDocId = key.match(/^(\d{4}-\d{2})/) ? key.substring(0, 7) : currentMonthDocId;
              const ref = doc(db, 'production_data', targetDocId);
              
              await updateDoc(ref, { [`entries.${key}`]: tombstone, last_sync: now });
              setLastSyncTime(new Date(now).toLocaleString());
          } catch (e) { console.error("Delete sync failed", e); }
      }

  }, [isCloudEnabled, currentMonthDocId]);

  const toggleCloudSync = (enabled: boolean) => {
      setIsCloudEnabled(enabled);
      localStorage.setItem('fmj_cloud_enabled', String(enabled));
      if (!enabled) setCloudStatus('disabled');
  };

  const updateAdminConfig = (newConfig: AdminConfig) => saveSpecificKey('adminConfig', newConfig);
  const updateDayData = (key: string, newData: DayData) => saveSpecificKey(key, newData);

  const combinedData = useMemo(() => ({ ...activeData, adminConfig }), [activeData, adminConfig]);

  return {
    combinedData,
    adminConfig,
    updateDayData,
    updateAdminConfig,
    deleteDayData: deleteSpecificKey,
    isCloudEnabled,
    toggleCloudSync,
    cloudStatus,
    localStatus,
    lastSyncTime
  };
};