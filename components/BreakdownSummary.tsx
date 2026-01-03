import React, { useState, useMemo } from 'react';
import { calculateMetrics } from '../utils';
import { FileDown, AlertTriangle, Calendar, Clock, Zap, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- VBA EXACT COLOR MAPPING (Long to ARGB Hex) ---
// COL_HEADER_BG = 15790320 → RGB(240,240,240) → #F0F0F0
// COL_SUBTOTAL = 14277081 → RGB(217,217,217) → #D9D9D9
// COL_TOT_BD = 9359529 → RGB(137,227,142) → #89E38E (teal-green)
// COL_EFF_HEAD = 15773696 → RGB(0,176,240) → #00B0F0 (blue)
// COL_GRAND_TOT = 5296274 → RGB(80,210,146) → #50D292 (bright green)
const VBA_COLORS = {
    HEADER_BG: 'FFF0F0F0',
    SUBTOTAL: 'FFD9D9D9',
    TOT_BD: 'FF89E38E',
    EFF_HEAD: 'FF00B0F0',
    GRAND_TOT: 'FF50D292',
};

const PRIORITY_ORDER = [
    "BD Production",
    "BD Engineering",
    "Machine Settings",
    "Cycle Time Deviation",
    "Mold Change Delay",
    "Absenteeism",
    "Power Failure"
];

interface Props {
    allData: Record<string, any>;
    initialDate: string;
}

const BreakdownSummary: React.FC<Props> = ({ allData, initialDate }) => {
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

    // --- DATA AGGREGATION (VBA LOGIC) ---
    const data = useMemo(() => {
        const getData = (type: 'IM' | 'BM') => allData[`${selectedDate}_${type}`]?.rows || [];
        const imRows = getData('IM');
        const bmRows = getData('BM');
        const allRows = [...imRows, ...bmRows];

        // Build breakdown list with VBA skip logic
        const bdList: any[] = [];
        allRows.forEach(row => {
            if (!row.breakdowns) return;
            row.breakdowns.forEach((bd: any) => {
                const catUpper = (bd.category || '').toUpperCase().trim();
                // VBA SKIP: "MOLD CHANGE" or "PLANNED"
                if (catUpper === "MOLD CHANGE" || catUpper === "PLANNED") return;

                // Calc time & weight
                const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;
                const startParts = (bd.startTime || '00:00').split(':').map(Number);
                const endParts = (bd.endTime || '00:00').split(':').map(Number);
                let s = startParts[0] * 60 + startParts[1];
                let e = endParts[0] * 60 + endParts[1];
                if (e < s) e += 1440;
                const dur = Math.max(0, e - s);
                const weight = (Math.floor(ratePerMin * dur) * (row.unitWeight || 0)) / 1000;

                bdList.push({
                    cat: bd.category?.trim() || 'Unknown',
                    shift: row.shift === 'day' ? 'Day' : 'Night',
                    machine: row.machine || '-',
                    time: dur,
                    weight: weight,
                    reason: bd.description || '-',
                    prod: row.product || '-'
                });
            });
        });

        // Efficiency Loss
        const calcEff = (rows: any[]) => rows.reduce((sum, row) => sum + calculateMetrics(row).efficiencyLossKg, 0);
        const effLossBM = calcEff(bmRows);
        const effLossIM = calcEff(imRows);

        // Group by category
        const grouped: Record<string, any[]> = {};
        bdList.forEach(item => {
            const key = item.cat;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });

        // Sort by priority
        const sortedCats = Object.keys(grouped).sort((a, b) => {
            const idxA = PRIORITY_ORDER.indexOf(a);
            const idxB = PRIORITY_ORDER.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        return { bdList, grouped, sortedCats, effLossBM, effLossIM };
    }, [allData, selectedDate]);

    // --- TOGGLE EXPAND ---
    const toggleCat = (cat: string) => {
        setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    // --- EXCEL GENERATION (VBA EXACT LAYOUT) ---
    const downloadExcelReport = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('BREAKDOWNS SUMMERY', {
            pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
            views: [{ showGridLines: false }]
        });

        // Column Widths
        sheet.getColumn(1).width = 25;
        sheet.getColumn(2).width = 8;
        sheet.getColumn(3).width = 10;
        sheet.getColumn(4).width = 8;
        sheet.getColumn(5).width = 10;
        sheet.getColumn(6).width = 40;
        sheet.getColumn(7).width = 20;

        // --- TITLE ---
        sheet.mergeCells('A1:G1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = "BREAKDOWN SUMMARY";
        titleCell.font = { name: 'Times New Roman', size: 26, bold: true };
        titleCell.alignment = { horizontal: 'center' };

        // --- HEADER ROW ---
        const headers = ['Breakdown Category', 'Shift', 'Machine', 'Time', 'Weight', 'Breakdown Reason', 'Product'];
        const headerRow = sheet.getRow(2);
        headerRow.values = headers;
        headerRow.font = { name: 'Calibri', size: 12, bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        for (let c = 1; c <= 7; c++) {
            const cell = sheet.getCell(2, c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.HEADER_BG } };
        }

        // --- DATA ROWS ---
        let r = 3;
        let totalWeight = 0;

        data.sortedCats.forEach(catName => {
            const items = data.grouped[catName];
            let catWeight = 0;

            items.forEach((item, index) => {
                const row = sheet.getRow(r);
                row.getCell(1).value = index === 0 ? catName : '';
                row.getCell(2).value = item.shift;
                row.getCell(3).value = item.machine;
                row.getCell(4).value = item.time;
                row.getCell(5).value = item.weight;
                row.getCell(6).value = item.reason;
                row.getCell(7).value = item.prod;

                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Calibri', size: index === 0 && colNumber === 1 ? 14 : 12, bold: index === 0 && colNumber === 1 };
                    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 6 || colNumber === 7 ? 'left' : 'center' };
                });

                catWeight += item.weight;
                r++;
            });

            // Subtotal Row
            if (items.length > 1) {
                sheet.mergeCells(`A${r}:D${r}`);
                const subRow = sheet.getRow(r);
                subRow.getCell(1).value = `${catName} Total`;
                subRow.getCell(1).alignment = { horizontal: 'right' };
                subRow.getCell(1).font = { bold: true, name: 'Calibri', size: 12 };
                subRow.getCell(5).value = catWeight;
                subRow.getCell(5).numFmt = '0.00';
                subRow.getCell(5).font = { bold: true, name: 'Calibri', size: 12 };

                for (let c = 1; c <= 7; c++) {
                    subRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.SUBTOTAL } };
                }
                r++;
            }

            totalWeight += catWeight;
            r++; // Gap
        });

        // --- TOTAL BREAKDOWN ROW ---
        sheet.mergeCells(`A${r}:D${r}`);
        const totRow = sheet.getRow(r);
        totRow.getCell(1).value = "Total Breakdown";
        totRow.getCell(1).alignment = { horizontal: 'right' };
        totRow.getCell(5).value = totalWeight;
        totRow.getCell(5).numFmt = '0.00';
        for (let c = 1; c <= 7; c++) {
            totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.TOT_BD } };
            totRow.getCell(c).font = { bold: true, name: 'Calibri', size: 12 };
        }
        r += 2;

        // --- EFFICIENCY LOSS SECTION ---
        const totalEff = data.effLossBM + data.effLossIM;

        if (totalEff > 0) {
            // Header
            sheet.mergeCells(`A${r}:C${r}`);
            sheet.getCell(`A${r}`).value = "Efficiency Loss";
            sheet.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.EFF_HEAD } };
            sheet.getCell(`A${r}`).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 12 };
            r++;

            // BM
            sheet.mergeCells(`A${r}:C${r}`);
            sheet.getCell(`A${r}`).value = "BM Efficiency Loss";
            sheet.getCell(`A${r}`).font = { name: 'Calibri', size: 12 };
            sheet.getCell(`E${r}`).value = data.effLossBM;
            sheet.getCell(`E${r}`).numFmt = '0.00';
            r++;

            // IM
            sheet.mergeCells(`A${r}:C${r}`);
            sheet.getCell(`A${r}`).value = "IM Efficiency Loss";
            sheet.getCell(`A${r}`).font = { name: 'Calibri', size: 12 };
            sheet.getCell(`E${r}`).value = data.effLossIM;
            sheet.getCell(`E${r}`).numFmt = '0.00';
            r++;

            // Total Eff
            sheet.mergeCells(`A${r}:C${r}`);
            sheet.getCell(`A${r}`).value = "Total Efficiency Loss";
            sheet.getCell(`A${r}`).font = { bold: true, name: 'Calibri', size: 12 };
            sheet.getCell(`E${r}`).value = totalEff;
            sheet.getCell(`E${r}`).numFmt = '0.00';
            for (let c = 1; c <= 7; c++) {
                sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.SUBTOTAL } };
                sheet.getCell(r, c).font = { bold: true, name: 'Calibri', size: 12 };
            }
            r++;

            // GRAND TOTAL
            sheet.mergeCells(`A${r}:D${r}`);
            sheet.getCell(`A${r}`).value = "Total";
            sheet.getCell(`A${r}`).alignment = { horizontal: 'right' };
            sheet.getCell(`E${r}`).value = totalWeight + totalEff;
            sheet.getCell(`E${r}`).numFmt = '0.00';
            for (let c = 1; c <= 7; c++) {
                sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VBA_COLORS.GRAND_TOT } };
                sheet.getCell(r, c).font = { bold: true, name: 'Calibri', size: 12 };
            }
        }

        // Export
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Breakdown_Summary_${selectedDate}.xlsx`);
    };

    // --- CALCULATIONS FOR UI ---
    const totalBreakdownWeight = data.bdList.reduce((sum, item) => sum + item.weight, 0);
    const totalEffLoss = data.effLossBM + data.effLossIM;
    const grandTotal = totalBreakdownWeight + totalEffLoss;
    const isEmpty = data.bdList.length === 0 && totalEffLoss === 0;

    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {/* HEADER WITH DATE SELECTOR */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Breakdown Summary</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Daily Loss Analysis Report</p>
                        </div>
                    </div>

                    {/* Date Selector */}
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                            <div className="relative flex items-center gap-3 bg-white dark:bg-slate-700 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none cursor-pointer uppercase dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={downloadExcelReport}
                            className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 transition-all shadow-xl shadow-emerald-500/30"
                        >
                            <FileDown className="w-4 h-4" />
                            Download Excel
                        </button>
                    </div>
                </div>
            </div>

            {isEmpty ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 text-center border border-slate-200 dark:border-slate-700 shadow-lg">
                    <AlertTriangle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-lg font-bold text-slate-400">No Breakdown Data Found</p>
                    <p className="text-sm text-slate-300">Select a different date to view breakdowns.</p>
                </div>
            ) : (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl shadow-rose-500/30">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingDown className="w-5 h-5 opacity-80" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Total Breakdown</span>
                            </div>
                            <p className="text-3xl font-black">{totalBreakdownWeight.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/30">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 opacity-80" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Efficiency Loss</span>
                            </div>
                            <p className="text-3xl font-black">{totalEffLoss.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-500/30">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 opacity-80" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Grand Total</span>
                            </div>
                            <p className="text-3xl font-black">{grandTotal.toFixed(2)} <span className="text-lg font-bold opacity-70">kg</span></p>
                        </div>
                    </div>

                    {/* BREAKDOWN CATEGORIES */}
                    <div className="space-y-4">
                        {data.sortedCats.map(catName => {
                            const items = data.grouped[catName];
                            const catWeight = items.reduce((sum: number, item: any) => sum + item.weight, 0);
                            const isExpanded = expandedCats[catName] !== false; // Default expanded

                            return (
                                <div key={catName} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCat(catName)}
                                        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                                            <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase tracking-tight">{catName}</h3>
                                            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full">{items.length} items</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-black text-rose-500">{catWeight.toFixed(2)} kg</span>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </button>

                                    {/* Items Table */}
                                    {isExpanded && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left">Shift</th>
                                                        <th className="px-3 py-3 text-left">Machine</th>
                                                        <th className="px-3 py-3 text-center">Time</th>
                                                        <th className="px-3 py-3 text-right text-rose-500">Weight (kg)</th>
                                                        <th className="px-3 py-3 text-left">Product</th>
                                                        <th className="px-5 py-3 text-left">Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                                                    {items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-5 py-3 font-medium">{item.shift}</td>
                                                            <td className="px-3 py-3 font-bold text-slate-800 dark:text-white">{item.machine}</td>
                                                            <td className="px-3 py-3 text-center font-mono text-slate-500">{item.time}m</td>
                                                            <td className="px-3 py-3 text-right font-bold text-rose-500">{item.weight.toFixed(2)}</td>
                                                            <td className="px-3 py-3 text-slate-500">{item.prod}</td>
                                                            <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{item.reason}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* EFFICIENCY LOSS SECTION */}
                    {totalEffLoss > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 shadow-lg">
                            <h3 className="text-lg font-black uppercase text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-3">
                                <Zap className="w-5 h-5" /> Efficiency Loss
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">BM Efficiency Loss</p>
                                    <p className="text-xl font-black text-amber-600">{data.effLossBM.toFixed(2)} kg</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <p className="text-xs font-bold uppercase text-slate-400 mb-1">IM Efficiency Loss</p>
                                    <p className="text-xl font-black text-amber-600">{data.effLossIM.toFixed(2)} kg</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BreakdownSummary;