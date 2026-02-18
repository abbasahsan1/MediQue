import crypto from 'node:crypto';
import { assertTransition } from '../domain/stateMachine.js';
import { classifyPriority, type TriageRuleConfig } from '../domain/triage.js';
import type { AuditEvent, QueueSnapshot, Role, Visit, VisitState } from '../domain/models.js';
import type {
  AuditRepository,
  IdempotencyRepository,
  QueueEventPublisher,
  VisitRepository,
} from './ports.js';

export interface UseCaseDeps {
  visits: VisitRepository;
  audits: AuditRepository;
  idempotency: IdempotencyRepository;
  publisher: QueueEventPublisher;
  triageConfig: TriageRuleConfig;
}

export interface Actor {
  userId: string;
  role: Role;
}

const now = () => Date.now();

const hash = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const makeAudit = (
  actor: Actor,
  traceId: string,
  action: string,
  entityType: AuditEvent['entityType'],
  entityId: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): AuditEvent => ({
  id: crypto.randomUUID(),
  timestamp: now(),
  traceId,
  actorId: actor.userId,
  actorRole: actor.role,
  action,
  entityType,
  entityId,
  before,
  after,
});

const queueSnapshot = async (repo: VisitRepository, departmentId: string): Promise<QueueSnapshot> => {
  const visits = await repo.listByDepartment(departmentId);
  const sorted = visits
    .slice()
    .sort((a, b) => {
      const stateWeight = (state: VisitState): number => {
        if (state === 'CALLED') return 4;
        if (state === 'IN_CONSULTATION') return 3;
        if (state === 'URGENT') return 2;
        if (state === 'WAITING') return 1;
        return 0;
      };
      const byState = stateWeight(b.state) - stateWeight(a.state);
      if (byState !== 0) return byState;
      if (a.priority !== b.priority) return a.priority === 'URGENT' ? -1 : 1;
      return a.createdAt - b.createdAt;
    });

  const active = sorted.find((visit) => visit.state === 'CALLED' || visit.state === 'IN_CONSULTATION');
  return {
    departmentId,
    nowServing: active?.tokenNumber,
    visits: sorted,
  };
};

export class QueueUseCases {
  constructor(private readonly deps: UseCaseDeps) {}

  async checkIn(input: {
    departmentId: string;
    patientName: string;
    age: number;
    symptoms: string[];
    restoreToken: string;
    traceId: string;
    idempotencyKey: string;
  }): Promise<Visit> {
    const scope = `checkin:${input.departmentId}`;
    const existing = await this.deps.idempotency.get(scope, input.idempotencyKey);
    if (existing) {
      return JSON.parse(existing) as Visit;
    }

    const createdAt = now();
    const tokenNumber = await this.deps.visits.nextTokenNumber(input.departmentId, createdAt);
    const priority = classifyPriority(input.symptoms, this.deps.triageConfig);
    const initialState: VisitState = priority === 'URGENT' ? 'URGENT' : 'WAITING';

    const visit: Visit = {
      id: crypto.randomUUID(),
      departmentId: input.departmentId,
      tokenNumber,
      patientName: input.patientName,
      age: input.age,
      symptoms: input.symptoms,
      patientSessionId: crypto.randomUUID(),
      restoreTokenHash: hash(input.restoreToken),
      state: initialState,
      priority,
      version: 1,
      createdAt,
      updatedAt: createdAt,
    };

    await this.deps.visits.create(visit);
    await this.deps.audits.append(
      makeAudit(
        { userId: 'patient', role: 'RECEPTION' },
        input.traceId,
        'VISIT_CHECKED_IN',
        'VISIT',
        visit.id,
        undefined,
        { state: visit.state, tokenNumber: visit.tokenNumber, priority: visit.priority },
      ),
    );

    const snapshot = await queueSnapshot(this.deps.visits, input.departmentId);
    await this.deps.publisher.publishQueueUpdated(snapshot);
    await this.deps.idempotency.put(scope, input.idempotencyKey, JSON.stringify(visit));
    return visit;
  }

  async transitionVisit(input: {
    visitId: string;
    toState: VisitState;
    actor: Actor;
    traceId: string;
    expectedVersion: number;
    prescriptionText?: string;
  }): Promise<Visit> {
    const visit = await this.deps.visits.getById(input.visitId);
    if (!visit) {
      throw new Error('Visit not found');
    }
    const before = { ...visit };
    assertTransition(visit.state, input.toState);

    const current = now();
    const next: Visit = {
      ...visit,
      state: input.toState,
      version: visit.version + 1,
      updatedAt: current,
      doctorId: input.actor.role === 'DOCTOR' ? input.actor.userId : visit.doctorId,
    };

    if (input.toState === 'CALLED') next.calledAt = current;
    if (input.toState === 'IN_CONSULTATION') next.consultationStartedAt = current;
    if (input.toState === 'NO_SHOW') next.noShowAt = current;
    if (input.toState === 'COMPLETED') {
      next.completedAt = current;
      next.prescriptionText = sanitizePrescription(input.prescriptionText ?? '');
    }

    await this.deps.visits.update(next, input.expectedVersion);
    await this.deps.audits.append(
      makeAudit(
        input.actor,
        input.traceId,
        `VISIT_${input.toState}`,
        'VISIT',
        next.id,
        before as unknown as Record<string, unknown>,
        next as unknown as Record<string, unknown>,
      ),
    );
    const snapshot = await queueSnapshot(this.deps.visits, next.departmentId);
    await this.deps.publisher.publishQueueUpdated(snapshot);
    return next;
  }

  async getVisit(visitId: string): Promise<Visit | undefined> {
    return this.deps.visits.getById(visitId);
  }

  async getDepartmentQueue(departmentId: string): Promise<QueueSnapshot> {
    return queueSnapshot(this.deps.visits, departmentId);
  }
}

const sanitizePrescription = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').trim();
};
