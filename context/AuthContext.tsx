import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccessLevel = 'edit' | 'view' | 'none';

export interface UserData {
  username: string;
  factoryId: string;
  collectionName: string;
  role: string;
  factoryName: string;
  id: string;
  permissions?: Record<string, AccessLevel>;
}

interface AuthContextType {
  userData: UserData | null;
  loading: boolean;
  login: (data: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ userData: null, loading: true, login: () => {}, logout: () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ඇප් එක Load වෙද්දී LocalStorage එකේ User ඉන්නවද බලනවා
    const storedUser = localStorage.getItem('fmj_current_user');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 2. ලොග් වෙනකොට මේක කෝල් කරන්න
  const login = (data: UserData) => {
    localStorage.setItem('fmj_current_user', JSON.stringify(data));
    setUserData(data);
  };

  // 3. ලොග් අවුට් වෙනකොට මේක
  const logout = () => {
    localStorage.removeItem('fmj_current_user');
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ userData, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);