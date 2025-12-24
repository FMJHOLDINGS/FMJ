
export type ShiftType = 'day' | 'night';
export type MachineType = 'IM' | 'BM';

export interface MachineItemConfig {
  id: string;
  machineName: string; // e.g., M01
  itemName: string;
  customerName: string;
  unitWeight: number;
}

export interface AdminConfig {
  machineMappings: MachineItemConfig[];
}

export interface Breakdown {
  id: string;
  category: string;
  description: string;
  startTime: string;
  endTime: string;
  machine?: string; // Added for log view
  date?: string;    // Added for log view
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
  cycleTime: number;
  achievedQty: number;
  breakdowns: Breakdown[];
}

export interface DayData {
  id: string; // YYYY-MM-DD_TYPE
  date: string;
  machineType: MachineType;
  rows: ProductionRow[];
}

export enum AppTab {
  PRODUCTION = 'production',
  KPI = 'analytics',
  OEE = 'efficiency',
  ADMIN = 'admin'
}
