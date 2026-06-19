import React, { useState } from 'react';
import { CalendarDays, Database, Factory, Layout, FileSpreadsheet, PieChart } from 'lucide-react';

import PlanIMView from './PlanIMView';
import ProductDB from './ProductDB';
import DailyPlan from './DailyPlanView';
import { usePlanningManager } from './usePlanningManager';
import PlanningSummary from './PlanningSummary';


import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { exportToExcelAdvanced } from './ExportExcelUtils';
import { useAuth } from '../../context/AuthContext';
import { PlanningService } from './PlanningService';
import { Loader2, X } from 'lucide-react';

// TABS Config
const TABS = [
  { id: 'DAILY_PLAN', label: 'Daily Plan', icon: CalendarDays, color: 'text-emerald-500' },
  { id: 'IM_PLAN', label: 'IM Plan', icon: Layout, color: 'text-indigo-500' },
  { id: 'BM_PLAN', label: 'BM Plan', icon: Factory, color: 'text-amber-500' },
  { id: 'PRODUCT_DB', label: 'Product DB', icon: Database, color: 'text-rose-500' },
  { id: 'SUMMARY', label: 'Summary', icon: PieChart, color: 'text-purple-500' },
];

const PlanningTab: React.FC = () => {
  const { userData } = useAuth();
  
  // 🟢 1. PERMISSION CHECKING
  const tabPermission = userData?.permissions?.PLANNING || 'none';
  const isReadOnly = tabPermission === 'view';

  const [activeTab, setActiveTab] = useState('DAILY_PLAN');
  const [isExporting, setIsExporting] = useState(false);

  // 🟢 2. 'none' නම් මුකුත් පෙන්වන්නේ නෑ, Access Denied පෙන්වනවා
  if (tabPermission === 'none') {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 dark:bg-[#020617]">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl flex flex-col items-center text-center border border-rose-100 dark:border-rose-900/30">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-6">
                      <X className="w-10 h-10 text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest">Access Denied</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mt-2">You don't have permission to access this section.</p>
              </div>
          </div>
      );
  }

  // Active Plans 
  const { plans: imPlans } = usePlanningManager('IM');
  const { plans: bmPlans } = usePlanningManager('BM');

  
  // 🟢 EXPORT LOGIC 
  const handleExport = async () => {
    const factoryId = userData?.collectionName;
    if (!factoryId) return alert("Factory ID not found!");
    
    setIsExporting(true);
    try {
        const date = new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // 1. Completed Jobs ලබා ගැනීම
        const imComp = await PlanningService.fetchCompletedJobsByMonth(factoryId, 'IM', monthKey);
        const bmComp = await PlanningService.fetchCompletedJobsByMonth(factoryId, 'BM', monthKey);

        // 2. අද දවසේ Daily Plan එක ලබා ගැනීම
        const todayStr = date.toISOString().split('T')[0];
        const dailyData = await PlanningService.getDailyPlan(factoryId, todayStr) || {};

        // 🟢 3. Product DB එක ලබා ගැනීම (IM සහ BM වෙන වෙනම)
        const imProdSnap = await getDoc(doc(db, `PLANNING_${factoryId}`, 'PRODUCT_IM'));
        const bmProdSnap = await getDoc(doc(db, `PLANNING_${factoryId}`, 'PRODUCT_BM'));
        
        const imProducts = imProdSnap.exists() ? imProdSnap.data().items || [] : [];
        const bmProducts = bmProdSnap.exists() ? bmProdSnap.data().items || [] : [];

        // 4. Excel ෆයිල් නම සැකසීම
        const formattedFactoryName = factoryId.toUpperCase();
        const filename = `${formattedFactoryName}-PLANNING-${todayStr}.xlsx`;

        // 5. Excel එක සාදා Download කිරීම
        await exportToExcelAdvanced(
            imPlans, bmPlans, 
            imComp, bmComp, 
            dailyData, 
            imProducts, bmProducts, // 🟢 වෙනස: IM සහ BM වෙන වෙනම යැවීම
            filename
        );
    } catch (error) {
        console.error("Export Error: ", error);
        alert("Failed to export Excel. Please try again.");
    } finally {
        setIsExporting(false);
    }
};




  return (
    <div className="flex flex-col h-full w-full gap-4 overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-[#0B1121] p-2 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar whitespace-nowrap px-1 py-1">
          {TABS.map((tab) => {
             const Icon = tab.icon;
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0
                   ${isActive 
                     ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-lg transform scale-105' 
                     : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                   }`}
               >
                 <Icon size={14} className={isActive ? 'text-white' : tab.color} />
                 <span>{tab.label}</span>
               </button>
             );
          })}
        </div>

        {/* 🟢 EXPORT EXCEL BUTTON */}
        <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all shrink-0 ml-2"
        >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>
      </div>

     

      {/* CONTENT AREA */}
      <div className="flex-1 bg-transparent rounded-[1.5rem] overflow-hidden relative">
      <div className="h-full w-full overflow-hidden"> 
            
            {activeTab === 'DAILY_PLAN' && <DailyPlan readOnly={isReadOnly} />}
            {activeTab === 'IM_PLAN' && <PlanIMView planType="IM" readOnly={isReadOnly} />}
            {activeTab === 'BM_PLAN' && <PlanIMView planType="BM" readOnly={isReadOnly} />}
            {activeTab === 'PRODUCT_DB' && <ProductDB readOnly={isReadOnly} />}
            {activeTab === 'SUMMARY' && <PlanningSummary readOnly={isReadOnly} />}
        </div>
      </div>

    </div>
  );
};

export default PlanningTab;