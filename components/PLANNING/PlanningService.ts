import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, writeBatch, getDocs, query, orderBy, getDocsFromCache, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { ProductItem, IMJobPlan } from './PlanningTypes'; 

const getCurrentMonthKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// 🟢 දත්ත සංසන්දනය කිරීමේ ආරක්ෂිත ක්‍රමය
const hasDataChanged = (oldObj: any, newObj: any) => {
    if (!oldObj) return true;
    const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
    for (let k of keys) {
        if (k === 'lastModified' || k === 'orderIndex') continue;
        if (typeof oldObj[k] === 'object' || typeof newObj[k] === 'object') {
            if (JSON.stringify(oldObj[k] || []) !== JSON.stringify(newObj[k] || [])) return true;
            continue;
        }
        const oldVal = oldObj[k] === null || oldObj[k] === undefined ? '' : String(oldObj[k]);
        const newVal = newObj[k] === null || newObj[k] === undefined ? '' : String(newObj[k]);
        if (oldVal !== newVal) return true;
    }
    return false;
};

export const PlanningService = {

  subscribeToIMPlans: (factoryId: string, callback: (plans: any[]) => void) => {
    if (!factoryId) return () => {};
    const colRef = collection(db, `PLANNING_${factoryId}`, 'IM_PLANS', 'ACTIVE_JOBS');
    const q = query(colRef, orderBy('orderIndex', 'asc')); 
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => doc.data());
      callback(plans);
    }, (error) => console.error("IM Plans Sub Error:", error));
  },

  saveIMPlans: async (factoryId: string, plans: any[]) => {
    if (!factoryId) return;
    const colRef = collection(db, `PLANNING_${factoryId}`, 'IM_PLANS', 'ACTIVE_JOBS');
    const q = query(colRef, orderBy('orderIndex', 'asc')); // 🟢 Exact query for safe caching
    const batch = writeBatch(db); 

    try {
        // 🟢 වෙනස: Cache එකෙන් පමණක් දත්ත ගනී, Server එකෙන් අනවශ්‍ය Reads කැපෙන්නේ නැත.
        const currentSnaps = await getDocsFromCache(q).catch(() => getDocs(q));
        const currentMap = new Map();
        if (currentSnaps) currentSnaps.docs.forEach(d => currentMap.set(d.id, d.data()));

        plans.forEach((plan, index) => {
            const docId = plan.jobNo ? String(plan.jobNo) : String(plan.id); 
            if (!docId || docId === 'undefined') return;

            const docRef = doc(colRef, docId); 
            const existingData = currentMap.get(docId);

            if (existingData) {
                const isDataChanged = hasDataChanged(existingData, plan);
                const isOrderChanged = existingData.orderIndex !== index;

                if (isDataChanged) {
                    batch.set(docRef, { ...plan, orderIndex: index, lastModified: Date.now() }, { merge: true }); 
                } else if (isOrderChanged) {
                    batch.update(docRef, { orderIndex: index });
                }
            } else {
                batch.set(docRef, { ...plan, orderIndex: index, lastModified: Date.now() }, { merge: true });
            }
        });
        await batch.commit();
    } catch (error) { console.error("IM Plans Save Error:", error); }
  },

  subscribeToBMPlans: (factoryId: string, callback: (plans: any[]) => void) => {
    if (!factoryId) return () => {};
    const colRef = collection(db, `PLANNING_${factoryId}`, 'BM_PLANS', 'ACTIVE_JOBS');
    const q = query(colRef, orderBy('orderIndex', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => doc.data());
      callback(plans);
    }, (error) => console.error("BM Plans Sub Error:", error));
  },

  saveBMPlans: async (factoryId: string, plans: any[]) => {
    if (!factoryId) return;
    const colRef = collection(db, `PLANNING_${factoryId}`, 'BM_PLANS', 'ACTIVE_JOBS');
    const q = query(colRef, orderBy('orderIndex', 'asc'));
    const batch = writeBatch(db);

    try {
        const currentSnaps = await getDocsFromCache(q).catch(() => getDocs(q));
        const currentMap = new Map();
        if (currentSnaps) currentSnaps.docs.forEach(d => currentMap.set(d.id, d.data()));

        plans.forEach((plan, index) => {
            const docId = plan.jobNo ? String(plan.jobNo) : String(plan.id);
            if (!docId || docId === 'undefined') return;

            const docRef = doc(colRef, docId);
            const existingData = currentMap.get(docId);

            if (existingData) {
                const isDataChanged = hasDataChanged(existingData, plan);
                const isOrderChanged = existingData.orderIndex !== index;

                if (isDataChanged) {
                    batch.set(docRef, { ...plan, orderIndex: index, lastModified: Date.now() }, { merge: true });
                } else if (isOrderChanged) {
                    batch.update(docRef, { orderIndex: index });
                }
            } else {
                batch.set(docRef, { ...plan, orderIndex: index, lastModified: Date.now() }, { merge: true });
            }
        });
        await batch.commit();
    } catch (error) { console.error("BM Plans Save Error:", error); }
  },

  deleteIMPlan: async (factoryId: string, docId: string) => {
    if (!factoryId || !docId) return;
    await deleteDoc(doc(db, `PLANNING_${factoryId}`, 'IM_PLANS', 'ACTIVE_JOBS', docId));
  },
  
  deleteBMPlan: async (factoryId: string, docId: string) => {
    if (!factoryId || !docId) return;
    await deleteDoc(doc(db, `PLANNING_${factoryId}`, 'BM_PLANS', 'ACTIVE_JOBS', docId));
  },

  archiveCompletedJobs: async (factoryId: string, planType: 'IM' | 'BM', jobs: IMJobPlan[]) => {
    if (!factoryId || jobs.length === 0) return;
    const monthKey = getCurrentMonthKey();
    const docRef = doc(db, `PLANNING_${factoryId}`, `${monthKey}_Completed_${planType}`);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const existingItems = docSnap.data().items || [];
            const existingMap = new Map(existingItems.map((item: any) => [item.id, item]));
            jobs.forEach(job => existingMap.set(job.id, job));
            await updateDoc(docRef, { items: Array.from(existingMap.values()), lastModified: Date.now() });
        } else {
            await setDoc(docRef, { items: jobs, lastModified: Date.now() });
        }
    } catch (error) { console.error("Error archiving jobs:", error); }
  },

  fetchCompletedJobsByMonth: async (factoryId: string, planType: 'IM' | 'BM', monthKey: string) => {
    if (!factoryId) return [];
    const docRef = doc(db, `PLANNING_${factoryId}`, `${monthKey}_Completed_${planType}`);
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data().items || [];
    } catch (error) { console.error("Error fetching completed jobs:", error); }
    return [];
  },

  // 🟢 අලුතින් එකතු කළ: Completed Jobs සඳහා Live Sync (Auto Update)
  subscribeToCompletedJobs: (factoryId: string, planType: 'IM' | 'BM', monthKey: string, callback: (jobs: IMJobPlan[]) => void) => {
    if (!factoryId || !monthKey) return () => {};
    const docRef = doc(db, `PLANNING_${factoryId}`, `${monthKey}_Completed_${planType}`);
    
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data().items || []);
        } else {
            callback([]);
        }
    }, (error) => console.error("Error subscribing to completed jobs:", error));
  },
  

  deleteArchivedJob: async (factoryId: string, planType: 'IM' | 'BM', monthKey: string, jobId: string) => {
    if (!factoryId) return;
    const docRef = doc(db, `PLANNING_${factoryId}`, `${monthKey}_Completed_${planType}`);
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const items = snap.data().items || [];
            await updateDoc(docRef, { items: items.filter((i: any) => i.id !== jobId), lastModified: Date.now() });
        }
    } catch (error) { console.error("Error deleting archived job:", error); }
  },

  updateArchivedJob: async (factoryId: string, planType: 'IM' | 'BM', monthKey: string, updatedJob: IMJobPlan) => {
    if (!factoryId) return;
    const docRef = doc(db, `PLANNING_${factoryId}`, `${monthKey}_Completed_${planType}`);
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const items = snap.data().items || [];
            await updateDoc(docRef, { items: items.map((i: any) => i.id === updatedJob.id ? updatedJob : i), lastModified: Date.now() });
        }
    } catch (error) { console.error("Error updating archived job:", error); }
  },

  subscribeToIMProducts: (factoryId: string, callback: (products: ProductItem[]) => void) => {
    if (!factoryId) return () => {};
    const docRef = doc(db, `PLANNING_${factoryId}`, 'PRODUCT_IM');
    return onSnapshot(docRef, (docSnap) => { callback(docSnap.exists() ? docSnap.data().items || [] : []); });
  },

  saveIMProducts: async (factoryId: string, products: ProductItem[]) => {
    if (!factoryId) return;
    await setDoc(doc(db, `PLANNING_${factoryId}`, 'PRODUCT_IM'), { items: products, lastModified: Date.now() }); 
  },

  subscribeToBMProducts: (factoryId: string, callback: (products: ProductItem[]) => void) => {
    if (!factoryId) return () => {};
    const docRef = doc(db, `PLANNING_${factoryId}`, 'PRODUCT_BM');
    return onSnapshot(docRef, (docSnap) => { callback(docSnap.exists() ? docSnap.data().items || [] : []); });
  },

  saveBMProducts: async (factoryId: string, products: ProductItem[]) => {
    if (!factoryId) return;
    await setDoc(doc(db, `PLANNING_${factoryId}`, 'PRODUCT_BM'), { items: products, lastModified: Date.now() }); 
  },

  subscribeToMachines: (factoryId: string, callback: (machines: any[]) => void) => {
    if (!factoryId) return () => {};
    const docRef = doc(db, `PLANNING_${factoryId}`, 'MACHINES_MASTER');
    return onSnapshot(docRef, (docSnap) => { callback(docSnap.exists() && docSnap.data().items ? docSnap.data().items : []); });
  },

  saveMachines: async (factoryId: string, machines: any[]) => {
    if (!factoryId) return;
    await setDoc(doc(db, `PLANNING_${factoryId}`, 'MACHINES_MASTER'), { items: machines, lastModified: Date.now() }); 
  },

  getDailyPlan: async (factoryId: string, dateStr: string) => {
    if (!factoryId || !dateStr) return null;
    const monthKey = dateStr.slice(0, 7); 
    const docRef = doc(db, `PLANNING_${factoryId}`, `DAILY_PLANS_${monthKey}`);
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            return data[dateStr] || null; 
        }
    } catch (error) { console.error("Error fetching daily plan:", error); }
    return null;
  },


  subscribeToDailyPlan: (factoryId: string, dateStr: string, callback: (data: any) => void) => {
    if (!factoryId || !dateStr) return () => {};
    const monthKey = dateStr.slice(0, 7);
    const docRef = doc(db, `PLANNING_${factoryId}`, `DAILY_PLANS_${monthKey}`);
    
    return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            callback(data[dateStr] || null);
        } else {
            callback(null);
        }
    }, (error) => console.error("Error subscribing to daily plan:", error));
  },

  

  saveDailyPlan: async (factoryId: string, dateStr: string, planData: any) => {
    if (!factoryId || !dateStr) return;
    const monthKey = dateStr.slice(0, 7); 
    const docRef = doc(db, `PLANNING_${factoryId}`, `DAILY_PLANS_${monthKey}`);
    try {
        await setDoc(docRef, { [dateStr]: planData, lastModified: Date.now() }, { merge: true });
    } catch (error) { console.error("Error saving daily plan:", error); }
  }
};