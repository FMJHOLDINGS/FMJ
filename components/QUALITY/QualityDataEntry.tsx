import React, { useState, useMemo } from 'react';
import { ChevronDown, PenTool, ShieldCheck, X, PlusCircle, Trash2, Save, Atom } from 'lucide-react';
import { createPortal } from 'react-dom'; // 🟢 අලුතින් එකතු කළා
import { DefectEntry } from '../../types';
import { QaService } from './QaService';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// 🛠️ TYPES & INTERFACES
// ============================================================================
interface DailyViewProps { data: any[]; onEditRow: (r: any) => void; }
interface ExpandableCardProps { date: string; items: any[]; onEditRow: (r: any) => void; }
interface ModalProps { row: any; onClose: () => void; onSave: (id: string, d: string, t: string, defs: DefectEntry[]) => void; categories: string[]; }



// ============================================================================
// 🚀 MAIN COMPONENT: QualityDataEntry
// ============================================================================
const QualityDataEntry = ({ data, onSaveDefects, availableCategories, onUpdateGoodQty, readOnly }: any) => {
    const [editingRow, setEditingRow] = useState<any | null>(null);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar pb-20 transform-gpu will-change-transform">
             {/* 🟢 මෙතනට onUpdateGoodQty පාස් කර ඇත */}
             <DailyCardView data={data} onEditRow={setEditingRow} onUpdateGoodQty={onUpdateGoodQty} readOnly={readOnly} />

             {/* 🟢 Modal එක රාමුවෙන් සම්පූර්ණයෙන්ම එළියට ගෙන ඇත */}
             {editingRow && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm bg-slate-900/70 animate-in fade-in zoom-in-95 duration-200">
                    <DefectModalContent 
                        row={editingRow} 
                        onClose={() => setEditingRow(null)} 
                        onSave={(rowObj: any, defs: any) => {
                            onSaveDefects(rowObj, defs);
                            setEditingRow(null);
                        }} 
                        categories={availableCategories} 
                        readOnly={readOnly}
                    />
                </div>,
                document.body
             )}
        </div>
    );
};

export default QualityDataEntry;

// ============================================================================
// 🧩 SUB-COMPONENTS
// ============================================================================


const DailyCardView: React.FC<any> = ({ data, onEditRow, onUpdateGoodQty, readOnly }) => {
    const groupedByDate = useMemo(() => {
        const groups: Record<string, any[]> = {};
        data.forEach((r: any) => { if (!groups[r.date]) groups[r.date] = []; groups[r.date].push(r); });
        return groups;
    }, [data]);
    const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    
    
    return <div className="space-y-3 p-1">{dates.map(date => <ExpandableDailyCard key={date} date={date} items={groupedByDate[date]} onEditRow={onEditRow} onUpdateGoodQty={onUpdateGoodQty} readOnly={readOnly} />)}</div>;
};


const ExpandableDailyCard: React.FC<any> = ({ date, items, onEditRow, onUpdateGoodQty, readOnly }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // 🟢 අලුත්: Shift මාරු කිරීමට State එක (Default: Day)
    const [activeShift, setActiveShift] = useState('Day');
    
    const [editingGoodQtyIdx, setEditingGoodQtyIdx] = useState<number | null>(null);
    const [tempGoodQty, setTempGoodQty] = useState<string>('');

    const [editingRejQtyIdx, setEditingRejQtyIdx] = useState<number | null>(null);
    const [tempRejQty, setTempRejQty] = useState<string>('');
    const [editingStartQtyIdx, setEditingStartQtyIdx] = useState<number | null>(null);
    const [tempStartQty, setTempStartQty] = useState<string>('');

    // 🟢 අලුත්: Shift එක අනුව Filter කර, Machine නම අනුව (IM 01, IM 02) පිළිවෙලට සැකසීම (Sort)
    const filteredAndSortedItems = useMemo(() => {
        return items
            .filter(i => (i.shift || '').toLowerCase() === activeShift.toLowerCase())
            .sort((a, b) => (a.machine || '').localeCompare(b.machine || ''));
    }, [items, activeShift]);

    // 🟢 අලුත්: Calculations හැදෙන්නේ තෝරාගත් Shift එකේ (Day හෝ Night) දත්ත වලට පමණි
    const shiftTotalProd = filteredAndSortedItems.reduce((s, i) => s + i.wgtTotal, 0); 
    const shiftTotalRej = filteredAndSortedItems.reduce((s, i) => s + i.wgtReject + i.wgtStartup, 0);
    const shiftPct = shiftTotalProd > 0 ? (shiftTotalRej / shiftTotalProd) * 100 : 0;

    // 🟢 අලුත්: Index එක ගන්නේ Filter වූ ලැයිස්තුවෙනි
    const handleSaveRejQty = (idx: number) => {
        const item = filteredAndSortedItems[idx];
        const newQty = tempRejQty === '' ? null : Number(tempRejQty);
        if (item.qtyReject !== newQty && onUpdateGoodQty) {
            onUpdateGoodQty(item, newQty, 'qtyReject'); 
        }
        setEditingRejQtyIdx(null);
    };

    const handleSaveStartQty = (idx: number) => {
        const item = filteredAndSortedItems[idx];
        const newQty = tempStartQty === '' ? null : Number(tempStartQty);
        if (item.qtyStartup !== newQty && onUpdateGoodQty) {
            onUpdateGoodQty(item, newQty, 'qtyStartup'); 
        }
        setEditingStartQtyIdx(null);
    };

    const handleSaveGoodQty = (idx: number) => {
        const item = filteredAndSortedItems[idx];
        const newQty = tempGoodQty === '' ? null : Number(tempGoodQty);
        if (item.goodQty !== newQty && onUpdateGoodQty) {
            onUpdateGoodQty(item, newQty);
        }
        setEditingGoodQtyIdx(null);
    };
    
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className={`p-4 flex flex-col md:flex-row items-center justify-between transition-colors ${isOpen ? 'bg-slate-50 dark:bg-slate-900/60' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}`}>
                
                {/* 1. Date & Toggle Icon */}
                <div className="flex items-center gap-4 w-full md:w-auto cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <div className={`p-2 rounded-lg transition-all ${isOpen ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><ChevronDown className="w-4 h-4 transition-transform" /></div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{new Date(date).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})}</h4>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">{filteredAndSortedItems.length} Records</span>
                    </div>
                </div>

                {/* 2. 🟢 Day / Night Switch Buttons (මධ්‍යගතව පිහිටුවා ඇත) */}
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg mx-auto md:mx-4 mt-4 md:mt-0 shadow-inner">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveShift('Day'); setIsOpen(true); }}
                        className={`px-5 py-1.5 text-xs font-black uppercase rounded-md transition-all ${activeShift === 'Day' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Day
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveShift('Night'); setIsOpen(true); }}
                        className={`px-5 py-1.5 text-xs font-black uppercase rounded-md transition-all ${activeShift === 'Night' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Night
                    </button>
                </div>

                {/* 3. Totals */}
                <div className="flex gap-6 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">Prod</span><span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{shiftTotalProd.toFixed(1)} kg</span></div>
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">Waste</span><span className="text-rose-500 font-black text-sm">{shiftTotalRej.toFixed(1)} kg</span></div>
                     <div className="text-center md:text-right"><span className="block text-[9px] font-black uppercase text-slate-400">%</span><span className={`font-black text-sm px-1.5 py-0.5 rounded ${shiftPct > 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{shiftPct.toFixed(1)}%</span></div>
                </div>
            </div>
            
            {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="bg-slate-100 dark:bg-slate-950 text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
                                <tr>
                                    <th className="py-2 px-3 pl-4 rounded-l-lg">M/C & Shift</th>
                                    <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800">Item</th>
                                    <th className="py-2 px-3 text-right">Unit Wt</th>
                                    <th className="py-2 px-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 border-l border-slate-200 dark:border-slate-800">Prod (Qty)</th>
                                    <th className="py-2 px-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">Acc (Qty)</th>
                                    <th className="py-2 px-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">Prod (Kg)</th>
                                    <th className="py-2 px-3 text-right text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10 border-r border-slate-200 dark:border-slate-800">Acc (Kg)</th>
                                    <th className="py-2 px-3 text-right text-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 w-20 min-w-[80px]">Rej (Qty)</th>
                                    <th className="py-2 px-3 text-right text-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 border-r border-slate-200 dark:border-slate-800">Rej (Kg)</th>
                                    <th className="py-2 px-3 text-right text-amber-500 bg-amber-50/30 dark:bg-amber-900/10 w-20 min-w-[80px]">Start (Qty)</th>
                                    <th className="py-2 px-3 text-right text-amber-500 bg-amber-50/30 dark:bg-amber-900/10 border-r border-slate-200 dark:border-slate-800">Start (Kg)</th>
                                    <th className="py-2 px-3 text-center">% (St)</th>
                                    <th className="py-2 px-3 text-center">Scrap %</th>
                                    <th className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800">Tot %</th>
                                    <th className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 min-w-[96px] w-24">Good Qty</th>
                                    <th className="py-2 px-3 text-center rounded-tr-lg whitespace-nowrap">Categorize the Reject</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                                {/* 🟢 අලුත්: Table එකට map කරන්නේ filteredAndSortedItems ය */}
                                {filteredAndSortedItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <td className="py-1.5 px-3 pl-4 border-r border-slate-200 dark:border-slate-800"><span className="font-black">{item.machine}</span> <span className="text-[10px] opacity-70">({item.shift})</span></td>
                                        <td className="py-1.5 px-3 truncate max-w-[150px]" title={item.product}>{item.product}</td>
                                        <td className="py-1.5 px-3 text-right font-mono opacity-70 border-r border-slate-200 dark:border-slate-800">{item.unitWeight}g</td>
                                        <td className="py-1.5 px-3 text-right font-black">{item.qtyTotal}</td>
                                        <td className="py-1.5 px-3 text-right">{item.qtyAccept}</td>
                                        <td className="py-1.5 px-3 text-right font-black">{item.wgtTotal.toFixed(1)}</td>
                                        <td className="py-1.5 px-3 text-right border-r border-slate-200 dark:border-slate-800">{item.wgtAccept.toFixed(1)}</td>
                                        
                                        <td 
                                            className={`py-1.5 px-3 text-right font-black text-indigo-500 transition-colors align-middle h-8 w-20 min-w-[80px] ${!readOnly ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80' : 'cursor-default opacity-80'}`}
                                            onClick={() => {
                                                if (readOnly) return;
                                                setEditingRejQtyIdx(idx);
                                                setTempRejQty(item.qtyReject !== undefined && item.qtyReject !== null ? item.qtyReject.toString() : '');
                                            }}
                                        >

                                            {editingRejQtyIdx === idx ? (
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    value={tempRejQty}
                                                    onChange={(e) => setTempRejQty(e.target.value)}
                                                    onBlur={() => handleSaveRejQty(idx)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRejQty(idx)}
                                                    className="w-full h-6 px-1 text-xs font-bold ring-2 ring-indigo-500 border-none rounded outline-none bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-end h-6 w-full">
                                                    {item.qtyReject !== undefined && item.qtyReject !== null ? item.qtyReject : '-'}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-1.5 px-3 text-right font-black text-indigo-500 border-r border-slate-200 dark:border-slate-800">{item.wgtReject.toFixed(1)}</td>
                                        

                                        <td 
                                            className={`py-1.5 px-3 text-right font-black text-amber-500 transition-colors align-middle h-8 w-20 min-w-[80px] ${!readOnly ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80' : 'cursor-default opacity-80'}`}
                                            onClick={() => {
                                                if (readOnly) return;
                                                setEditingStartQtyIdx(idx);
                                                setTempStartQty(item.qtyStartup !== undefined && item.qtyStartup !== null ? item.qtyStartup.toString() : '');
                                            }}
                                        >

                                            {editingStartQtyIdx === idx ? (
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    value={tempStartQty}
                                                    onChange={(e) => setTempStartQty(e.target.value)}
                                                    onBlur={() => handleSaveStartQty(idx)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveStartQty(idx)}
                                                    className="w-full h-6 px-1 text-xs font-bold ring-2 ring-amber-500 border-none rounded outline-none bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-end h-6 w-full">
                                                    {item.qtyStartup !== undefined && item.qtyStartup !== null ? item.qtyStartup : '-'}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-1.5 px-3 text-right font-black text-amber-500 border-r border-slate-200 dark:border-slate-800">{item.wgtStartup.toFixed(1)}</td>
                                        <td className="py-1.5 px-3 text-center text-amber-500">{item.pctStartup.toFixed(1)}%</td>
                                        <td className="py-1.5 px-3 text-center text-indigo-500">{item.pctScrap.toFixed(1)}%</td>
                                        <td className="py-1.5 px-3 text-center border-r border-slate-200 dark:border-slate-800"><span className={`px-1.5 py-0.5 rounded ${item.pctAll > 5 ? 'bg-rose-100 text-rose-600' : 'text-slate-500'}`}>{item.pctAll.toFixed(1)}%</span></td>
                                        

                                        <td 
                                            className={`py-1.5 px-3 text-center border-r border-slate-200 dark:border-slate-800 transition-colors align-middle h-8 min-w-[96px] w-24 ${!readOnly ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80' : 'cursor-default opacity-80'}`}
                                            onClick={() => {
                                                if (readOnly) return;
                                                setEditingGoodQtyIdx(idx);
                                                setTempGoodQty(item.goodQty !== undefined ? item.goodQty.toString() : '');
                                            }}
                                        >

                                            {editingGoodQtyIdx === idx ? (
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    value={tempGoodQty}
                                                    onChange={(e) => setTempGoodQty(e.target.value)}
                                                    onBlur={() => handleSaveGoodQty(idx)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGoodQty(idx)}
                                                    className="w-full h-6 px-1 text-xs font-bold ring-2 ring-indigo-500 border-none rounded outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-6 w-full">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {item.goodQty !== undefined && item.goodQty !== '' ? item.goodQty : '-'}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-1.5 px-3 text-center">
                                            <button 
                                                onClick={() => onEditRow(item)} 
                                                className={`px-3 py-1 rounded-lg text-white text-[10px] uppercase font-black tracking-wider whitespace-nowrap min-w-[100px] transition-all flex items-center justify-center mx-auto gap-1 relative overflow-hidden group transform-gpu
                                                    ${item.auditQty > 0 ? 'bg-indigo-600 shadow-sm ring-1 ring-indigo-400 ring-offset-1 dark:ring-offset-[#0F172A]' : 'bg-slate-700 hover:bg-indigo-600'}
                                                `}
                                            >
                                                {item.auditQty > 0 && <span className="absolute inset-0 bg-white/20 animate-[pulse_2s_infinite]"></span>}
                                                <PenTool className="w-3 h-3 relative z-10" /> 
                                                <span className="relative z-10">{item.auditQty > 0 ? `${item.auditQty} Rejects` : 'No Rejects'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};




const DefectModalContent: React.FC<any> = ({ row, onClose, onSave, readOnly }) => {
    const { userData } = useAuth();
    const [defects, setDefects] = useState<DefectEntry[]>([]);
    const [qaCategories, setQaCategories] = useState<{ id: string, name: string }[]>([]);
    const [selectedCat, setSelectedCat] = useState("");
    const [tempQty, setTempQty] = useState('');

    React.useEffect(() => {
        if(row.defects) setDefects(row.defects);
        const fetchCategories = async () => {
            if (!userData || !userData.collectionName) return;
            try {
                const data = await QaService.getQaSettings(userData.collectionName);
                const subs = data.subCategories || [];
                setQaCategories(subs);
                if(subs.length > 0) setSelectedCat(subs[0].name);
            } catch (error) { console.error("Error fetching QA categories", error); }
        };
        fetchCategories();
    }, [row, userData]);
    


    const handleAdd = () => {
        const qty = parseInt(tempQty);
        if (!qty || qty <= 0 || !selectedCat) return;
        
        const exists = defects.find(d => d.defectName === selectedCat);
        if (exists) {
            // 🟢 එකම Category එක නැවත Add කිරීම වළක්වයි (අවශ්‍ය නම් Alert එකක් දැමිය හැක)
            alert(`${selectedCat} is already added!`);
            return;
        } else {
            setDefects([{ defectName: selectedCat, qty }, ...defects]);
        }
        setTempQty('');
    };



    const handleRemove = (name: string) => setDefects(defects.filter(d => d.defectName !== name));
    const totalAudit = defects.reduce((a, b) => a + b.qty, 0);

    return (
        <div 
            className="bg-white dark:bg-[#0F172A] w-[95%] sm:w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/20 transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Atom className="w-24 h-24 text-white" /></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2"><ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5"/> QA Audit Entry</h3>
                        <p className="text-[10px] sm:text-xs font-bold text-indigo-100 mt-1 opacity-90">{row.machine} • {row.product}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"><X className="w-4 h-4"/></button>
                </div>
            </div>
            

            
            {/* Input Section */}
            {!readOnly && (
                <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                     <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                         <div className="flex-1">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">Defect Category</label>
                             <div className="relative">
                                 <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                     {qaCategories.length === 0 && <option value="">Loading...</option>}
                                     {qaCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                     <option value="OTHER">OTHER</option>
                                 </select>
                                 <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none"/>
                             </div>
                         </div>
                         <div className="flex gap-2.5 sm:gap-3">
                             <div className="w-full sm:w-20">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1 block">Qty</label>
                                 <input type="number" placeholder="0" value={tempQty} onChange={e => setTempQty(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center" />
                             </div>
                             <div className="flex items-end">
                                 <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95"><PlusCircle className="w-5 h-5" /></button>
                             </div>
                         </div>
                     </div>
                </div>
            )}



            {/* 🟢 Defects List (උස සහ Padding අවම කර ඇත) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1.5">
                {defects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-4"><ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" /><span className="text-[10px] font-bold text-slate-400 uppercase">No defects recorded</span></div>
                ) : (
                    defects.map((d, i) => (
                        // 🟢 p-2.5 වෙනුවට p-1.5 සහ py-1.5 යොදා row height අඩු කර ඇත
                        <div key={i} className="flex justify-between items-center p-1.5 px-2.5 sm:p-2 sm:px-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {d.defectName}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] sm:text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">{d.qty}</span>
                                
                                {/* 🟢 Trash icon එකේ ප්‍රමාණය ද මදක් කුඩා කර ඇත */}
                                {!readOnly && (
                                    <button onClick={() => handleRemove(d.defectName)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-100 p-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
                                )}

                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex-shrink-0">
                <div className="flex justify-between items-center mb-3 px-1"><span className="text-[10px] font-black uppercase text-slate-500">Total Audit Count</span><span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">{totalAudit} <span className="text-[9px] sm:text-[10px] text-slate-400">units</span></span></div>
                
                {!readOnly && (
                    <button onClick={() => onSave(row, defects)} className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"><Save className="w-4 h-4" /> Save Record</button>
                )}

            </div>
        </div>
    );
};