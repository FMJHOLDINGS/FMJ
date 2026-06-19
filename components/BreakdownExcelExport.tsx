import React from 'react';
import { Download } from 'lucide-react';
import XLSX from 'xlsx-js-style'; 

interface Props {
  filteredList: any[];
  startDate: string;
  endDate: string;
  isCategoryFiltered: boolean;
  isMachineFiltered: boolean; // New Prop
}

const BreakdownExcelExport: React.FC<Props> = ({ filteredList, startDate, endDate, isCategoryFiltered, isMachineFiltered }) => {

  const formatDateDDMMM = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-');
  };

  const handleExport = () => {
    // 🟢 1. නිවැරදිව Sort කිරීම (Date -> Shift -> Machine Type -> Machine No)
    const sortedData = [...filteredList].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;

        if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;

        const aType = (a.machine || '').substring(0, 2);
        const bType = (b.machine || '').substring(0, 2);
        if (aType !== bType) return aType === 'IM' ? -1 : 1;

        return (a.machine || '').localeCompare(b.machine || '');
    });

    let sheetData: any[][] = [];
    let merges: { s: { r: number, c: number }, e: { r: number, c: number } }[] = [];

    const headers = [
        "Date", "Machine", "Shift", "Product", "Unit Wt", "Category", "Reason", 
        "Start", "End", "Mins", "Cavity", "Cyc (s)", "Lost Qty", "Lost Kg"
    ];
    sheetData.push(headers);

 // --- STYLES ---
 const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "2F3542" } }, // 🟢 patternType එකතු කළා
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
};

const yellowTotalStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "FFFF00" } }, // 🟢 patternType එකතු කළා
    font: { bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
};

const grandTotalStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "10B981" } }, // 🟢 patternType එකතු කළා
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
};

const blackRowStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "000000" } } // 🟢 patternType එකතු කළා
};


    const centerStyle = { alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const rightStyle = { alignment: { horizontal: "right" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const leftStyle = { alignment: { horizontal: "left" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };

    let grandTotalMins = 0;
    let grandTotalLostQty = 0;
    let grandTotalKg = 0;
    let currentRowIndex = 1;

    const isDetailedView = !isCategoryFiltered && !isMachineFiltered;

    // --- SCENARIO 1: SPECIFIC FILTER (Machine OR Category Selected) ---
    if (!isDetailedView) {
        sortedData.forEach(item => {
            sheetData.push([
                formatDateDDMMM(item.date), item.machine, item.shift, item.product,
                item.unitWeight || 0, item.category, item.reason, item.startTime,
                item.endTime, item.mins, item.cavity || 0, item.cycleTime || 0,
                item.lostQty, Number(item.lostKg.toFixed(2))
            ]);
            
            grandTotalMins += item.mins; grandTotalLostQty += item.lostQty; grandTotalKg += item.lostKg;
            currentRowIndex++;
        });

        sheetData.push([
            "GRAND TOTAL", "", "", "", "", "", "", "", "", 
            grandTotalMins, "", "", grandTotalLostQty, Number(grandTotalKg.toFixed(2))
        ]);
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 8 } });
        currentRowIndex++;
    } 
    // --- SCENARIO 2: NO SPECIFIC FILTERS (Date Range Only) ---
    else {
        const groupedByDate: Record<string, any[]> = {};
        sortedData.forEach(item => {
            if (!groupedByDate[item.date]) groupedByDate[item.date] = [];
            groupedByDate[item.date].push(item);
        });

        Object.keys(groupedByDate).forEach((dateKey) => {
            const dayItems = groupedByDate[dateKey];
            let dailyMins = 0; let dailyLostQty = 0; let dailyKg = 0;

            dayItems.forEach(item => {
                sheetData.push([
                    formatDateDDMMM(item.date), item.machine, item.shift, item.product,
                    item.unitWeight || 0, item.category, item.reason, item.startTime,
                    item.endTime, item.mins, item.cavity || 0, item.cycleTime || 0,
                    item.lostQty, Number(item.lostKg.toFixed(2))
                ]);
                dailyMins += item.mins; dailyLostQty += item.lostQty; dailyKg += item.lostKg;
                currentRowIndex++;
            });

            // 🟢 2. Daily Total Yellow Row
            const dateObj = new Date(dateKey);
            const monthStr = dateObj.toLocaleString('en-US', { month: 'long' });
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            const displayDate = `TOTAL (${monthStr} ${dayStr})`;

            sheetData.push([
                displayDate, "", "", "", "", "", "", "", "", 
                dailyMins, "", "", dailyLostQty, Number(dailyKg.toFixed(2))
            ]);
            merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 8 } });
            currentRowIndex++;

            // 🟢 3. Daily Separator Black Row (Force Create Cells)
            sheetData.push(new Array(14).fill("BLACK_ROW")); 
            currentRowIndex++;

            grandTotalMins += dailyMins; grandTotalLostQty += dailyLostQty; grandTotalKg += dailyKg;
        });

        sheetData.push([
            "GRAND TOTAL", "", "", "", "", "", "", "", "", 
            grandTotalMins, "", "", grandTotalLostQty, Number(grandTotalKg.toFixed(2))
        ]);
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 8 } });
        currentRowIndex++;
    }

    // --- EXCEL FILE CREATION ---
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // 🟢 4. Force range to include all 14 columns explicitly for styling
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRowIndex - 1, c: 13 } });
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = 0; C <= 13; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            
            // Create cell object if it doesn't exist
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: "" };

            const rowValues = sheetData[R];

            if (R === 0) { ws[cellRef].s = headerStyle; continue; }

            // Default Alignments
            if (C === 0 || C === 2 || C === 7 || C === 8) ws[cellRef].s = centerStyle; 
            else if (C === 4 || C >= 9) ws[cellRef].s = rightStyle; 
            else ws[cellRef].s = leftStyle; 

            // Grand Total
            if (rowValues[0] === "GRAND TOTAL") {
                 ws[cellRef].s = grandTotalStyle;
                 continue; 
            }

            if (isDetailedView) {
                // Yellow Total Row
                if (String(rowValues[0]).includes("TOTAL (")) {
                    ws[cellRef].s = yellowTotalStyle;
                    continue;
                }
                // Black Row
                if (rowValues[0] === "BLACK_ROW") {
                    ws[cellRef].v = ""; // Text එක මකා දමයි
                    ws[cellRef].t = "s";
                    ws[cellRef].s = blackRowStyle;
                    continue;
                }
            }
        }
    }

    ws['!merges'] = merges;
    
    // 🟢 5. Column Widths (Product, Category, Reason දිගු කර ඇත, අනිත්වා 90px පමණ වේ)
    ws['!cols'] = [
        { wch: 10 }, // Date
        { wch: 10 }, // Machine
        { wch: 10 }, // Shift
        { wch: 35 }, // Product (දිග වැඩි කර ඇත)
        { wch: 10 }, // Unit Wt
        { wch: 25 }, // Category (දිග වැඩි කර ඇත)
        { wch: 40 }, // Reason (දිග වැඩි කර ඇත)
        { wch: 10 }, // Start
        { wch: 10 }, // End
        { wch: 10 }, // Mins
        { wch: 10 }, // Cavity
        { wch: 10 }, // Cyc
        { wch: 10 }, // Lost Qty
        { wch: 10 }  // Lost Kg
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Breakdowns");
    XLSX.writeFile(wb, `Breakdown_Report_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <button 
      onClick={handleExport} 
      className="
        flex items-center justify-center gap-2 
        bg-emerald-500 hover:bg-emerald-600 text-white 
        rounded-xl font-black uppercase tracking-widest 
        shadow-lg shadow-emerald-500/20 transition-all active:scale-95
        w-full sm:w-auto px-3 py-2 text-[10px]
        md:px-5 md:py-2.5 md:text-xs md:hover:-translate-y-0.5
      "
    >
      <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
      <span>Export</span>
    </button>
  );
};

export default BreakdownExcelExport;