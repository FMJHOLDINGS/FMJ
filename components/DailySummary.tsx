import React, { useState, useEffect, useRef, useMemo } from 'react';
import { calculateMetrics, getMTDData, getBreakdownSummary } from '../utils';
import { FileSpreadsheet, Save, RefreshCw, BarChart2, AlertOctagon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';

interface Props {
  allData: Record<string, any>;
  date: string;
}

const DailySummary: React.FC<Props> = ({ allData, date }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hotRef = useRef<Handsontable | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'BREAKDOWNS'>('DAILY');

  // --- DATA CALCULATION ---
  const data = useMemo(() => {
    const getData = (type: 'IM' | 'BM') => allData[`${date}_${type}`]?.rows || [];
    const imRows = getData('IM');
    const bmRows = getData('BM');

    const calc = (rows: any[], shift?: string) => {
        const filtered = shift ? rows.filter((r: any) => r.shift === shift) : rows;
        const res = filtered.reduce((acc, row) => {
            const m = calculateMetrics(row);
            return { plan: acc.plan + m.planKg, achv: acc.achv + m.achievedKg, loss: acc.loss + m.lostKg };
        }, { plan: 0, achv: 0, loss: 0 });
        return { 
            plan: Number(res.plan.toFixed(2)), 
            achv: Number(res.achv.toFixed(2)), 
            loss: Number(res.loss.toFixed(2)),
            pct: res.plan > 0 ? res.achv / res.plan : 0
        };
    };

    const bmD = calc(bmRows, 'day');
    const bmN = calc(bmRows, 'night');
    const bmT = calc(bmRows);
    const imD = calc(imRows, 'day');
    const imN = calc(imRows, 'night');
    const imT = calc(imRows);

    const bmMtdData = getMTDData(allData, date, 'BM');
    const imMtdData = getMTDData(allData, date, 'IM');
    
    const fmtMtd = (d: any) => ({
        plan: Number(d.mtdPlan.toFixed(2)),
        achv: Number(d.mtdAchv.toFixed(2)),
        loss: Number(d.mtdLoss.toFixed(2)),
        pct: d.mtdPlan > 0 ? d.mtdAchv / d.mtdPlan : 0
    });
    const bmM = fmtMtd(bmMtdData);
    const imM = fmtMtd(imMtdData);

    // Machines
    const getMcs = (rows: any[], shift: string) => {
        const list = Array.from(new Set(rows.filter((r:any) => r.shift === shift).map((r:any) => r.machine))).sort();
        return { text: list.join(', '), count: list.length };
    };
    const imDm = getMcs(imRows, 'day'); const bmDm = getMcs(bmRows, 'day');
    const imNm = getMcs(imRows, 'night'); const bmNm = getMcs(bmRows, 'night');

    const allBreakdowns = getBreakdownSummary([...imRows, ...bmRows]);

    return { bmD, bmN, bmT, bmM, imD, imN, imT, imM, imDm, bmDm, imNm, bmNm, allBreakdowns };
  }, [allData, date]);

  // --- DOWNLOAD EXACT EXCEL LAYOUT ---
  const downloadExactExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('1', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }, // A4 Landscape
      views: [{ showGridLines: false }]
    });

    // 1. SET COLUMN WIDTHS (A-AJ)
    const colWidths = [
      16.83, 9.5, 8.66, 9.83, 8.83, 7.83, 9.66, 10.16, 7.83, 8.16, 9.33, 4.16,
      13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 
      13, 13, 13, 13, 13, 13 
    ];
    colWidths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    // 2. SET ROW HEIGHTS (1-32)
    const rowHeights = [
      18.75, 27, 10.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 22.5, 
      22.5, 29.25, 28.5, 14.25, 30.75, 21, 21, 21, 21, 21, 16.5, 32.25, 33.75, 
      22.5, 20.25, 20.25, 20.25, 20.25, 20.25, 13.5
    ];
    rowHeights.forEach((h, i) => {
      sheet.getRow(i + 1).height = h;
    });

    // 3. APPLY FONTS & STYLES GLOBALLY
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.font = { name: 'Times New Roman', size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });

    // Helper for Borders
    const thickBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' }
    };
    const setBorder = (r1: number, c1: number, r2: number, c2: number) => {
        for(let r=r1; r<=r2; r++) {
            for(let c=c1; c<=c2; c++) {
                sheet.getCell(r,c).border = thickBorder;
            }
        }
    };

    // 4. CONTENT & DATA MAPPING
    
    // --- Header Area ---
    sheet.getCell('A1').value = `Date              -  ${date}`;
    sheet.getCell('A1').font = { name: 'Times New Roman', size: 11, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.getCell('A2').value = "Daily Production & Down Times Summary";
    sheet.getCell('A2').font = { name: 'Times New Roman', size: 20, bold: true };
    sheet.getCell('Q2').value = "Attendance";
    sheet.getCell('Q2').font = { name: 'Times New Roman', size: 20, bold: true };

    // --- LEFT SUMMARY TABLE (A4:H15) ---
    // Headers
    sheet.getCell('A4').value = "BM";
    sheet.getCell('B4').value = "Planned";
    sheet.getCell('D4').value = "Achivement"; // Typo in source maintained
    sheet.getCell('F4').value = "Loss";
    sheet.getCell('H4').value = "%";
    
    // Header Style
    for(let c=1; c<=8; c++) sheet.getCell(4, c).font = { name: 'Times New Roman', size: 12, bold: true };
    setBorder(4,1,4,8);

    // BM Data
    sheet.getCell('A5').value = "Day"; sheet.getCell('A5').font = { bold: true };
    sheet.getCell('B5').value = data.bmD.plan; 
    sheet.getCell('D5').value = data.bmD.achv;
    sheet.getCell('F5').value = data.bmD.loss;
    sheet.getCell('H5').value = { formula: 'IFERROR(D5/B5,0)' }; sheet.getCell('H5').numFmt = '0%';

    sheet.getCell('A6').value = "Night"; sheet.getCell('A6').font = { bold: true };
    sheet.getCell('B6').value = data.bmN.plan; 
    sheet.getCell('D6').value = data.bmN.achv;
    sheet.getCell('F6').value = data.bmN.loss;
    sheet.getCell('H6').value = { formula: 'IFERROR(D6/B6,0)' }; sheet.getCell('H6').numFmt = '0%';

    sheet.getCell('A7').value = "Total"; sheet.getCell('A7').font = { bold: true };
    sheet.getCell('B7').value = { formula: 'SUM(B5,B6)' };
    sheet.getCell('D7').value = { formula: 'SUM(D5,D6)' };
    sheet.getCell('F7').value = { formula: 'SUM(F5,F6)' };
    sheet.getCell('H7').value = { formula: 'IFERROR(D7/B7,0)' }; sheet.getCell('H7').numFmt = '0%';

    sheet.getCell('A8').value = "MTD"; sheet.getCell('A8').font = { bold: true };
    sheet.getCell('B8').value = data.bmM.plan;
    sheet.getCell('D8').value = data.bmM.achv;
    sheet.getCell('F8').value = data.bmM.loss;
    sheet.getCell('H8').value = { formula: 'IFERROR(D8/B8,0)' }; sheet.getCell('H8').numFmt = '0%';

    // IM Data
    sheet.getCell('A9').value = "IM";
    sheet.getCell('B9').value = "Planned";
    sheet.getCell('D9').value = "Achivement"; 
    sheet.getCell('F9').value = "Loss";
    sheet.getCell('H9').value = "%";
    for(let c=1; c<=8; c++) sheet.getCell(9, c).font = { name: 'Times New Roman', size: 12, bold: true };
    setBorder(9,1,9,8);

    sheet.getCell('A10').value = "Day";
    sheet.getCell('B10').value = data.imD.plan; 
    sheet.getCell('D10').value = data.imD.achv;
    sheet.getCell('F10').value = data.imD.loss;
    sheet.getCell('H10').value = { formula: 'IFERROR(D10/B10,0)' }; sheet.getCell('H10').numFmt = '0%';

    sheet.getCell('A11').value = "Night";
    sheet.getCell('B11').value = data.imN.plan; 
    sheet.getCell('D11').value = data.imN.achv;
    sheet.getCell('F11').value = data.imN.loss;
    sheet.getCell('H11').value = { formula: 'IFERROR(D11/B11,0)' }; sheet.getCell('H11').numFmt = '0%';

    sheet.getCell('A12').value = "Total";
    sheet.getCell('B12').value = { formula: 'SUM(B10,B11)' };
    sheet.getCell('D12').value = { formula: 'SUM(D10,D11)' };
    sheet.getCell('F12').value = { formula: 'SUM(F10,F11)' };
    sheet.getCell('H12').value = { formula: 'IFERROR(D12/B12,0)' }; sheet.getCell('H12').numFmt = '0%';

    sheet.getCell('A13').value = "MTD";
    sheet.getCell('B13').value = data.imM.plan;
    sheet.getCell('D13').value = data.imM.achv;
    sheet.getCell('F13').value = data.imM.loss;
    sheet.getCell('H13').value = { formula: 'IFERROR(D13/B13,0)' }; sheet.getCell('H13').numFmt = '0%';

    // Combined Data (Rows 14-15)
    sheet.getCell('A14').value = "IM+BM\nTotal"; sheet.getCell('A14').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; sheet.getCell('A14').font = { bold: true };
    sheet.getCell('B14').value = { formula: 'B7+B12' };
    sheet.getCell('D14').value = { formula: 'D7+D12' };
    sheet.getCell('F14').value = { formula: 'F7+F12' };
    sheet.getCell('H14').value = { formula: 'IFERROR(D14/B14,0)' }; sheet.getCell('H14').numFmt = '0%';

    sheet.getCell('A15').value = "IM+BM\nMTD"; sheet.getCell('A15').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; sheet.getCell('A15').font = { bold: true };
    sheet.getCell('B15').value = { formula: 'B8+B13' }; 
    sheet.getCell('D15').value = { formula: 'D8+D13' };
    sheet.getCell('F15').value = { formula: 'F8+F13' };
    sheet.getCell('H15').value = { formula: 'IFERROR(D15/B15,0)' }; sheet.getCell('H15').numFmt = '0%';

    // Borders for Main Table
    setBorder(4,1,15,8);

    // --- BOTTOM LEFT: SHIFT PERFORMANCE (A18:K22) ---
    sheet.getCell('A18').value = "Shift";
    sheet.getCell('C18').value = "Plan Vs Achivement";
    sheet.getCell('I18').value = "MTD %";
    sheet.getCell('A18').font = { bold: true, size: 12 };
    sheet.getCell('C18').font = { bold: true, size: 12 };
    sheet.getCell('I18').font = { bold: true, size: 12 };
    setBorder(18,1,22,11);

    sheet.getCell('A19').value = "Shift A\nParami"; sheet.getCell('A19').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    sheet.getCell('C19').value = "Plan";
    sheet.getCell('E19').value = { formula: 'B5+B10' }; // Day Plan Total
    sheet.getCell('C20').value = "Achivement";
    sheet.getCell('E20').value = { formula: 'D5+D10' }; // Day Achv Total
    sheet.getCell('I19').value = "75%"; // Placeholder/Calc

    sheet.getCell('A21').value = "Shift B\nDilusha"; sheet.getCell('A21').alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    sheet.getCell('C21').value = "Plan";
    sheet.getCell('E21').value = { formula: 'B6+B11' }; // Night Plan Total
    sheet.getCell('C22').value = "Achivement";
    sheet.getCell('E22').value = { formula: 'D6+D11' }; // Night Achv Total
    sheet.getCell('I21').value = "76%";

    // --- BOTTOM LEFT: REGISTER (A24:K31) ---
    sheet.getCell('A24').value = "Register"; sheet.getCell('A24').font = { size: 16, bold: true };
    
    sheet.getCell('A25').value = "Shift";
    sheet.getCell('C25').value = "Related M/C";
    sheet.getCell('J25').value = "Total M/C";
    sheet.getCell('A25').font = { bold: true, size: 12 };
    sheet.getCell('C25').font = { bold: true, size: 12 };
    sheet.getCell('J25').font = { bold: true, size: 12 };
    setBorder(25,1,31,11);

    sheet.getCell('A26').value = "Day"; sheet.getCell('A26').font = { bold: true };
    sheet.getCell('C26').value = "IM"; sheet.getCell('C27').value = "BM";
    sheet.getCell('E26').value = data.imDm.text || "-"; sheet.getCell('E26').alignment = { horizontal: 'left' };
    sheet.getCell('E27').value = data.bmDm.text || "-"; sheet.getCell('E27').alignment = { horizontal: 'left' };
    sheet.getCell('J26').value = data.imDm.count; sheet.getCell('J27').value = data.bmDm.count;
    sheet.getCell('K26').value = { formula: 'SUM(J26:J27)' }; 

    sheet.getCell('A28').value = "Night"; sheet.getCell('A28').font = { bold: true };
    sheet.getCell('C28').value = "IM"; sheet.getCell('C29').value = "BM";
    sheet.getCell('E28').value = data.imNm.text || "-"; sheet.getCell('E28').alignment = { horizontal: 'left' };
    sheet.getCell('E29').value = data.bmNm.text || "-"; sheet.getCell('E29').alignment = { horizontal: 'left' };
    sheet.getCell('J28').value = data.imNm.count; sheet.getCell('J29').value = data.bmNm.count;
    sheet.getCell('K28').value = { formula: 'SUM(J28:J29)' }; 

    sheet.getCell('A30').value = "Today"; sheet.getCell('A30').font = { bold: true };
    sheet.getCell('C30').value = "IM"; sheet.getCell('C31').value = "BM";
    
    // --- RIGHT SIDE: ATTENDANCE & STOCK (Placeholders based on layout) ---
    // Header Row 4
    sheet.getCell('L4').value = new Date(date); sheet.getCell('L4').numFmt = 'd-mmm';
    sheet.getCell('O4').value = "Actual";
    sheet.getCell('R4').value = "Present";
    sheet.getCell('U4').value = "Absent";
    setBorder(4, 12, 4, 30); // L to AD approx

    // Labels
    ['General', 'CN Night', 'Shift A', 'Shift B', 'Training', 'New', 'Total', 'Req', 'Balance'].forEach((txt, i) => {
        sheet.getCell(5 + i, 12).value = txt; // Col L
        sheet.getCell(5 + i, 12).font = { bold: true };
        sheet.getCell(5 + i, 25).value = txt; // Col Y (Next day block)
        sheet.getCell(5 + i, 25).font = { bold: true };
    });
    
    // Borders for Attendance
    setBorder(4, 12, 13, 23); // First Block
    setBorder(4, 25, 13, 36); // Second Block

    // Preform Issues Title
    sheet.getCell('L15').value = "Preform Issues & Stock Details";
    sheet.getCell('L15').font = { size: 16, bold: true };

    // Stock Table Headers (Row 17)
    sheet.getCell('P17').value = "Month Open Stock"; 
    sheet.getCell('P17').alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    sheet.getCell('S17').value = "RYD";
    sheet.getCell('V17').value = "RVD Total";
    sheet.getCell('Y17').value = "Issue";
    sheet.getCell('AB17').value = "Issued Total";
    sheet.getCell('AE17').value = "Stock";
    setBorder(17, 16, 21, 33); // Borders for stock table

    // Delivery Details
    sheet.getCell('P24').value = "Delivery Details";
    sheet.getCell('P24').font = { size: 14, bold: true };
    
    sheet.getCell('S25').value = "Actual";
    sheet.getCell('Z25').value = "MTD";
    
    sheet.getCell('Q26').value = "IM";
    sheet.getCell('Q27').value = "BM";
    sheet.getCell('Q28').value = "Total";
    setBorder(25, 16, 28, 32);

    // 5. MERGE CELLS (EXACT LIST)
    const merges = [
        'Y11:AA11', 'A26:B27', 'K26:K27', 'AH10:AJ10', 'O4:Q4', 'AB9:AD9', 'A24:K24', 'P17:R17', 'A21:B22', 'U7:W7',
        'B12:C12', 'AB11:AD11', 'D6:E6', 'E29:I29', 'F15:G15', 'P19:R19', 'D13:E13', 'L17:O17', 'Y13:AA13', 'L9:N9',
        'I19:J20', 'B14:C14', 'E31:I31', 'AB13:AJ13', 'U8:W8', 'I18:J18', 'B1:C1', 'L19:O19', 'Z27:AF27', 'B13:C13',
        'L11:N11', 'D7:E7', 'R5:T5', 'C27:D27', 'U10:W10', 'Y8:AA8', 'A2:K2', 'Z25:AF25', 'D4:E4', 'V21:X21',
        'F13:G13', 'AB6:AD6', 'E26:I26', 'O10:Q10', 'AH5:AJ5', 'C19:D19', 'L13:N13', 'O9:Q9', 'R4:T4', 'C28:D28',
        'AE18:AG18', 'S17:U17', 'AH4:AJ4', 'U11:W11', 'Y5:AA5', 'Y20:AA20', 'I21:J22', 'K30:K31', 'C30:D30', 'D10:E10',
        'O5:Q5', 'F10:G10', 'L21:O21', 'L8:N8', 'F6:G6', 'E22:H22', 'AB12:AJ12', 'Y6:AA6', 'L10:N10', 'B11:C11',
        'D11:E11', 'F5:G5', 'E28:I28', 'E21:H21', 'AB17:AD17', 'P18:R18', 'Y12:AA12', 'AE6:AG6', 'E30:I30', 'AB19:AD19',
        'Z26:AF26', 'R9:T9', 'O7:Q7', 'Y4:AA4', 'V17:X17', 'D9:E9', 'P20:R20', 'F9:G9', 'K28:K29', 'AE7:AG7',
        'B6:C6', 'AB5:AD5', 'S28:Y28', 'AB20:AD20', 'B15:C15', 'R11:T11', 'D15:E15', 'L26:R26', 'S18:U18', 'L20:O20',
        'AB4:AD4', 'V20:X20', 'L12:N12', 'R6:T6', 'L25:R25', 'P21:R21', 'F4:G4', 'B7:C7', 'Y10:AA10', 'Y19:AA19',
        'AE17:AG17', 'Y17:AA17', 'L4:N4', 'Z28:AF28', 'F7:G7', 'AH6:AJ6', 'C20:D20', 'C29:D29', 'S26:Y26', 'AE19:AG19',
        'AE9:AG9', 'AB8:AD8', 'C22:D22', 'S25:Y25', 'C31:D31', 'S20:U20', 'F8:G8', 'L28:R28', 'A28:B29', 'AH7:AJ7',
        'C21:D21', 'S27:Y27', 'AE11:AG11', 'AB10:AD10', 'AE5:AG5', 'Q2:AE2', 'AB18:AD18', 'J25:K25', 'E20:H20', 'U4:W4',
        'V18:X18', 'L15:AI16', 'A30:B31', 'B9:C9', 'AE4:AG4', 'C25:I25', 'L18:O18', 'D12:E12', 'U6:W6', 'S21:U21',
        'O6:Q6', 'B5:C5', 'D5:E5', 'D14:E14', 'F14:G14', 'B4:C4', 'Y21:AA21', 'V19:X19', 'F11:G11', 'L5:N5',
        'AH9:AJ9', 'AE8:AG8', 'C26:D26', 'AB21:AD21', 'Y7:AA7', 'L27:R27', 'S19:U19', 'F12:G12', 'A25:B25', 'AH11:AJ11',
        'AE10:AG10', 'A19:B20', 'Y18:AA18', 'O12:W12', 'A18:B18', 'O8:Q8', 'B8:C8', 'L6:N6', 'AB7:AD7', 'O11:Q11',
        'U5:W5', 'B10:C10', 'E27:I27', 'C18:H18', 'U9:W9', 'E19:H19', 'AE20:AG20', 'O13:W13', 'R8:T8', 'L7:N7',
        'D8:E8', 'R10:T10', 'Y9:AA9', 'AH8:AJ8', 'P24:AC24', 'R7:T7', 'AE21:AG21'
    ];

    merges.forEach(range => {
        try {
            sheet.mergeCells(range);
        } catch (e) { console.warn("Merge conflict or error:", range); }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Production_Summary_${date}.xlsx`);
  };

  // --- HANDSONTABLE (PREVIEW ONLY) ---
  useEffect(() => {
    // ... (Keep existing simple preview logic for web view if needed, or simplify it)
    if (containerRef.current) {
        if (hotRef.current) hotRef.current.destroy();
        hotRef.current = new Handsontable(containerRef.current, {
            data: [
                ['Daily Production Summary', date],
                ['BM Total', data.bmT.plan, data.bmT.achv, data.bmT.loss, data.bmT.pct],
                ['IM Total', data.imT.plan, data.imT.achv, data.imT.loss, data.imT.pct],
                ['Click "Download Excel" for Full Report with Exact Layout']
            ],
            colHeaders: true,
            height: 'auto',
            licenseKey: 'non-commercial-and-evaluation'
        });
    }
  }, [allData, date]);

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-20 animate-fade-in">
       <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
             <button onClick={() => setActiveSubTab('DAILY')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'DAILY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                <BarChart2 className="w-4 h-4"/> Daily Summary
             </button>
             <button onClick={() => setActiveSubTab('BREAKDOWNS')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeSubTab === 'BREAKDOWNS' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                <AlertOctagon className="w-4 h-4"/> Breakdowns Summary
             </button>
          </div>
          <button onClick={downloadExactExcel} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
             <FileSpreadsheet className="w-4 h-4" /> Download Exact Excel
          </button>
       </div>

       {activeSubTab === 'DAILY' && (
         <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg">
             <h3 className="text-center font-bold text-lg mb-4 text-slate-700 dark:text-white">Preview Mode</h3>
             <div ref={containerRef}></div>
             <p className="text-center text-xs text-slate-400 mt-4">* This preview is simplified. The downloaded Excel file contains the full complex layout.</p>
         </div>
       )}

       {activeSubTab === 'BREAKDOWNS' && (
         <div className="bg-white dark:bg-slate-800 border p-8 rounded-3xl dark:border-slate-700">
             <h2 className="text-center font-black text-xl mb-6 text-rose-600">Breakdown Summary</h2>
             <div className="space-y-4">
                 {Object.entries(data.allBreakdowns).map(([cat, items]) => (
                     <div key={cat} className="border p-4 rounded-xl dark:border-slate-700">
                         <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200">{cat}</h4>
                         {items.map((bd:any, i:number) => (
                             <div key={i} className="flex justify-between text-sm border-b dark:border-slate-800 py-1 text-slate-500">
                                 <span>{bd.machine}: {bd.description}</span>
                                 <span className="font-bold text-rose-500">{bd.lossKg.toFixed(2)} kg</span>
                             </div>
                         ))}
                     </div>
                 ))}
             </div>
         </div>
       )}
    </div>
  );
};

export default DailySummary;