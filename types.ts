export enum PatientStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export const Department = {
  GENERAL: 'GENERAL',
  ENT: 'ENT',
  ORTHOPEDICS: 'ORTHOPEDICS',
  DENTAL: 'DENTAL',
  CARDIOLOGY: 'CARDIOLOGY',
} as const;

export type Department = string;

export type Gender = 'Male' | 'Female' ;

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender?: Gender;
  problemDescription?: string;
  symptoms: string[];
  isUrgent: boolean;
  department: Department;
  status: PatientStatus;
  tokenNumber: string;
  checkInTime: number;
  calledTime?: number;
  completedTime?: number;
  notes?: string;
  assignedDoctor?: string;
  version?: number;
}

export interface QueueStats {
  waiting: number;
  completed: number;
  avgWaitTime: number;
  urgentCount: number;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  code: string;
  color: string;
}