import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// දිනය "1-Apr" ආකෘතියට හැරවීමේ ෆන්ක්ෂන් එක
const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}`;
};

export const exportPvsAExcel = async (chartData: any[], allData: any, startDate: string, endDate: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Plan Vs Achieved');

    // ==========================================================
    // 1. Column පළල (Widths) සැකසීම
    // ==========================================================
    worksheet.columns = [
        { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, // A - F (Shift A)
        { width: 3 },  // G (Black Column)
        { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, // H - L (Shift B)
        { width: 12 }, { width: 12 }  // M - N (Total)
    ];

    // ==========================================================
    // 2. ප්‍රධාන Header පේළිය (Row 1: SHIFT -A | SHIFT -B | Total)
    // ==========================================================
    const row1 = worksheet.addRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'SHIFT -A';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells('H1:L1');
    worksheet.getCell('H1').value = 'SHIFT -A'; // ඔබේ පින්තූරයේ Shift B පැත්තෙත් වැරදීමකින් SHIFT -A කියා තිබුණි, අවශ්‍ය නම් මෙය 'SHIFT -B' ලෙස වෙනස් කරන්න.
    worksheet.getCell('H1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('H1').font = { bold: true, size: 14 };

    worksheet.mergeCells('M1:N1');
    worksheet.getCell('M1').value = 'Total';
    worksheet.getCell('M1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('M1').font = { bold: true, size: 14 };

    // ==========================================================
    // 3. උප Header පේළිය (Row 2: Date, Shift, Plan...)
    // ==========================================================
    const headers = [
        'Date', 'Shift', 'Plan', 'Ach', 'Cu Plan', 'Cu Ach', 
        '', // Black separator
        'Shift', 'Plan', 'Ach', 'Cu Plan', 'Cu Ach',
        'Plan', 'Ach'
    ];
    const headerRow = worksheet.addRow(headers);
    
    headerRow.eachCell((cell, colNumber) => {
        if (colNumber !== 7) {
            cell.font = { bold: true, size: 12 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }
    });

  // ==========================================================
    // 4. දත්ත ඇතුළත් කිරීම සහ වර්ණ ගැන්වීම (Formulas සමග)
    // ==========================================================
    chartData.forEach((dataRow, index) => {
        const r = index + 3; // Excel එකේ දත්ත පටන් ගන්නේ 3 වෙනි පේළියෙන්

        // දින 7න් 7ට මුරය මාරු වන ගණිතමය රටාව (1-7 Day, 8-14 Night...)
        const dayOfMonth = new Date(dataRow.fullDate).getDate();
        const isFirst7DaysCycle = Math.floor((dayOfMonth - 1) / 7) % 2 === 0; 
        
        // Database එකේ දත්ත තිබේ නම් එය ගනී, නැත්නම් ඉබේම දින 7 රටාව යොදා ගනී
        const supData = allData[`${dataRow.fullDate}_SUPERVISORS`];
        const shiftAType = supData ? (supData.day === 'Shift-A' ? 'Day' : 'Night') : (isFirst7DaysCycle ? 'Day' : 'Night');
        const shiftBType = supData ? (supData.day === 'Shift-B' ? 'Day' : 'Night') : (isFirst7DaysCycle ? 'Night' : 'Day');

        // අගයන් ආසන්න පූර්ණ සංඛ්‍යාවට හැරවීම (දශම ඉවත් කිරීමට)
        const planA = Math.round(dataRow.planA);
        const achA = Math.round(dataRow.achievedA);
        const planB = Math.round(dataRow.planB);
        const achB = Math.round(dataRow.achievedB);

        const row = worksheet.addRow([
            formatDisplayDate(dataRow.fullDate), // A
            shiftAType,                          // B
            planA,                               // C
            achA,                                // D
            // Cumulative Plan A (Excel Formula)
            r === 3 ? planA : { formula: `E${r-1}+C${r}`, result: Math.round(dataRow.cumPlanA) }, // E
            // Cumulative Ach A (Excel Formula)
            r === 3 ? achA : { formula: `F${r-1}+D${r}`, result: Math.round(dataRow.cumAchA) },   // F
            '',                                  // G (Black column)
            shiftBType,                          // H
            planB,                               // I
            achB,                                // J
            // Cumulative Plan B (Excel Formula)
            r === 3 ? planB : { formula: `K${r-1}+I${r}`, result: Math.round(dataRow.cumPlanB) }, // K
            // Cumulative Ach B (Excel Formula)
            r === 3 ? achB : { formula: `L${r-1}+J${r}`, result: Math.round(dataRow.cumAchB) },   // L
            // Total Plan (Excel Formula)
            { formula: `C${r}+I${r}`, result: Math.round(dataRow.totalPlan) },                    // M
            // Total Ach (Excel Formula)
            { formula: `D${r}+J${r}`, result: Math.round(dataRow.totalAchieved) }                 // N
        ]);

        // වර්ණ කේත
        const dayColor = 'FFFFC000'; // Gold/Yellow
        const nightColor = 'FF8FAADC'; // Light Blue
        const blackColor = 'FF000000'; // Black

        row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            
            // දශමස්ථාන සම්පූර්ණයෙන්ම ඉවත් කර පූර්ණ සංඛ්‍යා ලෙස පමණක් පෙන්වීම
            if ([3, 4, 5, 6, 9, 10, 11, 12, 13, 14].includes(colNumber)) {
                cell.numFmt = '0';
            }

            // Border දැමීම (කළු තීරුව හැර)
            if (colNumber !== 7) {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }

            // Shift A වර්ණ ගැන්වීම
            if (colNumber >= 1 && colNumber <= 6) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shiftAType === 'Day' ? dayColor : nightColor } };
            }
            // මැද Black Column එක
            if (colNumber === 7) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blackColor } };
            }
            // Shift B වර්ණ ගැන්වීම
            if (colNumber >= 8 && colNumber <= 12) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shiftBType === 'Day' ? dayColor : nightColor } };
            }
        });
    });

    // ==========================================================
    // 5. Total Row එක පහළින් එකතු කිරීම (පින්තූරයේ පරිදි)
    // ==========================================================
    const lastDataRow = chartData.length + 2; 
    const totalRowIndex = lastDataRow + 1;

    worksheet.addRow([]); // හිස් පේළියක් නිර්මාණය කිරීම
    
    // K සහ L Column එකට "Total" යැයි ලිවීම සහ Merge කිරීම
    worksheet.mergeCells(`K${totalRowIndex}:L${totalRowIndex}`);
    const totalLabelCell = worksheet.getCell(`K${totalRowIndex}`);
    totalLabelCell.value = 'Total';
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.font = { bold: true, size: 12 };
    
    // Total Plan සහ Total Ach අගයන් එකතු කරන SUM() Formulas
    const totalPlanCell = worksheet.getCell(`M${totalRowIndex}`);
    totalPlanCell.value = { formula: `SUM(M3:M${lastDataRow})` };
    totalPlanCell.numFmt = '0';
    totalPlanCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalPlanCell.font = { bold: true, size: 12 };

    const totalAchCell = worksheet.getCell(`N${totalRowIndex}`);
    totalAchCell.value = { formula: `SUM(N3:N${lastDataRow})` };
    totalAchCell.numFmt = '0';
    totalAchCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalAchCell.font = { bold: true, size: 12 };

    // Total කොටසට තද (Thick) Border එකක් දැමීම
    ['K', 'L', 'M', 'N'].forEach(col => {
        worksheet.getCell(`${col}${totalRowIndex}`).border = { 
            top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} 
        };
    });

    // ==========================================================
    // 6. File එක Download කිරීම
    // ==========================================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `P_vs_A_Report_${startDate}_to_${endDate}.xlsx`);
};