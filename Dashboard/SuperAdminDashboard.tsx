import React, { useState } from 'react';
import { 
  LayoutDashboard, Factory, AlertTriangle, Activity, Users, LogOut, ShieldCheck, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';

// [STRICT] Keeping your original paths exactly as requested
import { useAuth } from '../context/AuthContext'; 

// Sub Components
import SA_FactoryManager from './SA_FactoryManager';
import SA_Production from './SA_Production';
import SA_Breakdowns from './SA_Breakdowns';
import SA_OEE from './SA_OEE';
import SA_DashboardOverview from './SA_DashboardOverview'; 

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'DASH' | 'PROD' | 'BREAK' | 'OEE' | 'ADMIN'>('ADMIN'); 
  const { logout, userData } = useAuth();

  // --- MODERN NAV TAB COMPONENT ---
  const NavTab = ({ id, icon: Icon, label }: any) => {
    const isActive = activeTab === id;
    
    return (
      <button 
        onClick={() => setActiveTab(id)}
        className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl transition-all duration-300 z-10 ${
          isActive ? 'text-white' : 'text-slate-400 hover:text-white'
        }`}
      >
        {/* Animated Background Pill */}
        {isActive && (
          <motion.div 
            layoutId="activeTab"
            className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/30"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}

        {/* Icon & Label */}
        <span className="relative z-10 flex items-center gap-2">
            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} strokeWidth={2} />
            <span className="font-bold text-xs uppercase tracking-wider hidden md:block">{label}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-indigo-500/30 flex flex-col relative overflow-hidden">
      
      {/* 1. BACKGROUND EFFECTS (Grid & Glows) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* ================= HEADER SECTION ================= */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/70 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1920px] mx-auto px-6 h-20 flex items-center justify-between">
            
            {/* LOGO AREA */}
            <div className="flex items-center gap-4 min-w-fit">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
                    <div className="relative w-11 h-11 bg-[#1E293B] rounded-xl flex items-center justify-center ring-1 ring-white/10">
                        <ShieldCheck className="text-indigo-400" size={22} />
                    </div>
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tighter text-white leading-none flex items-center gap-2">
                        SUPER ADMIN <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold border border-indigo-500/30">PRO</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mt-1 flex items-center gap-1">
                        System Control <Sparkles size={8} className="text-amber-400"/>
                    </p>
                </div>
            </div>

            {/* NAVIGATION TABS (CENTER) */}
            <nav className="flex-1 flex justify-center px-4 overflow-x-auto scrollbar-hide mx-4">
                <div className="flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
                    <NavTab id="DASH" icon={LayoutDashboard} label="Overview" />
                    <NavTab id="PROD" icon={Factory} label="Production" />
                    <NavTab id="BREAK" icon={AlertTriangle} label="Breakdowns" />
                    <NavTab id="OEE" icon={Activity} label="OEE Analysis" />
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 mx-2 hidden md:block"></div>
                    
                    <NavTab id="ADMIN" icon={Users} label="Factory Mgr" />
                </div>
            </nav>

            {/* USER PROFILE & LOGOUT */}
            <div className="flex items-center gap-5 min-w-fit pl-4 border-l border-white/5">
                <div className="text-right hidden lg:block">
                    <p className="text-xs font-bold text-white">{userData?.username || 'Administrator'}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Root Access</p>
                    </div>
                </div>
                
                <button 
                    onClick={logout}
                    className="group relative p-3 rounded-xl bg-slate-800/50 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition-all duration-300"
                    title="Logout System"
                >
                    <LogOut size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                </button>
            </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-indigo-900 scrollbar-track-transparent">
          <div className="max-w-[1920px] mx-auto p-6 md:p-8">
              
              {/* Content Animation Wrapper */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="min-h-[80vh]"
              >
                  {activeTab === 'DASH' && <SA_DashboardOverview />}
                  {activeTab === 'PROD' && <SA_Production />}
                  {activeTab === 'BREAK' && <SA_Breakdowns />}
                  {activeTab === 'OEE' && <SA_OEE />}
                  {activeTab === 'ADMIN' && <SA_FactoryManager />}
              </motion.div>

          </div>
      </main>

    </div>
  );
};

export default SuperAdminDashboard;