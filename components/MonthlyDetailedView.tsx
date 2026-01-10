import React, { useState } from 'react';
import { calculateMetrics } from '../utils';
import { FileDown, Table2, LayoutList, Calendar } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRef } from 'react';

// --- DEFAULT FALLBACK CATEGORIES (if none defined in Admin) ---
const DEFAULT_REASONS = [
    "Effeicency loss", "Mould Change Delay", "Quality Issues", "Sampling",
    "Machine Settings", "Machine Starting Delay", "Labour Shortage", "Abseteesm",
    "Power Failure", "Color Changing", "BD Engineering", "BD Production",
    "Mould Breakdown", "Cycle Time Deviation", "Hopper Material Stock Taking",
    "No Orders", "Lack of Materials", "Material Issues", "Lack of Packing Materials",
    "Planning Delay", "Early Leave", "Other1"
];

// Colors (ARGB) - Matching VBA RGB Values
const COL_L_BLUE = 'FFBDD7EE';
const COL_L_GREY = 'FFD9D9D9';
const COL_HEADER_BLUE = 'FF4472C4';

interface Props {
    dailyData: any[];
    monthTotals: any;
    allData: Record<string, any>;
    currentDate: string;
    breakdownCategories?: string[];
}

const MonthlyDetailedView: React.FC<Props> = ({ dailyData, monthTotals, allData, currentDate, breakdownCategories = [] }) => {

    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('Summary');

    const REASONS = breakdownCategories.length > 0 ? breakdownCategories : DEFAULT_REASONS;

    // --- DATA HELPERS ---
    const getBreakdownLoss = (dateStr: string, machineType: 'IM' | 'BM', category: string) => {
        const key = `${dateStr}_${machineType}`;
        const rows = allData?.[key]?.rows || [];
        let loss = 0;

        rows.forEach((r: any) => {
            const ratePerMin = ((r.qtyPerHour || 0) * (r.cavities || 1)) / 60;
            const uWeight = r.unitWeight || 0;

            if (r.breakdowns) {
                r.breakdowns.forEach((bd: any) => {
                    if (bd.category === category) {
                        if (!bd.startTime || !bd.endTime) return;
                        const partsS = bd.startTime.split(':');
                        const partsE = bd.endTime.split(':');
                        if (partsS.length < 2 || partsE.length < 2) return;
                        const s = parseInt(partsS[0]) * 60 + parseInt(partsS[1]);
                        const e = parseInt(partsE[0]) * 60 + parseInt(partsE[1]);
                        const dur = e - s > 0 ? e - s : (1440 - s) + e;
                        const lQty = Math.floor(ratePerMin * dur);
                        loss += (lQty * uWeight) / 1000;
                    }
                });
            }
        });
        return loss;
    };

    const getEfficiencyLoss = (dateStr: string, machineType: 'IM' | 'BM') => {
        const key = `${dateStr}_${machineType}`;
        const rows = allData?.[key]?.rows || [];
        let loss = 0;
        rows.forEach((r: any) => {
            const m = calculateMetrics(r);
            loss += m.efficiencyLossKg;
        });
        return loss;
    };

    const getDayData = (dayIndex: number) => {
        if (!currentDate) return { im: { dP: 0, dA: 0, nP: 0, nA: 0 }, bm: { dP: 0, dA: 0, nP: 0, nA: 0 }, dateStr: '' };
        const [year, month] = currentDate.split('-');
        const dayDate = `${year}-${month}-${String(dayIndex).padStart(2, '0')}`;

        let imDayP = 0, imDayA = 0, imNightP = 0, imNightA = 0;
        const imRows = allData?.[`${dayDate}_IM`]?.rows || [];
        imRows.forEach((row: any) => {
            const m = calculateMetrics(row);
            if (row.shift === 'day') { imDayP += m.planKg; imDayA += m.achievedKg; }
            else { imNightP += m.planKg; imNightA += m.achievedKg; }
        });

        let bmDayP = 0, bmDayA = 0, bmNightP = 0, bmNightA = 0;
        const bmRows = allData?.[`${dayDate}_BM`]?.rows || [];
        bmRows.forEach((row: any) => {
            const m = calculateMetrics(row);
            if (row.shift === 'day') { bmDayP += m.planKg; bmDayA += m.achievedKg; }
            else { bmNightP += m.planKg; bmNightA += m.achievedKg; }
        });

        return {
            im: { dP: imDayP, dA: imDayA, nP: imNightP, nA: imNightA },
            bm: { dP: bmDayP, dA: bmDayA, nP: bmNightP, nA: bmNightA },
            dateStr: dayDate
        };
    };

    // --- EXCEL GENERATION LOGIC ---
    const downloadSystemReport = async () => {
        try {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 500)); 

            // --- CALCULATE WORKING DAYS (Schedule & Production) ---
            let schedDaysIM = 0, schedDaysBM = 0;
            let prodDaysIM = 0, prodDaysBM = 0;
            
            const [yStr, mStr] = currentDate.split('-');
            const daysInMonthTotal = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
            
            for (let i = 1; i <= daysInMonthTotal; i++) {
                const dd = getDayData(i);
                
                // Schedule Working Days (Based on Plan > 0)
                if (dd.im.dP > 0) schedDaysIM += 0.5;
                if (dd.im.nP > 0) schedDaysIM += 0.5;
                if (dd.bm.dP > 0) schedDaysBM += 0.5;
                if (dd.bm.nP > 0) schedDaysBM += 0.5;
                
                // Production Working Days (Based on Achievement > 0)
                if (dd.im.dA > 0) prodDaysIM += 0.5;
                if (dd.im.nA > 0) prodDaysIM += 0.5;
                if (dd.bm.dA > 0) prodDaysBM += 0.5;
                if (dd.bm.nA > 0) prodDaysBM += 0.5;
            }
            
            const schedDaysTotal = Math.max(schedDaysIM, schedDaysBM);
            const prodDaysTotal = Math.max(prodDaysIM, prodDaysBM);

            const workbook = new ExcelJS.Workbook();
            
            const setupTableLayout = (ws: ExcelJS.Worksheet, dayIndex: number, isSummary: boolean) => {
                ws.getColumn(1).width = 18;
                for (let c = 2; c <= 35; c++) ws.getColumn(c).width = 14;
                ws.getCell('A1').value = "Daily Production Report";
                ws.getCell('A1').font = { name: 'Times New Roman', size: 20, bold: true };

                const stylesHeader = {
                    font: { bold: true, name: 'Calibri', size: 11 },
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COL_L_GREY } },
                    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                    border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
                };

                const setH = (r: number, c: number, val: string) => {
                    const cell = ws.getCell(r, c);
                    cell.value = val;
                    cell.font = stylesHeader.font;
                    cell.fill = stylesHeader.fill as any;
                    cell.alignment = stylesHeader.alignment as any;
                    cell.border = stylesHeader.border as any;
                };

                setH(3, 1, "Module"); ws.mergeCells('A3:A4');
                setH(3, 2, "Planed Weight (Kg)"); ws.mergeCells('B3:B4');
                setH(3, 3, "Day Shift"); ws.mergeCells('C3:D3');
                setH(4, 3, "Planed (Kg)"); setH(4, 4, "Production (kg)");
                setH(3, 5, "Night Shift"); ws.mergeCells('E3:F3');
                setH(4, 5, "Planed (Kg)"); setH(4, 6, "Production (kg)");
                setH(3, 7, "Total"); ws.mergeCells('G3:H3');
                setH(4, 7, "Total Plan Kg"); setH(4, 8, "Production (kg)");
                setH(3, 9, "Prod weight Planed weight"); ws.mergeCells('I3:I4');
                setH(3, 10, "Lost (Kg)"); ws.mergeCells('J3:J4');
                setH(3, 11, "Lost (Kg) Accuracy"); ws.mergeCells('K3:K4');
                setH(3, 12, "Lost Kg vs plan kg"); ws.mergeCells('L3:L4');
                setH(3, 13, "Eff Loss kg"); ws.mergeCells('M3:M4');
                REASONS.forEach((reason, idx) => { const col = 14 + idx; setH(3, col, reason); ws.mergeCells(3, col, 4, col); });
                ws.getRow(3).height = 45; ws.getRow(4).height = 45;

                const rowLabels = [{ r: 5, l: "IM Line" }, { r: 6, l: "BM Line" }, { r: 7, l: "Global AOP" }];
                rowLabels.forEach(item => {
                    const r = item.r;
                    ws.getCell(r, 1).value = item.l;
                    ws.getCell(r, 1).font = { bold: true, name: 'Calibri' };
                    ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL_L_BLUE } };
                    for (let c = 1; c <= 13 + REASONS.length; c++) {
                        ws.getCell(r, c).border = stylesHeader.border as any;
                        if (c > 1) {
                            ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' };
                            ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL_L_BLUE } };
                            const isInputArea = (c >= 3 && c <= 6 && r < 7) || (c >= 14);
                            if (isInputArea) ws.getCell(r, c).fill = { type: 'pattern', pattern: 'none' };
                        }
                    }
                    ws.getRow(r).height = 33.75;
                });

                if (isSummary) {
                    const sum3D = (cell: string) => ({ formula: `SUM('1:31'!${cell})` });
                    ws.getCell('C5').value = sum3D('C5'); ws.getCell('D5').value = sum3D('D5');
                    ws.getCell('E5').value = sum3D('E5'); ws.getCell('F5').value = sum3D('F5');
                    ws.getCell('C6').value = sum3D('C6'); ws.getCell('D6').value = sum3D('D6');
                    ws.getCell('E6').value = sum3D('E6'); ws.getCell('F6').value = sum3D('F6');
                    ws.getCell('M5').value = sum3D('M5'); ws.getCell('M6').value = sum3D('M6'); 
                    REASONS.forEach((_, i) => { const colLet = ws.getColumn(14 + i).letter; ws.getCell(5, 14 + i).value = sum3D(`${colLet}5`); ws.getCell(6, 14 + i).value = sum3D(`${colLet}6`); });
                } else {
                    const { im, bm, dateStr } = getDayData(dayIndex);
                    ws.getCell('C5').value = im.dP; ws.getCell('D5').value = im.dA;
                    ws.getCell('E5').value = im.nP; ws.getCell('F5').value = im.nA;
                    ws.getCell('C6').value = bm.dP; ws.getCell('D6').value = bm.dA;
                    ws.getCell('E6').value = bm.nP; ws.getCell('F6').value = bm.nA;

                    const effLossIM = getEfficiencyLoss(dateStr, 'IM');
                    const effLossBM = getEfficiencyLoss(dateStr, 'BM');
                    if (effLossIM > 0) ws.getCell('M5').value = effLossIM;
                    if (effLossBM > 0) ws.getCell('M6').value = effLossBM;

                    REASONS.forEach((res, i) => { const valIM = getBreakdownLoss(dateStr, 'IM', res); const valBM = getBreakdownLoss(dateStr, 'BM', res); if (valIM > 0) ws.getCell(5, 14 + i).value = valIM; if (valBM > 0) ws.getCell(6, 14 + i).value = valBM; });
                }

                [5, 6].forEach(r => {
                    ws.getCell(`B${r}`).value = { formula: `C${r}+E${r}` };
                    ws.getCell(`G${r}`).value = { formula: `C${r}+E${r}` };
                    ws.getCell(`H${r}`).value = { formula: `D${r}+F${r}` };
                    ws.getCell(`I${r}`).value = { formula: `IFERROR(H${r}/G${r},0)` }; ws.getCell(`I${r}`).numFmt = '0.00%';
                    ws.getCell(`J${r}`).value = { formula: `B${r}-H${r}` };
                    ws.getCell(`K${r}`).value = { formula: `SUM(M${r}:AJ${r})` };
                    ws.getCell(`L${r}`).value = { formula: `IFERROR(J${r}/B${r},0)` }; ws.getCell(`L${r}`).numFmt = '0.00%';
                });
                const lastCol = 13 + REASONS.length;
                for (let c = 2; c <= lastCol; c++) { const colLet = ws.getColumn(c).letter; if (c === 9) { ws.getCell(7, c).value = { formula: `IFERROR(H7/B7,0)` }; ws.getCell(7, c).numFmt = '0.00%'; } else if (c === 12) { ws.getCell(7, c).value = { formula: `IFERROR(J7/B7,0)` }; ws.getCell(7, c).numFmt = '0.00%'; } else if (c === 10) { ws.getCell(7, c).value = { formula: `B7-H7` }; } else { ws.getCell(7, c).value = { formula: `SUM(${colLet}5:${colLet}6)` }; } }
            };

            const addSummarySections = (ws: ExcelJS.Worksheet) => {
                const lastCol = 13 + REASONS.length;
                const lastColLetter = ws.getColumn(lastCol).letter;

                const borderStyle: Partial<ExcelJS.Borders> = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                const greyFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL_L_GREY } };

                // --- A. Schedule Table (A9:B13) ---
                ws.getCell('A9').value = 'Schedule';
                ws.getCell('A9').font = { bold: true };
                ws.getCell('B9').value = 'AOP';
                ws.getCell('B9').font = { bold: true };

                ws.getCell('A10').value = 'Working Days';
                ws.getCell('B10').value = schedDaysTotal; // UPDATED with calculated days
                ws.getCell('A11').value = 'Average Per Day (Kg)';
                ws.getCell('B11').value = { formula: 'IFERROR(G7/B10,0)' };
                ws.getCell('A12').value = 'Average per day(Kg)-IM';
                ws.getCell('B12').value = { formula: 'IFERROR(G5/B10,0)' };
                ws.getCell('A13').value = 'Average per day(Kg)-BM';
                ws.getCell('B13').value = { formula: 'IFERROR(G6/B10,0)' };

                for (let r = 10; r <= 13; r++) {
                    ws.getCell(r, 1).border = borderStyle;
                    ws.getCell(r, 1).fill = greyFill;
                    ws.getCell(r, 2).border = borderStyle;
                    ws.getCell(r, 2).fill = greyFill;
                    ws.getCell(r, 2).numFmt = '0.0';
                }

                // --- B. Production Table (D9:E13) ---
                ws.getCell('D9').value = 'Production';
                ws.getCell('D9').font = { bold: true };
                ws.getCell('E9').value = 'AOP';
                ws.getCell('E9').font = { bold: true };

                ws.getCell('D10').value = 'Working Days';
                ws.getCell('E10').value = prodDaysTotal; // UPDATED with calculated days
                ws.getCell('D11').value = 'Average Per Day (Kg)';
                ws.getCell('E11').value = { formula: 'IFERROR(H7/E10,0)' };
                ws.getCell('D12').value = 'Average per day(Kg)-IM';
                ws.getCell('E12').value = { formula: 'IFERROR(H5/E10,0)' };
                ws.getCell('D13').value = 'Average per day(Kg)-BM';
                ws.getCell('E13').value = { formula: 'IFERROR(H6/E10,0)' };

                for (let r = 10; r <= 13; r++) {
                    ws.getCell(r, 4).border = borderStyle;
                    ws.getCell(r, 4).fill = greyFill;
                    ws.getCell(r, 5).border = borderStyle;
                    ws.getCell(r, 5).fill = greyFill;
                    ws.getCell(r, 5).numFmt = '0.0';
                }

                // --- C. IM & BM Loss Analysis Tables (Row 16+) ---
                const startRow = 16;
                const headerBlue: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL_HEADER_BLUE } };
                const fontWhite: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };

                // --- IM TABLE (Columns A-D) ---
                ws.mergeCells(`A${startRow}:D${startRow}`);
                ws.getCell(`A${startRow}`).value = "IM Machine Loss Analysis";
                ws.getCell(`A${startRow}`).fill = headerBlue;
                ws.getCell(`A${startRow}`).font = fontWhite;
                ws.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

                const imHeaders = ['Reason', 'KG', '%', 'Cumulative'];
                imHeaders.forEach((h, i) => {
                    const cell = ws.getCell(startRow + 1, 1 + i);
                    cell.value = h;
                    cell.fill = greyFill;
                    cell.font = { bold: true };
                    cell.border = borderStyle;
                    cell.alignment = { horizontal: 'center' };
                });

                // --- BM TABLE (Columns F-I) ---
                ws.mergeCells(`F${startRow}:I${startRow}`);
                ws.getCell(`F${startRow}`).value = "BM Machine Loss Analysis";
                ws.getCell(`F${startRow}`).fill = headerBlue;
                ws.getCell(`F${startRow}`).font = fontWhite;
                ws.getCell(`F${startRow}`).alignment = { horizontal: 'center' };

                imHeaders.forEach((h, i) => {
                    const cell = ws.getCell(startRow + 1, 6 + i);
                    cell.value = h;
                    cell.fill = greyFill;
                    cell.font = { bold: true };
                    cell.border = borderStyle;
                    cell.alignment = { horizontal: 'center' };
                });

                // --- DATA ROWS ---
                const dataStartRow = startRow + 2;
                const endRow = dataStartRow + REASONS.length - 1;

                const imSumRange = `$B$${dataStartRow}:$B$${endRow}`;
                const bmSumRange = `$G$${dataStartRow}:$G$${endRow}`;

                REASONS.forEach((reason, idx) => {
                    const r = dataStartRow + idx;

                    // --- IM DATA ---
                    ws.getCell(r, 1).value = reason;
                    ws.getCell(r, 1).border = borderStyle;
                    ws.getCell(r, 2).value = { formula: `HLOOKUP(A${r},$N$3:$${lastColLetter}$6,3,FALSE)` };
                    ws.getCell(r, 2).numFmt = '0.00';
                    ws.getCell(r, 2).border = borderStyle;
                    ws.getCell(r, 3).value = { formula: `IFERROR(B${r}/SUM(${imSumRange}),0)` };
                    ws.getCell(r, 3).numFmt = '0.00%';
                    ws.getCell(r, 3).border = borderStyle;
                    if (idx === 0) ws.getCell(r, 4).value = { formula: `C${r}` };
                    else ws.getCell(r, 4).value = { formula: `D${r - 1}+C${r}` };
                    ws.getCell(r, 4).numFmt = '0.00%';
                    ws.getCell(r, 4).border = borderStyle;

                    // --- BM DATA ---
                    ws.getCell(r, 6).value = reason;
                    ws.getCell(r, 6).border = borderStyle;
                    ws.getCell(r, 7).value = { formula: `HLOOKUP(F${r},$N$3:$${lastColLetter}$6,4,FALSE)` };
                    ws.getCell(r, 7).numFmt = '0.00';
                    ws.getCell(r, 7).border = borderStyle;
                    ws.getCell(r, 8).value = { formula: `IFERROR(G${r}/SUM(${bmSumRange}),0)` };
                    ws.getCell(r, 8).numFmt = '0.00%';
                    ws.getCell(r, 8).border = borderStyle;
                    if (idx === 0) ws.getCell(r, 9).value = { formula: `H${r}` };
                    else ws.getCell(r, 9).value = { formula: `I${r - 1}+H${r}` };
                    ws.getCell(r, 9).numFmt = '0.00%';
                    ws.getCell(r, 9).border = borderStyle;
                });

                // Set row heights
                ws.getRow(9).height = 15.75;
                for (let r = 10; r <= 13; r++) ws.getRow(r).height = 15.75;
                for (let r = startRow; r <= endRow; r++) ws.getRow(r).height = 15.75;
            };

            // Create/Overwrite Daily Sheets
            const [y, m] = currentDate.split('-');
            const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();

            const getOrAddSheet = (name: string) => {
                const existing = workbook.getWorksheet(name);
                if (existing) return existing;
                return workbook.addWorksheet(name, { views: [{ showGridLines: false }] });
            };

            for (let d = 1; d <= daysInMonth; d++) {
                const ws = getOrAddSheet(String(d));
                setupTableLayout(ws, d, false);
            }
            for (let d = daysInMonth + 1; d <= 31; d++) {
                const ws = getOrAddSheet(String(d));
                setupTableLayout(ws, d, false);
            }
            
            let summaryWs = workbook.getWorksheet("Summary");
            if (!summaryWs) {
                summaryWs = workbook.addWorksheet("Summary", { views: [{ showGridLines: false }] });
            }

            setupTableLayout(summaryWs, 0, true);
            addSummarySections(summaryWs);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Production_Report_System_${currentDate}.xlsx`);
        } catch (error) { console.error("Excel Generation Error:", error); alert("Failed to generate Excel report."); } finally { setIsGenerating(false); }
    };

    // --- TABLE RENDER FUNCTION (Screen View) ---
    const renderTable = (isSummary: boolean, dayIndex: number = 0) => {
        let data = { im: { dP: 0, dA: 0, nP: 0, nA: 0, effLoss: 0 }, bm: { dP: 0, dA: 0, nP: 0, nA: 0, effLoss: 0 } };
        let breakdownData: any = {};
        REASONS.forEach(r => { breakdownData[r] = { im: 0, bm: 0 }; });

        if (isSummary) {
            const [year, month] = currentDate?.split('-') || ['2025', '01'];
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                const dayData = getDayData(i);
                data.im.dP += dayData.im.dP; data.im.dA += dayData.im.dA;
                data.im.nP += dayData.im.nP; data.im.nA += dayData.im.nA;
                data.im.effLoss += getEfficiencyLoss(dayData.dateStr, 'IM');
                data.bm.dP += dayData.bm.dP; data.bm.dA += dayData.bm.dA;
                data.bm.nP += dayData.bm.nP; data.bm.nA += dayData.bm.nA;
                data.bm.effLoss += getEfficiencyLoss(dayData.dateStr, 'BM');
                REASONS.forEach(res => { breakdownData[res].im += getBreakdownLoss(dayData.dateStr, 'IM', res); breakdownData[res].bm += getBreakdownLoss(dayData.dateStr, 'BM', res); });
            }
        } else {
            const dayD = getDayData(dayIndex);
            data.im = { ...dayD.im, effLoss: getEfficiencyLoss(dayD.dateStr, 'IM') };
            data.bm = { ...dayD.bm, effLoss: getEfficiencyLoss(dayD.dateStr, 'BM') };
            REASONS.forEach(res => { breakdownData[res].im = getBreakdownLoss(dayD.dateStr, 'IM', res); breakdownData[res].bm = getBreakdownLoss(dayD.dateStr, 'BM', res); });
        }

        const calcRow = (base: { dP: number, dA: number, nP: number, nA: number, effLoss: number }, type: 'IM' | 'BM') => {
            const planKg = base.dP + base.nP;
            const prodKg = base.dA + base.nA;
            const lostKg = Math.max(0, planKg - prodKg);
            let breakdownSum = 0;
            REASONS.forEach(r => breakdownSum += breakdownData[r][type.toLowerCase()]);
            return { planKg, prodKg, lostKg, breakdownSum, eff: planKg > 0 ? (prodKg / planKg) * 100 : 0, lostP: planKg > 0 ? (lostKg / planKg) * 100 : 0, ...base };
        };

        const imR = calcRow(data.im, 'IM');
        const bmR = calcRow(data.bm, 'BM');
        const globalR = {
            planKg: imR.planKg + bmR.planKg,
            prodKg: imR.prodKg + bmR.prodKg,
            lostKg: (imR.planKg + bmR.planKg) - (imR.prodKg + bmR.prodKg),
            breakdownSum: imR.breakdownSum + bmR.breakdownSum,
            effLoss: imR.effLoss + bmR.effLoss,
            eff: (imR.planKg + bmR.planKg) > 0 ? ((imR.prodKg + bmR.prodKg) / (imR.planKg + bmR.planKg)) * 100 : 0
        };

        const chartRef = useRef<HTMLDivElement>(null);
        const paretoIMData = REASONS.map(r => ({ name: r, kg: breakdownData[r].im })).sort((a, b) => b.kg - a.kg);
        const totalIMKg = paretoIMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeIM = 0;
        const paretoIMChartData = paretoIMData.map(item => {
            cumulativeIM += item.kg;
            return { ...item, cumulativePkg: totalIMKg > 0 ? (cumulativeIM / totalIMKg) * 100 : 0, pkg: totalIMKg > 0 ? (item.kg / totalIMKg) * 100 : 0 };
        });

        const paretoBMData = REASONS.map(r => ({ name: r, kg: breakdownData[r].bm })).sort((a, b) => b.kg - a.kg);
        const totalBMKg = paretoBMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeBM = 0;
        const paretoBMChartData = paretoBMData.map(item => {
            cumulativeBM += item.kg;
            return { ...item, cumulativePkg: totalBMKg > 0 ? (cumulativeBM / totalBMKg) * 100 : 0, pkg: totalBMKg > 0 ? (item.kg / totalBMKg) * 100 : 0 };
        });

        const Th = ({ children, rowSpan = 1, colSpan = 1, className = '' }: any) => <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 dark:border-slate-600 bg-[#d9d9d9] dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold text-center p-1 px-2 ${className}`}>{children}</th>;
        const Td = ({ children, className = '', bold = false }: any) => <td className={`border border-slate-300 dark:border-slate-600 p-2 text-right text-xs ${bold ? 'font-bold' : ''} ${className}`}>{children}</td>;

        return (
            <div className="space-y-8">
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
                                {REASONS.map(r => <Th key={r} rowSpan={2} className="min-w-[80px] text-[10px] break-words leading-tight">{r}</Th>)}
                            </tr>
                            <tr>
                                <Th>Planed (Kg)</Th><Th>Production (kg)</Th>
                                <Th>Planed (Kg)</Th><Th>Production (kg)</Th>
                                <Th>Total Plan Kg</Th><Th>Production (kg)</Th>
                            </tr>
                        </thead>
                        <tbody>
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
                                <Td className="text-amber-600 font-bold">{imR.effLoss > 0 ? imR.effLoss.toFixed(2) : '-'}</Td>
                                {REASONS.map(r => <Td key={r} className="bg-white dark:bg-slate-800 text-slate-500">{breakdownData[r].im > 0 ? breakdownData[r].im.toFixed(2) : '-'}</Td>)}
                            </tr>
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
                                <Td className="text-amber-600 font-bold">{bmR.effLoss > 0 ? bmR.effLoss.toFixed(2) : '-'}</Td>
                                {REASONS.map(r => <Td key={r} className="bg-white dark:bg-slate-800 text-slate-500">{breakdownData[r].bm > 0 ? breakdownData[r].bm.toFixed(2) : '-'}</Td>)}
                            </tr>
                            <tr className="bg-[#bdd7ee] dark:bg-sky-900/30 font-bold border-t-2 border-slate-400">
                                <td className="bg-[#bdd7ee] dark:bg-sky-900/50 p-2 font-bold text-xs border border-slate-300 dark:border-slate-600">Global AOP</td>
                                <Td>{globalR.planKg.toFixed(2)}</Td>
                                <Td className="bg-white dark:bg-slate-800">-</Td>
                                <Td className="bg-white dark:bg-slate-800">-</Td>
                                <Td className="bg-white dark:bg-slate-800">-</Td>
                                <Td className="bg-white dark:bg-slate-800">-</Td>
                                <Td>{globalR.planKg.toFixed(2)}</Td>
                                <Td>{globalR.prodKg.toFixed(2)}</Td>
                                <Td className="text-emerald-700">{globalR.eff.toFixed(2)}%</Td>
                                <Td className="text-rose-700">{globalR.lostKg.toFixed(2)}</Td>
                                <Td>{globalR.breakdownSum.toFixed(2)}</Td>
                                <Td className="text-rose-700">{(globalR.planKg > 0 ? (globalR.lostKg / globalR.planKg) * 100 : 0).toFixed(2)}%</Td>
                                <Td className="text-amber-700">{globalR.effLoss > 0 ? globalR.effLoss.toFixed(2) : '-'}</Td>
                                {REASONS.map(r => { const sum = breakdownData[r].im + breakdownData[r].bm; return <Td key={r} className={sum > 0 ? 'text-amber-600' : 'text-slate-400'}>{sum > 0 ? sum.toFixed(2) : '-'}</Td>; })}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {isSummary && (
                    <div className="space-y-8">
                         {/* IM Loss Reason Analysis (Screen View) */}
                        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
                                <h4 className="font-bold text-sm uppercase tracking-wider">📊 IM Machine - Loss Reason Analysis (Pareto)</h4>
                            </div>
                            <div className="p-4 flex flex-col lg:flex-row gap-6">
                                <div className="lg:w-1/3 overflow-auto max-h-[400px]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="bg-emerald-100 dark:bg-emerald-900/50 sticky top-0">
                                            <tr><th className="p-2 text-left">Reason</th><th className="p-2 text-right">KG</th><th className="p-2 text-right">%</th><th className="p-2 text-right">Cum %</th></tr>
                                        </thead>
                                        <tbody>
                                            {paretoIMChartData.map((row, i) => (
                                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-emerald-50/50 dark:bg-slate-700/50'}>
                                                    <td className="p-2 font-medium">{row.name}</td><td className="p-2 text-right font-bold">{row.kg.toFixed(2)}</td><td className="p-2 text-right text-emerald-600">{row.pkg.toFixed(1)}%</td><td className="p-2 text-right text-amber-600">{row.cumulativePkg.toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="lg:w-2/3 h-[350px]" ref={chartRef}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={paretoIMChartData} margin={{ top: 20, right: 40, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ef" />
                                            <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                            <YAxis yAxisId="left" orientation="left" stroke="#10b981" label={{ value: 'KG', angle: -90, position: 'insideLeft', fill: '#10b981' }} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#f97316" domain={[0, 100]} label={{ value: 'Cum %', angle: 90, position: 'insideRight', fill: '#f97316' }} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            <Bar yAxisId="left" dataKey="kg" fill="#10b981" name="Loss (KG)" barSize={25} radius={[4, 4, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="cumulativePkg" stroke="#f97316" name="Cumulative %" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                         {/* BM Loss Reason Analysis (Screen View) */}
                        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
                                <h4 className="font-bold text-sm uppercase tracking-wider">📊 BM Machine - Loss Reason Analysis (Pareto)</h4>
                            </div>
                            <div className="p-4 flex flex-col lg:flex-row gap-6">
                                <div className="lg:w-1/3 overflow-auto max-h-[400px]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="bg-amber-100 dark:bg-amber-900/50 sticky top-0">
                                            <tr><th className="p-2 text-left">Reason</th><th className="p-2 text-right">KG</th><th className="p-2 text-right">%</th><th className="p-2 text-right">Cum %</th></tr>
                                        </thead>
                                        <tbody>
                                            {paretoBMChartData.map((row, i) => (
                                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-amber-50/50 dark:bg-slate-700/50'}>
                                                    <td className="p-2 font-medium">{row.name}</td><td className="p-2 text-right font-bold">{row.kg.toFixed(2)}</td><td className="p-2 text-right text-amber-600">{row.pkg.toFixed(1)}%</td><td className="p-2 text-right text-orange-600">{row.cumulativePkg.toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="lg:w-2/3 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={paretoBMChartData} margin={{ top: 20, right: 40, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                                            <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                            <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" label={{ value: 'KG', angle: -90, position: 'insideLeft', fill: '#f59e0b' }} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#dc2626" domain={[0, 100]} label={{ value: 'Cum %', angle: 90, position: 'insideRight', fill: '#dc2626' }} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #fde68a' }} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            <Bar yAxisId="left" dataKey="kg" fill="#f59e0b" name="Loss (KG)" barSize={25} radius={[4, 4, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="cumulativePkg" stroke="#dc2626" name="Cumulative %" strokeWidth={3} dot={{ fill: '#dc2626', r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <Table2 className="w-6 h-6 text-indigo-500" /> Master Production Schedule
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Detailed Daily Analysis & Excel Export</p>
                </div>
                <button onClick={downloadSystemReport} disabled={isGenerating} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105'}`}>
                    {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <FileDown className="w-4 h-4" />}
                    {isGenerating ? "Generating..." : "Download System Excel (31 Sheets)"}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-200 dark:border-slate-700 p-2 gap-2 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={() => setActiveTab('Summary')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'Summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
                        <LayoutList className="w-4 h-4" /> Summary
                    </button>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <button key={day} onClick={() => setActiveTab(String(day))} className={`flex-shrink-0 w-10 h-10 rounded-xl text-xs font-bold flex justify-center items-center transition-all ${activeTab === String(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}>
                            {day}
                        </button>
                    ))}
                </div>
                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            {activeTab === 'Summary' ? `Month Summary - ${currentDate}` : `Daily Report - ${currentDate}-${String(activeTab).padStart(2, '0')}`}
                        </h3>
                    </div>
                    {renderTable(activeTab === 'Summary', activeTab === 'Summary' ? 0 : parseInt(activeTab))}
                </div>
            </div>
        </div>
    );
};

export default MonthlyDetailedView;