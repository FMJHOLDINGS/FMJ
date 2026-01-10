export type ShiftType = 'day' | 'night';
export type MachineType = 'IM' | 'BM';

export interface ProductionItem {
  id: string;
  machine: string;
  itemName: string;
  customerName: string;
  unitWeight: number;
  jobNo: string;
  type: MachineType;
}

export interface AdminConfig {
  productionItems: ProductionItem[];
  breakdownCategories: string[];
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
  achievedQty: number; // Gross Total
  rejectionQty?: number; // NEW
  startupQty?: number;   // NEW
  acceptedQty?: number;  // NEW (Good Products)

  breakdowns: Breakdown[];
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
  ADMIN = 'admin'
}