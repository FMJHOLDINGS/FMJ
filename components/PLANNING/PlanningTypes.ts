// දැනට තියෙන IMJobPlan එක එහෙමම තියන්න
export interface IMJobPlan {
  id: string;
  machine: string;
  jobNo: string;
  poNo?: string;
  poDate?: string;
  customer?: string;
  itemName: string;
  weight?: number;
  orderQty?: number;
  planQty?: number;
  completedQty: number;
  balance: number;
  
  // New Columns
  cavities?: number;
  cycleTime?: number;
  targetPerHr?: number;
  shiftTarget?: number;

  days?: number;
  startDate?: string;
  hldMold?: string;
  endDate?: string;

  packingQty?: number | string;
  cartonQty?: number | string;
  
  status: 'pending' | 'running' | 'completed' | 'hold';
  dailyCompletions: DailyCompletion[];
}

export interface DailyCompletion {
  id: string;
  date: string;
  qty: number;
  shift?: 'Day' | 'Night'; // Modal එකේ shift එක save කරන්න මෙයත් එකතු කර ඇත
}

// ✅ අලුත් වෙනස මෙතනයි: bmPlans එකතු කරන්න
export interface PlanningDoc {
  imPlans: IMJobPlan[];
  bmPlans?: IMJobPlan[]; // Optional ලෙස BM Plans එකතු කළා
  lastModified?: number;
}


export interface ProductItem {
  id: string;
  itemName: string;
  weight?: number;
  color?: string; 
  customer?: string;
  category?: string;
  cycleTime?: number | string;
  cavities?: number | string;
  machineType: 'IM' | 'BM';
  
  // 🟢 Errors මගහැරීමට අලුතින් එකතු කළ කොටස්:
  compatibleMachines?: string[]; // මැෂින් ෆිල්ටර් කිරීමට
  stdCavities?: number | string; // Standard Cavities
  actualCavities?: number | string; // Actual Cavities
  
  // Cycle Times
  standardCycleTime?: number; 
  actualCycleTime?: number;   
  
  targetPerHr?: number;

  // Packing Details
  cartonQty?: number;         
  packingQty?: number;        
  polytheneSize?: string;     
  polytheneType?: 'Single' | 'Double'; 
}

export interface ProductDBDoc {
  items: ProductItem[];
  lastModified?: number;
}