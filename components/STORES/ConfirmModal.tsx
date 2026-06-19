import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string; // [NEW] බොත්තමේ නම වෙනස් කිරීමට
  requireInputWord?: string;  // [NEW] Type කළ යුතු වචනය (උදා: "confirm")
}

const ConfirmModal: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmButtonText = "Yes, Delete", // Default අගය
  requireInputWord 
}) => {
  const [inputValue, setInputValue] = useState('');

  // Modal එක Open/Close වෙද්දී Input එක හිස් කරයි
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Type කළ වචනය හරියටම සමානදැයි බලයි (අකුරු වල Capital/Simple බැලීමක් නැත)
  const isConfirmDisabled = requireInputWord ? inputValue.toLowerCase() !== requireInputWord.toLowerCase() : false;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform scale-100">
        <div className="p-5 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
            
            {/* [NEW] වචනයක් Type කිරීමට අවශ්‍ය නම් පමණක් මෙය පෙන්වයි */}
            {requireInputWord && (
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Type <span className="text-rose-600 dark:text-rose-400 font-black">"{requireInputWord}"</span> to confirm
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  placeholder={requireInputWord}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          <button 
            disabled={isConfirmDisabled}
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-md transition-all ${isConfirmDisabled ? 'bg-rose-400 dark:bg-rose-800/50 cursor-not-allowed opacity-50' : 'bg-rose-600 hover:bg-rose-700 active:scale-95'}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;