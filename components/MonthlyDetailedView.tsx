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

    // Use dynamic categories from Admin, fallback to defaults if empty
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

    // --- CHART CAPTURE HELPERS ---
    const chartRef = useRef<HTMLDivElement>(null);

    const convertChartToImage = async () => {
        if (!chartRef.current) return null;
        const svg = chartRef.current.querySelector('svg');
        if (!svg) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        // Add minimal styling to ensure visibility on white background
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise<string | null>((resolve) => {
            img.onload = () => {
                canvas.width = img.width + 50; // Add padding
                canvas.height = img.height + 50;
                if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 25, 25);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    // --- EXCEL GENERATION LOGIC ---
    const downloadSystemReport = async () => {
        try {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 500)); // Allow UI to settle

            // Capture Chart First if active tab is Summary
            let chartImageBase64: string | null = null;
            if (activeTab === 'Summary') {
                chartImageBase64 = await convertChartToImage();
            }

            const workbook = new ExcelJS.Workbook();
            // ... (rest of setupTableLayout function) ...

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
                setH(3, 13, "Eff Loss kg"); ws.mergeCells('M3:M4'); // NEW COLUMN
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
                    ws.getCell('M5').value = sum3D('M5'); ws.getCell('M6').value = sum3D('M6'); // Summary for Eff Loss Kg
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

            // --- ADD SUMMARY SECTIONS (Schedule, Production, Pareto) ---
            const addSummarySections = (ws: ExcelJS.Worksheet, chartImage: string | null) => {
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
                ws.getCell('B10').value = 31;
                ws.getCell('A11').value = 'Average Per Day (Kg)';
                ws.getCell('B11').value = { formula: 'IFERROR(G7/B10,0)' };
                ws.getCell('A12').value = 'Average per day(Kg)-IM';
                ws.getCell('B12').value = { formula: 'IFERROR(G5/B10,0)' };
                ws.getCell('A13').value = 'Average per day(Kg)-BM';
                ws.getCell('B13').value = { formula: 'IFERROR(G6/B10,0)' };

                // Style Schedule Table
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
                ws.getCell('E10').value = 31;
                ws.getCell('D11').value = 'Average Per Day (Kg)';
                ws.getCell('E11').value = { formula: 'IFERROR(H7/E10,0)' };
                ws.getCell('D12').value = 'Average per day(Kg)-IM';
                ws.getCell('E12').value = { formula: 'IFERROR(H5/E10,0)' };
                ws.getCell('D13').value = 'Average per day(Kg)-BM';
                ws.getCell('E13').value = { formula: 'IFERROR(H6/E10,0)' };

                // Style Production Table
                for (let r = 10; r <= 13; r++) {
                    ws.getCell(r, 4).border = borderStyle;
                    ws.getCell(r, 4).fill = greyFill;
                    ws.getCell(r, 5).border = borderStyle;
                    ws.getCell(r, 5).fill = greyFill;
                    ws.getCell(r, 5).numFmt = '0.0';
                }

                // --- C. Pareto Table (Row 17+) ---
                const paretoStartRow = 17;

                // Headers
                ws.getCell(paretoStartRow, 1).value = 'Reason';
                ws.getCell(paretoStartRow, 2).value = 'KG';
                ws.getCell(paretoStartRow, 3).value = '%';
                ws.getCell(paretoStartRow, 4).value = 'Cumulative';

                for (let c = 1; c <= 4; c++) {
                    ws.getCell(paretoStartRow, c).font = { bold: true };
                    ws.getCell(paretoStartRow, c).fill = greyFill;
                    ws.getCell(paretoStartRow, c).border = borderStyle;
                    ws.getCell(paretoStartRow, c).alignment = { horizontal: 'center' };
                }

                // Data Rows (using HLOOKUP for KG values)
                const endParetoRow = paretoStartRow + REASONS.length;
                const sumRange = `$B$${paretoStartRow + 1}:$B$${endParetoRow}`;

                REASONS.forEach((reason, idx) => {
                    const rowNum = paretoStartRow + 1 + idx;

                    // Column A: Reason Name
                    ws.getCell(rowNum, 1).value = reason;
                    ws.getCell(rowNum, 1).border = borderStyle;

                    // Column B: HLOOKUP Formula (lookup reason in header row 3, get value from row 7)
                    // Formula: =HLOOKUP(A18,$M$3:$lastCol$7,5,FALSE)
                    ws.getCell(rowNum, 2).value = { formula: `HLOOKUP(A${rowNum},$M$3:$${lastColLetter}$7,5,FALSE)` };
                    ws.getCell(rowNum, 2).border = borderStyle;
                    ws.getCell(rowNum, 2).numFmt = '0';

                    // Column C: Percentage Formula
                    ws.getCell(rowNum, 3).value = { formula: `IFERROR(B${rowNum}/SUM(${sumRange}),0)` };
                    ws.getCell(rowNum, 3).border = borderStyle;
                    ws.getCell(rowNum, 3).numFmt = '0.00%';

                    // Column D: Cumulative Percentage
                    if (idx === 0) {
                        ws.getCell(rowNum, 4).value = { formula: `C${rowNum}` };
                    } else {
                        ws.getCell(rowNum, 4).value = { formula: `D${rowNum - 1}+C${rowNum}` };
                    }
                    ws.getCell(rowNum, 4).border = borderStyle;
                    ws.getCell(rowNum, 4).numFmt = '0.00%';
                });

                // Set row heights for new sections
                ws.getRow(9).height = 15.75;
                for (let r = 10; r <= 13; r++) ws.getRow(r).height = 15.75;
                for (let r = paretoStartRow; r <= endParetoRow; r++) ws.getRow(r).height = 15.75;

                // --- D. Embed Chart Image ---
                if (chartImage) {
                    const imageId = workbook.addImage({
                        base64: chartImage,
                        extension: 'png',
                    });
                    // Position similar to VBA: F17 onwards
                    ws.addImage(imageId, {
                        tl: { col: 5.5, row: 16 }, // F17 (0-indexed col 5, row 16)
                        ext: { width: 700, height: 350 }
                    });
                }
            };

            // Create/Overwrite Daily Sheets
            const [y, m] = currentDate.split('-');
            const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();

            // Function to safely get or add worksheet
            const getOrAddSheet = (name: string) => {
                const existing = workbook.getWorksheet(name);
                if (existing) {
                    // If template has daily sheets, we might want to clear them or overwrite. 
                    // For now, assume template only has Summary or we overwrite values.
                    return existing;
                }
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
            // Handle Summary Sheet
            let summaryWs = workbook.getWorksheet("Summary");
            if (!summaryWs) {
                summaryWs = workbook.addWorksheet("Summary", { views: [{ showGridLines: false }] });
            }

            // If template was loaded, we assume layout is good, but we still populating data.
            // However, our setupTableLayout does formatting. 
            // To ensure we don't break the chart references, we should run setupTableLayout 
            // BUT be careful about clearing content. 
            // NOTE: setupTableLayout mainly sets values and borders. It doesn't delete rows.
            setupTableLayout(summaryWs, 0, true);

            // We still add the section data (Pareto etc). 
            // If the template already has the table headers, this will overwrite them with same text, which is fine.
            // IMPORTANT: The chart in template likely points to specific cells. 
            // setupTableLayout + addSummarySections writes to those exact cells.
            addSummarySections(summaryWs, chartImageBase64);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Production_Report_System_${currentDate}.xlsx`);
        } catch (error) { console.error("Excel Generation Error:", error); alert("Failed to generate Excel report."); } finally { setIsGenerating(false); }
    };

    // --- TABLE RENDER FUNCTION ---
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

        // --- CALCULATE ROW METRICS ---
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

        // --- SUMMARY METRICS CALCULATION ---
        const totalPlan = globalR.planKg;
        const totalProd = globalR.prodKg;
        const totalLost = globalR.lostKg;

        // Schedule Table Data
        const daysInMonth = isSummary ? new Date(parseInt(currentDate.split('-')[0]), parseInt(currentDate.split('-')[1]), 0).getDate() : 0;
        const avgPerDayGlobal = daysInMonth > 0 ? totalProd / daysInMonth : 0;
        const avgPerDayIM = daysInMonth > 0 ? imR.prodKg / daysInMonth : 0;
        const avgPerDayBM = daysInMonth > 0 ? bmR.prodKg / daysInMonth : 0;

        // --- CALCULATE ACTUAL WORKING DAYS (0.5 per shift) ---
        let workingDaysIM = 0;
        let workingDaysBM = 0;
        if (isSummary) {
            const [year, month] = currentDate?.split('-') || ['2025', '01'];
            const totalDays = new Date(parseInt(year), parseInt(month), 0).getDate();
            for (let i = 1; i <= totalDays; i++) {
                const dayData = getDayData(i);
                // IM: 0.5 for each shift with production
                if (dayData.im.dA > 0) workingDaysIM += 0.5;
                if (dayData.im.nA > 0) workingDaysIM += 0.5;
                // BM: 0.5 for each shift with production
                if (dayData.bm.dA > 0) workingDaysBM += 0.5;
                if (dayData.bm.nA > 0) workingDaysBM += 0.5;
            }
        }
        const workingDaysTotal = Math.max(workingDaysIM, workingDaysBM);

        // --- SEPARATE PARETO DATA FOR IM AND BM ---
        // IM Pareto Data
        const paretoIMData = REASONS.map(r => ({
            name: r,
            kg: breakdownData[r].im
        })).sort((a, b) => b.kg - a.kg);

        const totalIMKg = paretoIMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeIM = 0;
        const paretoIMChartData = paretoIMData.map(item => {
            cumulativeIM += item.kg;
            return {
                ...item,
                cumulativePkg: totalIMKg > 0 ? (cumulativeIM / totalIMKg) * 100 : 0,
                pkg: totalIMKg > 0 ? (item.kg / totalIMKg) * 100 : 0
            };
        });

        // BM Pareto Data
        const paretoBMData = REASONS.map(r => ({
            name: r,
            kg: breakdownData[r].bm
        })).sort((a, b) => b.kg - a.kg);

        const totalBMKg = paretoBMData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulativeBM = 0;
        const paretoBMChartData = paretoBMData.map(item => {
            cumulativeBM += item.kg;
            return {
                ...item,
                cumulativePkg: totalBMKg > 0 ? (cumulativeBM / totalBMKg) * 100 : 0,
                pkg: totalBMKg > 0 ? (item.kg / totalBMKg) * 100 : 0
            };
        });

        // Combined Pareto Data (for reference)
        const paretoData = REASONS.map(r => ({
            name: r,
            kg: breakdownData[r].im + breakdownData[r].bm
        })).sort((a, b) => b.kg - a.kg);

        const totalBreakdownKg = paretoData.reduce((acc, curr) => acc + curr.kg, 0);
        let cumulative = 0;
        const paretoChartData = paretoData.map(item => {
            cumulative += item.kg;
            return {
                ...item,
                cumulativePkg: totalBreakdownKg > 0 ? (cumulative / totalBreakdownKg) * 100 : 0,
                pkg: totalBreakdownKg > 0 ? (item.kg / totalBreakdownKg) * 100 : 0
            };
        });

        const Th = ({ children, rowSpan = 1, colSpan = 1, className = '' }: any) => <th rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 dark:border-slate-600 bg-[#d9d9d9] dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold text-center p-1 px-2 ${className}`}>{children}</th>;
        const Td = ({ children, className = '', bold = false }: any) => <td className={`border border-slate-300 dark:border-slate-600 p-2 text-right text-xs ${bold ? 'font-bold' : ''} ${className}`}>{children}</td>;

        return (
            <div className="space-y-8">
                {/* Main Data Table */}
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
                        {/* Schedule & Production Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Schedule Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 overflow-hidden">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-bold text-slate-800 dark:text-white">Schedule</th>
                                            <th className="p-2 text-right border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-bold text-slate-800 dark:text-white w-24">AOP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Working Days</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#305496] text-white font-bold">{workingDaysTotal}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average Per Day (Kg)</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysTotal > 0 ? globalR.prodKg / workingDaysTotal : 0).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average per day(Kg)-IM</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysIM > 0 ? imR.prodKg / workingDaysIM : 0).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average per day(Kg)-BM</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysBM > 0 ? bmR.prodKg / workingDaysBM : 0).toFixed(1)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Production Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 overflow-hidden">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-bold text-slate-800 dark:text-white">Production</th>
                                            <th className="p-2 text-right border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-bold text-slate-800 dark:text-white w-24">AOP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Working Days</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{workingDaysTotal}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average Per Day (Kg)</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysTotal > 0 ? globalR.prodKg / workingDaysTotal : 0).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average per day(Kg)-IM</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysIM > 0 ? imR.prodKg / workingDaysIM : 0).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 bg-[#e7e6e6] dark:bg-slate-700 font-medium text-slate-800 dark:text-white">Average per day(Kg)-BM</td>
                                            <td className="p-2 border border-slate-300 dark:border-slate-600 text-right bg-[#203764] text-white font-bold">{(workingDaysBM > 0 ? bmR.prodKg / workingDaysBM : 0).toFixed(1)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* IM Loss Reason Analysis */}
                        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
                                <h4 className="font-bold text-sm uppercase tracking-wider">📊 IM Machine - Loss Reason Analysis (Pareto)</h4>
                            </div>
                            <div className="p-4 flex flex-col lg:flex-row gap-6">
                                {/* IM Pareto Table */}
                                <div className="lg:w-1/3 overflow-auto max-h-[400px]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="bg-emerald-100 dark:bg-emerald-900/50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left border border-emerald-200 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-300">Reason</th>
                                                <th className="p-2 text-right border border-emerald-200 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-300">KG</th>
                                                <th className="p-2 text-right border border-emerald-200 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-300">%</th>
                                                <th className="p-2 text-right border border-emerald-200 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-300">Cum %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paretoIMChartData.map((row, i) => (
                                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-emerald-50/50 dark:bg-slate-700/50'}>
                                                    <td className="p-2 border border-emerald-100 dark:border-emerald-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{row.name}</td>
                                                    <td className="p-2 border border-emerald-100 dark:border-emerald-800 text-right font-bold text-slate-800 dark:text-white">{row.kg.toFixed(2)}</td>
                                                    <td className="p-2 border border-emerald-100 dark:border-emerald-800 text-right text-emerald-600 dark:text-emerald-400">{row.pkg.toFixed(1)}%</td>
                                                    <td className="p-2 border border-emerald-100 dark:border-emerald-800 text-right text-amber-600 dark:text-amber-400">{row.cumulativePkg.toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* IM Chart */}
                                <div className="lg:w-2/3 h-[350px]" ref={chartRef}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={paretoIMChartData} margin={{ top: 20, right: 40, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ef" />
                                            <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} tick={{ fontSize: 9, fill: '#475569' }} />
                                            <YAxis yAxisId="left" orientation="left" stroke="#10b981" label={{ value: 'KG', angle: -90, position: 'insideLeft', fill: '#10b981' }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#f97316" domain={[0, 100]} label={{ value: 'Cum %', angle: 90, position: 'insideRight', fill: '#f97316' }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            <Bar yAxisId="left" dataKey="kg" fill="#10b981" name="Loss (KG)" barSize={25} radius={[4, 4, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="cumulativePkg" stroke="#f97316" name="Cumulative %" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* BM Loss Reason Analysis */}
                        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-amber-200 dark:border-amber-800 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
                                <h4 className="font-bold text-sm uppercase tracking-wider">📊 BM Machine - Loss Reason Analysis (Pareto)</h4>
                            </div>
                            <div className="p-4 flex flex-col lg:flex-row gap-6">
                                {/* BM Pareto Table */}
                                <div className="lg:w-1/3 overflow-auto max-h-[400px]">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="bg-amber-100 dark:bg-amber-900/50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left border border-amber-200 dark:border-amber-700 font-bold text-amber-800 dark:text-amber-300">Reason</th>
                                                <th className="p-2 text-right border border-amber-200 dark:border-amber-700 font-bold text-amber-800 dark:text-amber-300">KG</th>
                                                <th className="p-2 text-right border border-amber-200 dark:border-amber-700 font-bold text-amber-800 dark:text-amber-300">%</th>
                                                <th className="p-2 text-right border border-amber-200 dark:border-amber-700 font-bold text-amber-800 dark:text-amber-300">Cum %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paretoBMChartData.map((row, i) => (
                                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-amber-50/50 dark:bg-slate-700/50'}>
                                                    <td className="p-2 border border-amber-100 dark:border-amber-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{row.name}</td>
                                                    <td className="p-2 border border-amber-100 dark:border-amber-800 text-right font-bold text-slate-800 dark:text-white">{row.kg.toFixed(2)}</td>
                                                    <td className="p-2 border border-amber-100 dark:border-amber-800 text-right text-amber-600 dark:text-amber-400">{row.pkg.toFixed(1)}%</td>
                                                    <td className="p-2 border border-amber-100 dark:border-amber-800 text-right text-orange-600 dark:text-orange-400">{row.cumulativePkg.toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* BM Chart */}
                                <div className="lg:w-2/3 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={paretoBMChartData} margin={{ top: 20, right: 40, left: 20, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                                            <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={100} tick={{ fontSize: 9, fill: '#92400e' }} />
                                            <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" label={{ value: 'KG', angle: -90, position: 'insideLeft', fill: '#f59e0b' }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#dc2626" domain={[0, 100]} label={{ value: 'Cum %', angle: 90, position: 'insideRight', fill: '#dc2626' }} />
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
            {/* HEADER */}
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

            {/* TABS */}
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