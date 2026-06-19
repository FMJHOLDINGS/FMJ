import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProductionRow } from '../types';
import { calculateMetrics } from '../utils';
import { Trash2, ChevronDown, AlertTriangle, Zap, Package, CheckSquare, Square, X } from 'lucide-react';

// ============================================================================
// 🎨 THEME CONFIGURATION
// ============================================================================
const THEME = {
  card: "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800",
  timeInput: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white",
  machineSelect: "bg-indigo-100 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
  specInputDefault: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100",
  specInputHighlight: "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
  btnDelete: "text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20",
  statusGross: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white",
  bdDown: "bg-rose-500 text-white border-rose-400 hover:bg-rose-600",
  effLoss: "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300",
  metricBox: "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800",
  metricDivider: "bg-slate-200 dark:bg-slate-700",
  metricPlanTxt: "text-slate-700 dark:text-white",
  metricDoneTxt: "text-emerald-600 dark:text-emerald-400",
};



const formatVal = (val: any) => {
  // 1. ලැබෙන ඕනෑම අගයක් අනිවාර්යයෙන්ම Number එකක් බවට හරවනවා
  const num = Number(val);

  // 2. අගය Number එකක් නෙමෙයි නම් (NaN) හෝ අගයක් නැත්නම් '0' ලබා දෙනවා
  if (val === undefined || val === null || isNaN(num)) return '0';

  // 3. දැන් num කියන්නේ අනිවාර්යයෙන්ම Number එකක් නිසා ආරක්ෂිතව toFixed පාවිච්චි කළ හැකියි
  return Number(num.toFixed(1)).toString();
};




interface Props {
  rows: ProductionRow[];
  onUpdateRow: (id: string, updates: Partial<ProductionRow>) => void;
  onDeleteRow: (id: string) => void;
  onOpenBreakdowns: (id: string) => void;
  products?: any[]; 
  isFormMode?: boolean;
  activeJobs?: any[];
  readOnly?: boolean;
}

// ============================================================================
// 🧩 REUSABLE SUB-COMPONENTS
// ============================================================================

const TableInput = ({ value, onSave, placeholder, className = '', type = 'text', label, icon: Icon, readOnly = false, colorClass = THEME.specInputDefault }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isEditing) setLocalValue(value === 0 ? '' : formatVal(value)); }, [value, isEditing]);

  const commitChanges = () => {
    if (readOnly) return;
    setIsEditing(false);
    let finalVal = localValue;
    if (type === 'number') {
      if (!finalVal || finalVal === '' || finalVal === '.' || finalVal === '-') finalVal = '0';
      const numVal = parseFloat(finalVal);
      if (numVal !== value) onSave(numVal);
    } else {
      if (finalVal !== value) onSave(finalVal);
    }
  };

  const hasLabel = Boolean(label || Icon);

  return (
    <div onClick={() => { if (!readOnly) setIsEditing(true); }} className={`relative group/input h-10 rounded-xl border-2 overflow-hidden transition-colors flex flex-col justify-center shrink-0 ${colorClass} ${className} ${!readOnly && !isEditing ? 'cursor-text hover:border-indigo-400' : ''}`}>
      <div className="absolute top-[2px] left-2 flex items-center gap-1 z-10 pointer-events-none">
        {Icon && <Icon size={9} strokeWidth={3} className="opacity-70" />}
        <span className="text-[10px] font-black uppercase tracking-wider leading-none opacity-80">{label}</span>
      </div>
      {isEditing && !readOnly ? (
        <input ref={inputRef} type="text" inputMode={type === 'number' ? 'decimal' : 'text'} autoFocus value={localValue === 0 ? '' : localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={commitChanges} onKeyDown={(e) => { if (e.key === 'Enter') commitChanges(); }} className={`w-full h-full bg-transparent text-center font-black outline-none px-1 ${hasLabel ? 'text-sm pt-3' : 'text-[12px] pt-0'}`} placeholder={placeholder} onFocus={(e) => e.target.select()} />
      ) : (
        <div className={`w-full h-full flex items-center justify-center font-black px-1 truncate ${hasLabel ? 'text-sm pt-3' : 'text-[12px] pt-0'}`}>{localValue === 0 || localValue === '' ? '-' : localValue}</div>
      )}
    </div>
  );
};





const CustomProductSelect = ({ row, displayProducts, isDBMode, onToggleDB, onSelectProduct, onUpdateSubProducts, readOnly }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // 🟢 Search Bar State
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  
  const [menuStyles, setMenuStyles] = useState<React.CSSProperties>({ position: 'fixed', top: -9999, left: -9999, opacity: 0 });

  const updatePosition = () => {
    if (dropdownRef.current) {
       const rect = dropdownRef.current.getBoundingClientRect();
       const spaceBelow = window.innerHeight - rect.bottom;
       if (spaceBelow < 250 && rect.top > 250) {
           setMenuStyles({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 999999, opacity: 1 });
       } else {
           setMenuStyles({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 999999, opacity: 1 });
       }
    }
  };

  useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
     const isDropdownClick = (event.target as Element).closest('.portal-dropdown-menu');
     if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !isDropdownClick) setIsOpen(false);
   };
   const handleScroll = (event: Event) => {
      const target = event.target as Element;
      if (target && target.closest && target.closest('.portal-dropdown-menu')) return;
      setIsOpen(false);
   };
   if (isOpen) {
     updatePosition();
     document.addEventListener('mousedown', handleClickOutside);
     window.addEventListener('scroll', handleScroll, true);
     window.addEventListener('resize', handleScroll);
   }
   return () => {
     document.removeEventListener('mousedown', handleClickOutside);
     window.removeEventListener('scroll', handleScroll, true);
     window.removeEventListener('resize', handleScroll);
   };
  }, [isOpen]);

  const matchedProduct = displayProducts.find((p: any) => p.itemName === row.product);
  const displayCustomer = row.customerName || (matchedProduct?.customerName || matchedProduct?.customer);
  const displayJobNo = row.jobNo || matchedProduct?.jobNo;




  // 🟢 Search Filtering Logic
  const filteredProducts = displayProducts.filter((p: any) => 
    p.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.jobNo && p.jobNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ((p.customerName || p.customer || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 🟢 1. හරියටම Product එක අඳුරගන්න Function එක (Name, Job No සහ Customer ඔක්කොම බලනවා)
  const isExactMatch = (savedProd: string, savedJob: string, savedCust: string, item: any) => {
      return savedProd === item.itemName && 
             (savedJob || '') === (item.jobNo || '') && 
             (savedCust || '') === (item.customerName || item.customer || '');
  };

  // 🟢 Multi-Select Logic (Checkbox Click)
  const handleProductToggle = (item: any) => {
    if (readOnly) return;
    
    // නම විතරක් නෙමෙයි, Job එකත් සමානද බලනවා
    const isMain = isExactMatch(row.product, row.jobNo, row.customerName, item);
    const isSub = row.subProducts?.some((sp: any) => isExactMatch(sp.product, sp.jobNo, sp.customerName, item));

    if (isMain) {
       // ප්‍රධාන එක අයින් කරනවා නම්
       onSelectProduct({ itemName: '', productType: '', weight: 0, cavities: 0, cycleTime: 0, customerName: '', jobNo: '' });
    } else if (isSub) {
       // Sub එකෙන් අයින් කරනවා නම්
       const newSubs = row.subProducts.filter((sp: any) => !isExactMatch(sp.product, sp.jobNo, sp.customerName, item));
       onUpdateSubProducts(newSubs);
    } else {
       // අලුතින් Add කරනවා නම්
       if (!row.product) {
           onSelectProduct(item); 
       } else {
           const newSub = {
               id: Math.random().toString(36).substring(7),
               product: item.itemName,
               customerName: item.customerName || item.customer || '',
               jobNo: item.jobNo || '',
               achievedQty: 0,
               acceptedQty: 0
           };
           onUpdateSubProducts([...(row.subProducts || []), newSub]); 
       }
    }
  };





  return (
    <div className="flex-1 min-w-[160px] h-8 relative shrink-0" ref={dropdownRef}>
       <Package size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 z-10 pointer-events-none" />
       
       <div onClick={() => { if(!readOnly) setIsOpen(!isOpen) }} className={`w-full h-full pl-6 pr-5 bg-slate-50 dark:bg-slate-900 border-2 ${isOpen ? 'border-indigo-400' : 'border-slate-200 dark:border-slate-700'} rounded-lg flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors select-none overflow-hidden`}>
         <div className="flex flex-col w-full truncate leading-[1.1] justify-center">
            <span className="truncate font-bold text-slate-700 dark:text-slate-200 text-[11px]">
               {row.product || 'Select Product...'} {row.subProducts && row.subProducts.length > 0 && <span className="text-indigo-500 ml-1">(+{row.subProducts.length})</span>}
            </span>
            {row.product && (displayCustomer || displayJobNo) && (
               <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal truncate mt-[1px]">
                 {displayCustomer} {displayJobNo ? `| Job: ${displayJobNo}` : ''}
               </span>
            )}
         </div>
         <ChevronDown size={11} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
       </div>

       {isOpen && createPortal(
         <div style={menuStyles} className="portal-dropdown-menu bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl py-0 max-h-80 flex flex-col">
            
            {/* 🟢 Search Bar */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 rounded-t-lg shrink-0">
               <input 
                  type="text" autoFocus placeholder="Search Product, Customer or Job..." 
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white dark:bg-slate-900 text-[11px] p-1.5 rounded-md outline-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
               />
            </div>

            <div onClick={(e) => { e.stopPropagation(); onToggleDB(); }} className="px-3 py-2 font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[11px] flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
              {isDBMode ? <CheckSquare size={13} /> : <Square size={13} />}
              {isDBMode ? 'View Active Plans Only' : 'Load All Products (DB)'}
            </div>
            
            <div className="overflow-y-auto flex-1 py-1">
              {filteredProducts.length === 0 ? (
                  <div className="px-3 py-4 text-slate-400 text-[10px] text-center italic">No products found</div>
              ) : (
                  filteredProducts.map((item: any, idx: number) => {

                    // 🟢 Name එකෙන් විතරක් නෙමෙයි, Job No එකෙනුත් හරියටම Checkbox එක තෝරනවා
                    const isChecked = isExactMatch(row.product, row.jobNo, row.customerName, item) || 
                                      row.subProducts?.some((sp: any) => isExactMatch(sp.product, sp.jobNo, sp.customerName, item));

                                      
                    return (
                      <div key={idx} onClick={(e) => { e.stopPropagation(); handleProductToggle(item); }} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0 flex items-center gap-2">
                        {/* 🟢 Checkbox */}
                        {isChecked ? <CheckSquare size={13} className="text-indigo-600 shrink-0" /> : <Square size={13} className="text-slate-400 shrink-0" />}
                        
                        <div className="flex flex-col truncate w-full">
                          <span className="text-slate-700 dark:text-slate-200 text-[11px] font-bold truncate">
                            {item.itemName}
                          </span>
                          {(item.customerName || item.customer || item.jobNo) && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal truncate mt-[1px]">
                              {item.customerName || item.customer} {item.jobNo ? `| Job: ${item.jobNo}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
         </div>,
         document.body
       )}
    </div>
  );
};





const ConfirmEditModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => {
  // createPortal මගින් මෙය Table එකෙන් ගලවා මුළු Screen එකටම උඩින් (document.body) පෙන්වයි
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 p-4" style={{ zIndex: 9999999 }}>
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-amber-500/50 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-amber-500/30 bg-gradient-to-r from-slate-900 to-slate-800">
                <h3 className="font-black text-lg text-amber-500 flex items-center gap-2"><AlertTriangle size={18} /> Confirm Edit</h3>
                <button onClick={onCancel} className="text-amber-500 hover:text-amber-300"><X size={20} /></button>
            </div>
            <div className="p-5 text-sm font-bold text-slate-300">
                <p>You are about to edit an existing saved record.</p>
                <p className="mt-2 text-rose-400 text-xs">Are you sure you want to change these values?</p>
            </div>
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
                <button onClick={onCancel} className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black uppercase rounded shadow-lg shadow-amber-500/20 transition-all">Yes, Update</button>
            </div>
        </div>
    </div>,
    document.body
  );
};



const TableHeader = () => (
  <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 px-1 sm:px-1.5 pb-1 w-full min-w-[1520px] text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 select-none">
    <div className="w-14 text-center shrink-0">Machine</div>
    <div className="w-[100px] text-center shrink-0">Start Time</div>
    <div className="w-[100px] text-center shrink-0">End Time</div>
    <div className="flex-1 min-w-[160px] pl-2 shrink-0 text-left">Product / Item Name</div>
    <div className="w-14 text-center shrink-0">Wt</div>
    <div className="w-14 text-center shrink-0">Cyc</div>
    <div className="w-14 text-center shrink-0">Cav</div>
    <div className="w-16 text-center shrink-0 text-indigo-500 dark:text-indigo-400">Q/Hr</div>
    <div className="w-px mx-0.5 shrink-0"></div>
    <div className="w-[72px] text-center shrink-0">Gross</div>
    <div className="w-px mx-0.5 shrink-0"></div>
    <div className="w-[72px] text-center shrink-0 text-emerald-600 dark:text-emerald-400">Accepted</div>
    <div className="w-px mx-0.5 shrink-0"></div>
    <div className="w-[110px] text-center shrink-0 text-sky-500 dark:text-[#00f2ff]">Breakdowns</div>
    <div className="w-[160px] flex items-center justify-around shrink-0 px-2">
        <span className="w-1/3 text-center">Plan</span>
        <span className="w-1/3 text-center text-emerald-500">Done</span>
        <span className="w-1/3 text-center text-amber-500">Loss</span>
    </div>
    <div className="w-16 text-center shrink-0 text-amber-600 dark:text-amber-400">Eff Loss</div>
    <div className="w-px mx-0.5 shrink-0"></div>
    <div className="w-8 shrink-0 pr-1"></div>
  </div>
);


const ProductionDataRow = ({ row, index, uniqueMachines, activeJobs, products, handleSafeUpdate, onDeleteRow, onOpenBreakdowns, readOnly }: any) => {
  const [isDBMode, setIsDBMode] = useState(false);
  
  // 🟢 1. මුළු Gross එකතුව (දැන් ප්‍රධාන පේළියේ Gross එක පමණක් ගනී)
  const totalGrossQty = Number(row.achievedQty) || 0;

  // 🟢 2. ඒ මුළු එකතුව යොදාගෙන Metrics (Done, Loss, Eff Loss) ගණනය කිරීම
  let m: any = calculateMetrics({ ...row, achievedQty: totalGrossQty });
  if (!m) m = { planQty: 0, achievedKg: 0, efficiencyLossQty: 0, bdMins: 0, cycleTime: 0, weight: 0 };
  
  let planningMins = 0;
  let actualBdMins = 0;
  
  (row.breakdowns || []).forEach((bd: any) => {
      if (typeof bd.startTime === 'string' && bd.startTime.includes(':') && typeof bd.endTime === 'string' && bd.endTime.includes(':') && bd.category) {
          const [sh, sm] = bd.startTime.split(':').map(Number);
          const [eh, em] = bd.endTime.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 1440;
          if (mins > 0) {
              if (bd.category.toLowerCase().includes('planning')) planningMins += mins;
              else actualBdMins += mins;
          }
      }
  });

  const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
  const planningLossQty = Math.floor(ratePerMin * planningMins);
  const actualBdLossQty = Math.floor(ratePerMin * actualBdMins);
  
  m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty); 
  const updatedTotalLoss = m.planQty - totalGrossQty; 
  m.efficiencyLossQty = updatedTotalLoss - actualBdLossQty; 
  m.bdMins = actualBdMins;

  let displayProducts: any[] = [];
  if (isDBMode) {
      displayProducts = (products || []).filter((p: any) => Array.isArray(p.compatibleMachines) && p.compatibleMachines.includes(row.machine));
  } else {
      displayProducts = (activeJobs || []).filter((item: any) => item.machine === row.machine);
  }

  if (row.product && !displayProducts.find((p: any) => p.itemName === row.product)) {
      const existingItem = (products || []).find((p: any) => p.itemName === row.product);
      displayProducts = [...displayProducts, existingItem || { itemName: row.product, weight: row.unitWeight, cavities: row.cavities }];
  }

  return (
    <div className={`rounded-xl border shadow-sm hover:shadow-md relative ${THEME.card} w-full min-w-[1520px] flex flex-col`} style={{ zIndex: 100 - index }}>
      
      {/* 🟢 ප්‍රධාන පේළිය (Main Row) */}
      <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 p-1 w-full min-w-[1520px]">
        
        <div className="relative w-14 h-8 shrink-0">
          <select disabled={readOnly} value={row.machine} onChange={(e) => handleSafeUpdate(row, { machine: e.target.value, product: '', subProducts: [] })} className={`w-full h-full pl-1 pr-1 rounded-lg border-2 font-black outline-none text-[11px] uppercase cursor-pointer text-center appearance-none ${THEME.machineSelect}`}>
            <option value="" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">MC</option>
            {uniqueMachines.map((mc: string) => (<option key={mc} value={mc} className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">{mc}</option>))}
          </select>
        </div>

        <div className={`relative h-8 w-[100px] shrink-0 rounded-lg border-2 flex items-center px-1 ${THEME.timeInput}`}>
           <input disabled={readOnly} type="time" lang="sv-SE" value={row.startTime} required onChange={(e) => handleSafeUpdate(row, { startTime: e.target.value })} className="w-full bg-transparent text-center font-black text-[12px] outline-none cursor-pointer dark:[color-scheme:dark]" />
        </div>
        <div className={`relative h-8 w-[100px] shrink-0 rounded-lg border-2 flex items-center px-1 ${THEME.timeInput}`}>
           <input disabled={readOnly} type="time" lang="sv-SE" value={row.endTime} required onChange={(e) => handleSafeUpdate(row, { endTime: e.target.value })} className="w-full bg-transparent text-center font-black text-[12px] outline-none cursor-pointer dark:[color-scheme:dark]" />
        </div>

        <CustomProductSelect 
            readOnly={readOnly} row={row} displayProducts={displayProducts} isDBMode={isDBMode} onToggleDB={() => setIsDBMode(!isDBMode)} 
            onSelectProduct={(selected: any) => handleSafeUpdate(row, { 
                product: selected.itemName || '', productType: selected.productType || '', 
                unitWeight: selected.weight || selected.unitWeight || 0,
                cavities: selected.actualCavities || selected.cavities || selected.stdCavities || row.cavities,
                cycleTime: selected.actualCycleTime || selected.standardCycleTime || row.cycleTime,
                customerName: selected.customerName || selected.customer || '', jobNo: selected.jobNo || ''
            })} 
            onUpdateSubProducts={(subs: any) => handleSafeUpdate(row, { subProducts: subs })} // 🟢 අලුතින් එක් කළා
        />

        <TableInput readOnly={readOnly} className="w-14 shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.unitWeight} onSave={(v: any) => handleSafeUpdate(row, { unitWeight: v })} label="" colorClass={THEME.specInputDefault} />
        <TableInput readOnly={readOnly} className="w-14 shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.cycleTime || 0} onSave={(v: any) => handleSafeUpdate(row, { cycleTime: v })} label="" colorClass={THEME.specInputDefault} />
        <TableInput readOnly={readOnly} className="w-14 shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.cavities} onSave={(v: any) => handleSafeUpdate(row, { cavities: v })} label="" colorClass={THEME.specInputDefault} />
        <TableInput readOnly={readOnly} className="w-16 shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.qtyPerHour} onSave={(v: any) => handleSafeUpdate(row, { qtyPerHour: v })} label="" colorClass={THEME.specInputHighlight} />

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 shrink-0 mx-0.5"></div>

        <TableInput readOnly={readOnly} className="w-[72px] shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.achievedQty} onSave={(v: any) => handleSafeUpdate(row, { achievedQty: v })} label="" colorClass={THEME.statusGross} />

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 shrink-0 mx-0.5"></div>

        <TableInput readOnly={readOnly} className="w-[72px] shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" value={row.acceptedQty} onSave={(v: any) => handleSafeUpdate(row, { acceptedQty: v })} label="" colorClass="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 shrink-0 mx-0.5"></div>

        <button onClick={() => onOpenBreakdowns(row.id) } className="w-[110px] h-8 shrink-0 relative outline-none transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
          {m.bdMins > 0 ? (
            <div className={`w-full h-full rounded-lg flex items-center justify-center gap-1 shadow-md border-2 transition-colors ${THEME.bdDown}`}>
                <AlertTriangle size={10} strokeWidth={3} className="shrink-0" />
                <div className="flex items-center gap-1 leading-none">
                    <span className="text-[11px] font-black uppercase">{m.bdMins}m</span>
                    <span className="text-[10px] font-black opacity-90">({formatVal(((m.planQty || 0) - totalGrossQty) - (m.efficiencyLossQty || 0))})</span>
                </div>
            </div>
          ) : (
            <div className="w-full h-full rounded-lg flex items-center justify-center gap-1 shadow-sm border-2 transition-all bg-white dark:bg-slate-800 text-sky-500 dark:text-[#00f2ff] border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-[#00f2ff] hover:bg-sky-50 dark:hover:bg-slate-900">
                <Zap size={10} /> <span className="text-[10px] font-black uppercase tracking-wider">Log BD</span>
            </div>
          )}
        </button>

        {/* 🟢 මුළු Gross එක (totalGrossQty) යොදාගෙන Done, Loss පෙන්වීම */}
        <div className={`flex items-center justify-around px-1 rounded-lg border-2 h-8 w-[160px] shrink-0 ${THEME.metricBox}`}>
           <div className={`w-1/3 text-center text-[12px] font-black ${THEME.metricPlanTxt}`}>{formatVal(m.planQty)}</div>
           <div className={`w-px h-4 ${THEME.metricDivider}`}></div>
           <div className={`w-1/3 text-center text-[12px] font-black ${THEME.metricDoneTxt}`}>{formatVal(totalGrossQty)}</div>
           <div className={`w-px h-4 ${THEME.metricDivider}`}></div>
           <div className={`w-1/3 text-center text-[12px] font-black text-amber-600 dark:text-amber-400`}>{formatVal((m.planQty || 0) - totalGrossQty)}</div>
        </div>

        <div className={`w-16 h-8 shrink-0 flex items-center justify-center rounded-lg border-2 ${THEME.effLoss}`}>
            <span className="text-[12px] font-black leading-none">{formatVal(m.efficiencyLossQty)}</span>
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 shrink-0 mx-0.5"></div>

        {!readOnly && (
        <div className="flex items-center shrink-0 h-8 pr-1">
           <button onClick={() => onDeleteRow(row.id)} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors border-2 border-transparent ${THEME.btnDelete}`} title="Delete Row">
              <Trash2 size={14} />
           </button>
        </div>
        )}
      </div>

      {/* 🟢 අනු කොටස් (Sub-products) පේළි ලෙස පෙන්වීම */}
      {row.subProducts && row.subProducts.length > 0 && (
        <div className="flex flex-col w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl overflow-hidden border-t border-dashed border-slate-200 dark:border-slate-800">
           {/* 🟢 අනු කොටස් (Sub-products) පේළි ලෙස පෙන්වීම */}
      {row.subProducts && row.subProducts.length > 0 && (
        <div className="flex flex-col w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-b-xl overflow-hidden border-t border-dashed border-slate-200 dark:border-slate-800">
           {row.subProducts.map((sp: any) => (
              <div key={sp.id} className="flex flex-nowrap items-center gap-1 sm:gap-1.5 p-1 w-full min-w-[1520px] border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                 {/* හිස් ඉඩ (MC, Time) */}
                 <div className="w-14 shrink-0"></div>
                 <div className="w-[100px] shrink-0"></div>
                 <div className="w-[100px] shrink-0 flex items-center justify-end pr-3 text-slate-300 dark:text-slate-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                 </div>
                 
                 {/* Product Name Display */}
                 <div className="flex-1 min-w-[160px] h-8 flex flex-col justify-center px-3 border-l-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 rounded-r-md shadow-sm">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{sp.product}</span>
                    {(sp.customerName || sp.jobNo) && (
                      <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-normal truncate mt-[1px]">
                         {sp.customerName} {sp.jobNo ? `| Job: ${sp.jobNo}` : ''}
                      </span>
                    )}
                 </div>

                 {/* හිස් ඉඩ (Wt, Cyc, Cav, Q/Hr) */}
                 <div className="w-14 shrink-0"></div><div className="w-14 shrink-0"></div><div className="w-14 shrink-0"></div><div className="w-16 shrink-0"></div>
                 <div className="w-px mx-0.5 shrink-0"></div>

                 {/* 🟢 Sub-product Gross එක අයින් කර ඒ වෙනුවට හිස් ඉඩක් ලබා දීම (Accepted Input එක හරියටම Align වීමට) */}
                 <div className="w-[72px] shrink-0"></div>
                 <div className="w-px mx-0.5 shrink-0"></div>

                 {/* 🟢 Sub-product Accepted Input */}
                 <TableInput readOnly={readOnly} className="w-[72px] shrink-0 !h-8 [&>div:first-child]:hidden [&_input]:!pt-0 [&>div:last-child]:!pt-0 [&_input]:!text-[12px] [&>div:last-child]:!text-[12px]" type="number" 
                    value={sp.acceptedQty} 
                    onSave={(v: any) => {
                       const updatedSubs = row.subProducts.map((s: any) => s.id === sp.id ? { ...s, acceptedQty: v } : s);
                       handleSafeUpdate(row, { subProducts: updatedSubs });
                    }} 
                    label="" colorClass="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" 
                 />
                 <div className="w-px mx-0.5 shrink-0"></div>

                 {/* අනිත් හිස් ඉඩ */}
                 <div className="w-[110px] shrink-0"></div>
                 <div className="w-[160px] shrink-0"></div>
                 <div className="w-16 shrink-0"></div>
                 <div className="w-px mx-0.5 shrink-0"></div>
                 
                 {/* 🟢 නිවැරදි කිරීම: ප්‍රධාන පේළියේ Delete බොත්තමේ පළලට සමාන හිස් ඉඩක් ලබා දීම */}
                 {!readOnly && <div className="shrink-0 w-[36px]"></div>}
              </div>
           ))}
        </div>
      )}


        </div>
      )}
    </div>
  );
};



// ============================================================================
// 🚀 4. MAIN COMPONENT
// ============================================================================
const ProductionTable: React.FC<Props> = ({ rows, onUpdateRow, onDeleteRow, onOpenBreakdowns, products = [], isFormMode, activeJobs = [], readOnly }) => {
  const allItems = activeJobs;
  const uniqueMachines = Array.from(new Set(allItems.map((m) => m.machine || 'Unassigned'))).sort();

  const handleSafeUpdate = (row: ProductionRow, updates: Partial<ProductionRow>) => {
    
        onUpdateRow(row.id, updates);
};


  const styles = `
    input[type="time"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.8; }
    input[type="time"]::-webkit-calendar-picker-indicator:hover { opacity: 1; } `;

    
    if (!rows || rows.length === 0) return null;

    return (
      <div className="w-full max-w-[calc(100vw-1rem)] 2xl:max-w-full overflow-x-auto pb-8 mb-4 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <style>{styles}</style>
        <div className="min-w-[1520px] w-full space-y-1.5 pr-4">
        
        <TableHeader />
        {rows.map((row, index) => (
            <ProductionDataRow 
                key={row.id} row={row} index={index}
                uniqueMachines={uniqueMachines} activeJobs={activeJobs} products={products}
                handleSafeUpdate={handleSafeUpdate} onDeleteRow={onDeleteRow} onOpenBreakdowns={onOpenBreakdowns}
                readOnly={readOnly} 
            />


        ))}


      </div>
    </div>
  );
};

export default ProductionTable;