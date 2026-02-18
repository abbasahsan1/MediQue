export type Role = 'ADMIN' | 'DOCTOR' | 'RECEPTION';

export type VisitState =
  | 'SCANNED'
  | 'WAITING'
  | 'URGENT'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'NO_SHOW';

export type Priority = 'NORMAL' | 'URGENT';

export interface Visit {
  id: string;
  departmentId: string;
  tokenNumber: string;
  patientName: string;
  age: number;
  symptoms: string[];
  patientSessionId: string;
  restoreTokenHash: string;
  state: VisitState;
  priority: Priority;
  doctorId?: string;
  prescriptionText?: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  calledAt?: number;
  consultationStartedAt?: number;
  completedAt?: number;
  noShowAt?: number;
}

export interface Doctor {
  id: string;
  name: string;
  departmentIds: string[];
  availability: 'AVAILABLE' | 'PAUSED' | 'OFFLINE';
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  traceId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: 'VISIT' | 'DOCTOR' | 'DEPARTMENT';
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface QueueSnapshot {
  departmentId: string;
  nowServing?: string;
  visits: Visit[];
}
