import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { calculateMetrics } from '../../utils'; 

// =================================================================================
// ⚙️ සැකසුම් සහ වින්‍යාසයන් (CONFIGURATION SECTION)
// =================================================================================

// --- වර්ණ (Colors) ---
// මෙම වර්ණ කේත (ARGB hex) ඔබට අවශ්‍ය පරිදි වෙනස් කරගත හැක.
const CFG_COLOR_HEADER_BLUE = 'FF4472C4'; // ප්‍රධාන මාතෘකා සඳහා තද නිල් (IM/BM Header)
const CFG_COLOR_L_BLUE      = 'FFBDD7EE'; // උප මාතෘකා සඳහා ලා නිල් (Module/Labels)
const CFG_COLOR_L_GREY      = 'FFD9D9D9'; // සාමාන්‍ය හෙඩර් සඳහා අළු (Table Headers)
const CFG_COLOR_WHITE       = 'FFFFFFFF'; // අකුරු සඳහා සුදු වර්ණය

// --- අකුරු මෝස්තර (Fonts) ---
const CFG_FONT_MAIN_TITLE   = { name: 'Times New Roman', size: 20, bold: true };
const CFG_FONT_HEADER       = { name: 'Calibri', size: 11, bold: true };
const CFG_FONT_TABLE_TITLE  = { name: 'Calibri', size: 12, bold: true, color: { argb: CFG_COLOR_WHITE } }; // IM/BM Header Font
const CFG_FONT_NORMAL       = { name: 'Calibri', size: 11 };

// --- කොටු වල රාමු (Borders) ---
const CFG_BORDER_THIN: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' }, 
    bottom: { style: 'thin' }, right: { style: 'thin' }
};

// =================================================================================
// 🚀 ප්‍රධාන EXCEL සාදන ෆන්ෂන් එක (MAIN FUNCTION)
// =================================================================================
export const generateMonthlyExcel = async (
    allData: any, 
    currentDate: string, 
    REASONS: string[]
) => {
    try {
        
        // -------------------------------------------------------------------------
        // 2. දත්ත සැකසීමේ සහායක කොටස් (Adjusted for Negative Values)
        // -------------------------------------------------------------------------
        const getAdjustedMetrics = (row: any) => {
            const m = calculateMetrics(row);
            let planningLossQty = 0;
            let actualBdLossQty = 0;
            const ratePerMin = ((row.qtyPerHour || 0) * (row.cavities || 1)) / 60;

            (row.breakdowns || []).forEach((bd: any) => {
                if (bd.startTime && bd.endTime && bd.category) {
                    const [sh, sm] = bd.startTime.split(':').map(Number);
                    const [eh, em] = bd.endTime.split(':').map(Number);
                    let mins = (eh * 60 + em) - (sh * 60 + sm);
                    if (mins < 0) mins += 1440;

                    if (mins > 0) {
                        // 🟢 Breakdown Log එකට සමානව වෙන වෙනම ගණනය කිරීම
                        const bdQty = Math.floor(ratePerMin * mins);
                        if (bd.category.toLowerCase().includes('planning')) planningLossQty += bdQty;
                        else actualBdLossQty += bdQty;
                    }
                }
            });

            m.planQty = Math.max(0, (m.planQty || 0) - planningLossQty);
            // 🟢 .toFixed(1) වෙනුවට අනිත් තැන් වල වගේම .toFixed(2) යොදා ඇත
            m.planKg = Number(((m.planQty * (row.unitWeight || 0)) / 1000).toFixed(2));

            const updatedTotalLoss = m.planQty - (row.achievedQty || 0);
            
            m.efficiencyLossQty = updatedTotalLoss - actualBdLossQty;
            m.efficiencyLossKg = Number(((m.efficiencyLossQty * (row.unitWeight || 0)) / 1000).toFixed(2));

            m.lostQty = updatedTotalLoss;
            m.lostKg = Number(((updatedTotalLoss * (row.unitWeight || 0)) / 1000).toFixed(2));

            return m;
        };





        // 🟢 යන්ත්‍ර බිඳවැටීම් (Breakdowns) පාඩුව ගණනය කිරීම (Planning හැර)
        const getBreakdownLoss = (dateStr: string, machineType: 'IM' | 'BM', category: string) => {
            const key = `${dateStr}_${machineType}`;
            const rows = allData?.[key]?.rows || [];
            let loss = 0;
            rows.forEach((r: any) => {
                const ratePerMin = ((r.qtyPerHour || 0) * (r.cavities || 1)) / 60;
                const uWeight = r.unitWeight || 0;
                if (r.breakdowns) {
                    r.breakdowns.forEach((bd: any) => {
                        if (bd.category && bd.category.toLowerCase().includes('planning')) return; 
                        
                        if (bd.category === category) {
                            if (!bd.startTime || !bd.endTime) return;
                            const partsS = bd.startTime.split(':');
                            const partsE = bd.endTime.split(':');
                            if (partsS.length < 2 || partsE.length < 2) return;
                            const s = parseInt(partsS[0]) * 60 + parseInt(partsS[1]);
                            const e = parseInt(partsE[0]) * 60 + parseInt(partsE[1]);
                            const dur = e - s > 0 ? e - s : (1440 - s) + e;
                            
                            // 🟢 100% ක් Breakdown Log එකට සමාන කිරීම
                            const lQty = Math.floor(ratePerMin * dur);
                            const lKg = Number(((lQty * uWeight) / 1000).toFixed(2));
                            loss += lKg;
                        }
                    });
                }
            });
            return loss;
        };

        

        // 🟢 කාර්යක්ෂමතාව අඩු වීම (Efficiency Loss) ගණනය (Planning අයින් කළ අගය)
        const getEfficiencyLoss = (dateStr: string, machineType: 'IM' | 'BM') => {
            const key = `${dateStr}_${machineType}`;
            const rows = allData?.[key]?.rows || [];
            let loss = 0;
            rows.forEach((r: any) => {
                const m = getAdjustedMetrics(r); 
                
                // 🟢 මැජික් එක: Excel එකෙත් Accuracy = Lost Kg වීමට නම්,
                // Eff Loss = Total Lost Kg - Total Logged Breakdown Kg විය යුතුය.
                const ratePerMin = ((r.qtyPerHour || 0) * (r.cavities || 1)) / 60;
                let rowBdKgTotal = 0;

                (r.breakdowns || []).forEach((bd: any) => {
                    if (bd.category && !bd.category.toLowerCase().includes('planning')) {
                        if (!bd.startTime || !bd.endTime) return;
                        const [sh, sm] = bd.startTime.split(':').map(Number);
                        const [eh, em] = bd.endTime.split(':').map(Number);
                        let mins = (eh * 60 + em) - (sh * 60 + sm);
                        if (mins < 0) mins += 1440;
                        if (mins > 0) {
                            const bdQty = Math.floor(ratePerMin * mins);
                            const lKg = Number(((bdQty * (r.unitWeight || 0)) / 1000).toFixed(2));
                            rowBdKgTotal += lKg;
                        }
                    }
                });

                const exactEffLossKg = m.lostKg - rowBdKgTotal;
                loss += exactEffLossKg;
            });
            return loss;
        };




        // 🟢 එක් දිනකට අදාළ දත්ත ලබා ගැනීම (Planning අයින් කළ අගයන්)
        const getDayData = (dayIndex: number) => {
            if (!currentDate) return { im: { dP: 0, dA: 0, nP: 0, nA: 0 }, bm: { dP: 0, dA: 0, nP: 0, nA: 0 }, dateStr: '' };
            const [year, month] = currentDate.split('-');
            const dayDate = `${year}-${month}-${String(dayIndex).padStart(2, '0')}`;

            let imDayP = 0, imDayA = 0, imNightP = 0, imNightA = 0;
            const imRows = allData?.[`${dayDate}_IM`]?.rows || [];
            imRows.forEach((row: any) => {
                const m = getAdjustedMetrics(row); // Adjusted metrics භාවිතය
                if (row.shift === 'day') { imDayP += m.planKg; imDayA += m.achievedKg; }
                else { imNightP += m.planKg; imNightA += m.achievedKg; }
            });

            let bmDayP = 0, bmDayA = 0, bmNightP = 0, bmNightA = 0;
            const bmRows = allData?.[`${dayDate}_BM`]?.rows || [];
            bmRows.forEach((row: any) => {
                const m = getAdjustedMetrics(row); // Adjusted metrics භාවිතය
                if (row.shift === 'day') { bmDayP += m.planKg; bmDayA += m.achievedKg; }
                else { bmNightP += m.planKg; bmNightA += m.achievedKg; }
            });

            return {
                im: { dP: imDayP, dA: imDayA, nP: imNightP, nA: imNightA },
                bm: { dP: bmDayP, dA: bmDayA, nP: bmNightP, nA: bmNightA },
                dateStr: dayDate
            };
        };

        // -------------------------------------------------------------------------
        // 2. වැඩ කළ දින ගණනය කිරීම (Working Days Calculation)
        // -------------------------------------------------------------------------
        let schedDaysIM = 0, schedDaysBM = 0;
        let prodDaysIM = 0, prodDaysBM = 0;
        
        const [yStr, mStr] = currentDate.split('-');
        const daysInMonthTotal = new Date(parseInt(yStr), parseInt(mStr), 0).getDate();
        
        for (let i = 1; i <= daysInMonthTotal; i++) {
            const dd = getDayData(i);
            if (dd.im.dP > 0) schedDaysIM += 0.5; if (dd.im.nP > 0) schedDaysIM += 0.5;
            if (dd.bm.dP > 0) schedDaysBM += 0.5; if (dd.bm.nP > 0) schedDaysBM += 0.5;
            if (dd.im.dA > 0) prodDaysIM += 0.5; if (dd.im.nA > 0) prodDaysIM += 0.5;
            if (dd.bm.dA > 0) prodDaysBM += 0.5; if (dd.bm.nA > 0) prodDaysBM += 0.5;
        }
        
        const schedDaysTotal = Math.max(schedDaysIM, schedDaysBM);
        const prodDaysTotal = Math.max(prodDaysIM, prodDaysBM);

        // අලුත් Excel පොතක් සාදා ගැනීම
        const workbook = new ExcelJS.Workbook();
        
        // -------------------------------------------------------------------------
        // 3. වගුවේ සැකැස්ම (Table Layout Setup) - NO LAYOUT CHANGES
        // -------------------------------------------------------------------------
        const setupTableLayout = (ws: ExcelJS.Worksheet, dayIndex: number, isSummary: boolean) => {
            // තීරු වල පළල සැකසීම
            ws.getColumn(1).width = 25; 
            for (let c = 2; c <= 35; c++) ws.getColumn(c).width = 14;
            
            // ප්‍රධාන මාතෘකාව
            ws.getCell('A1').value = "Daily Production Report";
            ws.getCell('A1').font = CFG_FONT_MAIN_TITLE;

            // Header Styles Helper
            const setH = (r: number, c: number, val: string) => {
                const cell = ws.getCell(r, c);
                cell.value = val;
                cell.font = CFG_FONT_HEADER;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = CFG_BORDER_THIN;
            };

            // Headers ලිවීම
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
            
            // Dynamic Reasons Headers 
            REASONS.forEach((reason, idx) => { 
                const col = 14 + idx; 
                setH(3, col, reason); 
                ws.mergeCells(3, col, 4, col); 
            });
            ws.getRow(3).height = 45; ws.getRow(4).height = 45;

            const rowLabels = [{ r: 5, l: "IM Line" }, { r: 6, l: "BM Line" }, { r: 7, l: "Global AOP" }];
            rowLabels.forEach(item => {
                const r = item.r;
                ws.getCell(r, 1).value = item.l;
                ws.getCell(r, 1).font = CFG_FONT_HEADER;
                ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_BLUE } };
                
                for (let c = 1; c <= 13 + REASONS.length; c++) {
                    ws.getCell(r, c).border = CFG_BORDER_THIN;
                    if (c > 1) {
                        ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'middle' };
                        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_BLUE } };
                        const isInputArea = (c >= 3 && c <= 6 && r < 7) || (c >= 14);
                        if (isInputArea) ws.getCell(r, c).fill = { type: 'pattern', pattern: 'none' };
                    }
                }
                ws.getRow(r).height = 33.75;
            });

            // --- දත්ත පිරවීම (Filling Data) ---
            if (isSummary) {
                // Summary Sheet Logic
                const sum3D = (cell: string) => ({ formula: `SUM('1:31'!${cell})` });
                ws.getCell('C5').value = sum3D('C5'); ws.getCell('D5').value = sum3D('D5');
                ws.getCell('E5').value = sum3D('E5'); ws.getCell('F5').value = sum3D('F5');
                ws.getCell('C6').value = sum3D('C6'); ws.getCell('D6').value = sum3D('D6');
                ws.getCell('E6').value = sum3D('E6'); ws.getCell('F6').value = sum3D('F6');
                ws.getCell('M5').value = sum3D('M5'); ws.getCell('M6').value = sum3D('M6'); 
                REASONS.forEach((_, i) => { 
                    const colLet = ws.getColumn(14 + i).letter; 
                    ws.getCell(5, 14 + i).value = sum3D(`${colLet}5`); 
                    ws.getCell(6, 14 + i).value = sum3D(`${colLet}6`); 
                });
            } else {
                // Daily Sheet Logic
                const { im, bm, dateStr } = getDayData(dayIndex);
                ws.getCell('C5').value = im.dP; ws.getCell('D5').value = im.dA;
                ws.getCell('E5').value = im.nP; ws.getCell('F5').value = im.nA;
                ws.getCell('C6').value = bm.dP; ws.getCell('D6').value = bm.dA;
                ws.getCell('E6').value = bm.nP; ws.getCell('F6').value = bm.nA;

                const effLossIM = getEfficiencyLoss(dateStr, 'IM');
                const effLossBM = getEfficiencyLoss(dateStr, 'BM');

                // 🟢 වෙනස් කළ කොටස: > 0 වෙනුවට !== 0 භාවිතා කර සෘණ අගයන්ට ඉඩ ලබා දීම
                if (effLossIM !== 0) ws.getCell('M5').value = effLossIM;
                if (effLossBM !== 0) ws.getCell('M6').value = effLossBM;

                REASONS.forEach((res, i) => { 
                    const valIM = getBreakdownLoss(dateStr, 'IM', res); 
                    const valBM = getBreakdownLoss(dateStr, 'BM', res); 

                    // 🟢 බිංදුව නොවන ඕනෑම Breakdown අගයක් පෙන්වීම
                    if (valIM !== 0) ws.getCell(5, 14 + i).value = valIM; 
                    if (valBM !== 0) ws.getCell(6, 14 + i).value = valBM; 
                });
            }


            

            const lastColLet = ws.getColumn(13 + REASONS.length).letter;

            // --- දත්ත හැඩගැන්වීම සහ Formulars ---
            [5, 6].forEach(r => {
                ws.getCell(`B${r}`).value = { formula: `C${r}+E${r}` };
                ws.getCell(`G${r}`).value = { formula: `C${r}+E${r}` };
                ws.getCell(`H${r}`).value = { formula: `D${r}+F${r}` };
                
                ws.getCell(`I${r}`).value = { formula: `IFERROR(H${r}/G${r},0)` }; 
                ws.getCell(`I${r}`).numFmt = '0.#%'; 

                // 🟢 1. Lost Kg (Plan Kg - Gross Kg)
                ws.getCell(`J${r}`).value = { formula: `B${r}-H${r}` };
                
                // 🟢 2. ඔබගේ ලොජික් එක: Eff Loss (Lost Kg - Breakdowns Sum)
                ws.getCell(`M${r}`).value = { formula: `J${r}-SUM(N${r}:${lastColLet}${r})` };
                
                // 🟢 3. Accuracy (Eff Loss + Breakdowns Sum)
                ws.getCell(`K${r}`).value = { formula: `M${r}+SUM(N${r}:${lastColLet}${r})` };
                
                ws.getCell(`L${r}`).value = { formula: `IFERROR(J${r}/B${r},0)` }; 
                ws.getCell(`L${r}`).numFmt = '0.#%';

                ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M'].forEach(col => {
                    ws.getCell(`${col}${r}`).numFmt = '0.#'; 
                });
            });




            // Breakdown Totals Row Formatting
            const lastCol = 13 + REASONS.length;
            for (let c = 2; c <= lastCol; c++) { 
                const colLet = ws.getColumn(c).letter; 
                if (c === 9) { 
                    ws.getCell(7, c).value = { formula: `IFERROR(H7/B7,0)` }; 
                    ws.getCell(7, c).numFmt = '0.#%'; 
                } else if (c === 12) { 
                    ws.getCell(7, c).value = { formula: `IFERROR(J7/B7,0)` }; 
                    ws.getCell(7, c).numFmt = '0.#%'; 
                } else if (c === 10) { 
                    ws.getCell(7, c).value = { formula: `B7-H7` }; 
                    ws.getCell(7, c).numFmt = '0.#';
                } else { 
                    ws.getCell(7, c).value = { formula: `SUM(${colLet}5:${colLet}6)` }; 
                    ws.getCell(7, c).numFmt = '0.#'; 
                } 
                
                if (c >= 14) {
                    ws.getCell(5, c).numFmt = '0.#';
                    ws.getCell(6, c).numFmt = '0.#';
                }
            }
        };

        // -------------------------------------------------------------------------
        // 4. SUMMARY TABLES (පහළින් ඇති Schedule සහ Stacked Loss Analysis වගු)
        // -------------------------------------------------------------------------
        const addSummarySections = (ws: ExcelJS.Worksheet) => {
            const lastCol = 13 + REASONS.length;
            const lastColLetter = ws.getColumn(lastCol).letter;

            // Schedule & Production Tables
            ws.getCell('A9').value = 'Schedule'; ws.getCell('A9').font = { bold: true };
            ws.getCell('B9').value = 'AOP'; ws.getCell('B9').font = { bold: true };

            ws.getCell('A10').value = 'Working Days'; ws.getCell('B10').value = schedDaysTotal; 
            ws.getCell('A11').value = 'Average Per Day (Kg)'; ws.getCell('B11').value = { formula: 'IFERROR(G7/B10,0)' };
            ws.getCell('A12').value = 'Average per day(Kg)-IM'; ws.getCell('B12').value = { formula: 'IFERROR(G5/B10,0)' };
            ws.getCell('A13').value = 'Average per day(Kg)-BM'; ws.getCell('B13').value = { formula: 'IFERROR(G6/B10,0)' };

            for (let r = 10; r <= 13; r++) {
                ws.getCell(r, 1).border = CFG_BORDER_THIN; ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
                ws.getCell(r, 2).border = CFG_BORDER_THIN; ws.getCell(r, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
                ws.getCell(r, 2).numFmt = '0.#';
            }

            ws.getCell('D9').value = 'Production'; ws.getCell('D9').font = { bold: true };
            ws.getCell('E9').value = 'AOP'; ws.getCell('E9').font = { bold: true };

            ws.getCell('D10').value = 'Working Days'; ws.getCell('E10').value = prodDaysTotal; 
            ws.getCell('D11').value = 'Average Per Day (Kg)'; ws.getCell('E11').value = { formula: 'IFERROR(H7/E10,0)' };
            ws.getCell('D12').value = 'Average per day(Kg)-IM'; ws.getCell('E12').value = { formula: 'IFERROR(H5/E10,0)' };
            ws.getCell('D13').value = 'Average per day(Kg)-BM'; ws.getCell('E13').value = { formula: 'IFERROR(H6/E10,0)' };

            for (let r = 10; r <= 13; r++) {
                ws.getCell(r, 4).border = CFG_BORDER_THIN; ws.getCell(r, 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
                ws.getCell(r, 5).border = CFG_BORDER_THIN; ws.getCell(r, 5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
                ws.getCell(r, 5).numFmt = '0.#';
            }

            // =====================================================================
            // IM & BM STACKED TABLES 
            // =====================================================================
            
            const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_HEADER_BLUE } };
            const subHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CFG_COLOR_L_GREY } };
            const subHeaders = ['Reason', 'KG', '%', 'Cumulative'];

            // ---------------- IM TABLE ----------------
            const imStartRow = 16;
            
            ws.mergeCells(`A${imStartRow}:D${imStartRow}`); 
            const imHeaderCell = ws.getCell(`A${imStartRow}`);
            imHeaderCell.value = "IM Machine Loss Analysis";
            imHeaderCell.fill = headerFill;
            imHeaderCell.font = CFG_FONT_TABLE_TITLE;
            imHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
            imHeaderCell.border = CFG_BORDER_THIN;

            subHeaders.forEach((h, i) => {
                const c = ws.getCell(imStartRow + 1, 1 + i);
                c.value = h;
                c.fill = subHeaderFill;
                c.font = CFG_FONT_HEADER;
                c.border = CFG_BORDER_THIN;
                c.alignment = { horizontal: 'center' };
            });

            const imDataStart = imStartRow + 2;
            const imDataEnd = imDataStart + REASONS.length - 1;
            const imSumRange = `$B$${imDataStart}:$B$${imDataEnd}`;

            REASONS.forEach((reason, idx) => {
                const r = imDataStart + idx;
                ws.getCell(r, 1).value = reason; 
                ws.getCell(r, 1).border = CFG_BORDER_THIN;

                ws.getCell(r, 2).value = { formula: `HLOOKUP(A${r},$N$3:$${lastColLetter}$6,3,FALSE)` };
                ws.getCell(r, 2).numFmt = '0.#';
                ws.getCell(r, 2).border = CFG_BORDER_THIN;

                ws.getCell(r, 3).value = { formula: `IFERROR(B${r}/SUM(${imSumRange}),0)` };
                ws.getCell(r, 3).numFmt = '0.#%';
                ws.getCell(r, 3).border = CFG_BORDER_THIN;

                if (idx === 0) ws.getCell(r, 4).value = { formula: `C${r}` };
                else ws.getCell(r, 4).value = { formula: `D${r - 1}+C${r}` };
                ws.getCell(r, 4).numFmt = '0.#%';
                ws.getCell(r, 4).border = CFG_BORDER_THIN;
            });

            // ---------------- BM TABLE ----------------
            const bmStartRow = imDataEnd + 3; 

            ws.mergeCells(`A${bmStartRow}:D${bmStartRow}`); 
            const bmHeaderCell = ws.getCell(`A${bmStartRow}`);
            bmHeaderCell.value = "BM Machine Loss Analysis";
            bmHeaderCell.fill = headerFill;
            bmHeaderCell.font = CFG_FONT_TABLE_TITLE;
            bmHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
            bmHeaderCell.border = CFG_BORDER_THIN;

            subHeaders.forEach((h, i) => {
                const c = ws.getCell(bmStartRow + 1, 1 + i);
                c.value = h;
                c.fill = subHeaderFill;
                c.font = CFG_FONT_HEADER;
                c.border = CFG_BORDER_THIN;
                c.alignment = { horizontal: 'center' };
            });

            const bmDataStart = bmStartRow + 2;
            const bmDataEnd = bmDataStart + REASONS.length - 1;
            const bmSumRange = `$B$${bmDataStart}:$B$${bmDataEnd}`;

            REASONS.forEach((reason, idx) => {
                const r = bmDataStart + idx;
                ws.getCell(r, 1).value = reason; 
                ws.getCell(r, 1).border = CFG_BORDER_THIN;

                ws.getCell(r, 2).value = { formula: `HLOOKUP(A${r},$N$3:$${lastColLetter}$6,4,FALSE)` };
                ws.getCell(r, 2).numFmt = '0.#';
                ws.getCell(r, 2).border = CFG_BORDER_THIN;

                ws.getCell(r, 3).value = { formula: `IFERROR(B${r}/SUM(${bmSumRange}),0)` };
                ws.getCell(r, 3).numFmt = '0.#%';
                ws.getCell(r, 3).border = CFG_BORDER_THIN;

                if (idx === 0) ws.getCell(r, 4).value = { formula: `C${r}` };
                else ws.getCell(r, 4).value = { formula: `D${r - 1}+C${r}` };
                ws.getCell(r, 4).numFmt = '0.#%';
                ws.getCell(r, 4).border = CFG_BORDER_THIN;
            });
            
            // Row Heights adjust
            ws.getRow(9).height = 15.75;
            for (let r = 10; r <= 13; r++) ws.getRow(r).height = 15.75;
            for (let r = imStartRow; r <= bmDataEnd; r++) ws.getRow(r).height = 15.75;
        };

        // -------------------------------------------------------------------------
        // 5. Sheets සෑදීම සහ Save කිරීම
        // -------------------------------------------------------------------------
        const [y, m] = currentDate.split('-');
        const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();

        const getOrAddSheet = (name: string) => {
            const existing = workbook.getWorksheet(name);
            return existing ? existing : workbook.addWorksheet(name, { views: [{ showGridLines: false }] });
        };

        // දින 1 සිට 31 දක්වා Sheets
        for (let d = 1; d <= daysInMonth; d++) {
            const ws = getOrAddSheet(String(d));
            setupTableLayout(ws, d, false);
        }
        for (let d = daysInMonth + 1; d <= 31; d++) {
            const ws = getOrAddSheet(String(d));
            setupTableLayout(ws, d, false);
        }
        
        // Summary Sheet එක
        let summaryWs = workbook.getWorksheet("Summary");
        if (!summaryWs) summaryWs = workbook.addWorksheet("Summary", { views: [{ showGridLines: false }] });
        
        setupTableLayout(summaryWs, 0, true);
        addSummarySections(summaryWs);

        // File Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Production_Report_System_${currentDate}.xlsx`);
        
    } catch (error) { 
        console.error("Excel Generation Error:", error); 
        alert("Failed to generate Excel report."); 
    }
};