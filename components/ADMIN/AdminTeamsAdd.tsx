import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { AdminConfig } from '../../types';

interface Props {
  config: AdminConfig;
  onUpdate: (config: AdminConfig) => void;
}

const AdminTeamsAdd: React.FC<Props> = ({ config, onUpdate }) => {
  const [newTeam, setNewTeam] = useState('');
  const [teamError, setTeamError] = useState<string>('');

  const addTeam = () => {
    const trimmedTeam = newTeam.trim();
    if (!trimmedTeam) return;

    const currentTeams = config.shiftTeams || [];
    if (currentTeams.some(t => t.toLowerCase() === trimmedTeam.toLowerCase())) {
       setTeamError("Team exists!");
       return;
    }
    
    const updatedConfig = { ...config, shiftTeams: [...currentTeams, trimmedTeam] };
    onUpdate(updatedConfig);
    setNewTeam('');
    setTeamError(''); 
  };

  const deleteTeam = (team: string) => {
    if (!window.confirm("Remove team?")) return;
    const updatedConfig = {
        ...config,
        shiftTeams: (config.shiftTeams || []).filter(t => t !== team)
    };
    onUpdate(updatedConfig);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
       <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
          <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Add Shift Team</h3>
          <div className="flex gap-4">
             <div className="flex-1">
                <input type="text" placeholder="e.g. Shift C, Team Alpha" value={newTeam} 
                       onChange={e => { setNewTeam(e.target.value); setTeamError(''); }} 
                       className={`w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-bold dark:text-white outline-none transition-colors ${teamError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 dark:border-slate-600 focus:border-emerald-500'}`} />
                {teamError && <p className="text-rose-500 text-xs font-bold mt-2 ml-1">{teamError}</p>}
             </div>
             <button onClick={addTeam} className="px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95"><UserPlus className="w-4 h-4" /> Add Team</button>
          </div>
       </div>
       <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"><h4 className="font-black text-emerald-500 uppercase text-xs tracking-widest">Active Shift Teams</h4></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             {(config.shiftTeams && config.shiftTeams.length > 0) ? (
                config.shiftTeams.map(team => (
                   <div key={team} className="flex justify-between items-center p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{team}</span>
                      <button onClick={() => deleteTeam(team)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                   </div>
                ))
             ) : (<div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No shift teams defined.</div>)}
          </div>
       </div>
    </div>
  );
};

export default AdminTeamsAdd;