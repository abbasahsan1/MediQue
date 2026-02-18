import type { Response } from 'express';
import type { AuditEvent, QueueSnapshot, Visit } from '../domain/models.js';
import type {
  AuditRepository,
  IdempotencyRepository,
  QueueEventPublisher,
  VisitRepository,
} from '../application/ports.js';
import { VersionConflictError, VisitNotFoundError } from '../domain/errors.js';

const dayKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
};

export class InMemoryVisitRepository implements VisitRepository {
  private readonly visits = new Map<string, Visit>();
  private readonly sequenceByDeptAndDay = new Map<string, number>();

  async create(visit: Visit): Promise<void> {
    this.visits.set(visit.id, visit);
  }

  async getById(id: string): Promise<Visit | undefined> {
    const visit = this.visits.get(id);
    return visit ? { ...visit } : undefined;
  }

  async update(visit: Visit, expectedVersion: number): Promise<void> {
    const current = this.visits.get(visit.id);
    if (!current) {
      throw new VisitNotFoundError(visit.id);
    }
    if (current.version !== expectedVersion) {
      throw new VersionConflictError();
    }
    this.visits.set(visit.id, { ...visit });
  }

  async listByDepartment(departmentId: string): Promise<Visit[]> {
    return [...this.visits.values()]
      .filter((visit) => visit.departmentId === departmentId)
      .map((visit) => ({ ...visit }));
  }

  async nextTokenNumber(departmentId: string, now: number): Promise<string> {
    const key = `${departmentId}:${dayKey(now)}`;
    const current = this.sequenceByDeptAndDay.get(key) ?? 100;
    const next = current + 1;
    this.sequenceByDeptAndDay.set(key, next);
    return `${departmentId}-${next}`;
  }

  clear(): void {
    this.visits.clear();
    this.sequenceByDeptAndDay.clear();
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async list(limit = 100): Promise<AuditEvent[]> {
    return this.events.slice(-limit);
  }

  clear(): void {
    this.events.length = 0;
  }
}

export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly entries = new Map<string, string>();

  async get(scope: string, key: string): Promise<string | undefined> {
    return this.entries.get(`${scope}:${key}`);
  }

  async put(scope: string, key: string, responseJson: string): Promise<void> {
    this.entries.set(`${scope}:${key}`, responseJson);
  }

  clear(): void {
    this.entries.clear();
  }
}

export class InMemoryQueuePublisher implements QueueEventPublisher {
  private readonly listeners = new Map<string, Set<Response>>();

  subscribe(departmentId: string, res: Response): void {
    const set = this.listeners.get(departmentId) ?? new Set<Response>();
    set.add(res);
    this.listeners.set(departmentId, set);
  }

  unsubscribe(departmentId: string, res: Response): void {
    const set = this.listeners.get(departmentId);
    if (!set) {
      return;
    }
    set.delete(res);
    if (set.size === 0) {
      this.listeners.delete(departmentId);
    }
  }

  async publishQueueUpdated(snapshot: QueueSnapshot): Promise<void> {
    const set = this.listeners.get(snapshot.departmentId);
    if (!set || set.size === 0) {
      return;
    }

    const payload = `event: queue.updated\ndata: ${JSON.stringify(snapshot)}\n\n`;
    for (const response of set) {
      response.write(payload);
    }
  }
}
