// ============================================================================
// 🌐 STORES FIREBASE SERVICE
// මෙහි කිසිදු Local Cache එකක් භාවිතා නොවන අතර කෙලින්ම Server එකෙන් දත්ත ගනී.
// ============================================================================
import { doc, getDoc, getDocFromServer, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { MasterStockItem, MonthlyStockData, StockCategory } from './StoresTypes';

export const StoresService = {

  // ============================================================================
  // 1. 📥 FETCH DATA (Server එකෙන් පමණක් අලුත්ම දත්ත ලබා ගැනීම)
  // ============================================================================
  fetchStockFromServer: async (factoryId: string, category: StockCategory, month: string) => {
    // ෆැක්ටරි ID හෝ මාසය නැත්නම් හිස් දත්ත යවයි
    if (!factoryId || !category || !month) {
      return { masterData: [], monthlyData: {} };
    }
    
    // Document Paths සාදා ගැනීම
    const masterRef = doc(db, `STORES_${factoryId}`, `MASTER_${category}`);
    const monthRef = doc(db, `STORES_${factoryId}`, `${month}_${category}`);

    try {
      // [UPDATE] Promise.all මගින් getDocFromServer භාවිතා කර Document දෙකම එකවර Server එකෙන් ගෙන එයි.
      const [masterSnap, monthSnap] = await Promise.all([
        getDocFromServer(masterRef), 
        getDocFromServer(monthRef)
      ]);

      let monthlyData: Record<string, MonthlyStockData> = {};

      // මාසික දත්ත ඇත්නම් එය සකස් කිරීම
      if (monthSnap.exists()) {
        const data = monthSnap.data();
        
        // lastModified අගය UI එකට අනවශ්‍ය බැවින් එය Object එකෙන් මකා දමයි
        delete data.lastModified; 
        
        // දැන් ඇත්තේ Item IDs සහ ඒවායේ දත්ත පමණි (transactions wrapper එකක් නැත)
        monthlyData = data as Record<string, MonthlyStockData>;
      }

      // Master දත්ත සහ Monthly දත්ත Component එකට යවයි
      return {
        masterData: masterSnap.exists() ? (masterSnap.data().items || []) : [],
        monthlyData
      };

    } catch (error) {
      console.error("Error fetching strictly from server:", error);
      throw error;
    }
  },

  // ============================================================================
  // 2. 📤 SAVE DATA (පිරිසිදුව දත්ත Overwrite කිරීම - Bug Free)
  // ============================================================================
  saveStock: async (
    factoryId: string, 
    category: StockCategory, 
    month: string, 
    masterItems: MasterStockItem[], 
    monthlyTrans: Record<string, MonthlyStockData>
  ) => {
    // අවශ්‍ය දත්ත නැත්නම් ක්‍රියාවලිය නවත්වයි
    if (!factoryId || !category || !month) return;
    
    // Document Paths සාදා ගැනීම
    const masterRef = doc(db, `STORES_${factoryId}`, `MASTER_${category}`);
    const monthRef = doc(db, `STORES_${factoryId}`, `${month}_${category}`);
    
    // 2.1 Master Document එක Save කිරීම
    // මෙහිදී පරණ දත්ත සම්පූර්ණයෙන්ම මැකී අලුත් දත්ත ලියවේ (Delete කරන ලද Row ද මකා දැමේ)
    await setDoc(masterRef, { 
        items: masterItems, 
        lastModified: Date.now() 
    }); 
    
    // 2.2 Monthly Document එක Save කිරීම
    // Spread operator (...) මගින් transactions වැනි අමතර Wrappers නැතිව කෙලින්ම දත්ත ලියවේ
    await setDoc(monthRef, { 
        ...monthlyTrans, 
        lastModified: Date.now() 
    }); 
  },
  

  // ============================================================================
  // 3. ⚙️ TABS MANAGEMENT (Dynamic Category Tabs & Deep Delete)
  // ============================================================================
  
  fetchCategories: async (factoryId: string) => {
    if (!factoryId) return [];
    const ref = doc(db, `STORES_${factoryId}`, `SETTINGS_CATEGORIES`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().tabs || []) : [];
  },

  saveCategories: async (factoryId: string, dynamicTabs: {id: string, label: string}[]) => {
    if (!factoryId) return;
    const ref = doc(db, `STORES_${factoryId}`, `SETTINGS_CATEGORIES`);
    await setDoc(ref, { tabs: dynamicTabs });
  },

  deleteCategoryAndData: async (factoryId: string, categoryId: string) => {
    if (!factoryId || !categoryId) return;

    // 1. Settings Document එකෙන් ටැබ් එක මකා දැමීම
    const settingsRef = doc(db, `STORES_${factoryId}`, `SETTINGS_CATEGORIES`);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
        const data = snap.data();
        const updatedTabs = (data.tabs || []).filter((t: any) => t.id !== categoryId);
        await setDoc(settingsRef, { tabs: updatedTabs });
    }

    // 2. Database එකේ ඇති අදාළ සියලුම Master සහ Monthly Documents සොයා මකා දැමීම
    const colRef = collection(db, `STORES_${factoryId}`);
    const allDocs = await getDocs(colRef);
    const deletePromises: any[] = [];

    allDocs.forEach(d => {
        // අදාළ ටැබ් එකේ ID එකෙන් අවසන් වන සියලුම Documents මකා දමයි (උදා: MASTER_CHEMICALS)
        if (d.id.endsWith(`_${categoryId}`)) {
            deletePromises.push(deleteDoc(d.ref));
        }
    });

    await Promise.all(deletePromises);
  }


};