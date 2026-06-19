// ============================================================================
// 🌟 QUALITY TAB (Main Wrapper & Month Picker - FULLY FIXED VERSION)
// ============================================================================
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShieldCheck, BarChart3, PenTool, FileSpreadsheet, ChevronDown, ChevronUp, CheckSquare, Square, Filter, X } from 'lucide-react';
import { AdminConfig, DefectEntry } from '../../types';
import QualityDataEntry from './QualityDataEntry';
import QualityAnalysis from './QualityAnalysis';
import { QaService } from './QaService';
import { useAuth } from '../../context/AuthContext';
// Export Functions 
import { generateProductionReport, generateItemReport } from './QalityExcelExport';

interface Props {
  data?: Record<string, any>;
  allData?: Record<string, any>;
  onUpdate: (key: string, data: any) => void;
  adminConfig?: AdminConfig; 
  loadDataForRange?: (start: string, end: string, forceRefresh?: boolean) => void;
}

// 🎨 THEME CONFIGURATION
const THEME = {
    mainBg: "bg-[#F8FAFC] dark:bg-[#020617]",
    headerBg: "bg-white dark:bg-[#0F172A]",
    borderColor: "border-slate-100 dark:border-slate-800",
    tabEntryActive: "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50",
    tabAnalysisActive: "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50",
    tabInactive: "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800",
  };

  const QualityTab: React.FC<Props> = ({ data, allData, onUpdate, adminConfig, loadDataForRange }) => {
    const { userData } = useAuth();
    

    // 🟢 1. PERMISSION CHECKING
    const tabPermission = userData?.permissions?.QUALITY || 'none';
    const isReadOnly = tabPermission === 'view';
  
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
  
    const sourceData = data || allData || {};
    const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'ENTRY'>('ANALYSIS');


  
  // 📅 Month Picker Logic
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { startDate, endDate } = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const start = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-CA');
    const end = new Date(Number(year), Number(month), 0).toLocaleDateString('en-CA');
    return { startDate: start, endDate: end };
  }, [selectedMonth]);

  
  useEffect(() => {
    if (loadDataForRange && startDate && endDate) {
        
        loadDataForRange(startDate, endDate, true); 
    }
}, [startDate, endDate, loadDataForRange]);



  // 🧠 Data Processing
  const processedData = useMemo(() => {
    const rows: any[] = [];
    if (!sourceData || Object.keys(sourceData).length === 0) return [];
    
    Object.keys(sourceData).forEach(key => {
        if (!key.endsWith('_IM') && !key.endsWith('_BM')) return;
        const datePart = key.split('_')[0];
        
        if (datePart >= startDate && datePart <= endDate) {
            const dayData = sourceData[key];
            if(dayData && dayData.rows) {
                dayData.rows.forEach((r: any) => {
                    const qtyTotal = Number(r.achievedQty) || 0;

                    // 🟢 Production Qty එක 0 නම් මේ පේළිය අතහැර දමන්න (මෙය පමණි අලුතින් එක් කළේ)
                    if (qtyTotal === 0) return;

                    const qtyReject = r.qaRejQty !== undefined && r.qaRejQty !== null ? Number(r.qaRejQty) : 0; 
                    const qtyStartup = r.qaStartQty !== undefined && r.qaStartQty !== null ? Number(r.qaStartQty) : 0;
                    
                    const auditQty = (r.defects || []).reduce((s: number, d: DefectEntry) => s + d.qty, 0);
                    
                    const qtyAccept = qtyTotal - qtyReject - qtyStartup;
                    const unitWt = Number(r.unitWeight) || 0;
                    
                    const wgtTotal = (qtyTotal * unitWt) / 1000;
                    const wgtReject = (qtyReject * unitWt) / 1000;
                    const wgtStartup = (qtyStartup * unitWt) / 1000;
                    const wgtAccept = (qtyAccept * unitWt) / 1000;
                    
                    const pctScrap = wgtTotal > 0 ? (wgtReject / wgtTotal) * 100 : 0;
                    const pctStartup = wgtTotal > 0 ? (wgtStartup / wgtTotal) * 100 : 0;
                    const pctAll = wgtTotal > 0 ? ((wgtReject + wgtStartup) / wgtTotal) * 100 : 0;

                    rows.push({
                        // 🟢 dbKey සහ goodQty මෙතැනින් එකතු කර ඇත
                        dbKey: key, 
                        id: r.id, date: datePart, shift: r.shift, machine: r.machine || '-', 
                        product: r.product || '-', unitWeight: unitWt, 
                        goodQty: r.goodQty, 
                        qtyTotal, qtyAccept, wgtTotal, wgtAccept, qtyReject, wgtReject, auditQty,
                        qtyStartup, wgtStartup, pctScrap, pctStartup, pctAll, 
                        type: key.endsWith('_IM') ? 'IM' : 'BM', defects: r.defects || [] 
                    });
                });
            }
        }
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [sourceData, startDate, endDate]);

  const uniqueItems = useMemo(() => Array.from(new Set(processedData.map(r => r.product))).sort(), [processedData]);

  // ==========================================================================
  // 🎯 MULTI-SELECT FILTERS & DATA LOGIC
  // ==========================================================================
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const { imMachines, bmMachines } = useMemo(() => {
      const im = new Set<string>();
      const bm = new Set<string>();
      processedData.forEach(r => {
          if (r.type === 'IM') im.add(r.machine);
          if (r.type === 'BM') bm.add(r.machine);
      });
      return { imMachines: Array.from(im).sort(), bmMachines: Array.from(bm).sort() };
  }, [processedData]);

  const availableProducts = useMemo(() => {
      const filteredForProducts = processedData.filter(r => selectedMachines.length === 0 || selectedMachines.includes(r.machine));
      return Array.from(new Set(filteredForProducts.map(r => r.product))).sort();
  }, [processedData, selectedMachines]);

  const filteredData = useMemo(() => {
      return processedData.filter(r => {
          const matchMachine = selectedMachines.length === 0 || selectedMachines.includes(r.machine);
          const matchProduct = selectedProducts.length === 0 || selectedProducts.includes(r.product);
          return matchMachine && matchProduct;
      });
  }, [processedData, selectedMachines, selectedProducts]);

 // 4. Export Function එක
 const handleExport = async () => {
    if (filteredData.length === 0) { alert("No data available to export."); return; }
    
    // 🟢 Machine එකෙන් හෝ Product එකෙන් Filter කර තිබේදැයි පරීක්ෂා කිරීම
    const isFiltered = selectedMachines.length > 0 || selectedProducts.length > 0;
    const extraCats = adminConfig?.breakdownCategories || [];
    
    // isFiltered අගයත් සමඟ ප්‍රධාන Excel Export එකට යැවීම
    await generateProductionReport(filteredData, startDate, endDate, extraCats, isFiltered);
};

  // 💾 🟢 Save Logic (හරියටම dbKey එක භාවිතා කර ඇත)
  const handleSaveDefects = async (row: any, newDefects: DefectEntry[]) => {
      const dbKey = row.dbKey;
      const dayData = sourceData[dbKey];
      
      if (dayData) {
          const updatedRows = dayData.rows.map((r: any) => r.id === row.id ? { ...r, defects: newDefects } : r);
          onUpdate(dbKey, { ...dayData, rows: updatedRows });
      }
  };


// 🟢 field parameter එක අලුතින් එකතු කර ඇත (default අගය 'goodQty' වේ)
const handleUpdateGoodQty = async (row: any, newValue: number | null, field: string = 'goodQty') => {
    const dbKey = row.dbKey;
    const dayData = sourceData[dbKey];
    
    if (dayData) {
        const updatedRows = dayData.rows.map((r: any) => {
            if (r.id === row.id) {
                // 🟢 මෙහිදී field නමට අදාළව (උදා: qtyReject හෝ qtyStartup) අගය Save වේ. 
                // ඒ වගේම Rejection/Startup Qty වෙනස් වුණොත්, ඊට අදාළ Weight එකත් අලුතින් හැදෙන්න ඕනේ. (Production එකෙන් ආව වගේ නෙවෙයි, දැන් මේවා independent).
                
                const updatedRow = { ...r, [field]: newValue };
                
                // Weight එක ගණනය කර යාවත්කාලීන කිරීම
                if (field === 'qtyReject' || field === 'qtyStartup') {
                    const unitWt = Number(updatedRow.unitWeight) || 0;
                    if (field === 'qtyReject') {
                        // 🟢 Machine එකේ 'rejectionQty' එකට බලපෑමක් නොවන සේ වෙනමම සේව් කරයි
                        updatedRow.qaRejQty = newValue; 
                    }
                    if (field === 'qtyStartup') {
                        // 🟢 Machine එකේ 'startupQty' එකට බලපෑමක් නොවන සේ වෙනමම සේව් කරයි
                        updatedRow.qaStartQty = newValue; 
                    }
                }
                return updatedRow;
            }
            return r;
        });
        onUpdate(dbKey, { ...dayData, rows: updatedRows });
    }
};


  const availableCategories = useMemo(() => {
      const defaults = ["OTHER"];
      const fromConfig = (adminConfig as any)?.qaCategories || [];
      return Array.from(new Set([...defaults, ...fromConfig])).sort(); 
  }, [adminConfig]);

  return (
    <div className={`w-full h-full ${THEME.mainBg} p-2 overflow-hidden flex flex-col transition-colors duration-300 relative`}>
       
       {/* ================= HEADER & CONTROLS ================= */}
       <div className={`${THEME.headerBg} p-3 rounded-2xl shadow-md border ${THEME.borderColor} mb-2 flex-shrink-0 transform-gpu z-50`}>
         <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
           
           {/* Logo & Title */}
           <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
             <div className="flex items-center gap-3">
                 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md"><ShieldCheck className="w-5 h-5 text-white"/></div>
                 <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Quality Console</h2>
             </div>
             
             {/* TABS (Mobile) */}
             <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 lg:hidden">
                <button onClick={() => setActiveTab('ANALYSIS')} className={`px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? THEME.tabAnalysisActive : THEME.tabInactive}`}><BarChart3 size={14}/> Analysis</button>
                <button onClick={() => setActiveTab('ENTRY')} className={`px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ENTRY' ? THEME.tabEntryActive : THEME.tabInactive}`}><PenTool size={14}/> Entry</button>
             </div>
           </div>
           
           {/* Filters & Actions */}
           <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
             
             {/* 📅 Month Picker */}
             <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-sm">
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer dark:[color-scheme:dark]" />
             </div>

             <GroupedMachineSelect imMachines={imMachines} bmMachines={bmMachines} selected={selectedMachines} onChange={setSelectedMachines} />
             <ProductMultiSelect options={availableProducts} selected={selectedProducts} onChange={setSelectedProducts} />

             {/* Export Button */}
             <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md active:scale-95">
                 <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
             </button>

             {/* TABS (Desktop) */}
             <div className="hidden lg:flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 ml-2">
                 <button onClick={() => setActiveTab('ANALYSIS')} className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? THEME.tabAnalysisActive : THEME.tabInactive}`}><BarChart3 size={14}/> Analysis</button>
                 <button onClick={() => setActiveTab('ENTRY')} className={`px-4 py-1.5 rounded-md text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'ENTRY' ? THEME.tabEntryActive : THEME.tabInactive}`}><PenTool size={14}/> Data Entry</button>
             </div>

           </div>
         </div>
       </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex-1 overflow-hidden relative z-0">
            {activeTab === 'ENTRY' ? (
                // 🟢 onUpdateGoodQty Component එකට Pass කර ඇත
                <QualityDataEntry 
                    data={filteredData} 
                    onSaveDefects={handleSaveDefects} 
                    availableCategories={availableCategories} 
                    onUpdateGoodQty={handleUpdateGoodQty} 
                    readOnly={isReadOnly}
                />
            ) : (
                <QualityAnalysis data={filteredData} uniqueItems={availableProducts} startDate={startDate} endDate={endDate} adminConfig={adminConfig} />
            )}
        </div>
        
    </div>
  );
};

export default QualityTab;

// ============================================================================
// 🧩 CUSTOM MULTI-SELECT COMPONENTS (නොවෙනස්ව)
// ============================================================================

const GroupedMachineSelect = ({ imMachines, bmMachines, selected, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<'IM' | 'BM' | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleMachine = (mc: string) => {
        onChange(selected.includes(mc) ? selected.filter((m: string) => m !== mc) : [...selected, mc]);
    };

    const toggleGroup = (groupMcs: string[]) => {
        const allSelected = groupMcs.every(mc => selected.includes(mc));
        if (allSelected) {
            onChange(selected.filter((mc: string) => !groupMcs.includes(mc))); 
        } else {
            const newSelected = new Set([...selected, ...groupMcs]); 
            onChange(Array.from(newSelected));
        }
    };

    const renderGroup = (title: 'IM' | 'BM', machines: string[]) => {
        const allSelected = machines.length > 0 && machines.every(mc => selected.includes(mc));
        const someSelected = machines.some(mc => selected.includes(mc));
        const isExpanded = expandedGroup === title;

        return (
            <div className="mb-2 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2 flex-1" onClick={() => toggleGroup(machines)}>
                        {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className={`w-4 h-4 ${someSelected ? 'text-indigo-300' : 'text-slate-300'}`} />}
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{title} Machines</span>
                    </div>
                    <button onClick={() => setExpandedGroup(isExpanded ? null : title)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500"/> : <ChevronDown className="w-4 h-4 text-slate-500"/>}
                    </button>
                </div>
                {isExpanded && (
                    <div className="p-2 grid grid-cols-2 gap-2 bg-white dark:bg-slate-950">
                        {machines.map(mc => (
                            <div key={mc} onClick={() => toggleMachine(mc)} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-[10px] font-bold transition-colors ${selected.includes(mc) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                                {selected.includes(mc) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-50" />}
                                <span className="truncate">{mc}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="relative min-w-[160px] z-50" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-white transition-all hover:bg-slate-200 dark:hover:bg-slate-800`}>
                <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="truncate">{selected.length === 0 ? 'All Machines' : `${selected.length} Selected`}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-full min-w-[260px] p-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">Filter Machines</span>
                        {selected.length > 0 && <button onClick={() => onChange([])} className="text-[10px] font-bold text-rose-500 hover:underline">Clear</button>}
                    </div>
                    {renderGroup('IM', imMachines)}
                    {renderGroup('BM', bmMachines)}
                </div>
            )}
        </div>
    );
};

const ProductMultiSelect = ({ options, selected, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleProduct = (prod: string) => {
        onChange(selected.includes(prod) ? selected.filter((p: string) => p !== prod) : [...selected, prod]);
    };

    return (
        <div className="relative min-w-[180px] z-40" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-white transition-all hover:bg-slate-200 dark:hover:bg-slate-800`}>
                <div className="flex items-center gap-2 truncate">
                    <Filter className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate">{selected.length === 0 ? 'All Products' : `${selected.length} Selected`}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-full min-w-[220px] max-h-64 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1">
                    <div className="flex justify-between items-center mb-2 px-2 pt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Products</span>
                        {selected.length > 0 && <button onClick={() => onChange([])} className="text-[10px] font-bold text-rose-500 hover:underline">Clear</button>}
                    </div>
                    {options.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">No products found</div>
                    ) : (
                        options.map((opt: string) => (
                            <div key={opt} onClick={() => toggleProduct(opt)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-[11px] font-bold transition-colors ${selected.includes(opt) ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                {selected.includes(opt) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 opacity-50" />}
                                <span className="truncate">{opt}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};