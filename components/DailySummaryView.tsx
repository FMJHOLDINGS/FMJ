import React, { useState } from 'react';
import { FileDown, Calendar, CheckSquare } from 'lucide-react';
import MonthlyProduction from './Monthly Production Report/MonthlyProduction';
import BreakdownSummary from './BreakdownSummary';
import { ATT_KEYS, STOCK_KEYS, fmt } from './DailyReportExporter';

// ============================================================================
// 1. 🎨 THEME CONFIGURATION (වර්ණ වෙනස් කිරීමට මෙතැනින් හැක)
// ============================================================================
const THEME = {
  // --- Main Structure ---
  bgMain: "bg-white dark:bg-slate-800",
  bgSub: "bg-slate-50 dark:bg-slate-900",
  borderMain: "border-slate-400 dark:border-slate-600",
  textMain: "text-slate-800 dark:text-slate-200",
  textMuted: "text-slate-500 dark:text-slate-400",

  // --- Tables ---
  tableHeadBg: "bg-slate-100 dark:bg-slate-800",
  tableHeadText: "text-slate-700 dark:text-slate-300",
  tableCellBg: "bg-white dark:bg-slate-900",
  
  // --- Excel-like Inputs (Click කළ පසු වෙනස් වන වර්ණ) ---
  inputViewModeBg: "hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-text transition-colors",
  inputEditModeBg: "bg-yellow-50 dark:bg-yellow-900/30",
  inputText: "text-slate-900 dark:text-slate-100",
  inputDisabledBg: "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed",
};

// ============================================================================
// 2. 🧩 UI COMPONENTS (Excel-like Input & Cells)
// ============================================================================

// 🟢 EXCEL-LIKE INPUT CELL: (Arrow Keys වලින් මාරු විය හැක - Zero Lag)
const ExcelInputCell = React.memo(({ id, val, onChange, onBlur, className = '', disabled = false }: any) => {
  const [isEditing, setIsEditing] = useState(false);

  // Edit වීම අවසන් කර දත්ත Save කිරීම
  const finishEdit = (e?: any) => {
    setIsEditing(false);
    if (onBlur) onBlur(e);
  };

  // Keyboard එකෙන් Arrow Keys එබූ විට ක්‍රියාත්මක වන කොටස
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!id) return;
    
    let shouldNavigate = false;
    
    // Up, Down සහ Enter එබූ විට කෙලින්ම පනියි
    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) {
      shouldNavigate = true;
    } 
    // Left, Right එබූ විට පනින්නේ Cursor එක කෙළවරටම ආ විට පමණි (Excel වල මෙන්)
    else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const input = e.target as HTMLInputElement;
      if (e.key === 'ArrowLeft' && input.selectionStart === 0) shouldNavigate = true;
      if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) shouldNavigate = true;
    }

    if (shouldNavigate) {
      const parts = id.split('-');
      if (parts.length !== 3) return;
      const section = parts[0];
      const row = parseInt(parts[1]);
      const col = parseInt(parts[2]);

      let nextId = '';
      if (e.key === 'ArrowUp') nextId = `${section}-${row - 1}-${col}`;
      else if (e.key === 'ArrowDown' || e.key === 'Enter') nextId = `${section}-${row + 1}-${col}`;
      else if (e.key === 'ArrowLeft') nextId = `${section}-${row}-${col - 1}`;
      else if (e.key === 'ArrowRight') nextId = `${section}-${row}-${col + 1}`;

      if (nextId) {
        const nextEl = document.getElementById(nextId);
        if (nextEl) {
          e.preventDefault();
          finishEdit(e); // දැනට ඇති Cell එක Save කර වසා දමයි
          // කුඩා Timeout එකක් මඟින් React වලට ඊළඟ Cell එක Render කිරීමට ඉඩ දී එය Open කරයි
          setTimeout(() => nextEl.click(), 10);
        }
      }
    }
  };

  if (disabled) {
    return <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${THEME.inputDisabledBg} ${className}`}>{val || ''}</div>;
  }

  if (isEditing) {
    return (
      <input
        id={id}
        type="text"
        autoFocus
        value={val ?? ''}
        onChange={e => onChange(e.target.value)}
        onBlur={finishEdit}
        onKeyDown={handleKeyDown}
        className={`w-full h-full text-center text-xs font-bold outline-none ring-2 ring-indigo-500 inset-ring ${THEME.inputEditModeBg} ${THEME.inputText} ${className}`}
      />
    );
  }

  return (
    <div 
      id={id} // 🟢 Arrow Keys වලින් ඊළඟ Cell එක සොයා ගැනීමට මෙම ID එක අත්‍යවශ්‍ය වේ
      onClick={() => setIsEditing(true)}
      className={`w-full h-full flex items-center justify-center text-xs font-bold ${THEME.inputViewModeBg} ${THEME.inputText} ${className}`}
    >
      {val || ''}
    </div>
  );
});

const ReadOnlyCell = ({ val, suffix = '', color = '', bg = '' }: { val: string | number; suffix?: string; color?: string; bg?: string }) => (
  <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${color} ${bg}`}>{typeof val === 'number' ? fmt(val) : val}{suffix}</div>
);

const TH = ({ children, className = '', colSpan = 1, rowSpan = 1 }: any) => (
  <th colSpan={colSpan} rowSpan={rowSpan} className={`border ${THEME.borderMain} ${THEME.tableHeadBg} ${THEME.tableHeadText} font-black uppercase text-[10px] p-2 text-center ${className}`}>
    {children}
  </th>
);

const TD = ({ children, className = '', colSpan = 1, rowSpan = 1 }: any) => (
  <td colSpan={colSpan} rowSpan={rowSpan} className={`border ${THEME.borderMain} ${THEME.tableCellBg} ${THEME.textMain} text-xs p-0 ${className}`}>
    {children}
  </td>
);

// ============================================================================
// 3. 🖥️ MAIN UI VIEW
// ============================================================================
interface ViewProps {
  subTab: any; setSubTab: any; selDate: any; setSelDate: any; includePreform: any; setIncludePreform: any;
  data: any; att1: any; setAtt1: any; att2: any; setAtt2: any; stock: any; setStock: any;
  reg: any; setReg: any; del: any; setDel: any; calculatedStock: any; regTotals: any;
  handleExport: () => void; persistData: () => void; allData: any; breakdownCategories: string[]; readOnly?: boolean;
  loadDataForRange?: (start: string, end: string) => void;
}

const DailySummaryView: React.FC<ViewProps> = ({
  readOnly,
  subTab, setSubTab, selDate, setSelDate, includePreform, setIncludePreform,
  data, att1, setAtt1, att2, setAtt2, stock, setStock, reg, setReg, del, setDel,
  calculatedStock, regTotals, handleExport, persistData, allData, breakdownCategories, loadDataForRange
}) => {

  return (
    <div className="space-y-8 pb-20 animate-fade-in relative w-full transform-gpu">
      
      {/* 🟢 TOP TABS */}
      <div className="flex justify-center mb-4">
        <div className={`flex p-1 rounded-2xl border shadow-sm ${THEME.bgMain} ${THEME.borderMain}`}>
          {['DAILY', 'BREAKDOWNS', 'MONTHLY'].map(t => (
            <button key={t} onClick={() => setSubTab(t as any)} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${subTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'DAILY' && (
        <div className="max-w-7xl mx-auto px-4">
          <form className="space-y-8" onSubmit={e => e.preventDefault()}>
            
            {/* 🟢 HEADER (DATE & EXPORT) */}
            <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-3xl shadow-md border ${THEME.bgMain} ${THEME.borderMain}`}>
              <div className="flex items-center gap-6">
                <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl border ${THEME.bgSub} ${THEME.borderMain}`}>
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} className="bg-transparent font-black text-slate-700 dark:text-white outline-none uppercase text-sm dark:[color-scheme:dark]" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${includePreform ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 dark:border-slate-500 group-hover:border-indigo-400'}`}>
                    {includePreform && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input type="checkbox" checked={includePreform} onChange={e => setIncludePreform(e.target.checked)} className="hidden" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">With Preform</span>
                </label>
              </div>
              <button type="button" onClick={handleExport} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1">
                <FileDown className="w-4 h-4" /> Export Report
              </button>
            </div>

            {/* 🟢 GRID LAYOUT: (md:grid-cols-12 මගින් Desktop/Laptop වලදී පේළි 2කට කැඩීම වළක්වයි) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 xl:gap-6">
              
              {/* === LEFT COLUMN (Summary, Shift, Register) === */}
              <div className="col-span-1 md:col-span-5 space-y-6">
                
                {/* 1. PRODUCTION TABLE */}
                <div className={`rounded-lg shadow-sm overflow-hidden border ${THEME.borderMain}`}>
                  <div className={`p-2 text-center font-black uppercase text-xs border-b ${THEME.tableHeadBg} ${THEME.tableHeadText} ${THEME.borderMain}`}>Daily Production Summary</div>
                  <table className="w-full border-collapse">
                    <thead><tr><TH>Type</TH><TH>Planned</TH><TH>Achieve</TH><TH>Loss</TH><TH>%</TH></tr></thead>
                    <tbody>
                      {[{ l: 'BM Line', h: true }, { l: 'Day', d: data.bm.d }, { l: 'Night', d: data.bm.n }, { l: 'Total', d: data.bm.t }, { l: 'MTD', d: data.bm.m }, { l: 'IM Line', h: true }, { l: 'Day', d: data.im.d }, { l: 'Night', d: data.im.n }, { l: 'Total', d: data.im.t }, { l: 'MTD', d: data.im.m }, { l: 'IM+BM\nTotal', d: data.grand.t, b: true }, { l: 'IM+BM\nMTD', d: data.grand.m, b: true }].map((r: any, i) => (
                        <tr key={i}>{r.h ? <TD colSpan={5} className="font-bold text-center bg-slate-50 dark:bg-slate-800/50 p-1 text-indigo-600 dark:text-indigo-400">{r.l}</TD> : <><TD className={`text-center font-bold p-1.5 ${r.b ? 'whitespace-pre-line text-emerald-600 dark:text-emerald-400' : ''}`}>{r.l}</TD><TD className="text-center"><ReadOnlyCell val={r.d.p.toFixed(1)} /></TD><TD className="text-center"><ReadOnlyCell val={r.d.a.toFixed(1)} /></TD><TD className="text-center"><ReadOnlyCell val={r.d.l.toFixed(1)} color="text-rose-500" /></TD><TD className="text-center"><ReadOnlyCell val={r.d.pct.toFixed(0)} suffix="%" /></TD></>}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. SHIFT STATUS */}
                <div className={`rounded-lg shadow-sm overflow-hidden border ${THEME.borderMain}`}>
                  <table className="w-full border-collapse">
                    <thead><tr><TH className="w-32">Shift</TH><TH colSpan={2}>Plan Vs Achievement</TH><TH className="w-20">MTD %</TH></tr></thead>
                    <tbody>
                      {[{ n: 'Shift A', s: data.shift.as, d: data.shift.a }, { n: 'Shift B', s: data.shift.bs, d: data.shift.b }].map((r, i) => (
                        <React.Fragment key={i}>
                          <tr><TD rowSpan={2} className="text-center font-bold p-2 bg-slate-50 dark:bg-slate-800">{r.n}<br /><span className="font-normal text-[9px] text-slate-500">{r.s}</span></TD><TD className="text-center font-bold w-24 p-1 text-slate-500">Plan</TD><TD className="text-center"><ReadOnlyCell val={r.d.p.toFixed(1)} /></TD><TD rowSpan={2} className="text-center font-black text-indigo-600 dark:text-indigo-400"><ReadOnlyCell val={r.d.pct.toFixed(0)} suffix="%" /></TD></tr>
                          <tr><TD className={`text-center font-bold p-1 text-slate-500 border-t ${THEME.borderMain}`}>Achievement</TD><TD className={`text-center border-t ${THEME.borderMain}`}><ReadOnlyCell val={r.d.a.toFixed(1)} /></TD></tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 3. REGISTER (EXCEL INPUTS) */}
                <div className={`rounded-lg shadow-sm overflow-hidden border ${THEME.borderMain}`}>
                  <div className={`p-2 text-center font-black uppercase text-xs border-b ${THEME.tableHeadBg} ${THEME.tableHeadText} ${THEME.borderMain}`}>Register</div>
                  <table className="w-full border-collapse">
                    <thead><tr><TH rowSpan={2} className="w-20">Shift</TH><TH rowSpan={2} className="w-16"></TH><TH rowSpan={2}>Related M/C</TH><TH colSpan={2}>Total M/C</TH></tr><tr><TH className="w-12 text-[8px]">Each</TH><TH className="w-12 text-[8px]">Grand</TH></tr></thead>
                    <tbody>
                      {['Day', 'Night', 'Today'].map((s, idx) => {
                        const p = s === 'Day' ? 'd' : s === 'Night' ? 'n' : 't';
                        const baseRow = idx * 2;
                        const gtVal = idx === 0 ? regTotals.d_GT : idx === 1 ? regTotals.n_GT : regTotals.t_GT;
                        return (
                          <React.Fragment key={s}>
                           <tr><TD rowSpan={2} className="text-center font-bold p-2 text-sm bg-slate-50 dark:bg-slate-800">{s}</TD><TD className="text-center font-bold p-1 text-[10px]">IM</TD><TD className="p-0 h-8"><ExcelInputCell id={`reg-${baseRow}-0`} val={reg[`${p}IM_mc` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}IM_mc`]: v })} onBlur={persistData} disabled={readOnly} /></TD><TD className="p-0 h-8"><ExcelInputCell id={`reg-${baseRow}-1`} val={reg[`${p}IM_t` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}IM_t`]: v })} onBlur={persistData} disabled={readOnly} /></TD><TD rowSpan={2} className={`p-0 border-l ${THEME.borderMain} bg-indigo-50/50 dark:bg-indigo-900/20`}><ReadOnlyCell val={gtVal} color="text-indigo-700 dark:text-indigo-400 font-black" /></TD></tr>
                           <tr className="border-t border-black"><TD className={`text-center font-bold p-1 text-[10px] border-t ${THEME.borderMain}`}>BM</TD><TD className={`p-0 h-8 border-t ${THEME.borderMain}`}><ExcelInputCell id={`reg-${baseRow + 1}-0`} val={reg[`${p}BM_mc` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}BM_mc`]: v })} onBlur={persistData} disabled={readOnly} /></TD><TD className={`p-0 h-8 border-t ${THEME.borderMain}`}><ExcelInputCell id={`reg-${baseRow + 1}-1`} val={reg[`${p}BM_t` as keyof typeof reg]} onChange={(v: string) => setReg({ ...reg, [`${p}BM_t`]: v })} onBlur={persistData} disabled={readOnly} /></TD></tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* === RIGHT COLUMN (Attendance, Stock, Delivery) === */}
              <div className="col-span-1 md:col-span-7 space-y-6 overflow-x-auto custom-scrollbar pb-2">
                
                {/* 4. ATTENDANCE (EXCEL INPUTS) */}
                <div className={`grid grid-cols-2 gap-4 p-2 border rounded-lg shadow-sm ${THEME.bgMain} ${THEME.borderMain}`}>
                  <div className={`col-span-2 text-center font-bold uppercase text-lg border-b mb-2 pb-1 ${THEME.textMain} ${THEME.borderMain}`}>Attendance</div>
                  {[att1, att2].map((att, idx) => (
                    <table key={idx} className={`w-full border-collapse border ${THEME.borderMain}`}>
                      <thead>
                        <tr>
                          {/* 🟢 අලුතින් දැමූ Date Picker එක */}
                          <TH className="p-0 w-24 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-600">
                            <input 
                              type="date" 
                              value={att.date || ''} 
                              onChange={(e) => (idx === 0 ? setAtt1 : setAtt2)({ ...att, date: e.target.value })} 
                              className="w-full h-full bg-transparent text-[10px] font-bold text-center outline-none text-slate-700 dark:text-slate-300 dark:[color-scheme:dark] cursor-pointer"
                            />
                          </TH>
                          <TH>Act</TH>
                          <TH>Pre</TH>
                          <TH>Abs</TH>
                        </tr>
                      </thead>
                      <tbody>

                        
                      {ATT_KEYS.map((k, rIdx) => {
                          // 🟢 Req සහ Balance පේළි සඳහා වෙනම සැකැස්ම (Merge Columns)
                          if (k === 'req' || k === 'balance') {
                            return (
                              <tr key={k}>
                                <TD className="font-bold pl-2 p-1 capitalize text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-600">
                                  {k}
                                </TD>
                                {/* Columns 3ම Merge කිරීම (colSpan={3}) */}
                                <TD colSpan={3} className={`p-0 h-7 ${k === 'balance' ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                  {k === 'balance' ? (
                                    // Balance එක Read-only කර පෙන්වීම
                                    <ReadOnlyCell val={att[k]?.a || '0'} color="text-indigo-700 dark:text-indigo-400 font-black" />
                                  ) : (
                                    // Req එක Input කිරීමට ඉඩ දීම
                                    <ExcelInputCell 
                                      id={`att${idx}-${rIdx}-0`} 
                                      val={att[k]?.a} 
                                      onChange={(v:any) => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], a: v } })} 
                                    />
                                  )}
                                </TD>
                              </tr>
                            );
                          }

                          // 🟢 අලුතින් එක් කළ Total පේළිය (Auto-calc නිසා Read-only කර ඇත)
                          if (k === 'total') {
                            return (
                              <tr key={k}>
                                <TD className="font-bold pl-2 p-1 capitalize text-[10px] text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-600">
                                  {k}
                                </TD>
                                <TD className="p-0 w-12 h-7 bg-slate-50/50 dark:bg-slate-800/30">
                                  <ReadOnlyCell val={att[k]?.a || ''} color="font-black text-slate-800 dark:text-slate-200" />
                                </TD>
                                <TD className="p-0 w-12 h-7 bg-slate-50/50 dark:bg-slate-800/30">
                                  <ReadOnlyCell val={att[k]?.p || ''} color="font-black text-slate-800 dark:text-slate-200" />
                                </TD>
                                <TD className="p-0 w-12 h-7 bg-slate-50/50 dark:bg-slate-800/30">
                                  <ReadOnlyCell val={att[k]?.ab || ''} color="font-black text-rose-600 dark:text-rose-400" />
                                </TD>
                              </tr>
                            );
                          }

                          // 🟢 සාමාන්‍ය පේළි (General, Shift A ආදිය)
                          return (
                            <tr key={k}>
                              <TD className="font-bold pl-2 p-1 capitalize text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-600">
                                {k.replace(/([A-Z])/g, ' $1').trim()}
                              </TD>
                              <TD className="p-0 w-12 h-7"><ExcelInputCell id={`att${idx}-${rIdx}-0`} val={att[k]?.a} onChange={(v:any) => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], a: v } })} /></TD>
                              <TD className="p-0 w-12 h-7"><ExcelInputCell id={`att${idx}-${rIdx}-1`} val={att[k]?.p} onChange={(v:any) => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], p: v } })} /></TD>
                              <TD className="p-0 w-12 h-7"><ExcelInputCell id={`att${idx}-${rIdx}-2`} val={att[k]?.ab} onChange={(v:any) => (idx === 0 ? setAtt1 : setAtt2)({ ...att, [k]: { ...att[k], ab: v } })} className="text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10" /></TD>
                            </tr>
                          );
                        })}


                      </tbody>
                    </table>
                  ))}
                </div>

                

                {/* 5. STOCK (EXCEL INPUTS) */}
                <div className={`rounded-lg shadow-sm overflow-hidden border ${THEME.borderMain}`}>
                  <div className={`p-2 text-center font-black uppercase text-xs border-b ${THEME.tableHeadBg} ${THEME.tableHeadText} ${THEME.borderMain}`}>Preform Issues & Stock Details</div>
                  <table className="w-full border-collapse">
                    <thead><tr><TH className="w-20">Item</TH><TH className="w-24">Opn</TH><TH className="w-24">Rvd</TH><TH className="w-24">Tot (MTD)</TH><TH className="w-24">Iss</TH><TH className="w-24">IsT (MTD)</TH><TH className="w-24">Stk</TH></tr></thead>
                    <tbody>
                      {STOCK_KEYS.map((k, rIdx) => {
                        const c = calculatedStock.calcs[k];
                        return (
                          <tr key={k}><TD className="font-bold text-center uppercase p-1 bg-slate-50 dark:bg-slate-900">{k}</TD><TD className="p-0 h-8"><ExcelInputCell id={`stk-${rIdx}-0`} val={c.o} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], o: v } })} onBlur={persistData} disabled={readOnly || !calculatedStock.isDay1} /></TD><TD className="p-0 h-8"><ExcelInputCell id={`stk-${rIdx}-1`} val={stock[k as keyof typeof stock].r} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], r: v } })} onBlur={persistData} disabled={readOnly} /></TD><TD className="p-0 h-8 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"><ReadOnlyCell val={c.rt} color="text-indigo-700 dark:text-indigo-300" /></TD><TD className="p-0 h-8"><ExcelInputCell id={`stk-${rIdx}-3`} val={stock[k as keyof typeof stock].i} onChange={(v: string) => setStock({ ...stock, [k]: { ...stock[k as keyof typeof stock], i: v } })} onBlur={persistData} disabled={readOnly} /></TD><TD className="p-0 h-8 bg-rose-50/50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"><ReadOnlyCell val={c.it} color="text-rose-700 dark:text-rose-300" /></TD><TD className={`p-0 h-8 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black border-l ${THEME.borderMain}`}><ReadOnlyCell val={c.s} color="text-emerald-700 dark:text-emerald-300" /></TD></tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

               {/* 6. DELIVERY TABLE (EXCEL INPUTS) */}
               <div className={`rounded-lg shadow-sm border overflow-hidden max-w-md mx-auto w-full ${THEME.bgMain} ${THEME.borderMain}`}>
                  <div className={`p-2 text-center font-black uppercase text-xs border-b tracking-wide ${THEME.tableHeadBg} ${THEME.tableHeadText} ${THEME.borderMain}`}>Delivery Details</div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr><TH className="w-1/4 py-1 text-[10px]"></TH><TH className="w-1/3 py-1 text-[10px]">ACTUAL</TH><TH className="w-1/3 py-1 text-[10px]">MTD</TH></tr>
                    </thead>
                    <tbody>
                    <tr><TD className={`font-black text-center py-1 bg-slate-100 dark:bg-slate-900 border-r text-xs ${THEME.borderMain}`}>IM</TD><TD className={`p-0 h-8 border-r ${THEME.borderMain}`}><ExcelInputCell id="del-0-0" val={del.imA} onChange={(v: string) => setDel({ ...del, imA: v })} onBlur={persistData} disabled={readOnly} /></TD><TD className="p-0 h-8"><ExcelInputCell id="del-0-1" val={del.imM} onChange={(v: string) => setDel({ ...del, imM: v })} onBlur={persistData} disabled={readOnly} /></TD></tr>
                    <tr><TD className={`font-black text-center py-1 bg-slate-100 dark:bg-slate-900 border-r border-t text-xs ${THEME.borderMain}`}>BM</TD><TD className={`p-0 h-8 border-t border-r ${THEME.borderMain}`}><ExcelInputCell id="del-1-0" val={del.bmA} onChange={(v: string) => setDel({ ...del, bmA: v })} onBlur={persistData} disabled={readOnly} /></TD><TD className={`p-0 h-8 border-t ${THEME.borderMain}`}><ExcelInputCell id="del-1-1" val={del.bmM} onChange={(v: string) => setDel({ ...del, bmM: v })} onBlur={persistData} disabled={readOnly} /></TD></tr>
                      <tr className="border-t-2 border-slate-400 dark:border-slate-500"><TD className={`font-black text-center py-1 bg-slate-200 dark:bg-slate-950 border-r text-indigo-700 dark:text-indigo-400 uppercase text-[10px] tracking-wider ${THEME.borderMain}`}>Total</TD><TD className={`p-0 h-8 bg-indigo-50/30 dark:bg-indigo-900/10 font-black border-r ${THEME.borderMain}`}><ReadOnlyCell val={del.totA} color="text-indigo-700 dark:text-indigo-400" /></TD><TD className="p-0 h-8 bg-indigo-50/30 dark:bg-indigo-900/10 font-black"><ReadOnlyCell val={del.totM} color="text-indigo-700 dark:text-indigo-400" /></TD></tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </form>
        </div>
      )}

      {subTab === 'BREAKDOWNS' && <div className="max-w-7xl mx-auto px-4"><BreakdownSummary allData={allData} initialDate={selDate} /></div>}
      
      {subTab === 'MONTHLY' && (
  <div className="w-full px-2">
    <MonthlyProduction 
      allData={allData} 
      currentDate={selDate} 
      breakdownCategories={breakdownCategories} 
      loadDataForRange={loadDataForRange} // 👈 දැන් හරියටම Pass වෙනවා!
    />
  </div>
)}


    </div>
  );
};

export default DailySummaryView;