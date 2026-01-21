import React from 'react';
import { Calendar, UserCheck, ChevronDown, Sun, Moon, RefreshCcw } from 'lucide-react';
import { ShiftType } from '../types';

interface Props {
  entryDate: string;
  setEntryDate: (val: string) => void;
  activeShift: ShiftType;
  setActiveShift: (val: ShiftType) => void;
  displaySup: string;
  handleSupervisorChange: (val: string) => void;
  showSwapNotice: boolean;
  handleSwapNow: () => void;
}

const ProductionHeader: React.FC<Props> = ({
  entryDate,
  setEntryDate,
  activeShift,
  setActiveShift,
  displaySup,
  handleSupervisorChange,
  showSwapNotice,
  handleSwapNow
}) => {
  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-1.5 px-4 w-full flex justify-center transition-colors duration-300">
      <div className="flex flex-wrap items-center gap-3 md:gap-6">
        
        {/* 1. DATE PICKER */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm hover:border-indigo-400 transition-colors">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <input 
            type="date" 
            value={entryDate} 
            onChange={(e) => setEntryDate(e.target.value)} 
            className="bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none uppercase text-[10px] md:text-xs w-24 cursor-pointer dark:[color-scheme:dark]" 
          />
        </div>

        {/* 2. SUPERVISOR SELECT */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <UserCheck className={`w-3.5 h-3.5 ${activeShift === 'day' ? 'text-amber-500' : 'text-indigo-500'}`} />
          </div>
          <select 
            value={displaySup} 
            onChange={(e) => handleSupervisorChange(e.target.value)} 
            className="pl-7 pr-6 py-1 h-full text-[10px] md:text-xs font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm focus:border-indigo-500 outline-none appearance-none cursor-pointer min-w-[100px]"
          >
            <option value="Shift-A">Shift-A</option>
            <option value="Shift-B">Shift-B</option>
          </select>
          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* 3. SHIFT TOGGLE */}
        <div className="flex bg-slate-200 dark:bg-slate-950 p-0.5 rounded-lg shadow-inner">
          <button 
            onClick={() => setActiveShift('day')} 
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${activeShift === 'day' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <Sun className="w-3 h-3" /> Day
          </button>
          <button 
            onClick={() => setActiveShift('night')} 
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${activeShift === 'night' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <Moon className="w-3 h-3" /> Night
          </button>
        </div>

        {/* 4. SWAP BUTTON (Conditional) */}
        {showSwapNotice && (
          <button 
            onClick={handleSwapNow} 
            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-md animate-pulse"
          >
            <RefreshCcw className="w-3 h-3" /> Swap
          </button>
        )}

      </div>
    </div>
  );
};

export default ProductionHeader;