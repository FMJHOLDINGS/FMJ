// src/KPITypes.ts

export interface ElectricityData {
  meterReading: number;
  unitsConsumed: number;
  cost?: number;
}

export interface WaterData {
  meterReading: number;
  units: number;
  cost?: number;
}

export interface AbsenteeismData {
  totalEmployees: number;
  present: number;
  absent: number;
  percentage: number;
}

// ✅ [NEW] Labor Data (සේවක සංඛ්‍යා)
// Structure: { "2024-02-01": { "Shift-A": 10, "Shift-B": 12 } }
export interface LaborData {
  [date: string]: {
    [shiftTeam: string]: number; 
  };
}

export interface KPIMonthlyDoc {
  id: string;      
  month: string;   
  
  electricity?: ElectricityData;
  water?: WaterData;
  absenteeism?: AbsenteeismData;
  rejections?: any;
  
  // ✅ [NEW] Labor Field එකතු කළා
  labor?: LaborData;

  lastModified?: number; 
}