import React, { useState } from 'react';
import { X, Plus, Trash2, PackageOpen, Check, Edit2 } from 'lucide-react';
import { TransactionItem } from './StoresTypes';
import { StoreTheme } from './StoreConfig';
import ConfirmModal from './ConfirmModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  typeColor: string;
  transactions: TransactionItem[];
  onSave: (newTransactions: TransactionItem[]) => void;
}

const TransactionModal: React.FC<Props> = ({ isOpen, onClose, title, typeColor, transactions, onSave }) => {

  const modalType = title.startsWith('IN') ? 'IN' : title.startsWith('OUT') ? 'OUT' : 'RETURN';

  // ============================================================================
  // 📝 1. STATES
  // ============================================================================
  
  // --- [UPDATE] EDIT & CONFIRM STATES (Save වෙනුවට Edit ආදේශ කර ඇත) ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'delete' | 'edit'; id?: string; data?: TransactionItem }>({ isOpen: false, type: 'delete' });

  // --- [UPDATE] LOCAL TRANSACTIONS & ALL TOTALS (Totals 3ම ගණනය කරයි) ---
  const [localTrans, setLocalTrans] = useState<TransactionItem[]>(transactions);
  
  const totalInQty = modalType === 'IN' ? localTrans.reduce((sum, t) => sum + (Number(t.value) || 0), 0) : 0;
  const totalReqQty = modalType === 'IN' ? localTrans.reduce((sum, t) => sum + (Number(t.requestedQty) || 0), 0) : 0;
  const totalRemainQty = modalType === 'IN' ? localTrans.reduce((sum, t) => sum + (Number(t.remainingQty) || 0), 0) : 0;

  // --- Common Fields ---
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState(''); 
  
  // --- IN Specific Fields ---
  const [prNumber, setPrNumber] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [prSubmittedDate, setPrSubmittedDate] = useState('');
  const [goodReceivedDate, setGoodReceivedDate] = useState('');
  const [grn, setGrn] = useState('');
  const [bnIn, setBnIn] = useState('');
  // Remain Qty සඳහා වෙනම State එකක් අනවශ්‍ය වුවත්, පවතින කේතය නොකැඩීමට තබා ඇත.

  // ============================================================================
  // 🛠️ 2. HANDLERS 
  // ============================================================================
  
  const resetInputs = () => {
    setValue('');
    if (modalType === 'IN') {
      setPrNumber(''); setRequestedQty(''); setPrSubmittedDate('');
      setGoodReceivedDate(''); setGrn(''); setBnIn(''); 
    }
  };

  const handleAddOrUpdate = () => {
    if (!value || isNaN(Number(value))) return;
    
    const transactionData: Partial<TransactionItem> = {
      date,
      value: Number(value) || 0, 
    };

    if (modalType === 'IN') {
      transactionData.prNumber = prNumber || '-';
      transactionData.requestedQty = Number(requestedQty) || 0;
      transactionData.prSubmittedDate = prSubmittedDate || '-';
      transactionData.goodReceivedDate = goodReceivedDate || '-';
      transactionData.grn = grn || '-';
      transactionData.bnIn = bnIn || '-';
      
      // [NEW] Auto Calculate Remaining Qty = (Requested - Received)
      transactionData.remainingQty = (Number(requestedQty) || 0) - (Number(value) || 0);
    }

    if (editingId) {
      setLocalTrans(prev => prev.map(t => t.id === editingId ? { ...t, ...transactionData } : t));
      setEditingId(null);
    } else {
      const newItem: TransactionItem = { id: Date.now().toString(), ...transactionData as TransactionItem };
      setLocalTrans(prev => [...prev, newItem]);
    }
    
    resetInputs();
  };

  const handleStartEdit = (item: TransactionItem) => {
    setEditingId(item.id);
    setDate(item.date);
    setValue(item.value.toString());
    if (modalType === 'IN') {
      setPrNumber(item.prNumber || '');
      setRequestedQty(item.requestedQty?.toString() || '');
      setPrSubmittedDate(item.prSubmittedDate || '');
      setGoodReceivedDate(item.goodReceivedDate || '');
      setGrn(item.grn || '');
      setBnIn(item.bnIn || '');
    }
    document.getElementById('trans-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditingId(null); resetInputs(); };

  // [UPDATE] Delete සහ Edit සඳහා පමණක් Confirm Popup එක එයි
  const handleTriggerAction = (type: 'delete' | 'edit', item?: any) => {
    if (item) setConfirmState({ isOpen: true, type, id: item.id, data: item });
  };

  // [UPDATE] Confirm Modal එකෙන් OK කළ විට ක්‍රියාත්මක වේ
  const handleConfirmExecute = () => {
    if (confirmState.type === 'delete' && confirmState.id) {
      setLocalTrans(prev => prev.filter(t => t.id !== confirmState.id));
    } else if (confirmState.type === 'edit' && confirmState.data) {
      handleStartEdit(confirmState.data as TransactionItem);
    }
    setConfirmState({ isOpen: false, type: 'delete' });
  };

  // [NEW] Save Changes බොත්තම සඳහා කෙලින්ම Save වන Function එක
  const handleSaveAndClose = () => {
    onSave(localTrans);
    onClose();
  };

  // Styles
  const inputClass = "bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 w-full focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-[9px] font-bold text-slate-500 uppercase mb-0.5 truncate";
  const thClass = "px-3 py-2 border-b border-slate-200 dark:border-slate-800";
  const tdClass = "px-3 py-1.5 text-slate-700 dark:text-slate-300";

  // ============================================================================
  // 🎨 3. RENDER COMPONENTS 
  // ============================================================================
  
  const renderInputForm = () => {
    if (modalType === 'IN') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 items-end">
          <div><label className={labelClass}>PR Number</label><input type="text" value={prNumber} onChange={e => setPrNumber(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Req Qty</label><input type="number" value={requestedQty} onChange={e => setRequestedQty(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>PR Sub. Date</label><input type="date" value={prSubmittedDate} onChange={e => setPrSubmittedDate(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Good Rec. Date</label><input type="date" value={goodReceivedDate} onChange={e => setGoodReceivedDate(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>GRN</label><input type="text" value={grn} onChange={e => setGrn(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>BN - IN</label><input type="text" value={bnIn} onChange={e => setBnIn(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Received Qty</label><input type="number" value={value} onChange={e => setValue(e.target.value)} className={inputClass} /></div>
          
          {/* [UPDATE] Remain Qty එක Auto Calculate වී පෙන්වයි. Edit කළ නොහැක. */}
          <div>
            <label className={labelClass}>Remain Qty</label>
            <input 
              type="number" 
              value={(Number(requestedQty) || 0) - (Number(value) || 0)} 
              readOnly 
              className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} 
              title="Auto Calculated"
            />
          </div>
          <button onClick={handleAddOrUpdate} className={`h-[26px] rounded flex items-center justify-center transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
            {editingId ? <Check size={16}/> : <Plus size={16}/>}
          </button>
        </div>
      );
    } else if (modalType === 'OUT') {
      return (
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          <input type="number" placeholder="Qty (OUT)" value={value} onChange={e => setValue(e.target.value)} className={`${inputClass} w-24`} />
          <button onClick={handleAddOrUpdate} className={`px-4 h-[26px] rounded flex items-center justify-center transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
            {editingId ? <Check size={16}/> : <Plus size={16}/>}
          </button>
        </div>
      );
    } else {
      return (
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          <input type="number" placeholder="Qty (RETURN)" value={value} onChange={e => setValue(e.target.value)} className={`${inputClass} w-24`} />
          <button onClick={handleAddOrUpdate} className={`px-4 h-[26px] rounded flex items-center justify-center transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
            {editingId ? <Check size={16}/> : <Plus size={16}/>}
          </button>
        </div>
      );
    }
  };

  const renderTableHeaders = () => {
    if (modalType === 'IN') {
      return (
        <>
          <th className={thClass}>PR Number</th>
          <th className={`${thClass} text-right`}>Req Qty</th>
          <th className={thClass}>PR Sub. Date</th>
          <th className={thClass}>Good Rec. Date</th>
          <th className={thClass}>GRN</th>
          <th className={thClass}>BN - IN</th>
          <th className={`${thClass} text-right text-emerald-600 dark:text-emerald-500`}>Received Qty</th>
          <th className={`${thClass} text-right text-rose-600 dark:text-rose-500`}>Remaining Qty</th>
        </>
      );
    } else if (modalType === 'OUT') {
      return (
        <>
          <th className={thClass}>Date</th>
          <th className={`${thClass} text-right`}>Value (OUT)</th>
        </>
      );
    } else {
      return (
        <>
          <th className={thClass}>Date</th>
          <th className={`${thClass} text-right`}>Value (RETURN)</th>
        </>
      );
    }
  };

  const renderTableCells = (t: any) => {
    if (modalType === 'IN') {
      return (
        <>
          <td className={tdClass}>{t.prNumber}</td>
          <td className={`${tdClass} text-right font-bold text-slate-800 dark:text-slate-200`}>{t.requestedQty}</td>
          <td className={tdClass}>{t.prSubmittedDate}</td>
          <td className={tdClass}>{t.goodReceivedDate}</td>
          <td className={tdClass}>{t.grn}</td>
          <td className={tdClass}>{t.bnIn}</td>
          <td className={`${tdClass} text-right font-black text-emerald-600 dark:text-emerald-400`}>{t.value}</td>
          <td className={`${tdClass} text-right font-bold text-rose-600 dark:text-rose-400`}>{t.remainingQty}</td>
        </>
      );
    } else {
      return (
        <>
          <td className={tdClass}>{t.date}</td>
          <td className={`${tdClass} text-right font-bold text-slate-800 dark:text-slate-200`}>{t.value}</td>
        </>
      );
    }
  };


  // ============================================================================
  // 🏗️ 4. MAIN RENDER 
  // ============================================================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      
      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] ${modalType === 'IN' ? 'w-full max-w-7xl' : 'w-full max-w-md'}`}>
        
        {/* Header */}
        {modalType === 'IN' ? (
          <div className={`px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-inner">
                <PackageOpen size={22} strokeWidth={2.5}/>
              </div>
              <div>
                <h2 className={`font-black text-lg text-emerald-700 dark:text-emerald-300 tracking-tight`}>Received Stock (IN)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{title.replace('IN - ', '')}</p>
              </div>
            </div>
            
            {/* [UPDATE] All 3 Totals displayed in Header */}
            <div className="flex items-center gap-5">
              <div className="flex gap-5 border-r border-emerald-200 dark:border-emerald-800 pr-5">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-emerald-600/70 uppercase dark:text-emerald-400/70">Total Req Qty</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalReqQty.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-emerald-600/70 uppercase dark:text-emerald-400/70">Total IN Qty</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalInQty.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-emerald-600/70 uppercase dark:text-emerald-400/70">Total Remain Qty</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalRemainQty.toLocaleString()}</div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"><X size={20}/></button>
            </div>
          </div>
        ) : (
          <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center ${typeColor} bg-opacity-10`}>
            <h2 className={`font-bold text-sm ${typeColor.replace('bg-', 'text-')}`}>{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={18}/></button>
          </div>
        )}

        {/* Input Form */}
        <div id="trans-form" className={`p-3 border-b border-slate-100 dark:border-slate-800 ${editingId ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 dark:ring-blue-600 rounded-b-xl' : 'bg-slate-50/80 dark:bg-slate-800/50'}`}>
          <div className="flex flex-col gap-2">
            {editingId && <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><Edit2 size={14}/> Editing record...</div>}
            {renderInputForm()}
            {editingId && <button onClick={handleCancelEdit} className="text-[10px] text-slate-500 underline self-start">Cancel Edit</button>}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-0 bg-white dark:bg-[#0B1121] min-h-[200px] max-h-[50vh] custom-scrollbar">
          {localTrans.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-10">No records added yet.</div>
          ) : (
            <table className="w-full text-left text-[11px] min-w-max whitespace-nowrap border-collapse">
              <thead className="text-[9px] uppercase font-bold tracking-wider text-slate-500 sticky top-0 bg-slate-100 dark:bg-slate-900 shadow-sm z-10">
                <tr>
                  {renderTableHeaders()}
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-center sticky right-0 bg-slate-100 dark:bg-slate-900">Act</th>
                </tr>
              </thead>
              <tbody>
                {localTrans.map((t, i) => (
                  <tr key={t.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30 dark:bg-slate-800/20'} ${editingId === t.id ? 'ring-2 ring-inset ring-blue-500 bg-blue-50' : ''}`}>
                    
                    {renderTableCells(t)}
                    
                    <td className="px-2 py-1 text-center sticky right-0 bg-white dark:bg-[#0B1121] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-center gap-1">
                        {/* [UPDATE] Edit & Delete triggers confirmation */}
                        <button onClick={() => handleTriggerAction('edit', t)} className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"><Edit2 size={12}/></button>
                        <button onClick={() => handleTriggerAction('delete', t)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1 rounded transition-colors"><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          {/* [UPDATE] Save Changes saves immediately without confirmation */}
          <button onClick={handleSaveAndClose} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>

      {/* [UPDATE] Confirmation Modal for Edit and Delete ONLY */}
      {confirmState.isOpen && (
        <ConfirmModal 
          isOpen={confirmState.isOpen} 
          onClose={() => setConfirmState({ isOpen: false, type: 'delete' })} 
          onConfirm={handleConfirmExecute} 
          title={confirmState.type === 'delete' ? "Delete Record" : "Edit Record"} 
          message={confirmState.type === 'delete' ? "Are you sure you want to delete this record?" : "Are you sure you want to edit this record? The form will be populated with its data."} 
          confirmButtonText={confirmState.type === 'delete' ? "Yes, Delete" : "Yes, Edit"}
          requireInputWord="confirm"
        />
      )}
    </div>
  );
};

export default TransactionModal;