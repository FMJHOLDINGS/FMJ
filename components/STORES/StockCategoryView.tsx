
import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'; // [NEW] Refresh Icon
import { StockItem, StockCategory, TransactionItem } from './StoresTypes';
import { StoreTheme } from './StoreConfig';
import { useStoresManager } from './useStoresManager';
import AddEditItemModal from './AddEditItemModal';
import ConfirmModal from './ConfirmModal';

import InTransactionModal from './InTransactionModal';
import OutTransactionModal from './OutTransactionModal';
import ReturnTransactionModal from './ReturnTransactionModal';

// ============================================================================
// 1. MEMOIZED ROW (Re-rendering වළක්වා Hardware Performance වැඩි කරයි)
// ============================================================================
const MemoizedRow = React.memo(({ item, index, onEdit, onDelete, onOpenTrans }: { 
  item: StockItem; index: number; 
  onEdit: (item: StockItem) => void; onDelete: (id: string) => void; onOpenTrans: (item: StockItem, type: 'IN'|'OUT'|'RETURN') => void 
}) => {
  // Calculations
  const sumIn = item.inTrans?.reduce((a, b) => a + b.value, 0) || 0;
  const sumOut = item.outTrans?.reduce((a, b) => a + b.value, 0) || 0;
  const sumReturn = item.returnTrans?.reduce((a, b) => a + b.value, 0) || 0;
  const closingStock = (item.openStock + sumIn) - sumOut + sumReturn;
  const balance = closingStock - (item.reorderLevel || 0);
  
  const bgClass = index % 2 === 0 ? StoreTheme.rowBgEven : StoreTheme.rowBgOdd;

  return (
    <tr className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${bgClass} ${StoreTheme.rowHover}`}>
      <td className="p-2 text-[11px] font-medium text-center text-slate-500 dark:text-slate-400">{index + 1}</td>
      <td className="p-2 text-[11px] font-bold text-slate-800 dark:text-slate-200">{item.item}</td>
      <td className="p-2 text-[11px] text-slate-600 dark:text-slate-400">{item.weight}</td>
      <td className="p-2 text-[11px] text-right font-semibold text-slate-700 dark:text-slate-300">{item.openStock}</td>
      
      {/* Clickable Trans Cells */}
      <td onClick={() => onOpenTrans(item, 'IN')} className={`p-2 text-[11px] text-right font-bold cursor-pointer transition-colors hover:opacity-80 border-x border-transparent ${StoreTheme.colInBg} ${StoreTheme.colInText}`}>{sumIn}</td>
      <td onClick={() => onOpenTrans(item, 'OUT')} className={`p-2 text-[11px] text-right font-bold cursor-pointer transition-colors hover:opacity-80 border-r border-transparent ${StoreTheme.colOutBg} ${StoreTheme.colOutText}`}>{sumOut}</td>
      <td onClick={() => onOpenTrans(item, 'RETURN')} className={`p-2 text-[11px] text-right font-bold cursor-pointer transition-colors hover:opacity-80 border-r border-slate-100 dark:border-slate-800/50 ${StoreTheme.colReturnBg} ${StoreTheme.colReturnText}`}>{sumReturn}</td>
      
      <td className={`p-2 text-[11px] text-right font-black ${StoreTheme.colClosingBg} ${StoreTheme.colClosingText}`}>{closingStock}</td>
      <td className="p-2 text-[11px] text-right font-bold text-purple-600 dark:text-purple-400">{item.reorderLevel || 0}</td>
      <td className={`p-2 text-[11px] text-right font-black ${balance < 0 ? 'text-rose-600 dark:text-rose-500 bg-rose-500/10' : 'text-slate-700 dark:text-slate-300'}`}>{balance}</td>
      
      {/* Actions */}
      <td className="p-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => onEdit(item)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors"><Edit2 size={12}/></button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-rose-100 hover:text-rose-600 transition-colors"><Trash2 size={12}/></button>
        </div>
      </td>
    </tr>
  );
});

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
interface Props { category: StockCategory; categoryName: string; selectedMonth: string; }

const StockCategoryView: React.FC<Props> = ({ category, categoryName, selectedMonth }) => {
  
  // --- STATE FROM HOOK ---
const { stockItems, loading, error, saveStockData, fetchFromServer, syncFromPreviousMonth } = useStoresManager(category, selectedMonth);



  // --- MODAL STATES ---
  const [transModal, setTransModal] = useState<{isOpen: boolean, item?: StockItem, type?: 'IN'|'OUT'|'RETURN'}>({ isOpen: false });
  const [addEditModal, setAddEditModal] = useState<{isOpen: boolean, data?: StockItem | null}>({ isOpen: false, data: null });
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id?: string}>({ isOpen: false });

  const [syncConfirmModal, setSyncConfirmModal] = useState(false);

  // --- EVENT HANDLERS (useCallback මගින් Re-renders වළක්වයි) ---
  const handleEdit = useCallback((item: StockItem) => setAddEditModal({ isOpen: true, data: item }), []);
  const handleDeleteTrigger = useCallback((id: string) => setConfirmModal({ isOpen: true, id }), []);
  const handleOpenTrans = useCallback((item: StockItem, type: 'IN'|'OUT'|'RETURN') => setTransModal({ isOpen: true, item, type }), []);

  const handleSaveItem = async (data: Partial<StockItem>) => {
    let newItems;
    if (addEditModal.data) newItems = stockItems.map(i => i.id === addEditModal.data!.id ? { ...i, ...data } : i);
    else newItems = [...stockItems, { id: Date.now().toString(), item: data.item!, weight: data.weight!, openStock: data.openStock!, reorderLevel: data.reorderLevel!, inTrans: [], outTrans: [], returnTrans: [] }];
    await saveStockData(newItems);
  };

  const handleConfirmDelete = async () => {
    if (confirmModal.id) await saveStockData(stockItems.filter(i => i.id !== confirmModal.id));
  };

  const handleSaveTrans = async (newTrans: TransactionItem[]) => {
    const newItems = stockItems.map(i => {
      if (i.id === transModal.item?.id) {
        if (transModal.type === 'IN') return { ...i, inTrans: newTrans };
        if (transModal.type === 'OUT') return { ...i, outTrans: newTrans };
        if (transModal.type === 'RETURN') return { ...i, returnTrans: newTrans };
      }
      return i;
    });
    await saveStockData(newItems);
  };

  // --- RENDER LOADERS ---
  if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 text-rose-500">Error loading data: {error}</div>;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B1121]">
      



      {/* ========================================= */}
      {/* 4.3. VIEW HEADER & CONTROLS              */}
      {/* ========================================= */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/30 dark:bg-[#020617]/50">
        
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            {categoryName} DATABASE 
            <span className="text-[10px] ml-1 font-semibold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selectedMonth}</span>
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh/Sync Button */}
          <button onClick={fetchFromServer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
          
          <button onClick={() => setAddEditModal({ isOpen: true, data: null })} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold active:scale-95 transition-all ${StoreTheme.btnPrimary}`}>
            <Plus size={14} /> ADD ROW
          </button>
        </div>
      </div>





      {/* ========================================= */}
      {/* 4. OPTIMIZED TABLE CONTAINER           */}
      {/* ========================================= */}
      <div className="flex-1 overflow-auto custom-scrollbar relative transform-gpu">
        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
          <thead className={`sticky top-0 z-10 text-[9px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-800 shadow-sm ${StoreTheme.tableHeaderBg} ${StoreTheme.tableHeaderText}`}>
            <tr>
              <th className="p-3 text-center w-10">No</th><th className="p-3">Item</th><th className="p-3">Weight</th>


              {/* [NEW] Open Stock Column Header with Minimal Sync Icon */}
              <th className="p-3 text-right group">
                <div className="flex items-center justify-end gap-1.5">
                  <span>Open Stock</span>
                  <button 
                    onClick={() => setSyncConfirmModal(true)} // [UPDATE] Browser alert එක වෙනුවට Modal එක Open කරයි
                    className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-all active:scale-95"
                    title="Sync Open Stock from Previous Month"
                  >
                    <RefreshCw size={12} strokeWidth={3} />
                  </button>
                </div>
              </th>


              <th className={`p-3 text-right ${StoreTheme.colInBg} ${StoreTheme.colInText}`}>In</th>
              <th className={`p-3 text-right ${StoreTheme.colOutBg} ${StoreTheme.colOutText}`}>Out</th>
              <th className={`p-3 text-right border-r border-slate-200 dark:border-slate-800 ${StoreTheme.colReturnBg} ${StoreTheme.colReturnText}`}>Return</th>
              <th className={`p-3 text-right ${StoreTheme.colClosingBg} ${StoreTheme.colClosingText}`}>Closing Stock</th>
              <th className="p-3 text-right text-purple-600 dark:text-purple-500">Reorder Lvl</th><th className="p-3 text-right">Balance</th><th className="p-3 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {stockItems.map((item, index) => (
              <MemoizedRow key={item.id} item={item} index={index} onEdit={handleEdit} onDelete={handleDeleteTrigger} onOpenTrans={handleOpenTrans} />
            ))}
          </tbody>
        </table>
      </div>

      
      
{/* ========================================= */}
      {/* 5. MODALS RENDER                       */}
      {/* ========================================= */}
      
      
      {transModal.isOpen && transModal.item && transModal.type === 'IN' && (
        <InTransactionModal 
          isOpen={transModal.isOpen} 
          onClose={() => setTransModal({ isOpen: false })} 
          title={transModal.item.item} 
          transactions={transModal.item.inTrans} 
          onSave={handleSaveTrans} 
        />
      )}

      {transModal.isOpen && transModal.item && transModal.type === 'OUT' && (
        <OutTransactionModal 
          isOpen={transModal.isOpen} 
          onClose={() => setTransModal({ isOpen: false })} 
          title={transModal.item.item} 
          transactions={transModal.item.outTrans} 
          onSave={handleSaveTrans} 
        />
      )}

      {transModal.isOpen && transModal.item && transModal.type === 'RETURN' && (
        <ReturnTransactionModal 
          isOpen={transModal.isOpen} 
          onClose={() => setTransModal({ isOpen: false })} 
          title={transModal.item.item} 
          transactions={transModal.item.returnTrans} 
          onSave={handleSaveTrans} 
        />
      )}

    



      {addEditModal.isOpen && <AddEditItemModal isOpen={addEditModal.isOpen} onClose={() => setAddEditModal({ isOpen: false, data: null })} onSave={handleSaveItem} editData={addEditModal.data} />}
      {confirmModal.isOpen && <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false })} onConfirm={handleConfirmDelete} title="Delete Item" message="Are you sure you want to delete this row? This cannot be undone." />}
    
    
      {syncConfirmModal && (
        <ConfirmModal 
          isOpen={syncConfirmModal} 
          onClose={() => setSyncConfirmModal(false)} 
          onConfirm={syncFromPreviousMonth} 
          title="Sync Open Stock" 
          message="Are you sure you want to update the open stock from the previous month? Current values will be overwritten." 
          confirmButtonText="Yes, Sync Data"
          requireInputWord="confirm" // [NEW] "confirm" කියා Type කළ යුතු බව පවසයි
        />
      )}


    </div>
  );
};
export default StockCategoryView;