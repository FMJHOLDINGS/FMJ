import React, { useMemo } from 'react';
import { ProductionRow } from '../types';
import { calculateMetrics, getDatesInRange } from '../utils';
import { CalendarRange, Database } from 'lucide-react';

interface Props {
  startDate: string;
  endDate: string;
  machineType: 'IM' | 'BM';
  allData: Record<string, any>;
}

const DatabaseView: React.FC<Props> = ({ startDate, endDate, machineType, allData }) => {
  
  // 1. Combine data based on Date Range
  const reportData = useMemo(() => {
    const dates = getDatesInRange(startDate, endDate);
    
    // Structure: [{ date: '2023-11-16', rows: [...], totals: {...} }, ...]
    const grouped = dates.map(date => {
      const key = `${date}_${machineType}`;
      const dayData = allData[key];
      const rows: ProductionRow[] = dayData ? dayData.rows : [];
      
      // Sort rows by shift (Day first) then start time
      rows.sort((a, b) => {
         if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;
         return a.startTime.localeCompare(b.startTime);
      });

      // Calculate Daily Totals
      const subTotal = rows.reduce((acc, row) => {
         const m = calculateMetrics(row);
         return {
            planQty: acc.planQty + m.planQty,
            achvQty: acc.achvQty + row.achievedQty,
            planKg: acc.planKg + m.planKg,
            achvKg: acc.achvKg + m.achievedKg,
            lostQty: acc.lostQty + m.lostQty,
            lostKg: acc.lostKg + m.lostKg,
            bdLostKg: acc.bdLostKg + m.bdLostKg,
            effLostKg: acc.effLostKg + m.efficiencyLossKg,
         };
      }, { planQty: 0, achvQty: 0, planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 });

      return { date, rows, subTotal };
    }).filter(group => group.rows.length > 0); // Hide empty days? Remove this .filter if you want to see standard zero days

    return grouped;
  }, [startDate, endDate, machineType, allData]);

  // 2. Calculate Grand Total
  const grandTotal = reportData.reduce((acc, group) => {
     return {
        planQty: acc.planQty + group.subTotal.planQty,
        achvQty: acc.achvQty + group.subTotal.achvQty,
        planKg: acc.planKg + group.subTotal.planKg,
        achvKg: acc.achvKg + group.subTotal.achvKg,
        lostQty: acc.lostQty + group.subTotal.lostQty,
        lostKg: acc.lostKg + group.subTotal.lostKg,
        bdLostKg: acc.bdLostKg + group.subTotal.bdLostKg,
        effLostKg: acc.effLostKg + group.subTotal.effLostKg,
     };
  }, { planQty: 0, achvQty: 0, planKg: 0, achvKg: 0, lostQty: 0, lostKg: 0, bdLostKg: 0, effLostKg: 0 });

  if (reportData.length === 0) {
     return (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
           <div className="p-4 bg-slate-100 rounded-full text-slate-400 mb-4"><Database className="w-8 h-8"/></div>
           <h3 className="text-lg font-black text-slate-700">No Records Found</h3>
           <p className="text-slate-400 text-sm">Adjust the date range to view production logs.</p>
        </div>
     );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
       {/* Scrolling Wrapper */}
       <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-[11px] min-w-[1800px] border-collapse">
             <thead>
                <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest text-center h-12">
                   <th className="w-24 border-r border-slate-700">Date</th>
                   <th className="w-16">Shift</th>
                   <th className="w-32">Machine</th>
                   <th className="w-64 text-left pl-4">Product</th>
                   <th className="w-16">Wt(g)</th>
                   <th className="w-16">Qty/Hr</th>
                   <th className="w-16">Cav</th>
                   <th className="w-16 text-emerald-300">Time</th>
                   
                   <th className="w-24 bg-slate-700/50">Plan Qty</th>
                   <th className="w-24 bg-slate-700/50 text-emerald-400">Achv Qty</th>
                   
                   <th className="w-24 bg-slate-800">Plan Kg</th>
                   <th className="w-24 bg-slate-800 text-emerald-400">Achv Kg</th>
                   
                   <th className="w-24 bg-slate-700/50 text-rose-300">Lost Qty</th>
                   <th className="w-24 bg-slate-700/50 text-rose-300">Lost Kg</th>

                   <th className="w-24 text-amber-300">BD Loss</th>
                   <th className="w-24 text-amber-300">Eff Loss</th>
                   <th className="w-16">Eff %</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {reportData.map((group) => (
                   <React.Fragment key={group.date}>
                      {/* Loops Rows for this Date */}
                      {group.rows.map((row, idx) => {
                         const m = calculateMetrics(row);
                         return (
                            <tr key={row.id} className="hover:bg-slate-50 text-center text-slate-700 font-bold border-b border-slate-50">
                               <td className="py-2 text-xs font-black text-slate-400 border-r border-slate-100 bg-slate-50/50">
                                  {/* Show date only on first row of group */}
                                  {idx === 0 ? group.date : ''}
                               </td>
                               <td className="py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border ${row.shift === 'day' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                    {row.shift}
                                  </span>
                               </td>
                               <td className="py-2 font-black text-xs">{row.machine}</td>
                               <td className="py-2 text-left pl-4 text-xs font-medium">{row.product}</td>
                               <td className="py-2 text-slate-500">{row.unitWeight}</td>
                               <td className="py-2 text-slate-500">{row.qtyPerHour}</td>
                               <td className="py-2 text-slate-500">{row.cavities}</td>
                               <td className="py-2 text-emerald-700">{m.timeHr}</td>
                               
                               <td className="py-2 bg-slate-50 text-slate-500">{m.planQty}</td>
                               <td className="py-2 bg-emerald-50 text-emerald-700 font-black">{row.achievedQty}</td>
                               
                               <td className="py-2 bg-slate-50 text-slate-600">{m.planKg}</td>
                               <td className="py-2 bg-emerald-50 text-emerald-700 font-black">{m.achievedKg}</td>
                               
                               <td className="py-2 bg-rose-50/30 text-rose-600">{m.lostQty}</td>
                               <td className="py-2 bg-rose-50/30 text-rose-600">{m.lostKg}</td>

                               <td className="py-2 text-amber-600 bg-amber-50/30">{m.bdLostKg}</td>
                               <td className="py-2 text-amber-600 bg-amber-50/30">{m.efficiencyLossKg}</td>
                               <td className="py-2 text-[10px]">{m.efficiency.toFixed(0)}%</td>
                            </tr>
                         );
                      })}

                      {/* --- TOTAL ROW FOR THIS DATE --- */}
                      <tr className="bg-yellow-200 border-b-2 border-slate-300 text-center h-10 font-black text-xs text-slate-900 shadow-sm relative z-10">
                         <td className="border-r border-slate-300 bg-yellow-300">TOTAL ({group.date})</td>
                         <td colSpan={7}></td>
                         
                         <td className="text-slate-800">{group.subTotal.planQty.toLocaleString()}</td>
                         <td className="text-emerald-900 text-sm">{group.subTotal.achvQty.toLocaleString()}</td>
                         
                         <td className="text-slate-800">{group.subTotal.planKg.toFixed(1)}</td>
                         <td className="text-emerald-900 text-sm">{group.subTotal.achvKg.toFixed(1)}</td>
                         
                         <td className="text-rose-700">{group.subTotal.lostQty.toLocaleString()}</td>
                         <td className="text-rose-700">{group.subTotal.lostKg.toFixed(1)}</td>
                         
                         <td className="text-amber-800">{group.subTotal.bdLostKg.toFixed(1)}</td>
                         <td className="text-amber-800">{group.subTotal.effLostKg.toFixed(1)}</td>
                         <td></td>
                      </tr>
                   </React.Fragment>
                ))}

                {/* --- GRAND TOTAL ROW --- */}
                <tr className="bg-slate-900 h-16 text-center text-white font-black text-sm border-t-4 border-slate-800">
                    <td colSpan={5} className="text-left pl-6 text-yellow-400 uppercase tracking-widest text-lg">GRAND TOTAL</td>
                    <td colSpan={3}></td>
                    
                    <td className="text-slate-400 text-xs">{grandTotal.planQty.toLocaleString()}</td>
                    <td className="text-yellow-400 text-lg">{grandTotal.achvQty.toLocaleString()}</td>
                    
                    <td className="text-slate-400 text-xs">{grandTotal.planKg.toFixed(1)}</td>
                    <td className="text-yellow-400 text-lg">{grandTotal.achvKg.toFixed(1)} <span className="text-xs text-white/50">kg</span></td>
                    
                    <td className="text-rose-400 opacity-70">{grandTotal.lostQty.toLocaleString()}</td>
                    <td className="text-rose-400 text-lg">{grandTotal.lostKg.toFixed(1)}</td>
                    
                    <td className="text-amber-400">{grandTotal.bdLostKg.toFixed(1)}</td>
                    <td className="text-amber-400">{grandTotal.effLostKg.toFixed(1)}</td>
                    <td></td>
                </tr>
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default DatabaseView;