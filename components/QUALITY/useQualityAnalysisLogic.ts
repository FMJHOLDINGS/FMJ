// ============================================================================
// 🧠 QUALITY ANALYSIS LOGIC HOOK (UPDATED FOR QA MANUAL INPUTS)
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { QaService } from './QaService';
import { useAuth } from '../../context/AuthContext';

export const useQualityAnalysisLogic = (filteredData: any[]) => {
    const { userData } = useAuth();
    const [settings, setSettings] = useState({ mainCategories: [], subCategories: [] });
    
    // 🟢 1. අලුතින් Loading State එකක් එකතු කිරීම
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            if (userData?.collectionName) {
                setIsSettingsLoading(true); // Load වෙන්න පටන් ගනී
                try {
                    const config = await QaService.getQaSettings(userData.collectionName);
                    setSettings(config as any);
                } catch (error) { console.error("Error fetching QA settings", error); }
                finally {
                    setIsSettingsLoading(false); // Load වී අවසන්
                }
            } else {
                setIsSettingsLoading(false);
            }
        };
        fetchSettings();
    }, [userData?.collectionName]);


    const processedData = useMemo(() => {
        let totalProd = 0;
        let totalRej = 0;

        let imProd = 0;
        let bmProd = 0;
        let imRej = 0;
        let bmRej = 0;



        let totalGoodKg = 0;
        let imGoodKg = 0;
        let bmGoodKg = 0;


        let totalProdQty = 0;
        let totalRejQty = 0;
        let totalGoodQty = 0;

        let imRejQty = 0;
        let bmRejQty = 0;
        let imGoodQty = 0;
        let bmGoodQty = 0;
        
        
        let totalSortedRejKg = 0;
        let imSortedRejKg = 0;
        let bmSortedRejKg = 0;


        let targetYear = new Date().getFullYear();
        let targetMonth = new Date().getMonth();

        if (filteredData.length > 0) {
            const firstDate = new Date(filteredData[0].date);
            if (!isNaN(firstDate.getTime())) {
                targetYear = firstDate.getFullYear();
                targetMonth = firstDate.getMonth();
            }
        }

        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const dailyMap: Record<string, { Production: number, Rejection: number, dayIndex: number }> = {};

        for (let i = 1; i <= daysInMonth; i++) {
            const tempDate = new Date(targetYear, targetMonth, i);
            const label = tempDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            dailyMap[label] = { Production: 0, Rejection: 0, dayIndex: i };
        }

        const mainCatMap: Record<string, number> = {};
        const subCatMap: Record<string, { value: number, qty: number, items: any[] }> = {};
        const itemMap: Record<string, { value: number, qty: number }> = {};

        const mainCatConfig: Record<string, any> = {};
        if (settings.mainCategories) {
            settings.mainCategories.forEach((c: any) => mainCatConfig[c.id] = { name: (c.name || '').toUpperCase(), color: c.color });
        }

        const subCatConfig: Record<string, any> = {};
        if (settings.subCategories) {
            settings.subCategories.forEach((c: any) => {
                subCatConfig[(c.name || '').toUpperCase()] = { mainCatId: c.mainCategoryId, color: c.color };
            });
        }

        filteredData.forEach(row => {
            const rowDate = new Date(row.date);
            const dateLabel = rowDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            
            const prodKg = row.wgtTotal || 0;
            const unitWt = row.unitWeight || 0; 
            
           // 🟢 QualityTab එකේදී දැනටමත් ගණනය කර ඇති wgtReject සහ wgtStartup කෙළින්ම ගැනීම
           const rowTotalRejKg = (row.wgtReject || 0) + (row.wgtStartup || 0); 
           const rowGoodKg = row.goodQty ? (Number(row.goodQty) * unitWt) / 1000 : 0;

           // 🟢 අලුතින්: Qty අගයන් ලබා ගැනීම
           const prodQty = Number(row.qtyTotal) || 0;
           const rowRejQty = (Number(row.qtyReject) || 0) + (Number(row.qtyStartup) || 0);
           const rGoodQty = Number(row.goodQty) || 0;

           // ✔️ එක වරක් පමණක් එකතු කිරීම
           totalProd += prodKg;
           totalRej += rowTotalRejKg;
           totalGoodKg += rowGoodKg;

           // 🟢 Qty එකතු කිරීම
           totalProdQty += prodQty;
           totalRejQty += rowRejQty;
           totalGoodQty += rGoodQty;

           if (row.type === 'IM') {
                imProd += prodKg;
                imRej += rowTotalRejKg;
                imGoodKg += rowGoodKg;
                imRejQty += rowRejQty; 
                imGoodQty += rGoodQty;
            } else if (row.type === 'BM') {
                bmProd += prodKg;
                bmRej += rowTotalRejKg;
                bmGoodKg += rowGoodKg;
                bmRejQty += rowRejQty; 
                bmGoodQty += rGoodQty;
            }
            // ✂️ (අර දෙපාරක් තිබ්බ අමතර කොටස මම මෙතනින් සම්පූර්ණයෙන්ම අයින් කළා)

            if (dailyMap[dateLabel]) {
                dailyMap[dateLabel].Production += prodKg;
                dailyMap[dateLabel].Rejection += rowTotalRejKg;
            } else {
                dailyMap[dateLabel] = { Production: prodKg, Rejection: rowTotalRejKg, dayIndex: rowDate.getDate() };
            }

            const itemName = row.product || 'Unknown Product';
            if (!itemMap[itemName]) itemMap[itemName] = { value: 0, qty: 0 };
            itemMap[itemName].value += rowTotalRejKg;
            
            // 🟢 Rej Qty සහ Start Qty එකතුව (Error එක නිවැරදි කළා)
            const itemRejQty = (row.qtyReject || 0) + (row.qtyStartup || 0);
            itemMap[itemName].qty += itemRejQty;

          
            if (row.defects && Array.isArray(row.defects)) {
                let rowSortedRejKg = 0; // 🟢 මේ පේළියේ Sorted KG එකතුව

                row.defects.forEach((d: any) => {
                    const defectQty = Number(d.qty || 0);
                    const dKg = unitWt > 0 ? (defectQty * unitWt) / 1000 : 0; 

                    if (dKg > 0) {
                        rowSortedRejKg += dKg; // 🟢 Sorted KG එකතු කිරීම
                        const rawCat = (d.defectName || '').trim().toUpperCase();
                        const catName = (rawCat === '' || rawCat === 'OTHER') ? 'OTHER' : rawCat;

                        if (!subCatMap[catName]) subCatMap[catName] = { value: 0, qty: 0, items: [] };
                        subCatMap[catName].value += dKg;
                        subCatMap[catName].qty += defectQty;
                        
                        subCatMap[catName].items.push({
                            dateShift: `${dateLabel} - ${row.shift || 'Day'}`,
                            machine: row.machine || 'N/A',
                            product: row.product || 'Unknown Product',
                            qty: defectQty,
                            weight: Number(dKg.toFixed(2))
                        });

                        let mainTypeName = 'OTHER'; 
                        const sysSub = subCatConfig[catName];
                        if (sysSub && sysSub.mainCatId && mainCatConfig[sysSub.mainCatId]) {
                            mainTypeName = mainCatConfig[sysSub.mainCatId].name;
                        }

                        mainCatMap[mainTypeName] = (mainCatMap[mainTypeName] || 0) + dKg;
                    }
                });

                // 🟢  Total සහ IM/BM Sorted Rejection වලට එකතු කිරීම
                totalSortedRejKg += rowSortedRejKg;
                if (row.type === 'IM') {
                    imSortedRejKg += rowSortedRejKg;
                } else if (row.type === 'BM') {
                    bmSortedRejKg += rowSortedRejKg;
                }
            }

        });



        // 🟢 Daily Chart එකට යන Data එක
        const dailyChartData = Object.entries(dailyMap)
            .sort((a, b) => a[1].dayIndex - b[1].dayIndex)
            .map(([dateLabel, vals]) => ({
                dateLabel, 
                Production: Number(vals.Production.toFixed(1)), 
                Rejection: Number(vals.Rejection.toFixed(1)) // දැන් මෙතනට එන්නේ අර අලුතින් ගණනය කළ QA Weight එකයි
            }));

        const specificDefectsData = Object.entries(subCatMap)
            .map(([name, data]) => ({ 
                name, 
                value: Number(data.value.toFixed(1)), 
                qty: data.qty,
                items: data.items,
                color: subCatConfig[name]?.color || '#94a3b8' 
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        const mainPieData = Object.entries(mainCatMap)
            .map(([name, value]) => {
                const mainMatch = Object.values(mainCatConfig).find(m => m.name === name);
                return { 
                    name, 
                    value: Number(value.toFixed(1)), 
                    color: mainMatch ? mainMatch.color : '#cbd5e1' 
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

            
            const topItemsData = Object.entries(itemMap)
            .map(([name, data]) => ({ name, value: Number(data.value.toFixed(1)), qty: data.qty }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value).slice(0, 5); 

        return { 
            kpiData: {
                totalProd: Number(totalProd.toFixed(1)),
                totalRej: Number(totalRej.toFixed(1)),
                rate: totalProd > 0 ? ((totalRej / totalProd) * 100).toFixed(2) : '0.00',
                
                imProd: Number(imProd.toFixed(1)),
                bmProd: Number(bmProd.toFixed(1)),
                imRej: Number(imRej.toFixed(1)),
                bmRej: Number(bmRej.toFixed(1)),
                imRate: imProd > 0 ? ((imRej / imProd) * 100).toFixed(2) : '0.00',
                bmRate: bmProd > 0 ? ((bmRej / bmProd) * 100).toFixed(2) : '0.00',
                
                totalGoodKg: Number(totalGoodKg.toFixed(1)),
                imGoodKg: Number(imGoodKg.toFixed(1)),
                bmGoodKg: Number(bmGoodKg.toFixed(1)),

                // 🟢 අලුතින් එකතු කළ QTY අගයන්
                totalProdQty: totalProdQty,
                totalRejQty: totalRejQty,
                totalGoodQty: totalGoodQty,
                imRejQty: imRejQty || 0,
                bmRejQty: bmRejQty || 0,
                imGoodQty: imGoodQty || 0,
                bmGoodQty: bmGoodQty || 0,


                // 🟢 වෙනස් කළ ලොජික් එක: Total Rejection එකෙන් Good Qty එක අඩු කිරීම (IM සහ BM වලටත් වෙන වෙනම)
                totalSortedRejKg: Number((totalRej - totalGoodKg).toFixed(1)),
                imSortedRejKg: Number((imRej - imGoodKg).toFixed(1)),
                bmSortedRejKg: Number((bmRej - bmGoodKg).toFixed(1)),

                totalSortedRejQty: (totalRejQty || 0) - (totalGoodQty || 0),
                imSortedRejQty: (imRejQty || 0) - (imGoodQty || 0),
                bmSortedRejQty: (bmRejQty || 0) - (bmGoodQty || 0)

            },
            
            dailyChartData, 
            mainPieData, 
            specificDefectsData, 
            topItemsData,
            maxTopItemVal: topItemsData.length > 0 ? topItemsData[0].value : 1,
            isSettingsLoading 
        };

    }, [filteredData, settings]);

    return processedData;
};
