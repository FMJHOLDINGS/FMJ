import React, { useState, useMemo } from 'react';
import { calculateMetrics, getMTDData, getBreakdownSummary } from '../utils';
import { BarChart2, AlertOctagon, CalendarRange, Calendar } from 'lucide-react';

// Import the new Monthly Tab
import MonthlyProduction from './MonthlyProduction';
import BreakdownSummary from './BreakdownSummary';

interface Props {
  allData: Record<string, any>;
  date: string;
  breakdownCategories?: string[];
}

const DailySummary: React.FC<Props> = ({ allData, date, breakdownCategories = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'BREAKDOWNS' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState(date);

  // --- DATA CALCULATION ---
  const data = useMemo(() => {
    const getData = (type: 'IM' | 'BM') => allData[`${selectedDate}_${type}`]?.rows || [];
    const imRows = getData('IM');
    const bmRows = getData('BM');

    const bmData = allData[`${selectedDate}_BM`];
    const imData = allData[`${selectedDate}_IM`];
    const shiftASup = bmData?.daySupervisor || imData?.daySupervisor || 'Unassigned';
    const shiftBSup = bmData?.nightSupervisor || imData?.nightSupervisor || 'Unassigned';

    const calc = (rows: any[], shift?: string) => {
      const filtered = shift ? rows.filter((r: any) => r.shift === shift) : rows;
      const res = filtered.reduce((acc, row) => {
        const m = calculateMetrics(row);
        return { plan: acc.plan + m.planKg, achv: acc.achv + m.achievedKg, loss: acc.loss + m.lostKg };
      }, { plan: 0, achv: 0, loss: 0 });
      return {
        plan: Number(res.plan.toFixed(2)),
        achv: Number(res.achv.toFixed(2)),
        loss: Number(res.loss.toFixed(2)),
        pct: res.plan > 0 ? (res.achv / res.plan) * 100 : 0
      };
    };

    const bmD = calc(bmRows, 'day');
    const bmN = calc(bmRows, 'night');
    const bmT = calc(bmRows);
    const imD = calc(imRows, 'day');
    const imN = calc(imRows, 'night');
    const imT = calc(imRows);

    const bmMtdData = getMTDData(allData, selectedDate, 'BM');
    const imMtdData = getMTDData(allData, selectedDate, 'IM');

    const bmM = { plan: Number(bmMtdData.mtdPlan.toFixed(2)), achv: Number(bmMtdData.mtdAchv.toFixed(2)), loss: Number(bmMtdData.mtdLoss.toFixed(2)), pct: bmMtdData.mtdPlan > 0 ? (bmMtdData.mtdAchv / bmMtdData.mtdPlan) * 100 : 0 };
    const imM = { plan: Number(imMtdData.mtdPlan.toFixed(2)), achv: Number(imMtdData.mtdAchv.toFixed(2)), loss: Number(imMtdData.mtdLoss.toFixed(2)), pct: imMtdData.mtdPlan > 0 ? (imMtdData.mtdAchv / imMtdData.mtdPlan) * 100 : 0 };

    const grandTotal = { plan: bmT.plan + imT.plan, achv: bmT.achv + imT.achv, loss: bmT.loss + imT.loss, pct: (bmT.plan + imT.plan) > 0 ? ((bmT.achv + imT.achv) / (bmT.plan + imT.plan)) * 100 : 0 };
    const grandMtd = { plan: bmM.plan + imM.plan, achv: bmM.achv + imM.achv, loss: bmM.loss + imM.loss, pct: (bmM.plan + imM.plan) > 0 ? ((bmM.achv + imM.achv) / (bmM.plan + imM.plan)) * 100 : 0 };

    // Shift breakdown (Day=A, Night=B)
    const shiftAPlan = (bmD.plan + imD.plan);
    const shiftAAchv = (bmD.achv + imD.achv);
    const shiftBPlan = (bmN.plan + imN.plan);
    const shiftBAchv = (bmN.achv + imN.achv);
    const shiftAPct = shiftAPlan > 0 ? (shiftAAchv / shiftAPlan) * 100 : 0;
    const shiftBPct = shiftBPlan > 0 ? (shiftBAchv / shiftBPlan) * 100 : 0;

    const allBreakdowns = getBreakdownSummary([...imRows, ...bmRows]);

    return { bmD, bmN, bmT, bmM, imD, imN, imT, imM, grandTotal, grandMtd, shiftASup, shiftBSup, shiftAPlan, shiftAAchv, shiftAPct, shiftBPlan, shiftBAchv, shiftBPct, allBreakdowns };
  }, [allData, selectedDate]);

  // Table Row Component
  const Tr = ({ children, className = '' }: any) => <tr className={`border border-slate-300 dark:border-slate-600 ${className}`}>{children}</tr>;
  const Th = ({ children, colSpan = 1, rowSpan = 1, className = '' }: any) => <th colSpan={colSpan} rowSpan={rowSpan} className={`border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-black bg-slate-100 dark:bg-slate-800 ${className}`}>{children}</th>;
  const Td = ({ children, className = '' }: any) => <td className={`border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-center ${className}`}>{children}</td>;

  return (
    <div className="space-y-6 pb-20 animate-fade-in relative">
      {/* HEADER: Tabs Only - No Download Button */}
      {/* Centered Tabs for better aesthetics */}
      <div className="flex justify-center">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button onClick={() => setActiveSubTab('DAILY')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'DAILY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <BarChart2 className="w-4 h-4" /> Daily
          </button>
          <button onClick={() => setActiveSubTab('BREAKDOWNS')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'BREAKDOWNS' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <AlertOctagon className="w-4 h-4" /> Breakdowns
          </button>
          <button onClick={() => setActiveSubTab('MONTHLY')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'MONTHLY' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            <CalendarRange className="w-4 h-4" /> Monthly
          </button>
        </div>
      </div>

      {/* --- TAB 1: DAILY SUMMARY (Redesigned & Constrained) --- */}
      {activeSubTab === 'DAILY' && (
        <div className="max-w-[1000px] mx-auto space-y-8">

          {/* Date Selector - Centered & Premium */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <div className="relative flex items-center gap-4 bg-white dark:bg-slate-800 px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-black text-slate-700 dark:text-white outline-none cursor-pointer uppercase dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Main Summary Table - EXACT LAYOUT MATCH */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">

            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-800 text-center">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight font-serif">Daily Production & Down Times Summary</h2>
            </div>

            <div className="p-8">
              <table className="w-full border-collapse text-sm">
                <thead>
                  {/* BM SECTION */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 w-24 text-lg bg-white dark:bg-slate-800">BM</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Planned</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Achievement</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Loss</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 w-24 text-lg bg-white dark:bg-slate-800">%</Th>
                  </Tr>
                </thead>
                <tbody className="text-base font-bold text-slate-700 dark:text-slate-300">
                  {/* Day */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Day</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmD.plan || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmD.achv || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmD.loss || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmD.pct > 0 ? data.bmD.pct.toFixed(0) + '%' : '0%'}</Td>
                  </Tr>
                  {/* Night */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Night</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmN.plan || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmN.achv || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmN.loss || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmN.pct > 0 ? data.bmN.pct.toFixed(0) + '%' : '0%'}</Td>
                  </Tr>
                  {/* Total */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Total</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmT.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmT.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmT.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmT.pct.toFixed(0)}%</Td>
                  </Tr>
                  {/* MTD */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">MTD</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmM.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmM.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmM.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.bmM.pct.toFixed(0)}%</Td>
                  </Tr>

                  {/* IM SECTION HEADER */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">IM</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Planned</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Achievement</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Loss</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">%</Th>
                  </Tr>
                  {/* Day */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Day</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imD.plan || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imD.achv || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imD.loss || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imD.pct > 0 ? data.imD.pct.toFixed(0) + '%' : '0%'}</Td>
                  </Tr>
                  {/* Night */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Night</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imN.plan || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imN.achv || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imN.loss || ''}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imN.pct > 0 ? data.imN.pct.toFixed(0) + '%' : '0%'}</Td>
                  </Tr>
                  {/* Total */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">Total</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imT.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imT.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imT.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imT.pct.toFixed(0)}%</Td>
                  </Tr>
                  {/* MTD */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800">MTD</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imM.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imM.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imM.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.imM.pct.toFixed(0)}%</Td>
                  </Tr>

                  {/* GRAND TOTALS */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800 leading-tight">IM+BM<br />Total</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandTotal.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandTotal.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandTotal.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandTotal.pct.toFixed(0)}%</Td>
                  </Tr>
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800 leading-tight">IM+BM<br />MTD</Th>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandMtd.plan}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandMtd.achv}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandMtd.loss}</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400">{data.grandMtd.pct.toFixed(0)}%</Td>
                  </Tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Shift Breakdown Table - EXACT LAYOUT MATCH */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-8">
              <table className="w-full border-collapse text-base font-bold text-slate-700 dark:text-slate-300">
                <thead>
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Th className="border-2 border-slate-900 dark:border-slate-400 w-48 text-lg bg-white dark:bg-slate-800">Shift</Th>
                    <Th colSpan={2} className="border-2 border-slate-900 dark:border-slate-400 text-lg bg-white dark:bg-slate-800">Plan Vs Achievement</Th>
                    <Th className="border-2 border-slate-900 dark:border-slate-400 w-32 text-lg bg-white dark:bg-slate-800">MTD %</Th>
                  </Tr>
                </thead>
                <tbody>
                  {/* Shift A */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Td rowSpan={2} className="border-2 border-slate-900 dark:border-slate-400 font-bold bg-white dark:bg-slate-800">
                      Shift A<br />
                      <span className="text-sm font-normal">{data.shiftASup}</span>
                    </Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 w-32 bg-white dark:bg-slate-800 text-right pr-4">Plan</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 text-center">{data.shiftAPlan.toFixed(0)}</Td>
                    <Td rowSpan={2} className="border-2 border-slate-900 dark:border-slate-400 text-center text-xl">{data.shiftAPct.toFixed(0)}%</Td>
                  </Tr>
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Td className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800 text-right pr-4">Achievement</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 text-center">{data.shiftAAchv.toFixed(0)}</Td>
                  </Tr>

                  {/* Shift B */}
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Td rowSpan={2} className="border-2 border-slate-900 dark:border-slate-400 font-bold bg-white dark:bg-slate-800">
                      Shift B<br />
                      <span className="text-sm font-normal">{data.shiftBSup}</span>
                    </Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 w-32 bg-white dark:bg-slate-800 text-right pr-4">Plan</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 text-center">{data.shiftBPlan.toFixed(0)}</Td>
                    <Td rowSpan={2} className="border-2 border-slate-900 dark:border-slate-400 text-center text-xl">{data.shiftBPct.toFixed(0)}%</Td>
                  </Tr>
                  <Tr className="border-2 border-slate-900 dark:border-slate-400">
                    <Td className="border-2 border-slate-900 dark:border-slate-400 bg-white dark:bg-slate-800 text-right pr-4">Achievement</Td>
                    <Td className="border-2 border-slate-900 dark:border-slate-400 text-center">{data.shiftBAchv.toFixed(0)}</Td>
                  </Tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: BREAKDOWNS --- */}
      {activeSubTab === 'BREAKDOWNS' && (
        <BreakdownSummary allData={allData} initialDate={selectedDate} />
      )}

      {/* --- TAB 3: MONTHLY PRODUCTION --- */}
      {activeSubTab === 'MONTHLY' && (
        <MonthlyProduction allData={allData} currentDate={selectedDate} breakdownCategories={breakdownCategories} />
      )}
    </div>
  );
};

export default DailySummary;