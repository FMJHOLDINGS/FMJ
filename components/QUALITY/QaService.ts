// ⚡ මුලින්ම import එකට getDocFromServer එකතු කරගන්න
import { doc, setDoc, getDocFromServer } from 'firebase/firestore'; 
import { db } from '../../firebase'; 

export class QaService {
    // 1️⃣ Production Collection එක ඇතුළෙන්ම QA Settings ලබාගැනීම
    static async getQaSettings(collectionName: string) {
        try {
            const docRef = doc(db, collectionName, 'QA_Settings');
            
            // ⚡ getDoc වෙනුවට getDocFromServer භාවිතා කරන්න (මෙය කෙලින්ම Cloud එකෙන් දත්ත ගනී)
            const snap = await getDocFromServer(docRef);
            
            return snap.exists() ? snap.data() : { mainCategories: [], subCategories: [] };
        } catch (error) {
            console.error("❌ Error fetching QA Settings from server:", error);
            throw error;
        }
    }

    // 2️⃣ Production Collection එක ඇතුළටම QA Settings Save කිරීම
    static async saveQaSettings(collectionName: string, mainCategories: any[], subCategories: any[]) {
        try {
            const docRef = doc(db, collectionName, 'QA_Settings');
            await setDoc(docRef, { mainCategories, subCategories }, { merge: true });
            return true;
        } catch (error) {
            console.error("❌ Error saving QA Settings:", error);
            throw error;
        }
    }
}