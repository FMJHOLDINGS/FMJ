import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StockItem } from './StoresTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<StockItem>) => void;
  editData?: StockItem | null;
}

const AddEditItemModal: React.FC<Props> = ({ isOpen, onClose, onSave, editData }) => {
  const [formData, setFormData] = useState({
    item: '', weight: '', openStock: 0, reorderLevel: 0
  });

  useEffect(() => {
    if (editData) setFormData({ item: editData.item, weight: editData.weight, openStock: editData.openStock, reorderLevel: editData.reorderLevel });
    else setFormData({ item: '', weight: '', openStock: 0, reorderLevel: 0 });
  }, [editData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">{editData ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Item Name</label>
            <input type="text" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500" placeholder="e.g. Sample Bag" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Weight / Unit</label>
            <input type="text" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500" placeholder="e.g. 50kg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Open Stock</label>
              <input type="number" value={formData.openStock} onChange={e => setFormData({...formData, openStock: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Reorder Level</label>
              <input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
          <button onClick={() => { onSave(formData); onClose(); }} className="px-4 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md text-sm">Save Data</button>
        </div>
      </div>
    </div>
  );
};

export default AddEditItemModal;