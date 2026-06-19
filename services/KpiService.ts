import { collection, doc, setDoc, updateDoc, query, where, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { KPIMonthlyDoc } from '../KPITypes';

export const KpiService = {


  
// 1. මාසයට අදාළ සියලුම KPI Category Documents එකවර ලබාගැනීම (සෘජුවම සර්වර් එකෙන්)
fetchMonthlyKPI: async (collectionName: string, year: string, month: string) => {
  if (!collectionName || !year || !month) return null;

  const kpiCollection = `KPI_${collectionName}`;
  const monthKey = `${year}-${month}`;
  const q = query(collection(db, kpiCollection), where("monthKey", "==", monthKey));

  try {
    // 🟢 අලුත් නීතියට අනුව getDocsFromServer භාවිතා කර ඇත
    const snapshot = await getDocsFromServer(q);
    if (snapshot.empty) return null;

    const combinedData: any = {};
    snapshot.forEach(docSnap => {
      const docData = docSnap.data();
      const category = docData.category; 
      if (category && docData.records) {
        combinedData[category] = docData.records;
      }
    });

    return combinedData as KPIMonthlyDoc;
  } catch (error) {
    console.error("KPI Fetch Error:", error);
    return null;
  }
},




  // 2. Dot Notation මඟින් අදාළ Cell එක පමණක් Save කිරීම (Atomic Update)
  saveDailyCell: async (
    collectionName: string,
    year: string,
    month: string,
    category: string, // 'electricity' | 'water' | 'rejections'
    date: string,     // '2026-03-01'
    fieldPath: string,// 'shiftA' හෝ 'shiftA.IM'
    value: any        // 150
  ) => {
    const kpiCollection = `KPI_${collectionName}`;
    const monthKey = `${year}-${month}`;
    const docId = `${category}_${monthKey}`; // උදා: electricity_2026-03
    const docRef = doc(db, kpiCollection, docId);

    try {
      // 🟢 getDoc වෙනුවට getDocFromServer යොදා ඇත (Local Cache මඟහැර සෘජුවම සර්වර් එකෙන් කියවීමට)
      const docSnap = await getDocFromServer(docRef);

      if (!docSnap.exists()) {
         // Document එක නැත්නම් අලුතින් සාදයි (දත්ත ඇති දවස් වලට පමණි)
         const pathParts = fieldPath.split('.');
         const nestedObj: any = {};
         if(pathParts.length === 1) nestedObj[pathParts[0]] = value;
         else nestedObj[pathParts[0]] = { [pathParts[1]]: value };

         await setDoc(docRef, {
          id: docId,
          monthKey: monthKey,
          category: category,
          records: { [date]: nestedObj },
          lastModified: Date.now()
        });
        console.log(`✅ Created New KPI Doc: ${docId}`);
      } else {
        // Document එක තිබේ නම් අදාළ Cell එක පමණක් Dot Notation මඟින් Update කරයි
        await updateDoc(docRef, {
          [`records.${date}.${fieldPath}`]: value,
          lastModified: Date.now()
        });
        console.log(`✅ Updated KPI Cell: ${docId} -> ${date} -> ${fieldPath}`);
      }
    } catch (e) {
      console.error("❌ KPI Save Failed:", e);
      throw e;
    }
  }
};