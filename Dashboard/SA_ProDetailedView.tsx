import React from 'react';
import { FactoryAnalytics } from './SA_Production';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Activity, ChevronRight } from 'lucide-react';

// --- HELPER ---
const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);

interface Props {
  factories: FactoryAnalytics[];
}

const SA_ProDetailedView: React.FC<Props> = ({ factories }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-lg font-black text-indigo-200 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-1 bg-indigo-500 rounded-full"></span>
            Detailed Production Breakdown
        </h3>
        
        <div className="grid grid-cols-1 gap-6">
            {factories.map((fac, idx) => (
                <motion.div 
                    key={fac.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[#151e32]/90 border border-white/5 rounded-[2rem] p-1 shadow-xl hover:border-indigo-500/30 transition-all group"
                >
                    <div className="bg-[#0B1121]/50 p-6 rounded-[1.8rem]">
                        
                        {/* CARD HEADER */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-white/5 pb-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">{fac.name}</h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 tracking-wider mt-1">
                                            <MapPin size={12} className="text-amber-500"/> {fac.location} 
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span className="text-indigo-400">{fac.history.length} Days Active</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* MINI STATS */}
                            <div className="flex flex-wrap gap-4">
                                <div className="bg-[#0f172a] px-5 py-3 rounded-2xl border border-white/5 shadow-inner">
                                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Plan</div>
                                    <div className="text-lg font-black text-slate-300">{fmt(fac.totalTargetKG)}</div>
                                </div>
                                <div className="bg-[#0f172a] px-5 py-3 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                    <div className="text-[9px] text-emerald-500/70 font-black uppercase tracking-widest mb-1">Actual</div>
                                    <div className="text-lg font-black text-emerald-400">{fmt(fac.totalActualKG)}</div>
                                </div>
                                <div className="bg-[#0f172a] px-5 py-3 rounded-2xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                                    <div className="text-[9px] text-rose-500/70 font-black uppercase tracking-widest mb-1">Lost</div>
                                    <div className="text-lg font-black text-rose-400">{fmt(fac.totalLostKG)}</div>
                                </div>
                            </div>
                        </div>

                        {/* HISTORY GRID */}
                        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f172a]/50">
                            <table className="w-full text-left">
                                <thead className="bg-[#1e293b]/50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6"><div className="flex items-center gap-1"><Calendar size={10}/> Date</div></th>
                                        <th className="p-4 text-right">Plan (KG)</th>
                                        <th className="p-4 text-right">Actual (KG)</th>
                                        <th className="p-4 text-right text-rose-400">Lost (KG)</th>
                                        <th className="p-4 text-center">Efficiency</th>
                                        <th className="p-4 text-center">Rej %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs font-medium text-slate-300">
                                    {fac.history.slice().reverse().slice(0, 7).map((h, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3 pl-6 font-mono text-indigo-300/80">{h.date}</td>
                                            <td className="p-3 text-right opacity-50">{fmt(h.targetKG)}</td>
                                            <td className="p-3 text-right font-bold text-white">{fmt(h.actualKG)}</td>
                                            <td className="p-3 text-right text-rose-400 font-bold bg-rose-500/5">{fmt(h.lostKG)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${h.efficiency>=80?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                    {fmt(h.efficiency)}%
                                                </span>
                                            </td>
                                            <td className="p-3 text-center text-slate-500">{fmt(h.rejection)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-3 text-center text-[10px] text-slate-500 bg-[#0f172a] border-t border-white/5 flex items-center justify-center gap-2">
                                Showing last 7 active days <ChevronRight size={10}/>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
  );
};

export default SA_ProDetailedView;