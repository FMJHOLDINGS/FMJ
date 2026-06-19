import React, { useEffect } from 'react';
// AuthContext එකෙන් ලොග් වී ඇති අයගේ විස්තර ලබා ගනී
import { useAuth, AuthProvider } from './context/AuthContext';


// [NEW IMPORTS] Auto Logout සඳහා අවශ්‍ය Firebase කොටස්
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { signOut } from 'firebase/auth';

// --- COMPONENTS IMPORTS ---
import AuthPage from './context/AuthPage'; // ලොග් වීමේ පිටුව
import Dashboard from './context/Dashboard'; // සාමාන්‍ය Factory Dashboard එක
import SuperAdminDashboard from './Dashboard/SuperAdminDashboard'; // [NEW] අලුත් Super Admin Dashboard එක

import AutoUpdater from '././components/AutoUpdater';

const AppContent = () => {
  // context එක හරහා දැනට ලොග් වී ඇති User (userData) සහ Loading තත්වය ලබා ගනී
  const { userData, loading } = useAuth();

  // ---------------------------------------------------------------------------
  // [NEW LOGIC] SECURITY LISTENER 🛡️ (Auto Logout when User Deleted)
  // ඔබ ඉල්ලූ පරිදි Factory එක Delete කළ විට User ව Auto Logout කරන කොටස
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. User කෙනෙක් ඉන්නවාද?
    // 2. එයා Super Admin නොවේද? (Super Admin ව check කරන්න අවශ්‍ය නෑ)
    if (userData?.id && userData.role !== 'super_admin') {
      
      // Database එකේ එම User ගේ Document එක දෙස බලා සිටී (Real-time)
      const unsub = onSnapshot(doc(db, "users", userData.id), (docSnap) => {
        // යම් හෙයකින් Document එක මැකුණොත් (Factory Delete කළ විට)
        if (!docSnap.exists()) {
          console.warn("User account deleted. Logging out...");
          // Firebase Auth එකෙන් Sign Out කරවයි
          signOut(auth).then(() => {
            localStorage.clear(); // Browser එකේ Save වී ඇති දත්ත මකයි
            window.location.reload(); // Page එක Refresh කරයි (Login එකට යයි)
          });
        }
      }, (error) => {
          console.log("Auth Check Error (Ignored):", error);
      });
      return () => unsub(); // Cleanup
    }
  }, [userData]);

  // 1. LOADING STATE (පූරණය වෙමින් පවතී නම්)
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 2. NO USER (ලොග් වී නැත්නම්)
  if (!userData) {
    return <AuthPage />;
  }

  // 3. SUPER ADMIN CHECK (විශේෂ පරීක්ෂාව) 🔐
  if (userData.role === 'super_admin') {
      return <SuperAdminDashboard />;
  }

  // 4. NORMAL USER (සාමාන්‍ය පරිශීලකයා)
  return (
    <Dashboard 
      user={userData} 
    />
  );
};

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <AppContent />

      <AutoUpdater />


    </AuthProvider>
  );
}

