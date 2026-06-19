import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { IMJobPlan, ProductItem } from './PlanningTypes';

// ============================================================================
// 1. EXCEL STYLES 
// ============================================================================
const BORDER_STYLE: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
};

// 🎨 වර්ණ වෙනස් කරන ආකාරය:
// මෙහි 'FF' යන්නට පසුව එන්නේ HEX Color Code එකයි. (උදා: #1E293B වෙනුවට 'FF1E293B' යොදන්න).

// 🟢 1. Table එකේ මාතෘකා තීරුවට (Header)
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; 
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };

// 🟢 2. Active ජොබ්ස් වල Machine නම පෙන්වන තීරුවට අදාළ වර්ණය
const MACHINE_FILL_ACTIVE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; 

// 🟢 3. Completed ජොබ්ස් වල Machine නම පෙන්වන තීරුවට අදාළ වර්ණය
const MACHINE_FILL_COMPLETED: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; 

const MACHINE_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };

// ============================================================================
// 2. MAIN EXPORT FUNCTION 
// ============================================================================
export const exportToExcelAdvanced = async (
    imActive: IMJobPlan[], bmActive: IMJobPlan[],
    imCompleted: IMJobPlan[], bmCompleted: IMJobPlan[],
    dailyData: any, 
    imProducts: ProductItem[], bmProducts: ProductItem[], // 🟢 වෙනස: IM සහ BM Products වෙන වෙනම ලබාගැනීම
    filename: string
) => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'System';
    wb.created = new Date();

    // ------------------------------------------------------------------------
    // HELPER A: IM / BM Jobs සඳහා Sheet සැකසීම
    // ------------------------------------------------------------------------
    const createJobSheet = (sheetName: string, jobs: IMJobPlan[], isCompleted: boolean) => {
        const ws = wb.addWorksheet(sheetName);
        
        // 🟢 අලුත් වෙනස: උඩින්ම එන අනවශ්‍ය Header Row එක නැති කිරීම සඳහා
        // මෙහි header නම වෙන් කර තබා ඇත.
        const columnDefs = [
            { header: 'Machine', key: 'machine', width: 12 },
            { header: 'Item Name', key: 'itemName', width: 25 },
            { header: 'Weight (g)', key: 'weight', width: 10 },
            { header: 'Customer', key: 'customer', width: 15 },
            { header: 'Job No', key: 'jobNo', width: 15 },
            { header: 'PO No', key: 'poNo', width: 12 },
            { header: 'PO Date', key: 'poDate', width: 12 },
            { header: 'Order Qty', key: 'orderQty', width: 12 },
            { header: 'Plan Qty', key: 'planQty', width: 12 },
            { header: 'Completed Qty', key: 'compQty', width: 15 }, 
            { header: 'Balance', key: 'balance', width: 12 },
            { header: 'Cavity', key: 'cavities', width: 10 },
            { header: 'Cycle Time(s)', key: 'cycleTime', width: 12 },
            { header: 'Target/Hr', key: 'target', width: 12 },
            { header: 'Shift Target', key: 'shiftTarget', width: 12 },
            { header: 'Days', key: 'days', width: 8 },
            { header: 'Prod. Start', key: 'startDate', width: 15 },
            { header: 'HLD / Changes', key: 'hldMold', width: 15 },
            { header: 'Prod. End', key: 'endDate', width: 15 },
            { header: 'Carton Qty', key: 'cartonQty', width: 12 }
        ];

        // 🟢 Header නම නැතිව Columns Set කිරීම (එවිට උඩින්ම පේළිය හැදෙන්නේ නෑ)
        ws.columns = columnDefs.map(c => ({ key: c.key, width: c.width }));

        // දත්ත නොමැති නම් හිස් වගුවක් පෙන්වීම
        if (!jobs || jobs.length === 0) {
            const hRow = ws.addRow(columnDefs.map(c => c.header));
            hRow.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; cell.border = BORDER_STYLE; });
            ws.addRow(['No data available']).getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
            return;
        }

        // Machine අනුව Jobs වෙන් කිරීම
        const groupedJobs = jobs.reduce((acc, job) => {
            const m = job.machine || 'Unassigned';
            if (!acc[m]) acc[m] = [];
            acc[m].push(job);
            return acc;
        }, {} as Record<string, IMJobPlan[]>);

        Object.keys(groupedJobs).sort().forEach(machine => {
            // 1. Machine Header Row එක
            const mRow = ws.addRow([`MACHINE: ${machine}`]);
            mRow.getCell(1).fill = isCompleted ? MACHINE_FILL_COMPLETED : MACHINE_FILL_ACTIVE; 
            mRow.getCell(1).font = MACHINE_FONT;
            ws.mergeCells(mRow.number, 1, mRow.number, columnDefs.length);

            // 2. Table Headers (මාතෘකා - මෙහිදී පමණක් මාතෘකා පේළිය වදිනු ඇත)
            const hRow = ws.addRow(columnDefs.map(c => c.header));
            hRow.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; cell.border = BORDER_STYLE; });

          // 3. Data Rows එකතු කිරීම (Formulas සහ Date Chain සමඟ)
          groupedJobs[machine].forEach((job, index) => {
            // මුලින්ම සාමාන්‍ය දත්ත ටික පේළියට ඇතුළත් කිරීම
            const row = ws.addRow({
                machine: job.machine, itemName: job.itemName, weight: job.weight || 0, customer: job.customer,
                jobNo: job.jobNo, poNo: job.poNo || '-', poDate: job.poDate || '-',
                orderQty: job.orderQty || 0, planQty: job.planQty || 0, 
                cavities: job.cavities || 0, cycleTime: job.cycleTime || 0, target: job.targetPerHr || 0,
                hldMold: job.hldMold || 0
            });

            const r = row.number; // Excel එකේ අදාළ පේළි අංකය

            // 🟢 1. Completed Qty Formula
            const compCell = row.getCell('compQty');
            if (job.dailyCompletions && job.dailyCompletions.length > 0) {
                const formulaStr = job.dailyCompletions.map(c => Number(c.qty) || 0).join('+');
                compCell.value = formulaStr.includes('+') ? { formula: formulaStr, result: job.completedQty || 0 } : (job.completedQty || 0);
            } else {
                compCell.value = job.completedQty || 0;
            }
            compCell.font = { bold: true, color: { argb: 'FF10B981' } };

            // 🟢 2. Balance Formula (I = Plan Qty, J = Completed Qty)
            row.getCell('balance').value = { formula: `I${r}-J${r}`, result: job.balance || 0 };
            if (Number(job.balance) < 0) row.getCell('balance').font = { color: { argb: 'FFEF4444' }, bold: true };

            // 🟢 3. Shift Target Formula (N = Target/Hr)
            row.getCell('shiftTarget').value = { formula: `ROUND(N${r}*12*0.85, 0)`, result: job.shiftTarget || 0 };

            // 🟢 4. Days Formula (I = Plan Qty, O = Shift Target)
            row.getCell('days').value = { formula: `IF(O${r}>0, ROUNDUP(I${r}/(O${r}*2), 0), 0)`, result: job.days || 0 };

            // ==========================================================
            // 🟢 5. Prod. Start & End Date Formulas (DATE CHAIN LOGIC)
            // ==========================================================
            const startCell = row.getCell('startDate');
            const endCell = row.getCell('endDate');

            if (index === 0) {
                // Machine එකේ පළමු ජොබ් එකට Formula එකක් නෑ (Chain එකේ මුල)
                startCell.value = job.startDate ? new Date(job.startDate) : new Date();
            } else {
                // ඊළඟ ජොබ්ස් වල Start Date = කලින් ජොබ් එකේ End Date (S තීරුව)
                startCell.value = { formula: `S${r - 1}` };
            }
            startCell.numFmt = 'yyyy-mm-dd'; // Date Format එක

            // End Date = Start Date (Q) + Days (P) + HLD/Changes (R)
            endCell.value = { formula: `Q${r}+P${r}+R${r}` };
            endCell.numFmt = 'yyyy-mm-dd'; // Date Format එක
            // ==========================================================

            // 🟢 6. Carton Qty Formula (I = Plan Qty)
            const packQty = Number(job.packingQty) > 0 ? Number(job.packingQty) : 1; 
            row.getCell('cartonQty').value = { formula: `ROUNDUP(I${r}/${packQty}, 0)`, result: job.cartonQty || 0 };

            // Borders & Alignment
            row.eachCell(cell => { cell.border = BORDER_STYLE; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
            row.getCell('itemName').alignment = { horizontal: 'left' }; 
        });

            ws.addRow([]); // Machine එකෙන් පස්සේ හිස් පේළියක්
        });
    };



    // ------------------------------------------------------------------------
    // HELPER B: Daily Plan Sheet සැකසීම (Day / Night වෙන් කර)
    // ------------------------------------------------------------------------
    const createDailyPlanSheet = () => {
        const ws = wb.addWorksheet('DAILY PLAN');
        
        const addSection = (title: string, color: string, rows: any[]) => {
            const secRow = ws.addRow([title]);
            secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            secRow.getCell(1).font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
            
            // 🟢 වෙනස 1: තීරු 11 වෙනුවට 12 දක්වා Merge කිරීම (Remark තීරුව එකතු වූ නිසා)
            ws.mergeCells(secRow.number, 1, secRow.number, 12);

            // 🟢 වෙනස 2: Header එකට 'Remark' එකතු කිරීම
            const hRow = ws.addRow(['Machine', 'Product', 'Customer', 'Job No', 'Rem. Qty', 'Weight', 'Hours', 'Target/Hr', 'Plan Qty', 'Plan Kg', 'Labour', 'Remark']);
            hRow.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT; cell.border = BORDER_STYLE; });

            if (!rows || rows.length === 0) {
                ws.addRow(['No data available']).getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
            } else {
                rows.forEach(r => {
                    // 🟢 වෙනස 3: Data row එක අවසානයට r.remark එකතු කිරීම
                    const dRow = ws.addRow([r.machine, r.itemName, r.customer, r.jobNo, r.remainQty, r.weight, r.planHours, r.targetPerHr, r.planQty, r.planKg, r.labour, r.remark || '']);
                    dRow.eachCell(cell => { cell.border = BORDER_STYLE; cell.alignment = { horizontal: 'center' }; });
                    dRow.getCell(2).alignment = { horizontal: 'left' };
                    // Remark column එක left align වීම සඳහා
                    dRow.getCell(12).alignment = { horizontal: 'left' }; 
                });
            }
            ws.addRow([]);
        };

        // 🟢 වෙනස 4: අලුත් Remark තීරුවට width එකක් ලබා දීම (අවසානයට { width: 25 } එකතු කර ඇත)
        ws.columns = [ { width: 12 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 25 } ];
        
        addSection('☀️ DAY SHIFT - IM', 'FFF59E0B', dailyData?.dayIM || []); 
        addSection('☀️ DAY SHIFT - BM', 'FFF59E0B', dailyData?.dayBM || []);
        addSection('🌙 NIGHT SHIFT - IM', 'FF4F46E5', dailyData?.nightIM || []); 
        addSection('🌙 NIGHT SHIFT - BM', 'FF4F46E5', dailyData?.nightBM || []);
    };

   // ------------------------------------------------------------------------
    // HELPER C: Product DB Sheet සැකසීම (IM සහ BM සඳහා පොදු Function එකක්)
    // ------------------------------------------------------------------------
    const createProductDBSheet = (sheetName: string, productList: ProductItem[]) => {
        const ws = wb.addWorksheet(sheetName);
        const isIM = sheetName === 'IM PRODUCT DB'; // 🟢 මෙය IM ශීට් එකක්දැයි පරීක්ෂා කිරීම

        // 🟢 1. Columns සැකසීම (Double Header එක නැති කිරීම සඳහා header එක වෙනම ලබාගැනීම)
        const columnDefs = [
            { header: 'Item Name', key: 'itemName', width: 30 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Weight (g)', key: 'weight', width: 12 },
            { header: 'Std Cavity', key: 'stdCavities', width: 12 },
            { header: 'Actual Cavity', key: 'actualCavities', width: 15 },
            { header: 'Std Cycle Time(s)', key: 'stdCycleTime', width: 18 },
            { header: 'Actual Cycle Time(s)', key: 'actualCycleTime', width: 22 },
            { header: 'Target/Hr', key: 'targetHr', width: 15 },             
            { header: 'Shift Target', key: 'shiftTarget', width: 15 },       
            { header: 'Packing Qty', key: 'packingQty', width: 15 }
        ];

        // 🟢 IM ශීට් එකක් නම් පමණක් අමතර තීරු 5 එකතු කිරීම
        if (isIM) {
            columnDefs.push(
                { header: 'Material', key: 'material', width: 15 },
                { header: 'Mat %', key: 'matPercent', width: 12 },
                { header: 'MB Code', key: 'mbCode', width: 15 },
                { header: 'MB %', key: 'mbPercent', width: 12 },
                { header: 'Crush %', key: 'crushPercent', width: 12 }
            );
        }

        // අවසානයටම Compatible Machines තීරුව දැමීම
        columnDefs.push({ header: 'Compatible Machines', key: 'machines', width: 35 });

        // 🟢 Double Header ප්‍රශ්නය විසඳීම (header property එක නොදී columns set කිරීම)
        ws.columns = columnDefs.map(c => ({ key: c.key, width: c.width }));

        // 🟢 2. Header Row එක අතින් එකතු කර එයට වර්ණ ලබා දීම
        const hRow = ws.addRow(columnDefs.map(c => c.header));
        hRow.eachCell(cell => { 
            cell.fill = HEADER_FILL; 
            cell.font = HEADER_FONT; 
            cell.border = BORDER_STYLE; 
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // දත්ත නොමැති නම්
        if (!productList || productList.length === 0) {
            ws.addRow(['No data available']).getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
            return;
        }

        // 🟢 3. දත්ත පේළි එකතු කිරීම
        productList.forEach(p => {
            const stdCav = Number(p.stdCavities || p.cavities) || 0;
            const actCav = Number(p.actualCavities) || 0;
            const stdCyc = Number(p.standardCycleTime || p.cycleTime) || 0;
            const actCyc = Number(p.actualCycleTime) || 0;

            const rowData: any = {
                itemName: p.itemName || '-',
                customer: p.customer || '-',
                category: p.category || '-',
                weight: p.weight || 0,
                stdCavities: stdCav,
                actualCavities: actCav,
                stdCycleTime: stdCyc,
                actualCycleTime: actCyc,
                packingQty: p.packingQty || 0,
                machines: Array.isArray(p.compatibleMachines) ? p.compatibleMachines.join(', ') : '-'
            };

            // 🟢 IM ශීට් එක සඳහා පමණක් අමතර දත්ත ලබා දීම
            if (isIM) {
                const imProd: any = p; // TypeScript Error වළක්වා ගැනීමට
                rowData.material = imProd.material || '-';
                rowData.matPercent = imProd.matPercent || '-';
                rowData.mbCode = imProd.mbCode || '-';
                rowData.mbPercent = imProd.mbPercent || '-';
                rowData.crushPercent = imProd.crushPercent || '-';
            }

            const row = ws.addRow(rowData);
            const r = row.number; // Excel පේළි අංකය

            // 🟢 Target/Hr Formula: Actual දත්ත ඇත්නම් එය ගනී, නැත්නම් Std දත්ත ගනී.
            row.getCell('targetHr').value = { 
                formula: `IF(H${r}>0, ROUND((3600/H${r})*F${r}, 0), IF(G${r}>0, ROUND((3600/G${r})*E${r}, 0), 0))` 
            };
            row.getCell('targetHr').font = { bold: true, color: { argb: 'FF059669' } };

            // 🟢 Shift Target Formula
            row.getCell('shiftTarget').value = { formula: `ROUND(I${r}*12*0.85, 0)` };
            row.getCell('shiftTarget').font = { bold: true, color: { argb: 'FF4F46E5' } };

            // Borders & Alignments
            row.eachCell(cell => { cell.border = BORDER_STYLE; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
            row.getCell('itemName').alignment = { horizontal: 'left' };
            row.getCell('machines').alignment = { horizontal: 'left', wrapText: true }; 
        });
    };

    // 🟢 ෂීට් 7ම අනුපිළිවෙලින් නිර්මාණය කිරීම
    createDailyPlanSheet();
    createJobSheet('IM PLAN', imActive, false);
    createJobSheet('COMPLETED IM JOB', imCompleted, true);
    createJobSheet('BM PLAN', bmActive, false);
    createJobSheet('COMPLETED BM JOB', bmCompleted, true);
    
    // 🟢 අලුත්: Product DB Sheets දෙක වෙන් කර සෑදීම
    createProductDBSheet('IM PRODUCT DB', imProducts);
    createProductDBSheet('BM PRODUCT DB', bmProducts);

    // ෆයිල් එක Save කිරීම
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
};