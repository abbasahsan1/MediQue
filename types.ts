export enum PatientStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum Department {
  GENERAL = 'GENERAL',
  ENT = 'ENT',
  ORTHOPEDICS = 'ORTHOPEDICS',
  DENTAL = 'DENTAL',
  CARDIOLOGY = 'CARDIOLOGY',
}

export interface Patient {
  id: string;
  name: string;
  age: number;
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
  avgWaitTime: number; // in minutes
  urgentCount: number;
}

export interface DepartmentConfig {
  id: Department;
  name: string;
  code: string;
  color: string;
}