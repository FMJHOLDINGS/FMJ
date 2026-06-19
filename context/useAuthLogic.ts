import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

// ==================================================================================
// 🧠 BUSINESS LOGIC HOOK (ක්‍රියාකාරීත්වය හසුරුවන කොටස)
// ==================================================================================
export const useAuthLogic = () => {
  // AuthContext එකෙන් login function එක ලබා ගනී
  const { login } = useAuth();
  
  // --- UI STATES ---
  const [isLogin, setIsLogin] = useState(true); // Login ද Register ද යන්න
  const [loading, setLoading] = useState(false); // Loading animation එක
  
  // --- DATA STATES ---
  const [factories, setFactories] = useState<any[]>([]); // Factory ලිස්ට් එක
  const [username, setUsername] = useState(''); // යූසර් නම
  const [password, setPassword] = useState(''); // මුරපදය
  const [selectedFactoryId, setSelectedFactoryId] = useState(''); // තෝරාගත් Factory ID

  // 1. FACTORY LIST LOAD කිරීම
  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const q = query(collection(db, "companies"));
        const querySnapshot = await getDocs(q);
        setFactories(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Error loading factories:", e);
      }
    };
    fetchFactories();
  }, []);

  // --- 2. LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedFactoryId) throw new Error("Please select your Organization first!");

      const trimmedUser = username.trim();
      let isSuperAdmin = false;
      let superAdminData: any = null;

      // =================================================================
      // 👑 SUPER ADMIN LOGIC (Database එකෙන් පමණක් පරීක්ෂා කිරීම)
      // =================================================================
      
      // 'admin_credentials' collection එකෙන් අදාළ username එක සොයයි
      const qSuperAdmin = query(collection(db, "admin_credentials"), where("username", "==", trimmedUser));
      const superAdminSnapshot = await getDocs(qSuperAdmin); // <-- නම වෙනස් කළා
      
      if (!superAdminSnapshot.empty) {
          const docData = superAdminSnapshot.docs[0].data();
          
          if (docData.passwords === password) {
              isSuperAdmin = true;
              superAdminData = { 
                  id: superAdminSnapshot.docs[0].id, // උදා: accounts_admin, main_admin
                  username: docData.username,
                  ...docData 
              };
          }
      }

    
    

      if (isSuperAdmin) {
          // A. "Super Admin Dashboard" තෝරාගෙන තිබේ නම් -> Main Admin Dashboard
          if (selectedFactoryId === 'SUPER_ADMIN_OPTION') {
              login({
                  id: superAdminData.id, 
                  username: superAdminData.username,
                  factoryId: 'SUPER_ADMIN', 
                  collectionName: 'ALL_DATA',
                  factoryName: 'System Control Center',
                  role: 'super_admin' 
              });
              setLoading(false);
              return;
          }
          
          // B. වෙනත් Factory එකක් තෝරාගෙන තිබේ නම් -> එම Factory එකට Super Admin ලෙස
          else {
              const selectedFact = factories.find(f => f.id === selectedFactoryId);
              if (selectedFact) {
                  login({
                      id: superAdminData.id, 
                      username: superAdminData.username,
                      factoryId: selectedFact.id, 
                      collectionName: selectedFact.collectionName,
                      factoryName: selectedFact.name,
                      role: 'super_admin' // ⚠️ CRITICAL: Full Access ලබා දේ
                  });
                  setLoading(false);
                  return;
              }
          }
      }
      // =================================================================

      // සාමාන්‍ය User කෙනෙක් නම්
      
      if (selectedFactoryId === 'SUPER_ADMIN_OPTION') {
          throw new Error("Only Super Admin can access this option!");
      }

      const q = query(collection(db, "users"), where("username", "==", trimmedUser));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found!");
      }

      const docSnapshot = querySnapshot.docs[0];
      const userData: any = { 
          id: docSnapshot.id, 
          ...docSnapshot.data() 
      };

      if (userData.factoryId !== selectedFactoryId) {
          throw new Error("Access Denied: You do not belong to this factory.");
      }

      if (userData.password === password) {
        login(userData);
      } else {
        throw new Error("Incorrect Password!");
      }

    } catch (error: any) {
      alert(error.message);
    }
    setLoading(false); 
  };

  // --- 3. REQUEST ACCESS LOGIC ---
  const handleRegisterRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedUser = username.trim();
      
      const qUser = query(collection(db, "users"), where("username", "==", trimmedUser));
      const qReq = query(collection(db, "user_requests"), where("username", "==", trimmedUser));
      
      if (!(await getDocs(qUser)).empty || !(await getDocs(qReq)).empty) {
          throw new Error("Username already taken or pending approval!");
      }

      if (!selectedFactoryId || selectedFactoryId === 'SUPER_ADMIN_OPTION') throw new Error("Please select a valid organization.");

      const fact = factories.find(f => f.id === selectedFactoryId);
      const timestamp = Date.now();
      const requestId = `REQ_${timestamp}`; 
      
      const requestData = {
        username: trimmedUser,
        password, 
        factoryId: fact.id,
        collectionName: fact.collectionName,
        factoryName: fact.name,
        role: 'user', 
        status: 'pending', 
        requestDate: new Date().toISOString()
      };

      await setDoc(doc(db, "user_requests", requestId), requestData);

      alert("Request Sent! Wait for Admin approval.");
      setIsLogin(true);
      setUsername(''); setPassword(''); 

    } catch (error: any) {
      alert(error.message);
    }
    setLoading(false);
  };

  // සියලුම States සහ Functions UI එකට යැවීම
  return {
    isLogin, setIsLogin,
    loading,
    factories,
    username, setUsername,
    password, setPassword,
    selectedFactoryId, setSelectedFactoryId,
    handleLogin,
    handleRegisterRequest
  };
};