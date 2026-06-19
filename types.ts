// --- ENUMS & BASIC TYPES ---
export type ShiftType = 'day' | 'night'; // කාල පරාසය (Time Slot)
export type MachineType = 'IM' | 'BM';

// 🟢 'Preform' | 'Cap' වෙනුවට 'string' ලෙස වෙනස් කළා. 
export type ProductType = string;

// --- QA & DEFECTS ---
export interface DefectEntry {
  defectName: string;
  qty: number;
}

// --- MASTER DATA (ADMIN) ---
export interface ProductionItem {
  id: string;
  machine: string;
  itemName: string;
  customerName?: string;
  unitWeight: number;
  jobNo?: string;
  type: MachineType;
  productType?: ProductType; // 'Preform' හෝ 'Cap' හඳුනා ගැනීමට
}

export interface AdminConfig {
  breakdownCategories: string[];
  shiftTeams: string[];
  qaCategories: string[];
  lastModified?: number;
}

// --- BREAKDOWNS ---
export interface Breakdown {
  id: string;
  category: string;
  description: string;
  startTime: string; 
  endTime: string;   
  machine?: string;
  date?: string;
}

export interface SubProduct {
  id: string;
  product: string;
  customerName?: string;
  jobNo?: string;
  acceptedQty?: number;
}


// --- PRODUCTION DATA ---
export interface ProductionRow {
  id: string;
  shift: ShiftType; // 'day' හෝ 'night'
  startTime: string;
  endTime: string;
  machine: string;
  product: string;
  productType?: ProductType; // [NEW] මෙන්න මේක අලුතින් එකතු කළා (Cap ද Preform ද කියා හඳුනාගන්න)
  customerName?: string; // 🟢 අලුතින් එක් කළා (Database එකට සේව් වීමට)
  jobNo?: string;
  unitWeight: number;
  qtyPerHour: number;
  cavities: number;
  cycleTime?: number;
  
  achievedQty: number;   
  acceptedQty?: number;

  subProducts?: SubProduct[];

  breakdowns: Breakdown[];
  defects?: DefectEntry[];

  // 🟢 [NEW] PLANNING DOWNTIME FIELDS (මෙමඟින් මුළු System එකේම OEE/Loss නිවැරදි කරයි)
  planningMins?: number;
  planningLossQty?: number;
}



export interface DayData {
  id: string;
  date: string;       
  machineType: MachineType;
  daySupervisor?: string;   // අදාළ දවසේ Day Shift භාර කණ්ඩායම/Supervisor
  nightSupervisor?: string; // අදාළ දවසේ Night Shift භාර කණ්ඩායම/Supervisor
  rows: ProductionRow[];
  
  lastModified?: number;
}

// --- LABOR PRODUCTIVITY & SUPERVISORS ---
// Labor Productivity Tab එක සඳහා අවශ්‍ය අලුත් Types

export interface DailyWorkerCount {
  [shiftTeamName: string]: number; // Dynamic Key: "Shift-A": 5, "Shift-B": 4
}

export interface LaborDataMap {
  [date: string]: DailyWorkerCount; // Date Key: "2026-01-01": { ... }
}

export interface SupervisorAllocation {
  day: string;   // e.g., "Shift-A"
  night: string; // e.g., "Shift-B"
}

// --- NAVIGATION ---
export enum AppTab {
  PRODUCTION = 'production',
  KPI = 'analytics',
  OEE = 'efficiency',
  QUALITY = 'quality',
  PLANNING = 'planning',
  DELIVERY = 'delivery',
  STORES = 'stores',
  ADMIN = 'admin'
}