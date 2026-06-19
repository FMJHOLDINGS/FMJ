import React, { useState, useEffect } from 'react';
import { Warehouse, BarChart3, Settings2, Plus, Edit2, Trash2 } from 'lucide-react';
import StockCategoryView from './StockCategoryView';
import StoreSummary from './StoreSummary';
import { STOCK_TABS, StockCategory } from './StoresTypes';
import { StoresService } from './StoresService';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from './ConfirmModal';

type StoresMainTab = 'MANAGEMENT' | 'SUMMARY';

const StoresTab: React.FC = () => {
  // --- STATES ---
  const { userData } = useAuth();
  const factoryId = userData?.collectionName;

  const [activeMainTab, setActiveMainTab] = useState<StoresMainTab>('MANAGEMENT');
  const [activeSubTab, setActiveSubTab] = useState<StockCategory>('PREFORMS');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // --- DYNAMIC TABS STATES ---
  const [tabs, setTabs] = useState<{id: string, label: string}[]>(STOCK_TABS);
  const [isEditingTabs, setIsEditingTabs] = useState(false);
  const [newTabModal, setNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, tabId: string | null}>({isOpen: false, tabId: null});

  // 1. Fetch Dynamic Tabs from Server
  useEffect(() => {
    if (!factoryId) return;
    StoresService.fetchCategories(factoryId).then(fetchedTabs => {
      if (fetchedTabs && fetchedTabs.length > 0) {
        setTabs([...STOCK_TABS, ...fetchedTabs]);
      }
    });
  }, [factoryId]);

  // 2. Add New Tab
  const handleAddTab = async () => {
    if (!factoryId || !newTabName.trim()) return;
    const id = newTabName.trim().toUpperCase().replace(/\s+/g, '_');
    const newTab = { id, label: newTabName.trim() };

    if (tabs.some(t => t.id === id)) { alert("This tab already exists!"); return; }

    const updatedDynamicTabs = tabs.filter(t => t.id !== 'PREFORMS');
    updatedDynamicTabs.push(newTab);

    await StoresService.saveCategories(factoryId, updatedDynamicTabs);
    setTabs([...STOCK_TABS, ...updatedDynamicTabs]);
    setNewTabName('');
    setNewTabModal(false);
  };

  // 3. Delete Entire Tab & Deep Delete Data
  const handleConfirmDeleteTab = async () => {
    if (!factoryId || !deleteModal.tabId) return;
    const idToDelete = deleteModal.tabId;

    // Firebase එකෙන් සියලුම දත්ත මකා දැමීම
    await StoresService.deleteCategoryAndData(factoryId, idToDelete);

    // UI එක යාවත්කාලීන කිරීම
    const updatedDynamicTabs = tabs.filter(t => t.id !== 'PREFORMS' && t.id !== idToDelete);
    setTabs([...STOCK_TABS, ...updatedDynamicTabs]);

    if (activeSubTab === idToDelete) {
        setActiveSubTab('PREFORMS'); // මකපු ටැබ් එකේ හිටියා නම් මුල් ටැබ් එකට යවයි
    }
    setDeleteModal({isOpen: false, tabId: null});
    setIsEditingTabs(false);
  };

  return (
    <div className="flex flex-col h-full p-2 md:p-4 animate-fade-in bg-[#FAFAFA] dark:bg-[#020617]">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 bg-white dark:bg-[#0B1121] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">

        {/* TITLE & ICON */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md">
            <Warehouse size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white leading-none">Stores Control</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Inventory System</p>
          </div>
        </div>

        {/* CATEGORY TABS (Dynamic & Scrollable) */}
        {activeMainTab === 'MANAGEMENT' && (
          <div className="flex-1 overflow-x-auto custom-scrollbar mx-2 flex items-center gap-2">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <div key={tab.id} className="relative group flex items-center">
                    <button
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        activeSubTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${isEditingTabs && tab.id !== 'PREFORMS' ? 'pr-8' : ''}`} // [UPDATE]
                    >
                      {tab.label}
                    </button>

                    {/* Delete Icon (Preforms එකට හැර අනිත් ඒවට පෙන්වයි) */}
                    {isEditingTabs && tab.id !== 'PREFORMS' && ( // [UPDATE]
                      <button
                          onClick={() => setDeleteModal({ isOpen: true, tabId: tab.id })}
                          className="absolute right-1 p-1 bg-rose-100 text-rose-600 rounded hover:bg-rose-600 hover:text-white transition-colors"
                      >
                          <Trash2 size={10} />
                      </button>
                    )}

                    
                </div>
              ))}
            </div>

            {/* ADD & EDIT CONTROLS */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                <button
                    onClick={() => setNewTabModal(true)}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Add New Category Tab"
                >
                    <Plus size={14} strokeWidth={3} />
                </button>
                <button
                    onClick={() => setIsEditingTabs(!isEditingTabs)}
                    className={`p-1.5 rounded-lg transition-colors ${isEditingTabs ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
                    title="Edit Tabs"
                >
                    <Edit2 size={14} />
                </button>
            </div>
          </div>
        )}

        {/* RIGHT SIDE CONTROLS */}
        <div className="flex items-center gap-3 shrink-0">
          {activeMainTab === 'MANAGEMENT' && (
             <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 rounded-lg px-2 border border-slate-200 dark:border-slate-700">
               <input
                 type="month"
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(e.target.value)}
                 className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300 py-1.5 cursor-pointer"
               />
             </div>
          )}
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveMainTab('MANAGEMENT')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMainTab === 'MANAGEMENT' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}>
              <Settings2 size={14} /> Manage
            </button>
            <button onClick={() => setActiveMainTab('SUMMARY')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMainTab === 'SUMMARY' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500'}`}>
              <BarChart3 size={14} /> Summary
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#0B1121]">
        {activeMainTab === 'MANAGEMENT' ? (
          <StockCategoryView
             category={activeSubTab}
             categoryName={tabs.find(t => t.id === activeSubTab)?.label || ''}
             selectedMonth={selectedMonth}
          />
        ) : (
          <StoreSummary />
        )}
      </div>

      {/* --- MODALS --- */}

      {/* NEW TAB MODAL */}
      {newTabModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xs shadow-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white mb-3">Add New Category</h3>
                  <input
                      type="text"
                      value={newTabName}
                      onChange={(e) => setNewTabName(e.target.value)}
                      placeholder="e.g. Chemicals"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 mb-4"
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setNewTabModal(false)} className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                      <button onClick={handleAddTab} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Add Tab</button>
                  </div>
              </div>
          </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteModal.isOpen && (
          <ConfirmModal
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal({ isOpen: false, tabId: null })}
            onConfirm={handleConfirmDeleteTab}
            title="Delete Entire Category"
            message={`Are you sure you want to completely delete this category? ALL master data and monthly transactions under this category will be permanently deleted from the database. This action cannot be undone.`}
            confirmButtonText="Yes, Delete All Data"
            requireInputWord="confirm"
          />
      )}

    </div>
  );
};
export default StoresTab;