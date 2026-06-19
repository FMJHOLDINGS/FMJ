import { doc, setDoc, onSnapshot, getDoc, collection, query, where, getDocs, documentId, FieldValue } from 'firebase/firestore';
import { db } from '../firebase';



// ✅ Undefined අගයන් Null කිරීම සහ NaN අගයන් 0 කිරීම (Firebase Error විසඳීමට)
const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  
  if (data !== null && typeof data === 'object') {
    if (data instanceof Date) return data;
    
    // 🟢 අතිශය වැදගත්: Firebase 'deleteField' අණ විනාශ වීම වැළැක්වීම!
    // මින් පෙර තිබූ කේතය මඟින් මෙම අණ විනාශ වූ නිසා පේළි මැකීම අසාර්ථක විය.
    if (data instanceof FieldValue || (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Array')) {
        return data;
    }

    const newObj: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      
      if (value === undefined) {
        newObj[key] = null;
      } else if (typeof value === 'number' && Number.isNaN(value)) {
        newObj[key] = 0; 
      } else {
        newObj[key] = sanitizeData(value);
      }
    });
    return newObj;
  }
  
  if (typeof data === 'number' && Number.isNaN(data)) return 0;
  
  return data;
};



export const DataService = {

  // =================================================================
  // 🟢 SMART SYNC (Prevent Array Overwriting)
  // =================================================================
  saveSmartData: async (collectionName: string, date: string, payload: any) => {
    if (!collectionName) throw new Error("No Collection Name!");
    const cleanPayload = sanitizeData(payload); 
    const docRef = doc(db, collectionName, date);
    
    try {
      // Merge Mode හරහා අලුත් පේළි පමණක් එකතු කිරීම හා මැකීම (deleteField) සිදු කරයි
      await setDoc(docRef, cleanPayload, { merge: true });
      console.log(`✅ Smart Synced to ${date}`);
    } catch (error) {
      console.error(`❌ Sync Error (${date}):`, error);
      throw error;
    }
  },

  // =================================================================
  // 🟢 1. PRODUCTION DATA (Read & Legacy Save)
  // =================================================================

  subscribeToProductionDay: (collectionName: string, date: string, callback: (data: any) => void) => {
    if (!collectionName || !date) return () => {};

    const docRef = doc(db, collectionName, date);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(null); 
      }
    }, (err) => console.error("Sub Error:", err));
  },


  getProductionDay: async (collectionName: string, date: string) => {
    if (!collectionName || !date) return null;
    try {
      const docSnap = await getDoc(doc(db, collectionName, date)); // 🟢 Server බලහත්කාරය ඉවත් කර Cache එකට ඉඩ ලබා දුන්නා
      return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
      console.error("Fetch Error:", err);
      return null;
    }
  },


  // 🟢 අලුතින් එක් කළ කොටස: Timezone ගැටලු නොමැතිව, එකවර Data Range එකක් ගැනීම (1 Request)
  getProductionDataForRange: async (collectionName: string, startDate: string, endDate: string) => {
    if (!collectionName || !startDate || !endDate) return [];
    try {
      const colRef = collection(db, collectionName);
      // YYYY-MM-DD ආකෘතිය නිසා අකුරු (String) ලෙස සසඳා නිවැරදිවම දින පරාසය ලබා ගනී
      const q = query(
        colRef,
        where(documentId(), '>=', startDate),
        where(documentId(), '<=', endDate)
      );
      const querySnapshot = await getDocs(q); 
      const results: { date: string; data: any }[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ date: doc.id, data: doc.data() });
      });
      
      return results;
    } catch (err) {
      console.error("Range Fetch Error:", err);
      return [];
    }
  },




  saveProductionData: async (collectionName: string, date: string, field: 'IM' | 'BM' | 'supervisors', data: any) => {
    if (!collectionName) throw new Error("No Collection Name!");

    const cleanData = sanitizeData(data);
    const docRef = doc(db, collectionName, date);
    
    try {
      await setDoc(docRef, { [field]: cleanData }, { merge: true });
      console.log(`✅ Saved ${field} to ${date}`);
    } catch (error) {
      console.error(`❌ Save Error (${date}):`, error);
      throw error;
    }
  },



  // =================================================================
  // 🟢 SUMMARY DATA (මාසික Summary Documents සඳහා)
  // =================================================================
  
  subscribeToMonthlySummary: (collectionName: string, monthStr: string, callback: (data: any) => void) => {
    if (!collectionName || !monthStr) return () => {};
    const docRef = doc(db, collectionName, `${monthStr}_SUMMARY`);
    return onSnapshot(docRef, (docSnap) => {
      callback(docSnap.exists() ? docSnap.data() : null);
    }, (err) => console.error("Summary Sub Error:", err));
  },

  getMonthlySummary: async (collectionName: string, monthStr: string) => {
    if (!collectionName || !monthStr) return null;
    try {
      const docSnap = await getDoc(doc(db, collectionName, `${monthStr}_SUMMARY`));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (err) {
      console.error("Summary Fetch Error:", err);
      return null;
    }
  },

  saveSummaryData: async (collectionName: string, monthStr: string, date: string, payload: any) => {
    if (!collectionName) throw new Error("No Collection Name!");
    const docRef = doc(db, collectionName, `${monthStr}_SUMMARY`);
    try {
      // 🟢 Field එකක් ලෙස දිනය (date) භාවිතා කර සේව් කරයි
      await setDoc(docRef, { [date]: sanitizeData(payload) }, { merge: true });
      console.log(`✅ Summary Saved to ${monthStr}_SUMMARY for ${date}`);
    } catch (error) {
      console.error(`❌ Summary Save Error (${date}):`, error);
      throw error;
    }
  },


  

  // =================================================================
  // ⚙️ 2. ADMIN CONFIG
  // =================================================================
  
  subscribeToConfig: (collectionName: string, callback: (data: any) => void) => {
    if (!collectionName) return () => {};
    return onSnapshot(doc(db, collectionName, 'admin_config'), (snap) => callback(snap.exists() ? snap.data() : null));
  },
  
  saveConfig: async (collectionName: string, data: any) => {
    if (!collectionName) return;
    await setDoc(doc(db, collectionName, 'admin_config'), sanitizeData(data), { merge: true });
  }

};

export default DataService;