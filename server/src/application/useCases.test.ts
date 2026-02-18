import test from 'node:test';
import assert from 'node:assert/strict';
import { QueueUseCases } from './useCases.js';
import { InMemoryAuditRepository, InMemoryIdempotencyRepository, InMemoryQueuePublisher, InMemoryVisitRepository } from '../infrastructure/inMemory.js';

const createSut = () => {
  const visits = new InMemoryVisitRepository();
  const audits = new InMemoryAuditRepository();
  const idempotency = new InMemoryIdempotencyRepository();
  const publisher = new InMemoryQueuePublisher();
  const useCases = new QueueUseCases({
    visits,
    audits,
    idempotency,
    publisher,
    triageConfig: { urgentSymptoms: ['Chest Pain'] },
  });
  return { useCases };
};

test('check-in is idempotent with same key', async () => {
  const { useCases } = createSut();
  const first = await useCases.checkIn({
    departmentId: 'GM',
    patientName: 'A',
    age: 25,
    symptoms: ['Cough'],
    restoreToken: 'restore-1',
    traceId: 'trace-1',
    idempotencyKey: 'idem-1',
  });

  const second = await useCases.checkIn({
    departmentId: 'GM',
    patientName: 'A',
    age: 25,
    symptoms: ['Cough'],
    restoreToken: 'restore-1',
    traceId: 'trace-1',
    idempotencyKey: 'idem-1',
  });

  assert.equal(first.id, second.id);
  assert.equal(first.tokenNumber, second.tokenNumber);
});

test('visit completion sanitizes html', async () => {
  const { useCases } = createSut();
  const visit = await useCases.checkIn({
    departmentId: 'GM',
    patientName: 'B',
    age: 30,
    symptoms: ['Cough'],
    restoreToken: 'restore-2',
    traceId: 'trace-2',
    idempotencyKey: 'idem-2',
  });

  const called = await useCases.transitionVisit({
    visitId: visit.id,
    toState: 'CALLED',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-2',
    expectedVersion: visit.version,
  });

  const started = await useCases.transitionVisit({
    visitId: visit.id,
    toState: 'IN_CONSULTATION',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-2',
    expectedVersion: called.version,
  });

  const completed = await useCases.transitionVisit({
    visitId: visit.id,
    toState: 'COMPLETED',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-2',
    expectedVersion: started.version,
    prescriptionText: '<script>alert(1)</script>Take medicine',
  });

  assert.equal(completed.prescriptionText?.includes('<script>'), false);
  assert.equal(completed.state, 'COMPLETED');
});

test('version conflict is deterministic', async () => {
  const { useCases } = createSut();
  const visit = await useCases.checkIn({
    departmentId: 'GM',
    patientName: 'C',
    age: 29,
    symptoms: ['Cough'],
    restoreToken: 'restore-3',
    traceId: 'trace-3',
    idempotencyKey: 'idem-3',
  });

  await useCases.transitionVisit({
    visitId: visit.id,
    toState: 'CALLED',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-3',
    expectedVersion: visit.version,
  });

  await assert.rejects(() =>
    useCases.transitionVisit({
      visitId: visit.id,
      toState: 'IN_CONSULTATION',
      actor: { role: 'DOCTOR', userId: 'doc-1' },
      traceId: 'trace-3',
      expectedVersion: visit.version,
    }),
  );
});
