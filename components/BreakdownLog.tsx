import React from 'react';
import { DayData } from '../types';
import { Activity, Clock, ShieldAlert } from 'lucide-react';
import { calculateTimeDiff } from '../utils';

interface Props {
  allData: Record<string, any>;
  date: string;
}

const BreakdownLog: React.FC<Props> = ({ allData, date }) => {
  const bds = ['IM', 'BM'].flatMap(type => {
    const dayData = allData[`${date}_${type}`] as DayData;
    if (!dayData) return [];
    return dayData.rows.flatMap(row => 
      row.breakdowns.map(bd => ({
        ...bd,
        machine: row.machine,
        type: type,
        product: row.product
      }))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
             <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg"><ShieldAlert /></div>
             <div><h2 className="text-2xl font-black text-slate-800 uppercase">Breakdown Log</h2><p className="text-slate-500 font-bold text-xs uppercase">All recorded downtime for {date}</p></div>
          </div>

          <div className="space-y-3">
             {bds.map(bd => (
               <div key={bd.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-6">
                     <div className="flex flex-col items-center justify-center w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                        <span className="text-xs font-black">{calculateTimeDiff(bd.startTime, bd.endTime)}</span>
                        <span className="text-[8px] font-bold uppercase">Min</span>
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-black text-slate-800 uppercase">{bd.category}</span>
                           <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500">{bd.machine}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 mt-1">{bd.description || 'No description provided'}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Time Range</p>
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> {bd.startTime} - {bd.endTime}</p>
                     </div>
                  </div>
               </div>
             ))}
             {bds.length === 0 && <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px]">No breakdowns recorded for this date.</div>}
          </div>
       </div>
    </div>
  );
};

export default BreakdownLog;