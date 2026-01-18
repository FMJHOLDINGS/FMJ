import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DefectEntry } from '../types';

// --- VISUAL STYLES & COLORS ---
const COLORS = {
    // Shift Sheet Colors
    DATE_MC_BG:     'FFFFE699',      
    AUDIT_BG:       'FF92D050',      
    ITEM_BG:        'FFFFE699',      
    PROD_WITH_BG:   'FFA9D08E',      
    PROD_WITHOUT_BG:'FFA9D08E',      
    REJ_BG:         'FF00B0F0',      
    START_BG:       'FFF4B084',      
    SCRAP_BG:       'FFF4B084',      
    SCRAP_TOT_BG:   'FF92D050',      
    
    SHIFT_TITLE_BG: 'FFFFFFFF',
    DEFECT_HEADER:  'FF4472C4',      
    COL_Q_DYN:      'FF5B9BD5',      
    ROW_Q_DYN:      'FFCCCCFF',
    
    ROW_YELLOW:     'FFFFC000',
    ROW_GREEN:      'FFE2EFDA',
    ROW_CYAN:       'FFDAF2FF',
    ROW_ORANGE:     'FFFCE4D6',

    BLACK_ROW:      'FF000000',
    DAILY_TOTAL_BG: 'FFFFFF00', 

    REJ_HEADER_GREY: 'FFD9D9D9',
    REJ_ORANGE_TOT:  'FFF4B084',
    REJ_BLUE_TOT:    'FF9BC2E6',
    REJ_PEACH:       'FDFce4d6',
    REJ_GREEN:       'FFE2EFDA',
    REJ_LAVENDER:    'FFDCD7ED',
    REJ_LIGHT_BLUE:  'FFDDEBF7',

    // Dashboard Colors
    DASH_GREEN:     'FF00FF00',
    DASH_PURPLE:    'FFCC99FF',
    DASH_BLUE_HEADER:'FF002060',
    DASH_SUB_BG:    'FFFFCC99',
    DASH_DATE_BG:   'FFFF69B4',
    DASH_A_BG:      'FF9BC2E6',
    DASH_B_BG:      'FFFFFF00',
    
    WHITE:          'FFFFFFFF',
    SLATE_DARK:     'FF1E293B',
    LIGHT_GREY:     'FFF1F5F9',
    DARK_GREY:      'FFE2E8F0'
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
};

const SHEETS_CONFIG = [
    { name: "BM SHIFT -A", type: 'BM', shift: 'day', title: "SHIFT A" },
    { name: "BM SHIFT -B", type: 'BM', shift: 'night', title: "SHIFT B" },
    { name: "IM SHIFT -A", type: 'IM', shift: 'day', title: "SHIFT A" },
    { name: "IM SHIFT -B", type: 'IM', shift: 'night', title: "SHIFT B" },
];

const getColLetter = (colIndex: number) => {
    let temp, letter = '';
    while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
};

// --- MAIN EXPORT FUNCTION ---
export const generateProductionReport = async (data: any[], startDate: string, endDate: string, extraCategories: string[] = []) => {
    const workbook = new ExcelJS.Workbook();

    const defectSet = new Set<string>();
    const Defaults = ["LOW THIKNESS", "FORMING ISSUE", "P/F MARK", "WHITE CONER", "DEFORMATION", "BLACK DOT", "BURN MARK", "OTHER"];
    Defaults.forEach(d => defectSet.add(d));
    extraCategories.forEach(c => defectSet.add(c));
    data.forEach(row => {
        if(row.defects) row.defects.forEach((d: DefectEntry) => defectSet.add(d.defectName));
    });
    const finalDefectList = Array.from(defectSet).sort();

    const dashSheet = workbook.addWorksheet("A Vs B", { views: [{ showGridLines: false }] });
    setupDashboardLayout(dashSheet, data, startDate, endDate);

    for (const config of SHEETS_CONFIG) {
        const sheet = workbook.addWorksheet(config.name, { views: [{ showGridLines: false }] });
        const sheetData = data.filter(r => r.type === config.type && r.shift === config.shift);
        generateShiftLayout(sheet, config.title, sheetData, finalDefectList);
    }

    const rejSheet = workbook.addWorksheet("Rejection Analysis", { views: [{ showGridLines: false }] });
    generateRejectionLayout(rejSheet, data, startDate, endDate);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Production_Report_${startDate}_to_${endDate}.xlsx`);
};

// --- SINGLE ITEM REPORT EXPORT ---
export const generateItemReport = async (data: any[], itemName: string, startDate: string, endDate: string) => {
    const workbook = new ExcelJS.Workbook();
    const validSheetName = (itemName || "Unknown").replace(/[*?:\/[\]\\]/g, '').substring(0, 30);
    const sheet = workbook.addWorksheet(validSheetName, { views: [{ showGridLines: false }] });

    sheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Shift', key: 'shift', width: 10 }, 
        { header: 'Machine', key: 'machine', width: 10 },
        { header: 'Item Name', key: 'item', width: 25 },
        { header: 'Unit Wt', key: 'wt', width: 10 },
        { header: 'Prod (Qty)', key: 'prod', width: 12 },
        { header: 'Audit (Qty)', key: 'audit', width: 12 },
        { header: 'Rej (Qty)', key: 'rej', width: 12 },
        { header: 'Rej %', key: 'rejP', width: 10 },
        { header: 'Status', key: 'status', width: 12 },
    ];

    const defectSet = new Set<string>();
    data.forEach(r => { if(r.defects) r.defects.forEach((d: DefectEntry) => defectSet.add(d.defectName)); });
    const defectList = Array.from(defectSet).sort();
    
    // Add Dynamic Columns
    const startDefectCol = 11;
    defectList.forEach((def, i) => {
        sheet.getColumn(startDefectCol + i).width = 12;
        sheet.getRow(1).getCell(startDefectCol + i).value = def;
    });

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.WHITE }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SLATE_DARK } }; 
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_STYLE;
    });
    sheet.getRow(1).height = 25;

    data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let rowNum = 2;

    data.forEach(r => {
        const row = sheet.getRow(rowNum);
        const auditSum = (r.defects || []).reduce((s: number, d: DefectEntry) => s + d.qty, 0);
        
        row.getCell(1).value = new Date(r.date); row.getCell(1).numFmt = 'd-mmm';
        row.getCell(2).value = r.shift.toUpperCase(); 
        row.getCell(3).value = r.machine;
        row.getCell(4).value = r.product;
        row.getCell(5).value = r.unitWeight;
        row.getCell(6).value = r.qtyTotal; 
        row.getCell(7).value = auditSum;
        row.getCell(8).value = r.qtyReject;
        row.getCell(9).value = (r.pctAll || 0) / 100; row.getCell(9).numFmt = '0.0%';
        const status = r.pctAll > 5 ? 'High Waste' : 'Good';
        row.getCell(10).value = status;

        if (r.defects && Array.isArray(r.defects)) {
            r.defects.forEach((def: DefectEntry) => {
                const idx = defectList.indexOf(def.defectName);
                if (idx !== -1) {
                    const colPos = 11 + idx;
                    row.getCell(colPos).value = (row.getCell(colPos).value as number || 0) + def.qty;
                }
            });
        }

        const isDay = r.shift === 'day';
        const itemColor = isDay ? COLORS.LIGHT_GREY : COLORS.DARK_GREY;
        
        for(let c=1; c<=10 + defectList.length; c++) {
            const cell = row.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c > 10 ? COLORS.ROW_Q_DYN : itemColor } };
            cell.border = BORDER_STYLE;
            cell.alignment = { horizontal: 'center' };
            if ([5,6,7,8].includes(c) || c > 10) cell.numFmt = '0.#';
            if(c === 10) {
                if(status === 'High Waste') cell.font = { color: { argb: 'FFFF0000'}, bold: true };
                else cell.font = { color: { argb: 'FF008000'}, bold: true };
            }
        }
        rowNum++;
    });

    const totRow = sheet.getRow(rowNum);
    totRow.getCell(1).value = "TOTAL";
    totRow.getCell(6).value = { formula: `SUM(F2:F${rowNum-1})` }; totRow.getCell(6).numFmt = '0.#';
    totRow.getCell(7).value = { formula: `SUM(G2:G${rowNum-1})` }; totRow.getCell(7).numFmt = '0.#';
    totRow.getCell(8).value = { formula: `SUM(H2:H${rowNum-1})` }; totRow.getCell(8).numFmt = '0.#';
    
    defectList.forEach((_, i) => {
        const colIdx = 11 + i;
        const letter = getColLetter(colIdx);
        totRow.getCell(colIdx).value = { formula: `SUM(${letter}2:${letter}${rowNum-1})` };
        totRow.getCell(colIdx).numFmt = '0.#';
    });
    
    totRow.font = { bold: true };
    for(let c=1; c<=10 + defectList.length; c++) {
        const cell = totRow.getCell(c);
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    }
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Item_Report_${validSheetName}_${startDate}.xlsx`);
};

// --- SHIFT LAYOUT GENERATOR ---
function generateShiftLayout(ws: ExcelJS.Worksheet, shiftTitle: string, data: any[], defectList: string[]) {
    // 1. Column Widths
    const widths = [10, 6, 8, 25, 10, 12, 12, 12, 12, 10, 10, 10, 10, 8, 10, 12, 10]; 
    widths.forEach((w, i) => ws.getColumn(i+1).width = w);
    ws.getColumn(17).width = 8; 
    
    const startDefectCol = 18; 
    const totalCols = 17 + defectList.length;
    for(let i=startDefectCol; i<=totalCols; i++) ws.getColumn(i).width = 10;

    // Headers
    ws.getRow(1).height = 30;
    ws.mergeCells('A1:C1');
    const title = ws.getCell('A1');
    title.value = shiftTitle;
    title.font = { size: 20, bold: true };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.border = BORDER_STYLE;

    ws.mergeCells('E1:H1'); styleHeader(ws, 'E1', 'PRODUCTION', COLORS.PROD_WITH_BG);
    ws.mergeCells('I1:J1'); styleHeader(ws, 'I1', 'REJECTION', COLORS.REJ_BG);
    ws.mergeCells('K1:N1'); styleHeader(ws, 'K1', 'START UP', COLORS.START_BG);

    if (defectList.length > 0) {
        const endCol = getColLetter(totalCols);
        const startLetter = getColLetter(startDefectCol);
        ws.mergeCells(`${startLetter}1:${endCol}1`);
        const defH = ws.getCell(`${startLetter}1`);
        defH.value = "DEFECT BREAKDOWN";
        defH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DEFECT_HEADER } };
        defH.font = { bold: true, color: { argb: COLORS.WHITE } };
        defH.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    ws.getRow(2).height = 60;
    const headers = [ "DATE", "M/C", "ITEM", "Unit Weight(g)", "PROD With Damage", "PROD Acc", "PROD Weight", "Acc Weight", "REJ Qty", "REJ Weight", "START Qty", "START Weight", "% (St)", "SCRAP %", "TOT SCRAP %", "AUDIT (Qty)" ];
    const allHeaders = [...headers, ...defectList];

    allHeaders.forEach((val, idx) => {
        const colIdx = idx + 1;
        const cell = ws.getCell(2, colIdx);
        cell.value = val;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { bold: true, size: 9 };
        cell.border = BORDER_STYLE;

        let bg = COLORS.WHITE;
        if (colIdx<=2) bg = COLORS.DATE_MC_BG;
        else if (colIdx<=4) bg = COLORS.ITEM_BG;
        else if (colIdx<=8) bg = COLORS.PROD_WITH_BG;
        else if (colIdx<=10) bg = COLORS.REJ_BG;
        else if (colIdx<=13) bg = COLORS.START_BG;
        else if (colIdx<=15) bg = COLORS.SCRAP_BG;
        else if (colIdx === 16) bg = COLORS.AUDIT_BG; 
        else bg = COLORS.COL_Q_DYN;

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    });

    // Data Rows
    data.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group by Date for Black Separation
    const groupedData: Record<string, any[]> = {};
    data.forEach(r => {
        if(!groupedData[r.date]) groupedData[r.date] = [];
        groupedData[r.date].push(r);
    });

    let currentRow = 3;
    const dateKeys = Object.keys(groupedData).sort();

    dateKeys.forEach(dateKey => {
        const dailyRows = groupedData[dateKey];
        const startRow = currentRow;

        dailyRows.forEach(r => {
            const row = ws.getRow(currentRow);
            const R = currentRow;
            const auditSum = (r.defects || []).reduce((sum: number, d: DefectEntry) => sum + d.qty, 0);

            row.getCell(1).value = new Date(r.date); row.getCell(1).numFmt = 'd-mmm';
            row.getCell(2).value = r.machine;
            row.getCell(3).value = r.product;
            row.getCell(4).value = r.unitWeight;
            
            row.getCell(5).value = r.qtyTotal;
            row.getCell(6).value = r.qtyAccept;
            row.getCell(7).value = r.wgtTotal;
            row.getCell(8).value = r.wgtAccept;
            row.getCell(9).value = r.qtyReject;
            row.getCell(10).value = r.wgtReject;
            row.getCell(11).value = r.qtyStartup;
            row.getCell(12).value = r.wgtStartup;
            
            row.getCell(13).value = { formula: `IFERROR(L${R}/H${R},0)` }; row.getCell(13).numFmt = '0.0%'; 
            row.getCell(14).value = { formula: `IFERROR(J${R}/H${R},0)` }; row.getCell(14).numFmt = '0.0%'; 
            row.getCell(15).value = { formula: `IFERROR((J${R}+L${R})/H${R},0)` }; row.getCell(15).numFmt = '0.0%'; 
            row.getCell(16).value = auditSum;

            // Apply Decimal Formatting
            [4, 5, 6, 7, 8, 9, 10, 11, 12, 16].forEach(c => row.getCell(c).numFmt = '0.#');

            if (r.defects && Array.isArray(r.defects)) {
                r.defects.forEach((def: DefectEntry) => {
                    const idx = defectList.indexOf(def.defectName);
                    if (idx !== -1) {
                        const colPos = 17 + idx;
                        const prev = (row.getCell(colPos).value as number) || 0;
                        row.getCell(colPos).value = prev + def.qty;
                        row.getCell(colPos).numFmt = '0.#';
                    }
                });
            }

            for(let c=1; c<=totalCols; c++) {
                const cell = row.getCell(c);
                cell.border = BORDER_STYLE;
                cell.alignment = { horizontal: 'center' };
                cell.font = { size: 10 };
                
                let bg = COLORS.WHITE;
                if (c<=2 || c==4 || c==3) bg = COLORS.ROW_YELLOW;
                else if (c<=8) bg = COLORS.ROW_GREEN;
                else if (c<=10) bg = COLORS.ROW_CYAN;
                else if (c<=13) bg = COLORS.ROW_ORANGE;
                else if (c<=15) bg = COLORS.ROW_GREEN;
                else if (c==16) bg = COLORS.PROD_WITH_BG;
                else bg = COLORS.ROW_Q_DYN;
                
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            }
            currentRow++;
        });

        // Daily Total Row
        const totRow = ws.getRow(currentRow);
        const T = currentRow;
        totRow.getCell(1).value = "TOTAL"; 
        totRow.getCell(3).value = `(${new Date(dateKey).toLocaleDateString('en-GB', {day:'numeric', month:'short'})})`; 
        
        ['E','F','G','H','I','J','K','L'].forEach((colLet, idx) => {
             const colIdx = 5 + idx; 
             const letter = getColLetter(colIdx);
             totRow.getCell(colIdx).value = { formula: `SUM(${letter}${startRow}:${letter}${T-1})` };
             totRow.getCell(colIdx).numFmt = '0.#';
        });
        
        totRow.getCell(16).value = { formula: `SUM(P${startRow}:P${T-1})` }; totRow.getCell(16).numFmt = '0.#';

        for(let d=0; d<defectList.length; d++) {
            const col = 17 + d;
            const lettr = getColLetter(col);
            totRow.getCell(col).value = { formula: `SUM(${lettr}${startRow}:${lettr}${T-1})` };
            totRow.getCell(col).numFmt = '0.#';
        }

        for(let c=1; c<=totalCols; c++) {
            const cell = totRow.getCell(c);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DAILY_TOTAL_BG } };
            cell.font = { bold: true };
            cell.border = BORDER_STYLE;
            cell.alignment = { horizontal: 'center' };
        }
        currentRow++;

        // Black Separator
        const blackRow = ws.getRow(currentRow);
        for(let c=1; c<=totalCols; c++) {
            blackRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.BLACK_ROW } };
            blackRow.getCell(c).border = BORDER_STYLE;
        }
        currentRow++;
    });

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

// --- REJECTION ANALYSIS LAYOUT (Startup Excluded) ---
function generateRejectionLayout(ws: ExcelJS.Worksheet, data: any[], startDate: string, endDate: string) {
    ws.getColumn(1).width = 12;
    for(let i=2; i<=17; i++) ws.getColumn(i).width = 11;

    const setHeader = (ref: string, val: string, bg: string) => {
        ws.mergeCells(ref);
        const c = ws.getCell(ref.split(':')[0]);
        c.value = val;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.font = { bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = BORDER_STYLE;
    };
    setHeader('A1:A1', 'Date', COLORS.WHITE);
    setHeader('B1:E1', 'Accepted Production (Kg)', COLORS.REJ_HEADER_GREY);
    setHeader('F1:I1', 'Rejection (Kg)', COLORS.REJ_HEADER_GREY);
    setHeader('J1:M1', 'Rejection Percentage', COLORS.REJ_HEADER_GREY);
    setHeader('N1:N1', 'Total BM %', COLORS.REJ_HEADER_GREY);
    setHeader('O1:O1', 'Total IM %', COLORS.REJ_HEADER_GREY);
    setHeader('P1:P1', 'IM Total', COLORS.REJ_ORANGE_TOT);
    setHeader('Q1:Q1', 'BM Total', COLORS.REJ_BLUE_TOT);

    const subH = ["IM-A", "IM-B", "BM-A", "BM-B"];
    subH.forEach((v, i) => ws.getCell(2, 2+i).value = v);
    subH.forEach((v, i) => ws.getCell(2, 6+i).value = v);
    subH.forEach((v, i) => ws.getCell(2, 10+i).value = v);

    for(let c=2; c<=17; c++) {
        const cell = ws.getCell(2, c);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = BORDER_STYLE;
        if (c<=13 || c==14 || c==15) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_HEADER_GREY } };
        if (c==16) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_ORANGE_TOT } };
        if (c==17) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_BLUE_TOT } };
    }

    const summary: Record<string, any> = {};
    let d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
        summary[d.toISOString().split('T')[0]] = { imA_p:0, imB_p:0, bmA_p:0, bmB_p:0, imA_r:0, imB_r:0, bmA_r:0, bmB_r:0 };
        d.setDate(d.getDate() + 1);
    }
    
    data.forEach(r => {
        if (summary[r.date]) {
            const prod = r.wgtAccept;
            // FIX: Rejection ONLY (No Startup)
            const rej = r.wgtReject; 
            
            if (r.type === 'IM') {
                if (r.shift === 'day') { summary[r.date].imA_p += prod; summary[r.date].imA_r += rej; }
                else { summary[r.date].imB_p += prod; summary[r.date].imB_r += rej; }
            } else {
                if (r.shift === 'day') { summary[r.date].bmA_p += prod; summary[r.date].bmA_r += rej; }
                else { summary[r.date].bmB_p += prod; summary[r.date].bmB_r += rej; }
            }
        }
    });

    let r = 3;
    const sortedDates = Object.keys(summary).sort();
    
    for (const dateStr of sortedDates) {
        const row = ws.getRow(r);
        const v = summary[dateStr];
        row.getCell(1).value = new Date(dateStr); row.getCell(1).numFmt = 'd-mmm';
        [2,3,4,5,6,7,8,9,16,17].forEach((idx, i) => {
            let val = 0;
            switch(idx) {
                case 2: val = v.imA_p; break; case 3: val = v.imB_p; break;
                case 4: val = v.bmA_p; break; case 5: val = v.bmB_p; break;
                case 6: val = v.imA_r; break; case 7: val = v.imB_r; break;
                case 8: val = v.bmA_r; break; case 9: val = v.bmB_r; break;
            }
            if(idx < 16) {
                row.getCell(idx).value = val;
                row.getCell(idx).numFmt = '0.#'; 
            }
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
            const cell = row.getCell(c);
            cell.border = BORDER_STYLE;
            cell.alignment = { horizontal: 'center' };
            if(c==2||c==3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_PEACH } };
            if(c==4||c==5) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_GREEN } };
            if(c==6||c==7) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_LAVENDER } };
            if(c==8||c==9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_GREEN } };
            if(c>=10 && c<=13) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.REJ_LIGHT_BLUE } };
        }
        r++;
    }

    const fR = r;
    const footer = ws.getRow(fR);
    footer.getCell(1).value = "Total"; footer.font = { bold: true };
    ['B','C','D','E','F','G','H','I'].forEach((col, i) => {
        footer.getCell(2+i).value = { formula: `SUM(${col}3:${col}${fR-1})` };
        footer.getCell(2+i).font = { color: { argb: 'FFFF0000' }, bold: true };
        footer.getCell(2+i).numFmt = '0.#'; 
    });
    footer.getCell(16).value = { formula: `F${fR}+G${fR}` }; footer.getCell(16).numFmt = '0.#';
    footer.getCell(17).value = { formula: `H${fR}+I${fR}` }; footer.getCell(17).numFmt = '0.#';
    
    footer.getCell(10).value = { formula: `F${fR}/(B${fR}+F${fR})` };
    footer.getCell(11).value = { formula: `G${fR}/(C${fR}+G${fR})` };
    footer.getCell(12).value = { formula: `H${fR}/(D${fR}+H${fR})` };
    footer.getCell(13).value = { formula: `I${fR}/(E${fR}+I${fR})` };
    footer.getCell(14).value = { formula: `(H${fR}+I${fR})/(H${fR}+I${fR}+D${fR}+E${fR})` };
    footer.getCell(15).value = { formula: `(F${fR}+G${fR})/(F${fR}+G${fR}+B${fR}+C${fR})` };
    
    for (let c=1; c<=17; c++) {
        const cell = footer.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        cell.border = BORDER_STYLE;
        if(c>=10 && c<=15) cell.numFmt = '0.0%';
    }
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

// --- DASHBOARD LAYOUT (A Vs B With BM Data Only) ---
function setupDashboardLayout(ws: ExcelJS.Worksheet, data: any[], startDateStr: string, endDateStr: string) {
    ws.getColumn(1).width = 12;
    for(let i=2; i<=13; i++) ws.getColumn(i).width = 6;
    ws.getColumn(14).width = 2; // Spacer
    for(let i=15; i<=20; i++) ws.getColumn(i).width = 6;

    const setH = (ref: string, val: string, bg: string, color: string = 'FF000000') => {
        ws.mergeCells(ref);
        const c = ws.getCell(ref.split(':')[0]);
        c.value = val;
        c.font = { size: 14, bold: true, color: { argb: color } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = BORDER_STYLE;
    };

    ws.getCell('A1').value = "Date"; ws.getCell('A1').border = BORDER_STYLE;
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; ws.getCell('A1').font = { bold: true };

    setH('B1:G1', 'SHIFT A (BM)', COLORS.DASH_GREEN); // Explicit label
    setH('H1:M1', 'SHIFT B (BM)', COLORS.DASH_PURPLE);
    setH('O1:T1', 'TOTAL', COLORS.DASH_BLUE_HEADER, COLORS.WHITE);

    const subs = ["ACHIVE", "MTD", "Scrap", "MTD", "Day %", "MTD %"];
    const applySubs = (startCol: number) => {
        subs.forEach((v, i) => {
            const cell = ws.getCell(2, startCol + i);
            cell.value = v;
            cell.font = { bold: true, size: 9 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_SUB_BG } };
            cell.border = BORDER_STYLE;
        });
    };
    applySubs(2); applySubs(8); applySubs(15);

    // Data Aggregation for BM Only
    const dailyData: Record<string, any> = {};
    let d = new Date(startDateStr);
    const end = new Date(endDateStr);
    while(d <= end) {
        dailyData[d.toISOString().split('T')[0]] = { 
            a_ach: 0, a_scr: 0, b_ach: 0, b_scr: 0 
        };
        d.setDate(d.getDate() + 1);
    }

    data.forEach(r => {
        // FILTER: BM Only
        if(r.type === 'BM' && dailyData[r.date]) {
            if(r.shift === 'day') {
                dailyData[r.date].a_ach += r.wgtAccept; // Achieved = Accepted
                dailyData[r.date].a_scr += r.wgtReject; // Scrap = Rejected
            } else {
                dailyData[r.date].b_ach += r.wgtAccept;
                dailyData[r.date].b_scr += r.wgtReject;
            }
        }
    });

    const sorted = Object.keys(dailyData).sort();
    let r = 3;
    let cum_A_Ach = 0, cum_A_Scr = 0, cum_B_Ach = 0, cum_B_Scr = 0;
    
    // Total Cumulative for MTD Columns in Total Section
    let cum_Tot_Ach = 0, cum_Tot_Scr = 0;

    for (const dateKey of sorted) {
        const row = ws.getRow(r);
        const v = dailyData[dateKey];
        
        row.getCell(1).value = new Date(dateKey); row.getCell(1).numFmt = 'd-mmm';
        row.getCell(1).border = BORDER_STYLE;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_DATE_BG } };

        // SHIFT A (Cols B-G => 2-7)
        cum_A_Ach += v.a_ach; cum_A_Scr += v.a_scr;
        row.getCell(2).value = v.a_ach; // Achieve
        row.getCell(3).value = cum_A_Ach; // MTD
        row.getCell(4).value = v.a_scr; // Scrap
        row.getCell(5).value = cum_A_Scr; // MTD
        row.getCell(6).value = { formula: `IFERROR(D${r}/(B${r}+D${r}),0)` }; row.getCell(6).numFmt = '0.0%'; // Day %
        row.getCell(7).value = { formula: `IFERROR(E${r}/(C${r}+E${r}),0)` }; row.getCell(7).numFmt = '0.0%'; // MTD %

        // SHIFT B (Cols H-M => 8-13)
        cum_B_Ach += v.b_ach; cum_B_Scr += v.b_scr;
        row.getCell(8).value = v.b_ach; 
        row.getCell(9).value = cum_B_Ach;
        row.getCell(10).value = v.b_scr; 
        row.getCell(11).value = cum_B_Scr;
        row.getCell(12).value = { formula: `IFERROR(J${r}/(H${r}+J${r}),0)` }; row.getCell(12).numFmt = '0.0%';
        row.getCell(13).value = { formula: `IFERROR(K${r}/(I${r}+K${r}),0)` }; row.getCell(13).numFmt = '0.0%';

        // TOTAL (Cols O-T => 15-20)
        // Achieve = A + B Acc
        row.getCell(15).value = { formula: `B${r}+H${r}` };
        // MTD Total
        cum_Tot_Ach += (v.a_ach + v.b_ach);
        row.getCell(16).value = cum_Tot_Ach; 
        // Scrap Total
        row.getCell(17).value = { formula: `D${r}+J${r}` };
        // MTD Scrap
        cum_Tot_Scr += (v.a_scr + v.b_scr);
        row.getCell(18).value = cum_Tot_Scr;
        // Day Perc
        row.getCell(19).value = { formula: `IFERROR(Q${r}/(O${r}+Q${r}),0)` }; row.getCell(19).numFmt = '0.0%';
        // MTD Perc
        row.getCell(20).value = { formula: `IFERROR(R${r}/(P${r}+R${r}),0)` }; row.getCell(20).numFmt = '0.0%';

        // Formatting Numbers (0.#)
        [2,3,4,5,8,9,10,11,15,16,17,18].forEach(c => row.getCell(c).numFmt = '0.#');

        // Colors
        for(let c=2; c<=13; c++) {
            const cell = row.getCell(c); cell.border = BORDER_STYLE;
            if( ((c-2)%6) < 2 ) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_A_BG } };
            else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_B_BG } };
        }
        for(let c=15; c<=20; c++) {
            const cell = row.getCell(c); cell.border = BORDER_STYLE;
            if((c-15) < 2 ) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_A_BG } };
            else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.DASH_B_BG } };
        }
        r++;
    }
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];
}

function styleHeader(ws: ExcelJS.Worksheet, cellRef: string, val: string, bg: string) {
    const cell = ws.getCell(cellRef);
    cell.value = val;
    cell.font = { size: 14, bold: true };
    cell.alignment = { horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.border = BORDER_STYLE;
}