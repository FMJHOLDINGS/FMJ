// components/DELIVERY/DeliveryService.ts
import { collection, doc, setDoc, updateDoc, getDocFromServer, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';

export const DeliveryService = {

  // 1. මාසයට අදාළ සියලුම Delivery දත්ත ලබාගැනීම
  fetchMonthlyDeliveries: async (collectionName: string, year: string, month: string) => {
    if (!collectionName || !year || !month) return null;

    const monthKey = `${year}-${month}`;
    const docRef = doc(db, `DELIVERY_${collectionName}`, monthKey);

    try {
      const docSnap = await getDocFromServer(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().records || {};
      }
      return null;
    } catch (error) {
      console.error("Delivery Fetch Error:", error);
      return null;
    }
  },

  // 2. දිනපතා Delivery Qty එක Save කිරීම (Atomic Update)
  saveDeliveryLog: async (
    collectionName: string,
    jobId: string, 
    date: string,  
    qty: number    
  ) => {
    const [year, month] = date.split('-');
    const monthKey = `${year}-${month}`;
    const collectionPath = `DELIVERY_${collectionName}`;
    const docRef = doc(db, collectionPath, monthKey);

    try {
      const docSnap = await getDocFromServer(docRef);

      if (!docSnap.exists()) {
         // Document එක නැත්නම් අලුතින් සාදයි
         await setDoc(docRef, {
          monthKey: monthKey,
          records: {
            [jobId]: {
              [date]: qty
            }
          },
          lastModified: Date.now()
        });
        console.log(`✅ Created New Delivery Doc: ${monthKey}`);
      } else {
        // Document එක තිබේ නම් අදාළ Cell එක පමණක් Update කරයි
        await updateDoc(docRef, {
          [`records.${jobId}.${date}`]: qty,
          lastModified: Date.now()
        });
        console.log(`✅ Updated Delivery Log: ${monthKey} -> ${jobId} -> ${date}`);
      }
    } catch (e) {
      console.error("❌ Delivery Save Failed:", e);
      throw e;
    }
  },

  // 3. වැරදීමකින් දැමූ Delivery අගයක් මකා දැමීම (Delete)
  deleteDeliveryLog: async (
    collectionName: string, 
    jobId: string, 
    date: string
  ) => {
    const [year, month] = date.split('-');
    const monthKey = `${year}-${month}`;
    const docRef = doc(db, `DELIVERY_${collectionName}`, monthKey);

    try {
      // අදාළ දිනයට අදාළ Field එක Firebase හි deleteField() හරහා සම්පූර්ණයෙන්ම මකා දැමීම
      await updateDoc(docRef, {
        [`records.${jobId}.${date}`]: deleteField(),
        lastModified: Date.now()
      });
      console.log(`✅ Deleted Delivery Log: ${monthKey} -> ${jobId} -> ${date}`);
    } catch (e) {
      console.error("❌ Delivery Delete Failed:", e);
      throw e;
    }
  }
};
