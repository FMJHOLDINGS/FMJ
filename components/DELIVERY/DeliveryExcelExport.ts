// components/DELIVERY/DeliveryExcelExport.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { IMJobPlan } from '../PLANNING/PlanningTypes';

export const exportDeliveryToExcel = async (
    groupedData: any[],
    deliveryData: Record<string, any>,
    subTab: string,
    viewTab: string
) => {
    // 1. අලුත් Excel Workbook එකක් සහ Worksheet එකක් සෑදීම
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Delivery Schedule');

    // 2. ප්‍රධාන මාතෘකාව (Main Title)
    const titleText = `Delivery Schedule - ${subTab} Orders (${viewTab.toUpperCase()})`;
    worksheet.mergeCells('A1:G2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = titleText;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } }; // Orange Background
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // හිස් පේළියක්
    worksheet.addRow([]);

    // 3. Table Headers සෑදීම
    const headerRow = worksheet.addRow(['PO Date', 'PO Number', 'Customer', 'Product Name', 'Order Qty', 'Delivered', 'Balance']);
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate Background
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    });

    // 4. Column Widths සැකසීම
    worksheet.columns = [
        { width: 15 }, // PO Date
        { width: 20 }, // PO Number
        { width: 30 }, // Customer
        { width: 60 }, // Product Name
        { width: 15 }, // Order Qty
        { width: 15 }, // Delivered
        { width: 15 }, // Balance
    ];

    // 5. Data Rows එකතු කිරීම
    groupedData.forEach(group => {
        const { jobs, isOverdue, poDateStr } = group;
        const formattedDate = poDateStr ? new Date(poDateStr).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }).replace(' ', '-') : '-';
        
        // Parent/Single Row සඳහා දත්ත ගණනය කිරීම
        const totals = jobs.reduce((acc: any, job: any) => {
            const logs = deliveryData[job.id] || {};
            const jobDelivered = Object.values(logs).reduce<number>((sum, val) => sum + Number(val), 0);
            return {
                order: acc.order + (Number(job.orderQty) || 0),
                delivered: acc.delivered + jobDelivered
            };
        }, { order: 0, delivered: 0 });

        const parentBalance = totals.order - totals.delivered;
        const combinedName = (jobs[0] as any)?.summaryName || Array.from(new Set(jobs.map((j: IMJobPlan) => j.itemName))).join(' + ');
        const combinedCustomers = Array.from(new Set(jobs.map((j: IMJobPlan) => j.customer).filter(Boolean))).join(', ') || '-';
        const poNo = jobs[0].poNo ? jobs[0].poNo : 'Not Mention';

        // 🟢 පේළිය Add කිරීම (Parent හෝ Single)
        const row = worksheet.addRow([
            formattedDate,
            poNo,
            combinedCustomers,
            combinedName,
            totals.order,
            totals.delivered,
            parentBalance
        ]);

        // 🟢 Parent Row Styling
        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 10, bold: jobs.length > 1, color: { argb: isOverdue ? 'FFE11D48' : 'FF0F172A' } }; // Overdue නම් රතු පාට, නැත්නම් සාමාන්‍ය
            if (jobs.length > 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Light Gray background for grouped parent
            }
            cell.alignment = { vertical: 'middle', horizontal: colNumber >= 5 ? 'center' : 'left' };
            cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            
            // ඉලක්කම් Format කිරීම (1,000 කමා සහිතව)
            if (colNumber >= 5) cell.numFmt = '#,##0';
        });

        // 🟢 Child Rows Add කිරීම (Jobs ගණන 1 ට වඩා වැඩි නම් පමණක්)
        if (jobs.length > 1) {
            jobs.forEach((job: IMJobPlan) => {
                const logs = deliveryData[job.id] || {};
                const jobDelivered = Object.values(logs).reduce<number>((sum, val) => sum + Number(val), 0);
                const orderQty = Number(job.orderQty) || 0;
                const currentBalance = orderQty - jobDelivered;

                const childRow = worksheet.addRow([
                    '', // Date හිස්ව තබයි
                    `  ↳ Job: ${job.jobNo || '-'}`, // Job Number එක මඳක් ඇතුළට කර පෙන්වයි
                    job.customer || '-',
                    job.itemName,
                    orderQty,
                    jobDelivered,
                    currentBalance
                ]);

                // Child Row Styling
                childRow.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } }; // මඳක් අඳුරු අකුරු
                    cell.alignment = { vertical: 'middle', horizontal: colNumber >= 5 ? 'center' : 'left' };
                    cell.border = { bottom: { style: 'dotted', color: { argb: 'FFE2E8F0' } } };
                    
                    if (colNumber >= 5) cell.numFmt = '#,##0';
                });
            });
        }
    });

    // 6. Excel File එක Save කිරීම (Download)
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const todayStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `Delivery_Schedule_${subTab}_${viewTab}_${todayStr}.xlsx`);
};