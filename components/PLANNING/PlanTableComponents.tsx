import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Trash2, Edit2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IMJobPlan } from './PlanningTypes';

// ============================================================================
// 1. COLORS & STYLES CONFIGURATION
// ============================================================================
export const SECTION_COLORS = {
    cardBg: "bg-white dark:bg-[#0B1121]", 
    cardBorder: "border-slate-300 dark:border-slate-600", 
    headerBg: "bg-slate-50 dark:bg-[#0B1121]", 
    headerBorder: "border-slate-300 dark:border-slate-600",
    headerText: "text-slate-700 dark:text-slate-200",
    headerIconHover: "hover:bg-slate-200 dark:hover:bg-slate-800",
    badgeBg: "bg-white dark:bg-[#121b2f]", 
    badgeBorder: "border-slate-300 dark:border-slate-600",
    badgeText: "text-slate-500 dark:text-slate-400"
};



export const TABLE_COLORS = {
    headerBg: "bg-slate-50 dark:bg-[#0B1121]", 
    headerText: "text-slate-600 dark:text-slate-200",
    headerBorder: "border-slate-300 dark:border-slate-600",
    rowHoverBg: "hover:bg-slate-50 dark:hover:bg-[#121b2f]",
    rowDragBg: "bg-[#e2e8f0] dark:bg-[#1e293b]",
    cellBorder: "border-slate-300 dark:border-slate-600", 
    cellTextNormal: "text-slate-800 dark:text-slate-300",
    cellTextReadOnly: "text-slate-600 dark:text-slate-400"
};

export const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).replace(' ', '-');
};

// ============================================================================
// 2. COLUMNS CONFIGURATION (සියලුම කොලම් කිසිදු වෙනසකින් තොරව ඇත)
// ============================================================================
export const COLUMNS = [
    { key: 'dragHandle', label: '', width: 'w-[30px] min-w-[30px]', stickyLeft: true, left: '0px', align: 'text-center' },
    { key: 'machine', label: 'Machine', width: 'w-[80px] min-w-[80px]', stickyLeft: true, left: '30px', align: 'text-center', readOnly: true },
    { key: 'itemName', label: 'Item Name', width: 'w-[200px] min-w-[200px]', stickyLeft: true, left: '110px', align: 'text-left', readOnly: true },
    { key: 'weight', label: 'Weight', width: 'w-[60px] min-w-[60px]', stickyLeft: true, left: '310px', align: 'text-center', type: 'number', readOnly: true },
    { key: 'customer', label: 'Customer', width: 'w-[110px] min-w-[110px]', stickyLeft: true, left: '370px', align: 'text-left', readOnly: true },
  
    { key: 'jobNo', label: 'Job No', width: 'w-[110px] min-w-[110px]', align: 'text-center', readOnly: true },
    { key: 'poNo', label: 'PO No', width: 'w-[100px] min-w-[100px]', align: 'text-center', readOnly: true, collapsible: true },
    { key: 'poDate', label: 'PO Date', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'date', readOnly: true, collapsible: true },
    
    { key: 'orderQty', label: 'Order Qty', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', readOnly: true },
    { key: 'planQty', label: 'Plan Qty', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', readOnly: true },
    { key: 'completedQty', label: 'Comp. Qty', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', isSpecial: true },
    { key: 'balance', label: 'Balance', width: 'w-[90px] min-w-[90px]', align: 'text-center', font: 'text-rose-500', type: 'number', readOnly: true },
    
    { key: 'cavities', label: 'Cavity', width: 'w-[60px] min-w-[60px]', align: 'text-center', type: 'number', readOnly: true, collapsible: true },
    { key: 'cycleTime', label: 'Cycle Time', width: 'w-[80px] min-w-[80px]', align: 'text-center', type: 'number', readOnly: true, collapsible: true },
    { key: 'targetPerHr', label: 'Target/Hr', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', readOnly: true, collapsible: true },
    { key: 'shiftTarget', label: 'Shift Tgt', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', readOnly: true, collapsible: true },
    
    { key: 'days', label: 'Days', width: 'w-[60px] min-w-[60px]', align: 'text-center', type: 'number', readOnly: true },
    { key: 'startDate', label: 'Prod. Start', width: 'w-[100px] min-w-[100px]', align: 'text-center', type: 'date' },
    { key: 'hldMold', label: 'HLD / Changes', width: 'w-[100px] min-w-[100px]', align: 'text-center', font: 'text-amber-600', type: 'number' },
    { key: 'endDate', label: 'Prod. End', width: 'w-[100px] min-w-[100px]', align: 'text-center', type: 'date', readOnly: true },
    { key: 'cartonQty', label: 'Carton Qty', width: 'w-[90px] min-w-[90px]', align: 'text-center', type: 'number', readOnly: true, collapsible: true }, 
  
    { key: 'actions', label: '', width: 'w-[60px] min-w-[60px]', align: 'text-center' }
];

export const EXPANDED_COLS = COLUMNS;
export const COLLAPSED_COLS = COLUMNS.filter(col => !col.collapsible);

// ============================================================================
// 3. INDIVIDUAL CELL COMPONENTS (Header & Editable)
// ============================================================================
export const HeaderCell = memo(({ colConfig }: any) => {
    // Top-0 ලබා දී ඇත්තේ මුළු Table එකටම පොදු Header එකක් ඇති බැවින් එය ඉහළින්ම Sticky වීමටයි
    const stickyStyle: React.CSSProperties = colConfig.stickyLeft 
        ? { position: 'sticky', left: colConfig.left, top: 0, zIndex: 50 } 
        : { position: 'sticky', top: 0, zIndex: 40 };

    return (
        <th 
        className={`p-2 border-b border-r ${TABLE_COLORS.headerBorder} text-[10px] sm:text-xs leading-tight whitespace-nowrap ${colConfig.width} ${colConfig.align || 'text-center'} font-black uppercase ${TABLE_COLORS.headerText} ${TABLE_COLORS.headerBg} bg-clip-padding`} 
        style={stickyStyle}
    >
            {colConfig.label}
        </th>
    );
});

// 🟢 1. අලුත් Component එක: Edit Mode එක අවශ්‍ය තැන් වලට පමණක් State භාවිතා කිරීමට (Lag එක නැති කිරීමේ ප්‍රධාන රහස මෙයයි)
const InlineInputCell = memo(({ job, fieldKey, colConfig, onCommit, finalClass, stickyStyle, readOnly }: any) => {
    const [value, setValue] = useState(job[fieldKey] ?? '');
    const [isEditing, setIsEditing] = useState(false);
    
    useEffect(() => { setValue(job[fieldKey] ?? ''); }, [job[fieldKey]]);
    
    const handleBlur = () => { 
        setIsEditing(false); 
        if (value !== job[fieldKey]) onCommit(job.id, fieldKey, value); 
    };

    if (colConfig.type === 'date') {
        return (
            <td className={finalClass} style={stickyStyle}>
                {!isEditing ? (
                    <div onClick={() => { if (!readOnly) setIsEditing(true); }} className={`w-full flex justify-center px-1 rounded min-h-[18px] items-center text-indigo-600 dark:text-indigo-400 ${!readOnly ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default'}`}>
                        {value ? formatDateDisplay(String(value)) : '-'}
                    </div>
                ) : (
                    <input type="date" value={String(value)} onChange={(e) => { setValue(e.target.value); onCommit(job.id, fieldKey, e.target.value); setIsEditing(false); }} onBlur={() => setIsEditing(false)} autoFocus className="w-full bg-transparent outline-none text-center cursor-pointer dark:[color-scheme:dark] text-indigo-600 dark:text-indigo-400" />
                )}
            </td>
        );
    }

    return (
        <td className={finalClass} style={stickyStyle}>
            {!isEditing ? (
                <div onClick={() => { if (!readOnly) setIsEditing(true); }} className={`w-full flex justify-center px-1 rounded min-h-[18px] items-center ${!readOnly ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default'}`}>
                    {value || '-'}
                </div>
            ) : (
                <input type={colConfig.type || 'text'} value={String(value)} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} autoFocus placeholder="-" className={`w-full bg-transparent outline-none ${colConfig.align || 'text-center'} focus:bg-black/5 dark:focus:bg-white/10 rounded border border-transparent focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors`} />
            )}
        </td>
    );
});




// 🟢 2. EditableCell Component එක (Custom Confirmation Modal ඇතුළත් කර ඇත)
export const EditableCell = memo(({ job, colConfig, onCommit, onOpenCompletion, rowIndex, onDelete, onEdit, onManualComplete, dragHandleProps, rowBgClass, readOnly }: any) => {
    const fieldKey = colConfig.key as keyof IMJobPlan;
    const isInlineEditable = (fieldKey === 'hldMold') || (fieldKey === 'startDate' && rowIndex === 0);

    const stickyStyle: React.CSSProperties = colConfig.stickyLeft ? { position: 'sticky', left: colConfig.left, zIndex: 20 } : {};
    const bgClass = colConfig.stickyLeft ? rowBgClass : "bg-transparent"; 
    
    const CELL_CLASSES = `p-1 border-b border-r ${TABLE_COLORS.cellBorder} text-[10px] sm:text-[11px] whitespace-nowrap font-bold bg-clip-padding`;
    const finalClass = `${CELL_CLASSES} ${colConfig.width} ${colConfig.align || 'text-center'} ${colConfig.font || TABLE_COLORS.cellTextNormal} ${bgClass}`;

    // 🟢 අලුත් State: Confirmation Popup එක පෙන්වීමට
    const [confirmAction, setConfirmAction] = useState<'edit' | 'delete' | null>(null);

    const handleConfirm = () => {
        if (confirmAction === 'edit') onEdit(job);
        if (confirmAction === 'delete') onDelete(job.id);
        setConfirmAction(null);
    };

    if (colConfig.key === 'dragHandle') return (
        <td className={finalClass} style={stickyStyle} {...(!readOnly ? dragHandleProps : {})}>
            {!readOnly && <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-500"><GripVertical size={14} /></div>}
        </td>
    );
    
    if (colConfig.key === 'actions') return (
        <td className={finalClass} style={stickyStyle}>
            {!readOnly && (
                <div className="flex justify-center gap-2 relative">
                    <button onClick={() => setConfirmAction('edit')} className="text-slate-400 hover:text-amber-500"><Edit2 size={13} /></button>
                    <button onClick={() => setConfirmAction('delete')} className="text-slate-400 hover:text-rose-500"><Trash2 size={13} /></button>
                </div>
            )}

            {/* 🟢 CUSTOM CONFIRMATION MODAL (Fixed using React Portal) */}
            {confirmAction && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0B1121] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 transform-gpu transition-all">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 whitespace-normal">
                            {confirmAction === 'delete' ? 'Confirm Deletion' : 'Confirm Edit'}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 whitespace-normal text-left">
                            {confirmAction === 'delete' 
                                ? `Are you sure you want to permanently delete Job No: ${job.jobNo || '-'}? This action cannot be undone.` 
                                : `Do you want to proceed to edit Job No: ${job.jobNo || '-'}?`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleConfirm} className={`px-4 py-2 text-xs font-black text-white rounded-lg shadow-md transition-colors ${confirmAction === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                                {confirmAction === 'delete' ? 'Yes, Delete' : 'Yes, Edit'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body 
            )}
        </td>
    );

    if (colConfig.isSpecial && colConfig.key === 'completedQty') return (
        <td className={finalClass} style={stickyStyle}>
            <div className="flex justify-center">
                <button onClick={() => { if (!readOnly) onOpenCompletion(job); }} className={`px-1 rounded transition-colors text-emerald-600 dark:text-emerald-400 ${!readOnly ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40' : 'cursor-default'}`}>
                    {Number(job[fieldKey] || 0).toLocaleString()}
                </button>
            </div>
        </td>
    );
    
    if (colConfig.key === 'cartonQty') {
        const packQty = job.packingQty ? Number(job.packingQty) : 0;
        const cartonQty = packQty > 0 ? Math.ceil(Number(job.planQty || 0) / packQty) : '-';
        return <td className={finalClass} style={stickyStyle}><div className="w-full flex justify-center px-1 text-indigo-600 dark:text-indigo-400 cursor-default">{cartonQty}</div></td>;
    }

    if (isInlineEditable) {
        return <InlineInputCell job={job} fieldKey={fieldKey} colConfig={colConfig} onCommit={onCommit} finalClass={finalClass} stickyStyle={stickyStyle} readOnly={readOnly} />;
    }


    if (colConfig.key === 'jobNo') {
        const isReadyToComplete = Number(job.planQty) > 0 && Number(job.balance) <= 0;
        return (
            <td className={finalClass} style={stickyStyle}>
                <div className={`w-full flex items-center ${colConfig.align === 'text-left' ? 'justify-start' : 'justify-center'} px-1 ${TABLE_COLORS.cellTextReadOnly} cursor-default truncate relative gap-1`}>
                    <span>{job[fieldKey] === '' || job[fieldKey] === undefined ? '-' : job[fieldKey]}</span>
                    {isReadyToComplete && !readOnly && (
                        <button 
                            onClick={() => onManualComplete && onManualComplete(job.id)}
                            title="Mark as Completed"
                            className="text-emerald-500 hover:text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/40 rounded-full p-[2px] transition-colors flex-shrink-0"
                        >
                            <CheckCircle2 size={12} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </td>
        );
    }


    return (
        <td className={finalClass} style={stickyStyle}>
            <div className={`w-full flex ${colConfig.align === 'text-left' ? 'justify-start' : 'justify-center'} px-1 ${TABLE_COLORS.cellTextReadOnly} cursor-default truncate`}>
                {colConfig.type === 'date' ? formatDateDisplay(String(job[fieldKey])) : (job[fieldKey] === '' || job[fieldKey] === undefined ? '-' : job[fieldKey])}
            </div>
        </td>
    );
}, (prev, next) => {
    return prev.job === next.job && prev.rowIndex === next.rowIndex && prev.rowBgClass === next.rowBgClass && prev.readOnly === next.readOnly;
});






// ============================================================================
// 4. SORTABLE ROW COMPONENT
// ============================================================================
export const SortableRow = memo(({ job, rowIndex, visibleColumns, onCommit, onOpenCompletion, onDelete, onEdit, onManualComplete, readOnly }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id, data: { job } });
    
    // 🟢 වෙනස 1: Drag කරන විට පේළි පනින එක (Glitch) නැවැත්වීමට CSS.Transform වෙනුවට CSS.Translate යොදා ඇත.
    const style = { 
        transform: CSS.Translate.toString(transform), 
        transition, 
        zIndex: isDragging ? 100 : 'auto', 
        position: 'relative' as 'relative', 
        opacity: isDragging ? 0.4 : 1, 
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.2)' : 'none', 
        willChange: 'transform' 
    };
    
    const isFirstRow = rowIndex === 0;
    const rowBgClass = isDragging 
        ? TABLE_COLORS.rowDragBg 
        : (isFirstRow ? "bg-[#a7f3d0] dark:bg-[#064e3b] group-hover:bg-[#d1fae5] dark:group-hover:bg-[#065f46]" : "bg-white dark:bg-[#0B1121] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50");

    return (
        // 🟢 වෙනස 2: <tr> එකෙන් listeners ඉවත් කර ඇත. දැන් Drag කළ හැක්කේ Grip අයිකන් එකෙන් පමණි.
        <tr ref={setNodeRef} style={style} className={`group transition-colors ${rowBgClass}`}>
            {visibleColumns.map((col: any) => (
                <EditableCell 
                key={col.key} job={job} colConfig={col} rowIndex={rowIndex} rowBgClass={rowBgClass}
                onCommit={onCommit} onOpenCompletion={onOpenCompletion} onDelete={onDelete} onEdit={onEdit} onManualComplete={onManualComplete}
                dragHandleProps={col.key === 'dragHandle' ? { ...attributes, ...listeners } : undefined} 
                readOnly={readOnly}
            />

            ))}
        </tr>
    );
}, (prevProps, nextProps) => {
    return prevProps.job === nextProps.job && prevProps.rowIndex === nextProps.rowIndex && prevProps.visibleColumns === nextProps.visibleColumns;
});

// ============================================================================
// 5. MACHINE SECTION COMPONENT (එක් එක් මැෂින් එක සඳහා <tbody>)
// ============================================================================
export const MachineSection = memo(({ machineId, jobs, visibleColumns, isAllExpanded, onToggle, planType, onCommit, onOpenCompletion, onDelete, onEdit, onManualComplete, readOnly }: any) => {
    const { setNodeRef } = useDroppable({ id: machineId, data: { type: 'Machine', machineId } });
    const dotColor = planType === 'IM' ? 'bg-indigo-500' : 'bg-amber-500';


    // 🟢 Loading % ගණනය කිරීම
    const totalDays = jobs.reduce((sum: number, job: any) => sum + (Number(job.days) || 0), 0);
    const totalHLD = jobs.reduce((sum: number, job: any) => sum + (Number(job.hldMold) || 0), 0);
    const loadingPercent = Math.round(((totalDays + totalHLD) / 25) * 100);


    
    return (
        // 🟢 වෙනස 3: අන්තිම පේළියේ Border එක මැකී යන ගැටළුව විසඳීමට මෙහි තිබූ border-b-[8px] ඉවත් කර ඇත.
        <tbody ref={setNodeRef}>
            {/* Machine Name Separator Row */}
            <tr className={`${SECTION_COLORS.headerBg}`}>
                {/* 🟢 වෙනස: td හි තිබූ sticky left-0 ඉවත් කර, ඇතුළත ඇති div එකට ලබා දී ඇත */}
                <td colSpan={visibleColumns.length} className={`p-0 border-b border-r ${SECTION_COLORS.headerBorder}`}>
                    <div className="sticky left-0 flex items-center gap-3 px-4 py-2 w-max z-30">
                        <button onClick={onToggle} className={`p-1 rounded transition-colors text-slate-500 dark:text-slate-400 ${SECTION_COLORS.headerIconHover}`}>
                            {isAllExpanded ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${machineId === 'Unassigned' ? 'bg-rose-500' : dotColor} shadow-sm`}></div>
                            <h4 className={`text-sm font-black uppercase tracking-wider ${SECTION_COLORS.headerText}`}>
                                {machineId === 'Unassigned' ? 'Unassigned' : machineId}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${SECTION_COLORS.badgeBg} ${SECTION_COLORS.badgeBorder} ${SECTION_COLORS.badgeText}`}>
                                {jobs.length} Jobs
                            </span>
                            {/* 🟢 Loading % පෙන්වීම (රතු පැහැයෙන්) */}
                            {machineId !== 'Unassigned' && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                    {loadingPercent}% Load
                                </span>
                            )}
                        </div>
                    </div>
                </td>
            </tr>

            {/* Jobs for this Machine */}
            <SortableContext items={jobs.map((j: any) => j.id)} strategy={verticalListSortingStrategy}>
                {jobs.map((job: any, rowIndex: number) => (
                    <SortableRow 
                    key={job.id} job={job} rowIndex={rowIndex} visibleColumns={visibleColumns}
                    onCommit={onCommit} onOpenCompletion={onOpenCompletion} onDelete={onDelete} onEdit={onEdit} onManualComplete={onManualComplete}
                    readOnly={readOnly}
                />
                
                ))}
            </SortableContext>
        </tbody>
    );
});