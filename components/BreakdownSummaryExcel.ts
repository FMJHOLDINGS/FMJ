import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- VBA EXACT COLOR MAPPING (Long to ARGB Hex) ---
const VBA_COLORS = {
    HEADER_BG: 'FFF0F0F0',
    SUBTOTAL: 'FFD9D9D9',
    TOT_BD: 'FF89E38E',
    EFF_HEAD: 'FF00B0F0',
    GRAND_TOT: 'FF50D292',
};

export const downloadBreakdownSummaryExcel = async (selectedDate: string, data: any, totalWeight: number, totalEff: number) => {
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

    data.sortedCats.forEach((catName: string) => {
        const items = data.grouped[catName];
        let catWeight = 0;

        items.forEach((item: any, index: number) => {
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
        r++; // Gap
    });

    // --- TOTAL BREAKDOWN ROW ---
    if (totalWeight > 0) {
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
    }

    // --- EFFICIENCY LOSS SECTION ---
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