// ෆයිල් එකේ උඩම හරියට
import myImage from '../public/Fmj_Icon.png'; // <-- ඔබේ අයිකනය
import React from 'react';
import { motion } from 'framer-motion';
// අලංකාර අයිකන්
import { Building2, User, Lock, ArrowRight, Loader2, Sparkles, ShieldCheck, Send } from 'lucide-react';
import SimpleSpaceBackground from './SimpleSpaceBackground';
// Logic Hook එක Import කිරීම
import { useAuthLogic } from './useAuthLogic';

// ==================================================================================
// 🎨 UI COMPONENT එක (Logic Hook එක භාවිතා කරයි)
// ==================================================================================
const AuthPage = () => {
  
  // Custom Hook එකෙන් Data සහ Functions ලබා ගැනීම
  const {
    isLogin, setIsLogin,
    loading,
    factories,
    username, setUsername,
    password, setPassword,
    selectedFactoryId, setSelectedFactoryId,
    handleLogin,
    handleRegisterRequest
  } = useAuthLogic();

  // ==================================================================================
  // UI RENDERING
  // ==================================================================================
  return (
    // සම්පූර්ණ පිටුවේ පසුබිම (Responsive Fix: min-h-screen භාවිතා කර ඇත)
    <div className="relative w-full min-h-screen font-sans text-white bg-[#020617] flex items-center justify-center p-4 overflow-y-auto">
      
      {/* අභ්‍යවකාශ තේමාව සහිත පසුබිම */}
      <div className="fixed inset-0 pointer-events-none">
          <SimpleSpaceBackground />
      </div>

      {/* --- ප්‍රධාන කොටුව --- */}
      <div className="relative group w-full max-w-[400px] z-10 my-4"> 
            
            {/* 1. Animated Gradient Border */}
            <motion.div
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'], 
                }}
                transition={{
                    duration: 5, 
                    ease: "linear",
                    repeat: Infinity, 
                }}
                className="absolute -inset-[3px] rounded-[2.6rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500"
                style={{ backgroundSize: '200% 200%' }} 
            />
            
            {/* 2. Main Glass Card */}
            <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full bg-[#0b1121]/98 sm:bg-slate-900/90 sm:backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10 border border-white/10 transform-gpu"
            >
                
            {/* --- HEADER SECTION (Responsive & Inline) --- */}
            <div className="p-6 md:p-8 pb-0 text-center relative z-10"> 
                
                <div className="flex flex-row items-center justify-center gap-2 mb-2 transform scale-95 md:scale-100 transition-transform">
                    
                    {/* Icon එක */}
                    <img 
                        src={myImage} 
                        alt="FMJ Holdings Logo" 
                        className="w-16 h-16 md:w-20 md:h-20 object-contain shrink-0" 
                    />
                    
                    {/* --- Name with Border --- */}
                    <div className="relative inline-block">
                        <motion.div
                            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                            className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-70 blur-sm"
                            style={{ backgroundSize: '200% 200%' }}
                        />
                        <h1 className="relative z-10 text-[26px] md:text-4xl font-black tracking-tighter text-white mb-0 drop-shadow-lg px-3 py-1 bg-slate-900/60 rounded-lg whitespace-nowrap leading-none">
                            FMJ HOLDINGS
                        </h1>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-indigo-200/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                    <ShieldCheck size={12} /> Secure Access Gateway
                </div>
            </div>

            {/* --- TOGGLE BUTTONS --- */}
            <div className="px-6 md:px-8 mt-6 relative z-10">
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Login</button>
                <button onClick={() => { setIsLogin(false); setUsername(''); setPassword(''); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${!isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Request Access</button>
                </div>
            </div>

            {/* --- FORM AREA --- */}
            <div className="p-6 md:p-8 relative z-10">
                <form onSubmit={isLogin ? handleLogin : handleRegisterRequest} className="space-y-4">
                
                {/* Organization Dropdown */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-3 tracking-wide">Organization</label>
                    <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <select 
                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-12 py-3.5 text-sm font-bold text-white/90 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800/80 transition-colors appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10"
                        value={selectedFactoryId}
                        onChange={(e) => setSelectedFactoryId(e.target.value)}
                        required={!isLogin || (username.trim() !== 'Admin')}
                        >
                        <option value="" className="bg-[#0F172A] text-slate-500">Select Organization...</option>
                        
                        {/* ✅ SUPER ADMIN OPTION */}
                        {isLogin && (
                            <option value="SUPER_ADMIN_OPTION" className="bg-indigo-900/50 text-indigo-200 font-black py-2">
                                👑 Super Admin Dashboard
                            </option>
                        )}

                        {factories.map(f => (
                            <option key={f.id} value={f.id} className="bg-[#0F172A] text-white py-2">{f.name}</option>
                        ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                    </div>
                </div>

                {/* Username Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-3 tracking-wide">Username</label>
                    <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="text" placeholder="Enter your username" required 
                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-12 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800/80 transition-colors focus:ring-4 focus:ring-indigo-500/10"
                        value={username} onChange={e => setUsername(e.target.value)}
                    />
                    </div>
                </div>
                
                {/* Password Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 ml-3 tracking-wide">Password</label>
                    <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        type="password" placeholder="••••••••" required 
                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-12 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-800/80 transition-all focus:ring-4 focus:ring-indigo-500/10"
                        value={password} onChange={e => setPassword(e.target.value)}
                    />
                    </div>
                </div>

                {/* Submit Button */}
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 mt-4 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                    
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                    <>
                        <span className="relative z-10 uppercase tracking-widest text-xs">
                            {isLogin ? 'Access Dashboard' : 'Send Request'}
                        </span>
                        {isLogin ? <ArrowRight className="w-4 h-4 relative z-10" strokeWidth={3} /> : <Send className="w-4 h-4 relative z-10" strokeWidth={3} />}
                    </>
                    )}
                </motion.button>

                </form>
            </div>
            
            {/* --- FOOTER --- */}
            <div className="bg-black/20 p-4 md:p-5 text-center border-t border-white/5 backdrop-blur-sm">
                <p className="text-[10px] text-slate-500 font-bold tracking-widest flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <Sparkles size={10} className="text-amber-400" /> POWERED BY FMJ SYSTEMS
                </p>
            </div>

            </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;