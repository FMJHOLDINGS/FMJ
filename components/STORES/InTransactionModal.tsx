import React, { useState } from 'react';
import { X, Plus, Trash2, PackageOpen, Check, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { TransactionItem } from './StoresTypes';
import { StoreTheme } from './StoreConfig';
import ConfirmModal from './ConfirmModal';

// [NEW] Sub-deliveries හඳුනාගැනීම සඳහා Local Interface එකක්
interface LocalTransItem extends TransactionItem {
  parentId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: TransactionItem[];
  onSave: (newTransactions: TransactionItem[]) => void;
}

const InTransactionModal: React.FC<Props> = ({ isOpen, onClose, title, transactions, onSave }) => {

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'delete' | 'edit'; id?: string; data?: TransactionItem }>({ isOpen: false, type: 'delete' });

  // [NEW] Balance Qty Modal State
  const [balanceModal, setBalanceModal] = useState<{isOpen: boolean, parentItem: LocalTransItem | null}>({ isOpen: false, parentItem: null });
  const [balDate, setBalDate] = useState('');
  const [balQty, setBalQty] = useState('');
  const [balGrn, setBalGrn] = useState('');
  const [balBnIn, setBalBnIn] = useState('');

  const [localTrans, setLocalTrans] = useState<LocalTransItem[]>(transactions);


  // [NEW] Expand/Collapse සඳහා State එක
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  
  // ============================================================================
  // 🧮 CALCULATIONS (Remaining Qty ස්වයංක්‍රීයව ගණනය කිරීම)
  // ============================================================================
  
  // 1. Sub-deliveries වල එකතුව සෙවීම
  const subDelMap: Record<string, number> = {};
  localTrans.forEach(t => {
      if (t.parentId) {
          subDelMap[t.parentId] = (subDelMap[t.parentId] || 0) + (Number(t.value) || 0);
      }
  });

  // 2. Row එකක ඉතිරි ප්‍රමාණය (Remaining) සෙවීම
  const getRowRemain = (t: LocalTransItem) => {
      if (t.parentId) return 0; // Sub-delivery වලට ඉතිරියක් නැත
      const subTotal = subDelMap[t.id] || 0;
      const req = Number(t.requestedQty) || 0;
      const rec = Number(t.value) || 0;
      return Math.max(0, req - rec - subTotal);
  };

  // 3. Header Totals
  const totalInQty = localTrans.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const totalReqQty = localTrans.reduce((sum, t) => sum + (Number(t.requestedQty) || 0), 0);
  const totalRemainQty = localTrans.reduce((sum, t) => sum + getRowRemain(t), 0);

  // --- Input States ---
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState(''); 
  const [prNumber, setPrNumber] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [prSubmittedDate, setPrSubmittedDate] = useState('');
  const [goodReceivedDate, setGoodReceivedDate] = useState('');
  const [grn, setGrn] = useState('');
  const [bnIn, setBnIn] = useState('');

  const resetInputs = () => {
    setValue(''); setPrNumber(''); setRequestedQty(''); setPrSubmittedDate('');
    setGoodReceivedDate(''); setGrn(''); setBnIn(''); 
  };

  // ============================================================================
  // 🛠️ HANDLERS 
  // ============================================================================
  const handleAddOrUpdate = () => {
    if (!value || isNaN(Number(value))) return;
    
    const reqQ = Number(requestedQty) || 0;
    const valQ = Number(value) || 0;

    const transactionData: Partial<LocalTransItem> = {
      date, value: valQ, 
      prNumber: prNumber || '-',
      requestedQty: reqQ,
      prSubmittedDate: prSubmittedDate || '-',
      goodReceivedDate: goodReceivedDate || '-',
      grn: grn || '-', bnIn: bnIn || '-',
      remainingQty: Math.max(0, reqQ - valQ) // Database එකට යාමට පමණි
    };

    if (editingId) {
      setLocalTrans(prev => prev.map(t => t.id === editingId ? { ...t, ...transactionData } : t));
      setEditingId(null);
    } else {
      const newItem: LocalTransItem = { id: Date.now().toString(), ...transactionData as LocalTransItem };
      setLocalTrans(prev => [...prev, newItem]);
    }
    resetInputs();
  };

  // [NEW] Sub-delivery එකක් සේව් කිරීම
  const handleSaveBalance = () => {
      if (!balanceModal.parentItem || !balQty || isNaN(Number(balQty))) return;
      
      const pItem = balanceModal.parentItem;
      const q = Number(balQty);

      if (q > getRowRemain(pItem)) {
          alert("Error: Received quantity cannot exceed the pending quantity!");
          return;
      }

      const newItem: LocalTransItem = {
          id: `sub_${Date.now()}`,
          date: balDate, 
          value: q,
          prNumber: pItem.prNumber,
          requestedQty: 0, // Total Req Qty වැඩි නොවීම සඳහා
          prSubmittedDate: pItem.prSubmittedDate,
          goodReceivedDate: balDate,
          grn: balGrn || '-',
          bnIn: balBnIn || '-',
          remainingQty: 0,
          parentId: pItem.id // මුල් පේළියට සම්බන්ධ කරයි
      };

      setLocalTrans(prev => [...prev, newItem]);
      setBalanceModal({ isOpen: false, parentItem: null });
  };

  const handleStartEdit = (item: LocalTransItem) => {
    setEditingId(item.id); setDate(item.date); setValue(item.value.toString());
    setPrNumber(item.prNumber || ''); setRequestedQty(item.requestedQty?.toString() || '');
    setPrSubmittedDate(item.prSubmittedDate || ''); setGoodReceivedDate(item.goodReceivedDate || '');
    setGrn(item.grn || ''); setBnIn(item.bnIn || '');
    document.getElementById('in-trans-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setEditingId(null); resetInputs(); };

  const handleTriggerAction = (type: 'delete' | 'edit', item?: any) => {
    if (item) setConfirmState({ isOpen: true, type, id: item.id, data: item });
  };

  const handleConfirmExecute = () => {
    if (confirmState.type === 'delete' && confirmState.id) {
      setLocalTrans(prev => prev.filter(t => t.id !== confirmState.id && t.parentId !== confirmState.id));
    } else if (confirmState.type === 'edit' && confirmState.data) {
      handleStartEdit(confirmState.data as LocalTransItem);
    }
    setConfirmState({ isOpen: false, type: 'delete' });
  };

  const handleSaveAndClose = () => { onSave(localTrans); onClose(); };

  const inputClass = "bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 w-full focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-[9px] font-bold text-slate-500 uppercase mb-0.5 truncate";
  const tdClass = "px-3 py-1.5 text-slate-700 dark:text-slate-300";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] w-full max-w-7xl">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <PackageOpen size={22} strokeWidth={2.5}/>
            </div>
            <div>
              <h2 className="font-black text-lg text-emerald-700 dark:text-emerald-300 tracking-tight">Received Stock (IN)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex gap-5 border-r border-emerald-200 dark:border-emerald-800 pr-5">
              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-600/70 uppercase">Total Req Qty</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalReqQty.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-600/70 uppercase">Total IN Qty</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalInQty.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-emerald-600/70 uppercase">Total Remain Qty</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-300 leading-none">{totalRemainQty.toLocaleString()}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"><X size={20}/></button>
          </div>
        </div>

        {/* Input Form */}
        <div id="in-trans-form" className={`p-3 border-b border-slate-100 dark:border-slate-800 ${editingId ? 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 dark:ring-blue-600 rounded-b-xl' : 'bg-slate-50/80 dark:bg-slate-800/50'}`}>
          <div className="flex flex-col gap-2">
            {editingId && <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><Edit2 size={14}/> Editing record...</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 items-end">
              <div><label className={labelClass}>PR Number</label><input type="text" value={prNumber} onChange={e => setPrNumber(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Req Qty</label><input type="number" value={requestedQty} onChange={e => setRequestedQty(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>PR Sub. Date</label><input type="date" value={prSubmittedDate} onChange={e => setPrSubmittedDate(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Good Rec. Date</label><input type="date" value={goodReceivedDate} onChange={e => setGoodReceivedDate(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>GRN</label><input type="text" value={grn} onChange={e => setGrn(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>BN - IN</label><input type="text" value={bnIn} onChange={e => setBnIn(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Received Qty</label><input type="number" value={value} onChange={e => setValue(e.target.value)} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Remain Qty</label>
                <input type="number" value={Math.max(0, (Number(requestedQty) || 0) - (Number(value) || 0))} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-800 cursor-not-allowed`} title="Auto Calculated"/>
              </div>
              <button onClick={handleAddOrUpdate} className={`h-[26px] rounded flex items-center justify-center transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
                {editingId ? <Check size={16}/> : <Plus size={16}/>}
              </button>
            </div>
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
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">PR Number</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-right">Req Qty</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">PR Sub. Date</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">Good Rec. Date</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">GRN</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">BN - IN</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-right text-emerald-600 dark:text-emerald-500">Received Qty</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-right text-rose-600 dark:text-rose-500">Remaining Qty</th>
                  <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-center sticky right-0 bg-slate-100 dark:bg-slate-900">Act</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. ප්‍රධාන (Parent) පේළි පමණක් පෙරීම */}
                {localTrans.filter(t => !t.parentId).map((p, i) => {
                  
                  // 2. අදාළ Parent එකට අයිති Sub-deliveries සෙවීම
                  const children = localTrans.filter(c => c.parentId === p.id);
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedRows.includes(p.id);
                  const remain = getRowRemain(p);
                  
                  // 3. මුළු එකතුව සෙවීම (ප්‍රධාන Received Qty + සියලුම Sub-deliveries)
                  const totalReceived = (Number(p.value) || 0) + (subDelMap[p.id] || 0);
                  
                  return (
                    <React.Fragment key={p.id}>
                      {/* ========================================= */}
                      {/* ප්‍රධාන පේළිය (Main Row)                  */}
                      {/* ========================================= */}
                      <tr className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30 dark:bg-slate-800/20'} ${editingId === p.id ? 'ring-2 ring-inset ring-blue-500 bg-blue-50' : ''}`}>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            {hasChildren ? (
                              <button onClick={() => toggleRow(p.id)} className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                                {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                              </button>
                            ) : <div className="w-[20px]"></div>}
                            {p.prNumber}
                          </div>
                        </td>
                        <td className={`${tdClass} text-right font-bold text-slate-800 dark:text-slate-200`}>{p.requestedQty}</td>
                        <td className={tdClass}>{p.prSubmittedDate}</td>
                        <td className={tdClass}>{p.goodReceivedDate}</td>
                        
                        {/* Sub-deliveries ඇත්නම් ප්‍රධාන පේළියේ GRN හා BN සැඟවීම */}
                        <td className={`${tdClass} ${hasChildren ? 'text-slate-400 font-bold text-center' : ''}`}>{hasChildren ? '-' : p.grn}</td>
                        <td className={`${tdClass} ${hasChildren ? 'text-slate-400 font-bold text-center' : ''}`}>{hasChildren ? '-' : p.bnIn}</td>
                        
                        <td 
                            onClick={() => {
                                if (remain > 0) {
                                    setBalanceModal({ isOpen: true, parentItem: p });
                                    setBalDate(new Date().toISOString().split('T')[0]);
                                    setBalQty(remain.toString());
                                    setBalGrn(''); setBalBnIn('');
                                }
                            }}
                            className={`${tdClass} text-right font-black ${remain > 0 ? 'text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline hover:text-emerald-700' : 'text-slate-600 dark:text-slate-400'}`}
                            title={remain > 0 ? "Click to add remaining quantity" : ""}
                        >
                            {totalReceived} {/* මෙහි මුළු එකතුව පෙන්වයි */}
                        </td>
                        
                        <td className={`${tdClass} text-right font-bold ${remain > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-600'}`}>
                            {remain === 0 ? <span className="text-emerald-500 flex justify-end items-center gap-1"><Check size={12}/>0</span> : remain}
                        </td>
                        <td className="px-2 py-1 text-center sticky right-0 bg-white dark:bg-[#0B1121] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleTriggerAction('edit', p)} className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"><Edit2 size={12}/></button>
                            <button onClick={() => handleTriggerAction('delete', p)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1 rounded transition-colors"><Trash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>

                      {/* ========================================= */}
                      {/* Expand කළ විට පෙන්වන Sub-deliveries        */}
                      {/* ========================================= */}
                      {isExpanded && hasChildren && (
                        <>
                          {/* 1. මුලින්ම ආව තොගයේ දත්ත */}
                          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/50">
                            <td className={tdClass}><span className="text-slate-500 ml-7 text-[10px] uppercase font-bold flex items-center gap-1">↳ Initial</span></td>
                            <td className={`${tdClass} text-right text-slate-400`}>-</td>
                            <td className={`${tdClass} text-slate-400`}>-</td>
                            <td className={tdClass}>{p.goodReceivedDate}</td>
                            <td className={tdClass}>{p.grn}</td>
                            <td className={tdClass}>{p.bnIn}</td>
                            <td className={`${tdClass} text-right font-bold text-emerald-600/70 dark:text-emerald-400/70`}>{p.value}</td>
                            <td className={`${tdClass} text-right text-slate-400`}>-</td>
                            <td className="px-2 py-1 text-center sticky right-0 bg-slate-50/80 dark:bg-[#0B1121]"></td>
                          </tr>

                          {/* 2. පසුව ආව Balance තොග වල දත්ත */}
                          {children.map(c => (
                            <tr key={c.id} className={`bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${editingId === c.id ? 'ring-2 ring-inset ring-blue-500 bg-blue-50' : ''}`}>
                              <td className={tdClass}><span className="text-slate-500 ml-7 text-[10px] uppercase font-bold flex items-center gap-1">↳ Balance</span></td>
                              <td className={`${tdClass} text-right text-slate-400`}>-</td>
                              <td className={`${tdClass} text-slate-400`}>-</td>
                              <td className={tdClass}>{c.goodReceivedDate}</td>
                              <td className={tdClass}>{c.grn}</td>
                              <td className={tdClass}>{c.bnIn}</td>
                              <td className={`${tdClass} text-right font-bold text-emerald-600/70 dark:text-emerald-400/70`}>{c.value}</td>
                              <td className={`${tdClass} text-right text-slate-400`}>-</td>
                              <td className="px-2 py-1 text-center sticky right-0 bg-slate-50/80 dark:bg-[#0B1121] shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => handleTriggerAction('edit', c)} className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"><Edit2 size={12}/></button>
                                  <button onClick={() => handleTriggerAction('delete', c)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1 rounded transition-colors"><Trash2 size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSaveAndClose} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition-transform active:scale-95 ${StoreTheme.btnPrimary}`}>
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 🛡️ MODALS (Confirm & Add Balance) */}
      {/* ============================================================================ */}
      
      {confirmState.isOpen && (
        <ConfirmModal 
          isOpen={confirmState.isOpen} onClose={() => setConfirmState({ isOpen: false, type: 'delete' })} onConfirm={handleConfirmExecute} 
          title={confirmState.type === 'delete' ? "Delete Record" : "Edit Record"} 
          message={confirmState.type === 'delete' ? "Are you sure you want to delete this record?" : "Are you sure you want to edit this record?"} 
          confirmButtonText={confirmState.type === 'delete' ? "Yes, Delete" : "Yes, Edit"} requireInputWord="confirm"
        />
      )}

      {/* [NEW] Add Balance Modal */}
      {balanceModal.isOpen && balanceModal.parentItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400">Receive Remaining Stock</h3>
              <button onClick={() => setBalanceModal({ isOpen: false, parentItem: null })} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <div className="text-[10px] font-bold text-slate-500 uppercase">PR Number</div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-200">{balanceModal.parentItem.prNumber}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">Pending Quantity</div>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400">{getRowRemain(balanceModal.parentItem)}</div>
              </div>
              
              <div className="space-y-1.5">
                <label className={labelClass}>Received Date</label>
                <input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Received Qty</label>
                <input type="number" value={balQty} onChange={e => setBalQty(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>GRN</label>
                  <input type="text" value={balGrn} onChange={e => setBalGrn(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>BN - IN</label>
                  <input type="text" value={balBnIn} onChange={e => setBalBnIn(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#0B1121] border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setBalanceModal({ isOpen: false, parentItem: null })} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSaveBalance} className={`flex items-center gap-2 px-6 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm active:scale-95 transition-all`}>
                <Plus size={14}/> Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InTransactionModal;