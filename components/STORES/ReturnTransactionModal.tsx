import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Edit2 } from 'lucide-react';
import { TransactionItem } from './StoresTypes';
import { StoreTheme } from './StoreConfig';
import ConfirmModal from './ConfirmModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: TransactionItem[];
  onSave: (newTransactions: TransactionItem[]) => void;
}

const ReturnTransactionModal: React.FC<Props> = ({ isOpen, onClose, title, transactions, onSave }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'delete' | 'edit'; id?: string; data?: TransactionItem }>({ isOpen: false, type: 'delete' });
  const [localTrans, setLocalTrans] = useState<TransactionItem[]>(transactions);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState(''); 

  const handleAddOrUpdate = () => {
    if (!value || isNaN(Number(value))) return;
    const transactionData: Partial<TransactionItem> = { date, value: Number(value) || 0 };

    if (editingId) {
      setLocalTrans(prev => prev.map(t => t.id === editingId ? { ...t, ...transactionData } : t));
      setEditingId(null);
    } else {
      setLocalTrans(prev => [...prev, { id: Date.now().toString(), ...transactionData as TransactionItem }]);
    }
    setValue('');
  };

  const handleStartEdit = (item: TransactionItem) => {
    setEditingId(item.id); setDate(item.date); setValue(item.value.toString());
  };

  const handleTriggerAction = (type: 'delete' | 'edit', item?: any) => {
    if (item) setConfirmState({ isOpen: true, type, id: item.id, data: item });
  };

  const handleConfirmExecute = () => {
    if (confirmState.type === 'delete' && confirmState.id) {
      setLocalTrans(prev => prev.filter(t => t.id !== confirmState.id));
    } else if (confirmState.type === 'edit' && confirmState.data) {
      handleStartEdit(confirmState.data as TransactionItem);
    }
    setConfirmState({ isOpen: false, type: 'delete' });
  };

  const inputClass = "bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 w-full focus:ring-1 focus:ring-blue-500";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] w-full max-w-md">
        
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-amber-500 bg-opacity-10">
          <h2 className="font-bold text-sm text-amber-600">RETURN - {title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>

        <div className={`p-3 border-b border-slate-100 dark:border-slate-800 ${editingId ? 'bg-blue-50' : 'bg-slate-50/80'}`}>
          <div className="flex gap-2 items-center">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            <input type="number" placeholder="Qty (RETURN)" value={value} onChange={e => setValue(e.target.value)} className={`${inputClass} w-24`} />
            <button onClick={handleAddOrUpdate} className={`px-4 h-[26px] rounded flex items-center justify-center ${StoreTheme.btnPrimary}`}>
              {editingId ? <Check size={16}/> : <Plus size={16}/>}
            </button>
          </div>
          {editingId && <button onClick={() => {setEditingId(null); setValue('');}} className="text-[10px] text-slate-500 underline mt-1">Cancel Edit</button>}
        </div>

        <div className="flex-1 overflow-auto p-0 bg-white min-h-[200px] max-h-[50vh] custom-scrollbar">
          {localTrans.length === 0 ? ( <div className="text-center text-slate-400 text-xs py-10">No records added yet.</div> ) : (
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="text-[9px] uppercase font-bold text-slate-500 sticky top-0 bg-slate-100">
                <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Value (RETURN)</th><th className="px-3 py-2 text-center">Act</th></tr>
              </thead>
              <tbody>
                {localTrans.map((t, i) => (
                  <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50 ${editingId === t.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-1.5">{t.date}</td><td className="px-3 py-1.5 text-right font-bold">{t.value}</td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => handleTriggerAction('edit', t)} className="text-blue-400 hover:text-blue-600 p-1"><Edit2 size={12}/></button>
                      <button onClick={() => handleTriggerAction('delete', t)} className="text-rose-400 hover:text-rose-600 p-1"><Trash2 size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <button onClick={() => { onSave(localTrans); onClose(); }} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-[11px] font-bold shadow-sm ${StoreTheme.btnPrimary}`}>
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>
      
      {confirmState.isOpen && (
        <ConfirmModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({ isOpen: false, type: 'delete' })} onConfirm={handleConfirmExecute} title={confirmState.type === 'delete' ? "Delete Record" : "Edit Record"} message={confirmState.type === 'delete' ? "Delete this record?" : "Edit this record?"} confirmButtonText="Yes" requireInputWord="confirm" />
      )}
    </div>
  );
};
export default ReturnTransactionModal;