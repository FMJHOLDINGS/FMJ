import React, { useState } from 'react';
import { AdminConfig, MachineItemConfig } from '../types';
import { Plus, Trash2, Save, Database, Info, Search } from 'lucide-react';

interface Props {
  config: AdminConfig;
  onUpdate: (config: AdminConfig) => void;
}

const AdminTab: React.FC<Props> = ({ config, onUpdate }) => {
  const [newEntry, setNewEntry] = useState<Omit<MachineItemConfig, 'id'>>({
    machineName: '',
    itemName: '',
    customerName: '',
    unitWeight: 0
  });

  const addEntry = () => {
    if (!newEntry.machineName || !newEntry.itemName) return;
    const entry: MachineItemConfig = {
      ...newEntry,
      id: `cfg_${Date.now()}`
    };
    onUpdate({ ...config, machineMappings: [...config.machineMappings, entry] });
    setNewEntry({ machineName: '', itemName: '', customerName: '', unitWeight: 0 });
  };

  const deleteEntry = (id: string) => {
    onUpdate({
      ...config,
      machineMappings: config.machineMappings.filter(m => m.id !== id)
    });
  };

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Database /></div>
           <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Machine Configurations</h2><p className="text-slate-500 font-bold text-xs uppercase">Set machine-specific items and unit weights for auto-filling production forms.</p></div>
        </div>

        <div className="grid grid-cols-5 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 items-end">
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine ID</label>
             <input type="text" placeholder="e.g. M01" value={newEntry.machineName} onChange={e => setNewEntry({...newEntry, machineName: e.target.value.toUpperCase()})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" />
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
             <input type="text" placeholder="Product name" value={newEntry.itemName} onChange={e => setNewEntry({...newEntry, itemName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" />
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</label>
             <input type="text" placeholder="Customer" value={newEntry.customerName} onChange={e => setNewEntry({...newEntry, customerName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" />
           </div>
           <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight (g)</label>
             <input type="number" placeholder="0.00" value={newEntry.unitWeight || ''} onChange={e => setNewEntry({...newEntry, unitWeight: Number(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" />
           </div>
           <button onClick={addEntry} className="bg-indigo-600 text-white h-[46px] rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
             <Plus className="w-4 h-4" /> Add Mapping
           </button>
        </div>

        <div className="overflow-hidden border border-slate-100 rounded-2xl">
           <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase">
                  <th className="px-6 py-4">Machine</th>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Weight</th>
                  <th className="px-6 py-4"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {config.machineMappings.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-indigo-600">{m.machineName}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{m.itemName}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{m.customerName}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{m.unitWeight}g</td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => deleteEntry(m.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {config.machineMappings.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold uppercase text-[10px]">No machine mappings defined yet.</td></tr>
                )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTab;