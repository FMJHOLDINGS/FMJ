// ============================================================================
// 🛠️ ADMIN QA DEFECTS MANAGER (User Interface)
// Path: components/ADMIN/AdminQaDefectsAdd.tsx
// ============================================================================

import React, { useState } from 'react';
import { Layers, Plus, Tag, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { useQaManager } from '../QUALITY/useQaManager';
import { useAuth } from '../../context/AuthContext'; 

// ============================================================================
// 🎨 THEME & COLORS CONFIGURATION
// ============================================================================
const THEME = {
    cardBg: "bg-white dark:bg-slate-800",
    cardBorder: "border-slate-200 dark:border-slate-700",
    headerText: "text-slate-800 dark:text-white",
    
    mainIcon: "text-indigo-500",
    mainBtn: "bg-indigo-500 hover:bg-indigo-600",
    
    subIcon: "text-amber-500",
    subBtn: "bg-amber-500 hover:bg-amber-600",
    
    inputBg: "bg-slate-50 dark:bg-slate-900",
    inputBorder: "border-slate-200 dark:border-slate-600",
    
    listItemBg: "bg-slate-50 dark:bg-slate-900/50",
    listHoverBorderMain: "hover:border-indigo-200 dark:hover:border-indigo-900/50",
    listHoverBorderSub: "hover:border-amber-200 dark:hover:border-amber-900/50",
};

const AdminQaDefectsAdd: React.FC = () => {
    // 1️⃣ Auth Context එකෙන් Collection Name එක ලබාගැනීම
    const { userData } = useAuth(); 
    const collectionName = userData?.collectionName || '';

    // 2️⃣ Custom Hook එක හරහා Data සහ Functions ලබාගැනීම
    const { 
        loading, saving, saveSuccess, mainCategories, subCategories, 
        setMainCategories, setSubCategories, saveToDatabase 
    } = useQaManager(collectionName);

    // 3️⃣ Local States (Forms සඳහා)
    const [newMainCatName, setNewMainCatName] = useState('');
    const [newMainCatColor, setNewMainCatColor] = useState('#6366f1'); 
    
    const [newSubCatName, setNewSubCatName] = useState('');
    const [newSubCatColor, setNewSubCatColor] = useState('#f59e0b'); 
    const [selectedMainCat, setSelectedMainCat] = useState('');

    // ========================================================================
    // ⚙️ HANDLERS
    // ========================================================================
    const handleAddMainCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMainCatName.trim()) return;

        const newCat = { id: `qa_main_${Date.now()}`, name: newMainCatName.toUpperCase(), color: newMainCatColor };
        const updatedMains = [...mainCategories, newCat];
        
        setMainCategories(updatedMains);
        setNewMainCatName('');
        saveToDatabase(updatedMains, subCategories);
    };

    const handleAddSubCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubCatName.trim() || !selectedMainCat) return;

        const newSub = { id: `qa_sub_${Date.now()}`, name: newSubCatName.toUpperCase(), mainCategoryId: selectedMainCat, color: newSubCatColor };
        const updatedSubs = [...subCategories, newSub];
        
        setSubCategories(updatedSubs);
        setNewSubCatName('');
        saveToDatabase(mainCategories, updatedSubs);
    };

    const handleDeleteMain = (id: string) => {
        if(window.confirm("Delete this Main Defect Area? All sub-defects under it will also be deleted.")) {
            const updatedMains = mainCategories.filter(c => c.id !== id);
            const updatedSubs = subCategories.filter(c => c.mainCategoryId !== id);
            setMainCategories(updatedMains);
            setSubCategories(updatedSubs);
            saveToDatabase(updatedMains, updatedSubs);
        }
    };

    const handleDeleteSub = (id: string) => {
        if(window.confirm("Remove this specific defect?")) {
            const updatedSubs = subCategories.filter(c => c.id !== id);
            setSubCategories(updatedSubs);
            saveToDatabase(mainCategories, updatedSubs);
        }
    };

    // ========================================================================
    // 🖥️ UI RENDERING
    // ========================================================================
    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-300 w-full max-w-7xl mx-auto">
            
            {/* STATUS INDICATOR */}
            <div className="flex justify-end h-6">
                {saving && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Loader2 size={12} className="animate-spin" /> Saving QA Database...</span>}
                {saveSuccess && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500"><CheckCircle size={12} /> Saved to Factory Database</span>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 🔴 MAIN CATEGORIES SECTION (Hardware Accelerated) */}
                <div className={`${THEME.cardBg} rounded-3xl shadow-sm border ${THEME.cardBorder} p-5 transform-gpu will-change-transform`}>
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <Layers className={THEME.mainIcon} size={20} />
                        <h2 className={`text-lg font-bold ${THEME.headerText}`}>QA Main Areas (e.g. Preform Defects)</h2>
                    </div>

                    <form onSubmit={handleAddMainCategory} className="flex gap-2 mb-6">
                        <input type="color" value={newMainCatColor} onChange={(e) => setNewMainCatColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" title="Pick Color"/>
                        <input type="text" placeholder="Area Name..." value={newMainCatName} onChange={(e) => setNewMainCatName(e.target.value)} className={`flex-1 ${THEME.inputBg} border ${THEME.inputBorder} rounded-lg px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500`} required/>
                        <button type="submit" disabled={saving} className={`${THEME.mainBtn} disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1`}>
                            <Plus size={16} /> Add
                        </button>
                    </form>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 transform-gpu">
                        {mainCategories.length === 0 ? (
                            <p className="text-center text-xs font-medium text-slate-400 py-4">No QA Main Areas added.</p>
                        ) : (
                            mainCategories.map(cat => (
                                <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl ${THEME.listItemBg} border border-slate-100 dark:border-slate-700/50 ${THEME.listHoverBorderMain} transition-colors`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                                    </div>
                                    <button type="button" onClick={() => handleDeleteMain(cat.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 🔴 SUB CATEGORIES SECTION */}
                <div className={`${THEME.cardBg} rounded-3xl shadow-sm border ${THEME.cardBorder} p-5 transform-gpu will-change-transform`}>
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                        <Tag className={THEME.subIcon} size={20} />
                        <h2 className={`text-lg font-bold ${THEME.headerText}`}>Specific Defects (e.g. Black Dots)</h2>
                    </div>

                    <form onSubmit={handleAddSubCategory} className="flex flex-col gap-3 mb-6">
                        <select value={selectedMainCat} onChange={(e) => setSelectedMainCat(e.target.value)} className={`w-full ${THEME.inputBg} border ${THEME.inputBorder} rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500`} required>
                            <option value="" disabled>-- Select Main QA Area --</option>
                            {mainCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        
                        <div className="flex gap-2">
                            <input type="color" value={newSubCatColor} onChange={(e) => setNewSubCatColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0 shrink-0" title="Pick Color"/>
                            <input type="text" placeholder="Defect Name..." value={newSubCatName} onChange={(e) => setNewSubCatName(e.target.value)} className={`flex-1 ${THEME.inputBg} border ${THEME.inputBorder} rounded-lg px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500`} required/>
                            <button type="submit" disabled={!selectedMainCat || saving} className={`${THEME.subBtn} disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shrink-0`}>
                                <Plus size={16} /> Add
                            </button>
                        </div>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 transform-gpu">
                        {subCategories.length === 0 ? (
                            <p className="text-center text-xs font-medium text-slate-400 py-4">No specific defects added.</p>
                        ) : (
                            subCategories.map(sub => {
                                const parentMain = mainCategories.find(m => m.id === sub.mainCategoryId);
                                return (
                                    <div key={sub.id} className={`flex items-center justify-between p-3 rounded-xl ${THEME.listItemBg} border border-slate-100 dark:border-slate-700/50 ${THEME.listHoverBorderSub} transition-colors`}>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: sub.color }}></div>
                                                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{sub.name}</span>
                                            </div>
                                            {parentMain && <span className="text-[10px] font-bold text-slate-400 ml-5">Area: {parentMain.name}</span>}
                                        </div>
                                        <button type="button" onClick={() => handleDeleteSub(sub.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminQaDefectsAdd;