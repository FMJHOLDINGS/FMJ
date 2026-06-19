import React, { useState, useEffect, memo } from 'react';
import { Plus, Database, Search, X, Trash2, Edit2, Save, Factory, Layers, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { useProductDBLogic } from './ProductDBLogic';

// --- STYLES ---
const MODAL_OVERLAY_CLASS = "fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4";
const MODAL_BOX_CLASS = "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] transform-gpu";

// ============================================================================
// 🚀 OPTIMIZATION: ISOLATED MODAL COMPONENT (Prevents Typing Lag & Freeze)
// ============================================================================
const ProductFormModal = memo(({ 
    activeTab, initialData, machines, onClose, onSave, onSaveMachine, onDeleteMachine 
}: any) => {
    
    const [modalTab, setModalTab] = useState<'product' | 'machines'>('product');
    const [newMachineName, setNewMachineName] = useState('');
    
    // 🟢 LOCAL FORM STATE
    const [formData, setFormData] = useState<any>(() => {
        if (initialData) return { ...initialData };
        return {
            itemName: '', customer: '', machineType: activeTab, weight: 0, color: '',
            standardCycleTime: 0, actualCycleTime: 0, stdCavities: 0, actualCavities: 0,
            packingQty: 0, polytheneSize: '', polytheneColor: '', packingType: 'Single',


            compatibleMachines: [],
            productType: 'Preform', materialType: 'PET', materialPercent: 0, mbCode: '', mbPercent: 0, crushPercent: 0
        };
    });

    const activeMachines = machines.filter((m: any) => m.type === activeTab);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const toggleMachineSelection = (machineName: string) => {
        const currentList = formData.compatibleMachines || [];
        if (currentList.includes(machineName)) {
            handleChange('compatibleMachines', currentList.filter((m: string) => m !== machineName));
        } else {
            handleChange('compatibleMachines', [...currentList, machineName]);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleAddMachineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMachineName.trim()) return;
        onSaveMachine({ id: `mach_${Date.now()}`, name: newMachineName.trim().toUpperCase(), type: activeTab });
        setNewMachineName('');
    };

    const previewTarget = Math.round((3600 / (Number(formData.actualCycleTime) || 1)) * (Number(formData.actualCavities) || 1));

    return (
        <div className={MODAL_OVERLAY_CLASS}>
            <div className={MODAL_BOX_CLASS}>
                {/* Modal Header & Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 gap-3">
                    <div className="flex bg-slate-200 dark:bg-slate-900 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                        <button type="button" onClick={() => setModalTab('product')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-md transition-all ${modalTab === 'product' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Product Info</button>
                        <button type="button" onClick={() => setModalTab('machines')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-md transition-all flex items-center gap-1 ${modalTab === 'machines' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Settings size={14}/> {activeTab} Machine Master</button>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                {/* --- TAB 1: PRODUCT INFO FORM --- */}
                {modalTab === 'product' && (
                    <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#0B1121]">
                        <div className="space-y-5">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="sm:col-span-2"><InputGroup label="Item Name" value={formData.itemName || ''} onChange={(e:any) => handleChange('itemName', e.target.value)} required placeholder="e.g. 500ml Bottle" /></div>
                                <div className="sm:col-span-2"><InputGroup label="Customer" value={formData.customer || ''} onChange={(e:any) => handleChange('customer', e.target.value)} /></div>
                                <InputGroup label="Weight (g)" type="number" step="0.01" value={formData.weight || ''} onChange={(e:any) => handleChange('weight', e.target.value)} />
                                <InputGroup label="Color" value={formData.color || ''} onChange={(e:any) => handleChange('color', e.target.value)} />
                            </div>

                            {/* 🟢 IM SPECIFIC FIELDS */}
                            {/* 🟢 MATERIAL SPECS (දැන් IM සහ BM දෙකටම පෙනේ) */}
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl space-y-3">
                                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-2"><Layers size={14}/> {activeTab} Material Specs</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Product Type</label>
                                        <select value={formData.productType || 'Preform'} onChange={e => handleChange('productType', e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-bold outline-none focus:border-indigo-500">
                                            <option value="Preform">Preform</option>
                                            <option value="Cap">Cap</option>
                                            <option value="Bottle">Bottle</option>
                                            <option value="Container">Container</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Material Type</label>
                                        <select value={formData.materialType || 'PET'} onChange={e => handleChange('materialType', e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-bold outline-none focus:border-indigo-500">
                                            <option value="PET">PET</option>
                                            <option value="PPCP">PPCP</option>
                                            <option value="PP">PP</option>
                                            <option value="LDPE">LDPE</option>
                                            <option value="HDPE">HDPE</option>
                                        </select>
                                    </div>

                                    <InputGroup label="Material %" type="number" value={formData.materialPercent || ''} onChange={(e:any) => handleChange('materialPercent', e.target.value)} />
                                    <InputGroup label="MB Code" value={formData.mbCode || ''} onChange={(e:any) => handleChange('mbCode', e.target.value)} />
                                    <InputGroup label="MB %" type="number" value={formData.mbPercent || ''} onChange={(e:any) => handleChange('mbPercent', e.target.value)} />
                                    <InputGroup label="Crush %" type="number" value={formData.crushPercent || ''} onChange={(e:any) => handleChange('crushPercent', e.target.value)} />
                                </div>
                            </div>





                            {/* Production Specs */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2">Production Specs</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <InputGroup label="Std Cavity" type="number" value={formData.stdCavities || ''} onChange={(e:any) => handleChange('stdCavities', e.target.value)} />
                                    <InputGroup label="Act. Cavity" type="number" value={formData.actualCavities || ''} onChange={(e:any) => handleChange('actualCavities', e.target.value)} />
                                    <InputGroup label="Std Cycle (s)" type="number" step="0.1" value={formData.standardCycleTime || ''} onChange={(e:any) => handleChange('standardCycleTime', e.target.value)} />
                                    <InputGroup label="Act. Cycle (s)" type="number" step="0.1" value={formData.actualCycleTime || ''} onChange={(e:any) => handleChange('actualCycleTime', e.target.value)} />
                                    <div className="space-y-1.5 w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Target/Hr Preview</span>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{previewTarget}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Packing Specs */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2">Packing Specs</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <InputGroup label="Qty Per Pack" type="number" value={formData.packingQty || ''} onChange={(e:any) => handleChange('packingQty', e.target.value)} />
                                    <InputGroup label="Poly Size" value={formData.polytheneSize || ''} onChange={(e:any) => handleChange('polytheneSize', e.target.value)} placeholder='10" x 12"' />
                                    <InputGroup label="Poly Color" value={formData.polytheneColor || ''} onChange={(e:any) => handleChange('polytheneColor', e.target.value)} />
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Pack Type</label>
                                        <select value={formData.packingType || 'Single'} onChange={e => handleChange('packingType', e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-bold outline-none">
                                            <option value="Single">Single Poly</option>
                                            <option value="Double">Double Poly</option>
                                            <option value="Carton">Carton Box</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Compatible Machines */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2">Compatible {activeTab} Machines</h4>
                                <div className="flex flex-wrap gap-2">
                                    {activeMachines.length === 0 ? <p className="text-[10px] font-bold text-rose-500">No {activeTab} machines added yet. Go to Machine Master tab to add.</p> : null}
                                    {activeMachines.map((m: any) => {
                                        const isSelected = (formData.compatibleMachines || []).includes(m.name);
                                        return (
                                            // ✅ FIX: Changed to vivid Emerald (Green) color for selected machines
                                            <button 
                                                key={m.id} 
                                                type="button" 
                                                onClick={() => toggleMachineSelection(m.name)} 
                                                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-colors ${
                                                    isSelected 
                                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/60 dark:border-emerald-500 dark:text-emerald-300 shadow-sm' 
                                                    : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {m.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-[#0B1121] pb-2">
                            <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg">Cancel</button>
                            <button type="submit" className="flex items-center gap-2 px-6 py-2 text-xs font-black bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-md"><Save size={16} /> Save Product</button>
                        </div>
                    </form>
                )}

                {/* --- TAB 2: MACHINE MASTER --- */}
                {modalTab === 'machines' && (
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#0B1121]">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase mb-3">Add New {activeTab} Machine</h4>
                            <form onSubmit={handleAddMachineSubmit} className="flex gap-3">
                                <input type="text" value={newMachineName} onChange={e => setNewMachineName(e.target.value)} placeholder={`e.g. ${activeTab}-01`} required className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-xs font-bold outline-none focus:border-indigo-500 dark:text-white" />
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-xs font-black uppercase shadow-sm">Add</button>
                            </form>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">Registered {activeTab} Machines</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activeMachines.length === 0 && <p className="text-xs text-slate-500 col-span-3">No {activeTab} machines found.</p>}
                            {activeMachines.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg shadow-sm">
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{m.name}</span>
                                    <button onClick={() => onDeleteMachine(m.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});


// ============================================================================
// 🚀 OPTIMIZATION: MEMOIZED ROW COMPONENT (Prevents UI Freeze on Save)
// ============================================================================
const ProductRow = memo(({ p, activeTab, onEdit, onDelete, readOnly }: { p: any, activeTab: string, onEdit: (p: any) => void, onDelete: (id: string) => void, readOnly?: boolean }) => {
    return (
        <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors bg-transparent">
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{p.itemName}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{p.customer || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-800 dark:text-slate-200">{p.weight}</td>
            
            {/* 🟢 Material Data Columns (IM/BM දෙකටම පොදුයි) */}
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.productType || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.materialType || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.materialPercent ? `${p.materialPercent}%` : '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.mbCode || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.mbPercent ? `${p.mbPercent}%` : '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-indigo-500 dark:text-indigo-400">{p.crushPercent ? `${p.crushPercent}%` : '-'}</td>


            
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-600 dark:text-slate-400">{p.stdCavities || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-800 dark:text-slate-200">{p.actualCavities || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-600 dark:text-slate-400">{p.standardCycleTime ? `${p.standardCycleTime}s` : '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-800 dark:text-slate-200">{p.actualCycleTime ? `${p.actualCycleTime}s` : '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-black text-center text-emerald-500 dark:text-emerald-400">{p.targetPerHr || '-'}</td>
            
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-600 dark:text-slate-400">{p.packingQty || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-600 dark:text-slate-400">{p.polytheneSize || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-center text-slate-600 dark:text-slate-400 truncate">{p.polytheneColor || '-'}</td>
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[10px] font-bold text-center text-slate-500 dark:text-slate-400">{p.packingType || '-'}</td>
            
            <td className="py-1.5 px-3 border-r border-slate-100 dark:border-slate-800/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 w-auto">
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                    {(p.compatibleMachines || []).map((m: string) => (
                        <span key={m} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {m}
                        </span>
                    ))}
                    {(!p.compatibleMachines || p.compatibleMachines.length === 0) && '-'}
                </div>
            </td>
            
            {/* 🟢 Edit & Delete Buttons */}
            <td className="py-1.5 px-3 text-center flex items-center justify-center gap-3 sticky right-0 z-20 bg-white dark:bg-[#0B1121] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                {!readOnly && (
                    <>
                        <button onClick={() => onEdit(p)} className="text-slate-400 hover:text-indigo-500 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => onDelete(p.id)} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={13} /></button>
                    </>
                )}
            </td>

        </tr>
    );
});




// ============================================================================
// MAIN PRODUCT DB VIEW (Single Fast Table & Clean UI)
// ============================================================================
const ProductDB = ({ readOnly }: { readOnly?: boolean }) => {
    const {
      products, totalCount, machines, searchQuery, setSearchQuery,
      activeTab, setActiveTab, isModalOpen, openModal, closeModal,
      handleSave, handleDelete, editingProduct,
      handleSaveMachine, handleDeleteMachine
    } = useProductDBLogic();

    const [confirmState, setConfirmState] = useState<{isOpen: boolean, action: 'edit'|'delete'|null, item: any}>({ isOpen: false, action: null, item: null });

    const confirmEdit = (product: any) => setConfirmState({ isOpen: true, action: 'edit', item: product });
    const confirmDelete = (id: string) => setConfirmState({ isOpen: true, action: 'delete', item: id });

    const handleConfirmProceed = () => {
        if (confirmState.action === 'edit') openModal(confirmState.item);
        else if (confirmState.action === 'delete') handleDelete(confirmState.item);
        setConfirmState({ isOpen: false, action: null, item: null });
    };
  
    return (
      <div className="flex flex-col h-full gap-4 relative overflow-hidden">
          
          {/* --- HEADER & TABS --- */}
          <div className="flex flex-col sm:flex-row items-center justify-between shrink-0 bg-white dark:bg-[#0B1121] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-2 z-10">
              <div className="flex items-center gap-3 px-2 w-full sm:w-auto">
                  <Database size={18} className="text-rose-500" />
                  <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase text-slate-700 dark:text-white leading-none">Product DB</h3>
                      <span className="text-[10px] font-bold text-slate-400">{totalCount} Items</span>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-4 border border-slate-200 dark:border-slate-700">
                      <button onClick={() => setActiveTab('IM')} className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'IM' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Layers size={12} /> IM Products</button>
                      <button onClick={() => setActiveTab('BM')} className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'BM' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Factory size={12} /> BM Products</button>
                  </div>
              </div>
  
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-48">
                      <Search size={14} className="absolute left-2 top-1.5 text-slate-400" />
                      <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 pr-2 py-1.5 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-rose-500 dark:text-white" />
                  </div>

                  {!readOnly && (
                  <button onClick={() => openModal()} className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
                      <Plus size={14} strokeWidth={3} /> <span className="hidden sm:inline">Add New</span>
                  </button>
                  )}
              </div>
          </div>
  
          {/* --- MAIN CONTENT AREA (SINGLE UNIFIED TABLE) --- */}
          {/* ✅ FIX: Section ගැලවීම ඉවත් කර එකම Table එකක් සාදා ඇත. Clean UI. */}
          <div className="flex-1 overflow-auto transform-gpu custom-scrollbar w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121]" style={{ willChange: 'transform' }}>
              <table className="w-full border-collapse min-w-max">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 border-b border-slate-300 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
                      <tr>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-left w-[180px]">Item Name</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-left w-[100px]">Customer</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px]">Wt (g)</th>
                          
                          {/* 🟢 Header Columns (IM/BM දෙකටම පොදුයි) */}
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[90px]">Product Type</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[90px]">Material Type</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[60px]">Mat %</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[70px]">MB Code</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[60px]">MB %</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 text-center w-[60px]">Crush %</th>
                          
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px]">Std Cav</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px]">Act Cav</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px]">Std Cyc</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px]">Act Cyc</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 text-center w-[70px]">Tgt / Hr</th>
                          
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[70px]">Qty/Pack</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[90px]">Poly Size</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[80px]">Poly Color</th>
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[90px]">Pack Type</th>
                          
                          <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-left min-w-[350px]">Machines</th>
                          <th className="py-2 px-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 text-center w-[60px] sticky right-0 z-40 bg-slate-100 dark:bg-slate-900 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                    {/* 🟢 වෙනස: Memoize කළ අලුත් ProductRow Component එක භාවිතය */}
                    {products.map((p) => (
                        <ProductRow 
                            key={p.id} 
                            p={p} 
                            activeTab={activeTab} 
                            onEdit={confirmEdit} 
                            onDelete={confirmDelete}
                            readOnly={readOnly} 
                        />
                    ))}

                    {products.length === 0 && (
                        <tr>
                            <td colSpan={17} className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                                No products found for {activeTab}.
                            </td>
                        </tr>
                    )}
                </tbody>
              </table>
          </div>
  


{/* CUSTOM CONFIRMATION MODAL */}
          {confirmState.isOpen && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 transform-gpu transition-all">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">
                          {confirmState.action === 'delete' ? 'Confirm Deletion' : 'Confirm Edit'}
                      </h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">
                          {confirmState.action === 'delete' 
                              ? 'Are you sure you want to permanently delete this product? This action cannot be undone.' 
                              : 'Do you want to proceed to edit this product?'}
                      </p>

                    
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setConfirmState({ isOpen: false, action: null, item: null })} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors">Cancel</button>
                          <button onClick={handleConfirmProceed} className={`px-4 py-2 text-xs font-black text-white rounded-lg shadow-md transition-colors ${confirmState.action === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                              {confirmState.action === 'delete' ? 'Yes, Delete' : 'Yes, Edit'}
                          </button>
                      </div>
                    

                  </div>
              </div>
          )}




          {/* --- RENDER MODAL ONLY WHEN OPEN --- */}
          {isModalOpen && (
              <ProductFormModal 
                  activeTab={activeTab} 
                  initialData={editingProduct} 
                  machines={machines} 
                  onClose={closeModal} 
                  onSave={handleSave} 
                  onSaveMachine={handleSaveMachine} 
                  onDeleteMachine={handleDeleteMachine} 
              />
          )}
      </div>
    );
  };
  
  // Reusable Small Input Component
  const InputGroup = ({ label, ...props }: any) => (
      <div className="space-y-1.5 w-full">
          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">{label}</label>
          <input className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs font-bold outline-none focus:border-rose-500 transition-colors" {...props} />
      </div>
  );
  
  export default ProductDB;