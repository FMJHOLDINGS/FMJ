import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth"; 

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDd7hEcGiWBfikLEMB0Yz-7_Bjg8L_85ys",
  authDomain: "fmjpro.firebaseapp.com",
  projectId: "fmjpro",
  storageBucket: "fmjpro.firebasestorage.app",
  messagingSenderId: "785425990688",
  appId: "1:785425990688:web:b68623cf44a58e58552845",
  measurementId: "G-L05648FYR8"
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore with Advanced Offline Caching
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // බ්‍රව්සර් ටැබ් කිහිපයක එකවර Database එක භාවිතා කිරීමට ඉඩ ලබාදෙයි
    tabManager: persistentMultipleTabManager(),
    
    // 🟢 අලුතින් එකතු කළා: 20MB උපරිම සීමාව (මෙයින් RAM සහ Storage එක පිරීම නවතී)
    cacheSizeBytes: 20 * 1024 * 1024 
  })
});

// 3. Initialize Firebase Auth
export const auth = getAuth(app);

export default app;