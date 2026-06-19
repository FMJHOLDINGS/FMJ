

export type StockCategory = string;

export const STOCK_TABS: { id: string; label: string }[] = [
  { id: 'PREFORMS', label: 'Preforms' }
];


export interface TransactionItem {
  id: string;
  date: string;
  value: number;
  
  // [NEW] IN Modal Specific Fields (IN සඳහා පමණක් ඇති අලුත් දත්ත)
  prNumber?: string;
  requestedQty?: number;
  prSubmittedDate?: string;
  goodReceivedDate?: string;
  grn?: string;
  bnIn?: string;
  remainingQty?: number;
}

// UI එක සඳහා සම්පූර්ණ දත්තය
export interface StockItem {
  id: string;
  item: string;         
  weight: string;       
  openStock: number;    
  reorderLevel: number; 
  inTrans: TransactionItem[];     
  outTrans: TransactionItem[];    
  returnTrans: TransactionItem[]; 
}

// Database එකට යැවීමට කඩන මාස්ටර් දත්ත (නොවෙනස් වන දේවල්)
export interface MasterStockItem {
  id: string;
  item: string;
  weight: string;
  reorderLevel: number;
}

// Database එකට යැවීමට කඩන මාසික දත්ත (වෙනස් වන දේවල්)
export interface MonthlyStockData {
  openStock: number;
  inTrans: TransactionItem[];
  outTrans: TransactionItem[];
  returnTrans: TransactionItem[];
}

