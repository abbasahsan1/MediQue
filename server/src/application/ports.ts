import type { AuditEvent, QueueSnapshot, Visit } from '../domain/models.js';

export interface VisitRepository {
  create(visit: Visit): Promise<void>;
  getById(id: string): Promise<Visit | undefined>;
  update(visit: Visit, expectedVersion: number): Promise<void>;
  listByDepartment(departmentId: string): Promise<Visit[]>;
  nextTokenNumber(departmentId: string, now: number): Promise<string>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  list(limit?: number): Promise<AuditEvent[]>;
}

export interface IdempotencyRepository {
  get(scope: string, key: string): Promise<string | undefined>;
  put(scope: string, key: string, responseJson: string): Promise<void>;
}

export interface QueueEventPublisher {
  publishQueueUpdated(snapshot: QueueSnapshot): Promise<void>;
}
