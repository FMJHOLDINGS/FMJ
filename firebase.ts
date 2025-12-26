
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDd7hEcGiWBfikLEMB0Yz-7_Bjg8L_85ys",
  authDomain: "fmjpro.firebaseapp.com",
  projectId: "fmjpro",
  storageBucket: "fmjpro.firebasestorage.app",
  messagingSenderId: "785425990688",
  appId: "1:785425990688:web:b68623cf44a58e58552845",
  measurementId: "G-L05648FYR8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Offline Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
