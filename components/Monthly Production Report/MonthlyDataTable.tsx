import React from 'react';

// --- TABLE COMPONENT (විශාල දත්ත වගුව) ---
interface TableProps {
    isSummary: boolean;
    imR: any;
    bmR: any;
    globalR: any;
    breakdownData: any;
    REASONS: string[];
}

const MonthlyDataTable: React.FC<TableProps> = ({ isSummary, imR, bmR, globalR, breakdownData, REASONS }) => {
    
    // Table Headers සහ Cells සඳහා Styles helper components
    const Th = ({ children, rowSpan = 1, colSpan = 1, className = '' }: any) => 
        <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 dark:border-slate-600 bg-[#d9d9d9] dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold text-center p-1 px-2 ${className}`}>{children}</th>;
    
    const Td = ({ children, className = '', bold = false }: any) => 
        <td className={`border border-slate-300 dark:border-slate-600 p-2 text-right text-xs ${bold ? 'font-bold' : ''} ${className}`}>{children}</td>;

    return (
        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-300 shadow-sm bg-white dark:bg-slate-800">
            <table className="w-full border-collapse min-w-[2000px]">
                <thead>
                    <tr>
                        <Th rowSpan={2} className="min-w-[150px]">Module</Th>
                        <Th rowSpan={2}>Planed Weight (Kg)</Th>
                        <Th colSpan={2}>Day Shift</Th>
                        <Th colSpan={2}>Night Shift</Th>
                        <Th colSpan={2}>Total</Th>
                        <Th rowSpan={2}>Prod weight %</Th>
                        <Th rowSpan={2}>Lost (Kg)</Th>
                        <Th rowSpan={2}>Lost (Kg) Accuracy</Th>
                        <Th rowSpan={2}>Lost Kg %</Th>
                        <Th rowSpan={2}>Eff Loss kg</Th>
                        {/* දෝෂ වර්ග (Reasons) Headers */}
                        {REASONS.map(r => <Th key={r} rowSpan={2} className="min-w-[80px] text-[10px] break-words leading-tight">{r}</Th>)}
                    </tr>
                    <tr>
                        <Th>Planed (Kg)</Th><Th>Production (kg)</Th>
                        <Th>Planed (Kg)</Th><Th>Production (kg)</Th>
                        <Th>Total Plan Kg</Th><Th>Production (kg)</Th>
                    </tr>
                </thead>
                <tbody>
                    {/* --- IM Line Data --- */}
                    <tr className="bg-[#bdd7ee] dark:bg-sky-900/30">
                        <td className="bg-[#bdd7ee] dark:bg-sky-900/50 p-2 font-bold text-xs border border-slate-300 dark:border-slate-600">IM Line</td>
                        <Td bold>{imR.planKg.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{imR.dP.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{imR.dA.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{imR.nP.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{imR.nA.toFixed(2)}</Td>
                        <Td bold>{imR.planKg.toFixed(2)}</Td>
                        <Td bold>{imR.prodKg.toFixed(2)}</Td>
                        <Td>{imR.eff.toFixed(2)}%</Td>
                        <Td className="text-rose-600 font-bold">{imR.lostKg.toFixed(2)}</Td>
                        <Td>{imR.breakdownSum.toFixed(2)}</Td>
                        <Td>{imR.lostP.toFixed(2)}%</Td>
                        <Td className="text-amber-600 font-bold">{imR.effLoss !== 0 ? imR.effLoss.toFixed(2) : '-'}</Td>
                        {REASONS.map(r => <Td key={r} className="bg-white dark:bg-slate-800 text-slate-500">{breakdownData[r].im > 0 ? breakdownData[r].im.toFixed(2) : '-'}</Td>)}
                    </tr>

                    {/* --- BM Line Data --- */}
                    <tr className="bg-[#bdd7ee] dark:bg-sky-900/30">
                        <td className="bg-[#bdd7ee] dark:bg-sky-900/50 p-2 font-bold text-xs border border-slate-300 dark:border-slate-600">BM Line</td>
                        <Td bold>{bmR.planKg.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{bmR.dP.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{bmR.dA.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{bmR.nP.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{bmR.nA.toFixed(2)}</Td>
                        <Td bold>{bmR.planKg.toFixed(2)}</Td>
                        <Td bold>{bmR.prodKg.toFixed(2)}</Td>
                        <Td>{bmR.eff.toFixed(2)}%</Td>
                        <Td className="text-rose-600 font-bold">{bmR.lostKg.toFixed(2)}</Td>
                        <Td>{bmR.breakdownSum.toFixed(2)}</Td>
                        <Td>{bmR.lostP.toFixed(2)}%</Td>
                        <Td className="text-amber-600 font-bold">{bmR.effLoss !== 0 ? bmR.effLoss.toFixed(2) : '-'}</Td>
                        {REASONS.map(r => <Td key={r} className="bg-white dark:bg-slate-800 text-slate-500">{breakdownData[r].bm > 0 ? breakdownData[r].bm.toFixed(2) : '-'}</Td>)}
                    </tr>

                    {/* --- Global Totals (Only visible in Summary usually, but computed for day too) --- */}
                    <tr className="bg-[#bdd7ee] dark:bg-sky-900/30 font-bold border-t-2 border-slate-400">
                        <td className="bg-[#bdd7ee] dark:bg-sky-900/50 p-2 font-bold text-xs border border-slate-300 dark:border-slate-600">Global AOP</td>
                        <Td>{globalR.planKg.toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{(imR.dP + bmR.dP).toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{(imR.dA + bmR.dA).toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{(imR.nP + bmR.nP).toFixed(2)}</Td>
                        <Td className="bg-white dark:bg-slate-800">{(imR.nA + bmR.nA).toFixed(2)}</Td>
                        <Td>{globalR.planKg.toFixed(2)}</Td>
                        <Td>{globalR.prodKg.toFixed(2)}</Td>
                        <Td className="text-emerald-700">{globalR.eff.toFixed(2)}%</Td>
                        <Td className="text-rose-700">{globalR.lostKg.toFixed(2)}</Td>
                        <Td className="font-bold">{(globalR.breakdownSum).toFixed(2)}</Td>
                        <Td className="text-rose-700">{(globalR.planKg > 0 ? (globalR.lostKg / globalR.planKg) * 100 : 0).toFixed(2)}%</Td>
                        <Td className="text-amber-700">{globalR.effLoss !== 0 ? globalR.effLoss.toFixed(2) : '-'}</Td>
                        {REASONS.map(r => { const sum = breakdownData[r].im + breakdownData[r].bm; return <Td key={r} className={sum > 0 ? 'text-amber-600' : 'text-slate-400'}>{sum > 0 ? sum.toFixed(2) : '-'}</Td>; })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default MonthlyDataTable;