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

// ── Two-phase QR-scan → activate flow ───────────────────────────────────────

test('scanQr creates visit in SCANNED state', async () => {
  const { useCases } = createSut();
  const visit = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-scan-1',
    traceId: 'trace-scan-1',
    idempotencyKey: 'idem-scan-1',
  });

  assert.equal(visit.state, 'SCANNED');
  assert.equal(visit.departmentId, 'GM');
  assert.equal(visit.patientName, '');
});

test('scanQr is idempotent with same key', async () => {
  const { useCases } = createSut();
  const first = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-scan-2',
    traceId: 'trace-scan-2',
    idempotencyKey: 'idem-scan-2',
  });

  const second = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-scan-2',
    traceId: 'trace-scan-2',
    idempotencyKey: 'idem-scan-2',
  });

  assert.equal(first.id, second.id);
  assert.equal(first.tokenNumber, second.tokenNumber);
});

test('activateVisit transitions SCANNED to WAITING for normal symptoms', async () => {
  const { useCases } = createSut();
  const scanned = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-act-1',
    traceId: 'trace-act-1',
    idempotencyKey: 'idem-act-1',
  });

  const activated = await useCases.activateVisit({
    visitId: scanned.id,
    patientName: 'Alice',
    age: 35,
    symptoms: ['Cough'],
    traceId: 'trace-act-1',
  });

  assert.equal(activated.state, 'WAITING');
  assert.equal(activated.patientName, 'Alice');
  assert.equal(activated.age, 35);
  assert.equal(activated.priority, 'NORMAL');
  assert.equal(activated.version, scanned.version + 1);
});

test('activateVisit transitions SCANNED to URGENT for urgent symptoms', async () => {
  const { useCases } = createSut();
  const scanned = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-act-2',
    traceId: 'trace-act-2',
    idempotencyKey: 'idem-act-2',
  });

  const activated = await useCases.activateVisit({
    visitId: scanned.id,
    patientName: 'Bob',
    age: 55,
    symptoms: ['Chest Pain'],
    traceId: 'trace-act-2',
  });

  assert.equal(activated.state, 'URGENT');
  assert.equal(activated.priority, 'URGENT');
});

test('activateVisit rejects non-SCANNED visits', async () => {
  const { useCases } = createSut();
  const waiting = await useCases.checkIn({
    departmentId: 'GM',
    patientName: 'Carol',
    age: 40,
    symptoms: ['Cough'],
    restoreToken: 'restore-act-3',
    traceId: 'trace-act-3',
    idempotencyKey: 'idem-act-3',
  });

  // A WAITING visit cannot be activated again
  await assert.rejects(() =>
    useCases.activateVisit({
      visitId: waiting.id,
      patientName: 'Carol',
      age: 40,
      symptoms: ['Cough'],
      traceId: 'trace-act-3',
    }),
    { name: 'InvalidTransitionError' },
  );
});

test('activateVisit rejects unknown visitId', async () => {
  const { useCases } = createSut();
  await assert.rejects(() =>
    useCases.activateVisit({
      visitId: '00000000-0000-0000-0000-000000000000',
      patientName: 'Ghost',
      age: 30,
      symptoms: [],
      traceId: 'trace-act-4',
    }),
    { name: 'VisitNotFoundError' },
  );
});

test('full two-phase lifecycle: scanQr → activateVisit → call → complete', async () => {
  const { useCases } = createSut();

  const scanned = await useCases.scanQr({
    departmentId: 'GM',
    restoreToken: 'restore-lifecycle',
    traceId: 'trace-lifecycle',
    idempotencyKey: 'idem-lifecycle',
  });
  assert.equal(scanned.state, 'SCANNED');

  const activated = await useCases.activateVisit({
    visitId: scanned.id,
    patientName: 'Dan',
    age: 45,
    symptoms: ['Back pain'],
    traceId: 'trace-lifecycle',
  });
  assert.equal(activated.state, 'WAITING');

  const called = await useCases.transitionVisit({
    visitId: activated.id,
    toState: 'CALLED',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-lifecycle',
    expectedVersion: activated.version,
  });
  assert.equal(called.state, 'CALLED');

  const started = await useCases.transitionVisit({
    visitId: called.id,
    toState: 'IN_CONSULTATION',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-lifecycle',
    expectedVersion: called.version,
  });

  const completed = await useCases.transitionVisit({
    visitId: started.id,
    toState: 'COMPLETED',
    actor: { role: 'DOCTOR', userId: 'doc-1' },
    traceId: 'trace-lifecycle',
    expectedVersion: started.version,
    prescriptionText: 'Rest and hydrate',
  });
  assert.equal(completed.state, 'COMPLETED');
  assert.equal(completed.prescriptionText, 'Rest and hydrate');
});
