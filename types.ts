export type ShiftType = 'day' | 'night';
export type MachineType = 'IM' | 'BM';
export type ProductType = 'Preform' | 'Cap'; 

// New Interface for detailed defect tracking
export interface DefectEntry {
  defectName: string;
  qty: number;
}

export interface ProductionItem {
  id: string;
  machine: string;
  itemName: string;
  customerName?: string; // Optional field
  unitWeight: number;
  jobNo?: string;        // Optional field
  type: MachineType;
  productType?: ProductType; 
}

// types.ts හි AdminConfig එක මෙලෙස වෙනස් කරන්න:
export interface AdminConfig {
  productionItems: ProductionItem[];
  breakdownCategories: string[];
  shiftTeams: string[];
  qaCategories?: string[]; // අලුතින් එකතු කල කොටස (Optional)
}
export interface Breakdown {
  id: string;
  category: string;
  description: string;
  startTime: string; 
  endTime: string;   
  machine?: string;
  date?: string;
}

export interface ProductionRow {
  id: string;
  shift: ShiftType;
  startTime: string;
  endTime: string;
  machine: string;
  product: string;
  unitWeight: number;
  qtyPerHour: number;
  cavities: number;
  cycleTime?: number;
  
  // Production Counts
  achievedQty: number; 
  rejectionQty?: number; 
  startupQty?: number;   
  acceptedQty?: number;  

  breakdowns: Breakdown[];
  
  // NEW FIELD: Stores specific rejection details (e.g., Black Dot: 50, Burn Mark: 20)
  defects?: DefectEntry[];
}

export interface DayData {
  id: string;
  date: string;       
  machineType: MachineType;
  daySupervisor?: string;
  nightSupervisor?: string;
  rows: ProductionRow[];
}

export enum AppTab {
  PRODUCTION = 'production',
  KPI = 'analytics',
  OEE = 'efficiency',
  QUALITY = 'quality',
  ADMIN = 'admin'
}