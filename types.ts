export type ShiftType = 'day' | 'night';
export type MachineType = 'IM' | 'BM';
export type ProductType = 'Preform' | 'Cap'; 

export interface DefectEntry {
  defectName: string;
  qty: number;
}

export interface ProductionItem {
  id: string;
  machine: string;
  itemName: string;
  customerName?: string;
  unitWeight: number;
  jobNo?: string;
  type: MachineType;
  productType?: ProductType; 
}

export interface AdminConfig {
  productionItems: ProductionItem[];
  breakdownCategories: string[];
  shiftTeams: string[];
  qaCategories?: string[];
  
  // NEW FIELD FOR SYNC
  lastModified?: number;
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
  
  achievedQty: number; 
  rejectionQty?: number; 
  startupQty?: number;   
  acceptedQty?: number;  

  breakdowns: Breakdown[];
  defects?: DefectEntry[];
}

export interface DayData {
  id: string;
  date: string;       
  machineType: MachineType;
  daySupervisor?: string;
  nightSupervisor?: string;
  rows: ProductionRow[];
  
  // NEW FIELD FOR SYNC
  lastModified?: number;
}

export enum AppTab {
  PRODUCTION = 'production',
  KPI = 'analytics',
  OEE = 'efficiency',
  QUALITY = 'quality',
  PLANNING = 'planning',
  DELIVERY = 'delivery',
  ADMIN = 'admin'
}