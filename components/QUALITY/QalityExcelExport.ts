import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DefectEntry } from '../../types';

// ============================================================================
// 🎨 1. VISUAL STYLES & COLORS CONFIGURATION
// ============================================================================
const COLORS = {
    DATE_MC_BG: 'FFFFE699', AUDIT_BG: 'FF92D050', ITEM_BG: 'FFFFE699',
    PROD_WITH_BG: 'FFA9D08E', PROD_WITHOUT_BG: 'FFA9D08E', REJ_BG: 'FF00B0F0',
    START_BG: 'FFF4B084', SCRAP_BG: 'FFF4B084', SCRAP_TOT_BG: 'FF92D050',
    SHIFT_TITLE_BG: 'FFFFFFFF', DEFECT_HEADER: 'FF4472C4', COL_Q_DYN: 'FF5B9BD5',
    ROW_Q_DYN: 'FFCCCCFF', ROW_YELLOW: 'FFFFC000', ROW_GREEN: 'FFE2EFDA',
    ROW_CYAN: 'FFDAF2FF', ROW_ORANGE: 'FFFCE4D6', BLACK_ROW: 'FF000000',
    DAILY_TOTAL_BG: 'FFFFFF00', REJ_HEADER_GREY: 'FFD9D9D9', REJ_ORANGE_TOT: 'FFF4B084',
    REJ_BLUE_TOT: 'FF9BC2E6', REJ_PEACH: 'FDFce4d6', REJ_GREEN: 'FFE2EFDA',
    REJ_LAVENDER: 'FFDCD7ED', REJ_LIGHT_BLUE: 'FFDDEBF7', DASH_GREEN: 'FF00FF00',
    DASH_PURPLE: 'FFCC99FF', DASH_BLUE_HEADER: 'FF002060', DASH_SUB_BG: 'FFFFCC99',
    DASH_DATE_BG: 'FFFF69B4', DASH_A_BG: 'FF9BC2E6', DASH_B_BG: 'FFFFFF00',
    WHITE: 'FFFFFFFF', SLATE_DARK: 'FF1E293B', LIGHT_GREY: 'FFF1F5F9', DARK_GREY: 'FFE2E8F0'
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
};

// අදාළ Shift එක සහ අදාළ Sheet එක නිවැරදිව Map කිරීම
const SHEETS_CONFIG = [
    { name: "BM SHIFT -A", type: 'BM', shift: 'day', title: "SHIFT A" },
    { name: "BM SHIFT -B", type: 'BM', shift: 'night', title: "SHIFT B" },
    { name: "IM SHIFT -A", type: 'IM', shift: 'day', title: "SHIFT A" },
    { name: "IM SHIFT -B", type: 'IM', shift: 'night', title: "SHIFT B" },
];

// ============================================================================
// 🛠️ 2. HELPER FUNCTIONS (කේතය පහසු කිරීමට සහ නිවැරදිව පවත්වා ගැනීමට)
// ============================================================================

const getColLetter = (colIndex: number) => {
    let temp, letter = '';
    while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
};

// 🟢 අලුත්: Shift එක 100% ක් නිවැරදිව හඳුනා ගැනීම (DatabaseView එකේ ආකාරයටම)
const getShiftStr = (r: any) => {
    const shiftVal = (r.shift || r.shiftType || '').toString().toLowerCase().trim();
    return shiftVal === 'day' ? 'day' : 'night';
};



// 🟢 අලුත්: ITEM තීරුව පමණක් Auto Adjust කර, අනිත් සියලුම තීරු 100px (13) කිරීම
const applyColumnWidths = (ws: ExcelJS.Worksheet) => {
    ws.columns.forEach((column, i) => {
        const colNum = i + 1;
        const h1 = ws.getCell(1, colNum).value?.toString().toUpperCase() || '';
        const h2 = ws.getCell(2, colNum).value?.toString().toUpperCase() || '';
        
        if (h1.includes('ITEM') || h2.includes('ITEM')) {
            let maxLen = 15;
            column.eachCell({ includeEmpty: true }, cell => {
                if (Number(cell.row) >= 2 && cell.value) {
                    const len = cell.value.toString().length;
                    if (len > maxLen) maxLen = len;
                }
            });
            column.width = Math.min(Math.max(maxLen + 2, 15), 50);
        } else {
            // ExcelJS හි width '13' යනු දළ වශයෙන් 100 pixels වේ
            column.width = 13;
        }
    });
};

const styleHeader = (ws: ExcelJS.Worksheet, cellRef: string, val: string, bg: string, fontColor: string = COLORS.BLACK_ROW) => {
    const cell = ws.getCell(cellRef);
    cell.value = val;
    cell.font = { size: 14, bold: true, color: { argb: fontColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.border = BORDER_STYLE;
};

// ============================================================================
// 🚀 3. MAIN EXPORT FUNCTIONS (ප්‍රධාන Export ක්‍රියාවලිය)
// ============================================================================
export const generateProductionReport = async (data: any[], startDate: string, endDate: string, extraCategories: any[] = [], isFiltered: boolean = false) => {
    const workbook = new ExcelJS.Workbook();

    // 🟢 ඔබ කී පරිදිම Database එකේ සේව් වෙලා තියෙන Data (Defects) වලින්ම Category ටික වෙන් කරගැනීම
    const defectSet = new Set<string>();
    
    data.forEach(r => {
        if (r.defects && Array.isArray(r.defects)) {
            r.defects.forEach((d: DefectEntry) => {
                const name = (d.defectName || '').trim().toUpperCase();
                if (name) defectSet.add(name);
            });
        }
    });
    
    let finalDefectList = Array.from(defectSet).sort();
    
    // "OTHER" යන්නක් ලිස්ට් එකේ ඇත්නම් එය අයින් කර අවසානයටම දැමීම
    const otherIdx = finalDefectList.indexOf("OTHER");
    if (otherIdx > -1) { 
        finalDefectList.splice(otherIdx, 1); 
    }
    finalDefectList.push("OTHER"); // අනිවාර්යයෙන්ම "OTHER" අන්තිමට පෙන්වයි

    if (isFiltered) {
        const sheet = workbook.addWorksheet("Filtered Data", { views: [{ showGridLines: false }] });
        generateFilteredLayout(sheet, "FILTERED PRODUCTION DATA", data, finalDefectList);
    } else {
        const dashSheet = workbook.addWorksheet("A Vs B", { views: [{ showGridLines: false }] });
        setupDashboardLayout(dashSheet, data, startDate, endDate);

       // 🟢 අදාළ Shift එකටම අදාළ Data යැවීම
       for (const config of SHEETS_CONFIG) {
        const sheet = workbook.addWorksheet(config.name, { views: [{ showGridLines: false }] });
        // හරියටම Shift එක day ද night ද කියා පරීක්ෂා කරයි
        const sheetData = data.filter(r => r.type === config.type && getShiftStr(r) === config.shift);
        generateShiftLayout(sheet, config.title, sheetData, finalDefectList);
    }

        const rejSheet = workbook.addWorksheet("Rejection Analysis", { views: [{ showGridLines: false }] });
        generateRejectionLayout(rejSheet, data, startDate, endDate);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), isFiltered ? `Filtered_Report_${startDate}_to_${endDate}.xlsx` : `Production_Report_${startDate}_to_${endDate}.xlsx`);
};

export const generateItemReport = async (data: any[], itemName: string, startDate: string, endDate: string) => {
    const workbook = new ExcelJS.Workbook();
    const validSheetName = (itemName || "Unknown").replace(/[*?:\/[\]\\]/g, '').substring(0, 30);
    const sheet = workbook.addWorksheet(validSheetName, { views: [{ showGridLines: false }] });

    const defectSet = new Set<string>();
    data.forEach(r => { if(r.defects) r.defects.forEach((d: DefectEntry) => defectSet.add(d.defectName.toUpperCase())); });
    const defectList = Array.from(defectSet).sort();

    const headers = ['Date', 'Shift', 'Machine', 'Item Name', 'Unit Wt', 'Prod (Qty)', 'Audit (Qty)', 'Rej (Qty)', 'Rej %', 'Status', ...defectList];
    sheet.columns = headers.map((h, i) => ({ header: h, key: `col${i}`, width: 13 }));

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_DARK } }; 
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_STYLE;
    });
    headerRow.height = 25;

    data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let rowNum = 2;

    data.forEach(r => {
        const row = sheet.getRow(rowNum);
        const auditSum = (r.defects || []).reduce((s: number, d: DefectEntry) => s + d.qty, 0);
        
        row.getCell(1).value = new Date(r.date); row.getCell(1).numFmt = 'd-mmm';
        row.getCell(2).value = getShiftStr(r).toUpperCase(); 
        row.getCell(3).value = r.machine; row.getCell(4).value = r.product;
        row.getCell(5).value = r.unitWeight; row.getCell(6).value = r.qtyTotal; 
        row.getCell(7).value = auditSum; row.getCell(8).value = r.qtyReject;
        row.getCell(9).value = (r.pctAll || 0) / 100; row.getCell(9).numFmt = '0.0%';
        const status = r.pctAll > 5 ? 'High Waste' : 'Good';
        row.getCell(10).value = status;

        if (r.defects) {
            r.defects.forEach((def: DefectEntry) => {
                const idx = defectList.indexOf(def.defectName.toUpperCase());
                if (idx !== -1) row.getCell(11 + idx).value = ((row.getCell(11 + idx).value as number) || 0) + def.qty;
            });
        }

        const isDay = getShiftStr(r).includes('day');
        const itemColor = isDay ? COLORS.LIGHT_GREY : COLORS.DARK_GREY;
        for(let c=1; c<=headers.length; c++) {
            const cell = row.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c > 10 ? COLORS.ROW_Q_DYN : itemColor } };
            cell.border = BORDER_STYLE; cell.alignment = { horizontal: 'center' };
            if ([5,6,7,8].includes(c) || c > 10) cell.numFmt = '0.#';
            if (c === 10) cell.font = { color: { argb: status === 'High Waste' ? 'FFFF0000' : 'FF008000'}, bold: true };
        }
        rowNum++;
    });

    applyColumnWidths(sheet); 
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Item_Report_${validSheetName}_${startDate}.xlsx`);
};

// ============================================================================
// 📊 4. SHEET LAYOUT GENERATORS (එක් එක් Sheet එක සෑදීම)
// ============================================================================

function generateShiftLayout(ws: ExcelJS.Worksheet, shiftTitle: string, data: any[], defectList: string[]) {
    buildCommonTableLayout(ws, shiftTitle, defectList);

    data.sort((a,b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.machine || '').localeCompare(b.machine || '', undefined, { numeric: true });
    });
    
    const groupedData: Record<string, any[]> = {};
    data.forEach(r => { if(!groupedData[r.date]) groupedData[r.date] = []; groupedData[r.date].push(r); });

    let currentRow = 3;
    Object.keys(groupedData).sort().forEach(dateKey => {
        const startRow = currentRow;
        currentRow = writeDataRows(ws, groupedData[dateKey], defectList, currentRow);
        
        writeTotalRow(ws, currentRow, startRow, currentRow - 1, defectList, `TOTAL (${new Date(dateKey).toLocaleDateString('en-GB', {day:'numeric', month:'short'})})`, COLORS.DAILY_TOTAL_BG);
        currentRow++;

        const blackRow = ws.getRow(currentRow);
        for(let c=1; c<=18 + defectList.length; c++) {
            blackRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BLACK_ROW } };
        }
        currentRow++;
    });

    if (currentRow > 3) {
        writeTotalRow(ws, currentRow, 3, currentRow - 1, defectList, "GRAND TOTAL", 'FF92D050');
    }
    
    applyColumnWidths(ws); 
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

function generateFilteredLayout(ws: ExcelJS.Worksheet, shiftTitle: string, data: any[], defectList: string[]) {
    buildCommonTableLayout(ws, shiftTitle, defectList);

    data.sort((a,b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.machine || '').localeCompare(b.machine || '', undefined, { numeric: true });
    });
    
    let currentRow = writeDataRows(ws, data, defectList, 3);

    if (currentRow > 3) {
        writeTotalRow(ws, currentRow, 3, currentRow - 1, defectList, "GRAND TOTAL", 'FF92D050');
    }

    applyColumnWidths(ws); 
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

// ============================================================================
// 🏗️ 5. REUSABLE BUILDERS (මේවායින් කේතයේ දිග ගොඩක් අඩුවේ)
// ============================================================================

function buildCommonTableLayout(ws: ExcelJS.Worksheet, titleTxt: string, defectList: string[]) {
    const totalCols = 18 + defectList.length;
    ws.getRow(1).height = 30; ws.mergeCells('A1:C1');
    const title = ws.getCell('A1'); title.value = titleTxt; title.font = { size: 20, bold: true };
    title.alignment = { horizontal: 'center', vertical: 'middle' }; title.border = BORDER_STYLE;

    ws.mergeCells('E1:H1'); styleHeader(ws, 'E1', 'PRODUCTION', COLORS.PROD_WITH_BG);
    ws.mergeCells('I1:J1'); styleHeader(ws, 'I1', 'REJECTION', COLORS.REJ_BG);
    ws.mergeCells('K1:N1'); styleHeader(ws, 'K1', 'START UP', COLORS.START_BG);

    if (defectList.length > 0) {
        ws.mergeCells(`${getColLetter(18)}1:${getColLetter(totalCols)}1`);
        styleHeader(ws, `${getColLetter(18)}1`, 'DEFECT BREAKDOWN', COLORS.DEFECT_HEADER, COLORS.WHITE);
    }

    ws.getRow(2).height = 60;
    const headers = [ "DATE", "M/C", "ITEM", "Unit Weight(g)", "PROD With Damage", "PROD Acc", "PROD Weight", "Acc Weight", "REJ Qty", "REJ Weight", "START Qty", "START Weight", "% (St)", "SCRAP %", "TOT SCRAP %", "Good Qty", "AUDIT (Qty)", ...defectList ];
    
    headers.forEach((val, idx) => {
        const c = ws.getCell(2, idx + 1);
        c.value = val; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.font = { bold: true, size: 9 }; c.border = BORDER_STYLE;
        
        let bg = COLORS.ROW_Q_DYN;
        if (idx<2) bg = COLORS.DATE_MC_BG; else if (idx<4) bg = COLORS.ITEM_BG;
        else if (idx<8) bg = COLORS.PROD_WITH_BG; else if (idx<10) bg = COLORS.REJ_BG;
        else if (idx<13) bg = COLORS.START_BG; else if (idx<15) bg = COLORS.SCRAP_BG;
        else if (idx===16) bg = COLORS.AUDIT_BG;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    });
}

function writeDataRows(ws: ExcelJS.Worksheet, data: any[], defectList: string[], startRow: number) {
    let r = startRow;
    const totalCols = 18 + defectList.length;

    data.forEach(item => {
        const row = ws.getRow(r);
        const auditSum = (item.defects || []).reduce((s: number, d: DefectEntry) => s + d.qty, 0);

        row.getCell(1).value = new Date(item.date); row.getCell(1).numFmt = 'd-mmm';
        row.getCell(2).value = item.machine; row.getCell(3).value = item.product;
        row.getCell(4).value = item.unitWeight; row.getCell(5).value = item.qtyTotal;
        row.getCell(6).value = item.qtyAccept; row.getCell(7).value = item.wgtTotal;
        row.getCell(8).value = item.wgtAccept; row.getCell(9).value = item.qtyReject;
        row.getCell(10).value = item.wgtReject; row.getCell(11).value = item.qtyStartup;
        row.getCell(12).value = item.wgtStartup;
        
        row.getCell(13).value = { formula: `IFERROR(L${r}/G${r},0)` }; row.getCell(13).numFmt = '0.0%'; 
        row.getCell(14).value = { formula: `IFERROR(J${r}/G${r},0)` }; row.getCell(14).numFmt = '0.0%'; 
        row.getCell(15).value = { formula: `IFERROR((J${r}+L${r})/G${r},0)` }; row.getCell(15).numFmt = '0.0%'; 
        row.getCell(16).value = item.goodQty || null; row.getCell(17).value = auditSum;

        [4,5,6,7,8,9,10,11,12,17].forEach(c => row.getCell(c).numFmt = '0.#');

        if (item.defects) {
            item.defects.forEach((def: DefectEntry) => {
                const defName = (def.defectName || '').toUpperCase();
                let idx = defectList.indexOf(defName);
                if (idx === -1) idx = defectList.indexOf("OTHER"); 
                
                if (idx !== -1) {
                    const c = row.getCell(18 + idx);
                    c.value = ((c.value as number) || 0) + def.qty; c.numFmt = '0.#';
                }
            });
        }

        for(let c=1; c<=totalCols; c++) {
            const cell = row.getCell(c); cell.border = BORDER_STYLE; cell.alignment = { horizontal: 'center' }; cell.font = { size: 10 };
            let bg = COLORS.ROW_Q_DYN;
            if (c<=3 || c==4) bg = COLORS.ROW_YELLOW; else if (c<=8) bg = COLORS.ROW_GREEN;
            else if (c<=10) bg = COLORS.ROW_CYAN; else if (c<=13) bg = COLORS.ROW_ORANGE;
            else if (c<=15) bg = COLORS.ROW_GREEN; else if (c==17) bg = COLORS.PROD_WITH_BG;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        }
        r++;
    });
    return r;
}

function writeTotalRow(ws: ExcelJS.Worksheet, r: number, startR: number, endR: number, defectList: string[], title: string, bgColor: string) {
    const row = ws.getRow(r);
    const totalCols = 18 + defectList.length;
    row.getCell(1).value = title; 
    
    ['E','F','G','H','I','J','K','L'].forEach((colLet, idx) => {
        const cIdx = 5 + idx; 
        row.getCell(cIdx).value = { formula: `SUBTOTAL(9, ${getColLetter(cIdx)}${startR}:${getColLetter(cIdx)}${endR})` };
        row.getCell(cIdx).numFmt = '0.#';
    });

    row.getCell(13).value = { formula: `IFERROR(L${r}/G${r},0)` }; row.getCell(13).numFmt = '0.0%';
    row.getCell(14).value = { formula: `IFERROR(J${r}/G${r},0)` }; row.getCell(14).numFmt = '0.0%';
    row.getCell(15).value = { formula: `IFERROR((J${r}+L${r})/G${r},0)` }; row.getCell(15).numFmt = '0.0%';
    
    row.getCell(16).value = { formula: `SUBTOTAL(9, P${startR}:P${endR})` }; row.getCell(16).numFmt = '0.#';
    row.getCell(17).value = { formula: `SUBTOTAL(9, Q${startR}:Q${endR})` }; row.getCell(17).numFmt = '0.#';

    for(let d=0; d<defectList.length; d++) {
        const col = 18 + d;
        row.getCell(col).value = { formula: `SUBTOTAL(9, ${getColLetter(col)}${startR}:${getColLetter(col)}${endR})` };
        row.getCell(col).numFmt = '0.#';
    }

    for(let c=1; c<=totalCols; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { bold: true }; cell.border = BORDER_STYLE; cell.alignment = { horizontal: 'center' };
    }
    if (title === "GRAND TOTAL") ws.mergeCells(`A${r}:D${r}`);
}


// --- DASHBOARD & REJECTION LAYOUTS ---
function setupDashboardLayout(ws: ExcelJS.Worksheet, data: any[], startDateStr: string, endDateStr: string) {
    ws.getCell('A1').value = "Date"; ws.getCell('A1').border = BORDER_STYLE;
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; ws.getCell('A1').font = { bold: true };

    styleHeader(ws, 'B1:G1', 'SHIFT A (BM)', COLORS.DASH_GREEN); 
    styleHeader(ws, 'H1:M1', 'SHIFT B (BM)', COLORS.DASH_PURPLE);
    styleHeader(ws, 'O1:T1', 'TOTAL', COLORS.DASH_BLUE_HEADER, COLORS.WHITE);

    const applySubs = (sCol: number) => {
        ["ACHIVE", "MTD", "Scrap", "MTD", "Day %", "MTD %"].forEach((v, i) => {
            const c = ws.getCell(2, sCol + i);
            c.value = v; c.font = { bold: true, size: 9 }; c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_SUB_BG } }; c.border = BORDER_STYLE;
        });
    };
    applySubs(2); applySubs(8); applySubs(15);

    const dailyData: Record<string, any> = {};
    let d = new Date(startDateStr); const end = new Date(endDateStr);
    while(d <= end) { dailyData[d.toISOString().split('T')[0]] = { a_ach: 0, a_scr: 0, b_ach: 0, b_scr: 0 }; d.setDate(d.getDate() + 1); }

    data.forEach(r => {
        if(r.type === 'BM' && dailyData[r.date]) {
            // 🟢 Shift එක කෙලින්ම ලබා ගැනීම
            const isDay = getShiftStr(r) === 'day';
            
            if(isDay) { 
                dailyData[r.date].a_ach += r.wgtAccept; 
                dailyData[r.date].a_scr += r.wgtReject; 
            } else { 
                dailyData[r.date].b_ach += r.wgtAccept; 
                dailyData[r.date].b_scr += r.wgtReject; 
            }
        }
    });



    let r = 3, cum_A_Ach = 0, cum_A_Scr = 0, cum_B_Ach = 0, cum_B_Scr = 0, cum_Tot_Ach = 0, cum_Tot_Scr = 0;
    
    Object.keys(dailyData).sort().forEach(dateKey => {
        const row = ws.getRow(r); const v = dailyData[dateKey];
        row.getCell(1).value = new Date(dateKey); row.getCell(1).numFmt = 'd-mmm'; row.getCell(1).border = BORDER_STYLE;
        row.getCell(1).alignment = { horizontal: 'center' }; row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_DATE_BG } };

        cum_A_Ach += v.a_ach; cum_A_Scr += v.a_scr;
        row.getCell(2).value = v.a_ach; row.getCell(3).value = cum_A_Ach; row.getCell(4).value = v.a_scr; row.getCell(5).value = cum_A_Scr;
        row.getCell(6).value = { formula: `IFERROR(D${r}/(B${r}+D${r}),0)` }; row.getCell(6).numFmt = '0.0%'; 
        row.getCell(7).value = { formula: `IFERROR(E${r}/(C${r}+E${r}),0)` }; row.getCell(7).numFmt = '0.0%';

        cum_B_Ach += v.b_ach; cum_B_Scr += v.b_scr;
        row.getCell(8).value = v.b_ach; row.getCell(9).value = cum_B_Ach; row.getCell(10).value = v.b_scr; row.getCell(11).value = cum_B_Scr;
        row.getCell(12).value = { formula: `IFERROR(J${r}/(H${r}+J${r}),0)` }; row.getCell(12).numFmt = '0.0%';
        row.getCell(13).value = { formula: `IFERROR(K${r}/(I${r}+K${r}),0)` }; row.getCell(13).numFmt = '0.0%';

        row.getCell(15).value = { formula: `B${r}+H${r}` };
        cum_Tot_Ach += (v.a_ach + v.b_ach); row.getCell(16).value = cum_Tot_Ach; 
        row.getCell(17).value = { formula: `D${r}+J${r}` };
        cum_Tot_Scr += (v.a_scr + v.b_scr); row.getCell(18).value = cum_Tot_Scr;
        row.getCell(19).value = { formula: `IFERROR(Q${r}/(O${r}+Q${r}),0)` }; row.getCell(19).numFmt = '0.0%';
        row.getCell(20).value = { formula: `IFERROR(R${r}/(P${r}+R${r}),0)` }; row.getCell(20).numFmt = '0.0%';

        [2,3,4,5,8,9,10,11,15,16,17,18].forEach(c => row.getCell(c).numFmt = '0.#');

        for(let c=2; c<=20; c++) {
            if(c===14) continue;
            const cell = row.getCell(c); cell.border = BORDER_STYLE;
            let bg = COLORS.DASH_B_BG;
            if (c<=13 && ((c-2)%6) < 2) bg = COLORS.DASH_A_BG;
            if (c>=15 && (c-15) < 2) bg = COLORS.DASH_A_BG;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        }
        r++;
    });

    applyColumnWidths(ws); 
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

function generateRejectionLayout(ws: ExcelJS.Worksheet, data: any[], startDate: string, endDate: string) {
    styleHeader(ws, 'A1:A1', 'Date', COLORS.WHITE);
    styleHeader(ws, 'B1:E1', 'Accepted Production (Kg)', COLORS.REJ_HEADER_GREY);
    styleHeader(ws, 'F1:I1', 'Rejection (Kg)', COLORS.REJ_HEADER_GREY);
    styleHeader(ws, 'J1:M1', 'Rejection Percentage', COLORS.REJ_HEADER_GREY);
    styleHeader(ws, 'N1:N1', 'Total BM %', COLORS.REJ_HEADER_GREY); 
    styleHeader(ws, 'O1:O1', 'Total IM %', COLORS.REJ_HEADER_GREY);
    styleHeader(ws, 'P1:P1', 'IM Total', COLORS.REJ_ORANGE_TOT); 
    styleHeader(ws, 'Q1:Q1', 'BM Total', COLORS.REJ_BLUE_TOT);

    const subH = ["IM-A", "IM-B", "BM-A", "BM-B"];
    [2, 6, 10].forEach(offset => subH.forEach((v, i) => ws.getCell(2, offset+i).value = v));

    for(let c=2; c<=17; c++) {
        const cell = ws.getCell(2, c); cell.font = { bold: true }; cell.alignment = { horizontal: 'center' }; cell.border = BORDER_STYLE;
        if (c<=15) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_HEADER_GREY } };
        if (c==16) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_ORANGE_TOT } };
        if (c==17) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_BLUE_TOT } };
    }

    const summary: Record<string, any> = {};
    let d = new Date(startDate); const end = new Date(endDate);
    while (d <= end) { summary[d.toISOString().split('T')[0]] = { imA_p:0, imB_p:0, bmA_p:0, bmB_p:0, imA_r:0, imB_r:0, bmA_r:0, bmB_r:0 }; d.setDate(d.getDate() + 1); }
    

    
    data.forEach(r => {
        if (summary[r.date]) {
            const prod = r.wgtAccept; 
            const rej = r.wgtReject; 
            // 🟢 Shift එක කෙලින්ම ලබා ගැනීම
            const isDay = getShiftStr(r) === 'day';

            if (r.type === 'IM') {
                if (isDay) { summary[r.date].imA_p += prod; summary[r.date].imA_r += rej; }
                else { summary[r.date].imB_p += prod; summary[r.date].imB_r += rej; }
            } else {
                if (isDay) { summary[r.date].bmA_p += prod; summary[r.date].bmA_r += rej; }
                else { summary[r.date].bmB_p += prod; summary[r.date].bmB_r += rej; }
            }
        }
    });



    let r = 3;
    Object.keys(summary).sort().forEach(dateStr => {
        const row = ws.getRow(r); const v = summary[dateStr];
        row.getCell(1).value = new Date(dateStr); row.getCell(1).numFmt = 'd-mmm';
        
        [2,3,4,5,6,7,8,9].forEach((idx) => {
            const vals = [v.imA_p, v.imB_p, v.bmA_p, v.bmB_p, v.imA_r, v.imB_r, v.bmA_r, v.bmB_r];
            row.getCell(idx).value = vals[idx-2]; row.getCell(idx).numFmt = '0.#'; 
        });

        row.getCell(16).value = { formula: `F${r}+G${r}` }; row.getCell(16).numFmt = '0.#';
        row.getCell(17).value = { formula: `H${r}+I${r}` }; row.getCell(17).numFmt = '0.#';

        row.getCell(10).value = { formula: `IFERROR(F${r}/(B${r}+F${r}),0)` }; row.getCell(10).numFmt = '0.0%';
        row.getCell(11).value = { formula: `IFERROR(G${r}/(C${r}+G${r}),0)` }; row.getCell(11).numFmt = '0.0%';
        row.getCell(12).value = { formula: `IFERROR(H${r}/(D${r}+H${r}),0)` }; row.getCell(12).numFmt = '0.0%';
        row.getCell(13).value = { formula: `IFERROR(I${r}/(E${r}+I${r}),0)` }; row.getCell(13).numFmt = '0.0%';
        row.getCell(14).value = { formula: `IFERROR((H${r}+I${r})/(D${r}+E${r}+H${r}+I${r}),0)` }; row.getCell(14).numFmt = '0.0%';
        row.getCell(15).value = { formula: `IFERROR((F${r}+G${r})/(B${r}+C${r}+F${r}+G${r}),0)` }; row.getCell(15).numFmt = '0.0%';

        for(let c=1; c<=17; c++) {
            const cell = row.getCell(c); cell.border = BORDER_STYLE; cell.alignment = { horizontal: 'center' };
            if(c==2||c==3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_PEACH } };
            if(c==4||c==5||c==8||c==9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_GREEN } };
            if(c==6||c==7) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_LAVENDER } };
            if(c>=10 && c<=13) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_LIGHT_BLUE } };
        }
        r++;
    });

    const fR = r; const footer = ws.getRow(fR);
    footer.getCell(1).value = "Total"; footer.font = { bold: true };
    ['B','C','D','E','F','G','H','I'].forEach((col, i) => {
        footer.getCell(2+i).value = { formula: `SUM(${col}3:${col}${fR-1})` };
        footer.getCell(2+i).font = { color: { argb: 'FFFF0000' }, bold: true }; footer.getCell(2+i).numFmt = '0.#'; 
    });
    footer.getCell(16).value = { formula: `F${fR}+G${fR}` }; footer.getCell(16).numFmt = '0.#';
    footer.getCell(17).value = { formula: `H${fR}+I${fR}` }; footer.getCell(17).numFmt = '0.#';
    
    footer.getCell(10).value = { formula: `IFERROR(F${fR}/(B${fR}+F${fR}),0)` };
    footer.getCell(11).value = { formula: `IFERROR(G${fR}/(C${fR}+G${fR}),0)` };
    footer.getCell(12).value = { formula: `IFERROR(H${fR}/(D${fR}+H${fR}),0)` };
    footer.getCell(13).value = { formula: `IFERROR(I${fR}/(E${fR}+I${fR}),0)` };
    footer.getCell(14).value = { formula: `IFERROR((H${fR}+I${fR})/(H${fR}+I${fR}+D${fR}+E${fR}),0)` };
    footer.getCell(15).value = { formula: `IFERROR((F${fR}+G${fR})/(F${fR}+G${fR}+B${fR}+C${fR}),0)` };
    
    for (let c=1; c<=17; c++) {
        const cell = footer.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; cell.border = BORDER_STYLE;
        if(c>=10 && c<=15) cell.numFmt = '0.0%';
    }
    
    applyColumnWidths(ws); 
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}