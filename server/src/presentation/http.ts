import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'node:crypto';
import type { Request } from 'express';
import { z } from 'zod';
import type { QueueUseCases } from '../application/useCases.js';
import type { InMemoryAuditRepository, InMemoryQueuePublisher } from '../infrastructure/inMemory.js';
import { InvalidTransitionError, VersionConflictError, VisitNotFoundError } from '../domain/errors.js';
import {
  authMiddleware,
  correlationIdMiddleware,
  requireRole,
  rateLimiter,
  signCheckinToken,
  signStaffToken,
  verifyCheckinToken,
} from '../infrastructure/security.js';

interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  color: string;
  isActive: boolean;
}

const DEPARTMENT_REGISTRY: DepartmentRecord[] = [
  { id: 'GENERAL', name: 'General Medicine', code: 'GM', color: 'bg-dept-general', isActive: true },
  { id: 'ENT', name: 'ENT (Ear, Nose, Throat)', code: 'EN', color: 'bg-dept-ent', isActive: true },
  { id: 'ORTHOPEDICS', name: 'Orthopedics', code: 'OR', color: 'bg-dept-orthopedics', isActive: true },
  { id: 'DENTAL', name: 'Dental Care', code: 'DE', color: 'bg-dept-dental', isActive: true },
  { id: 'CARDIOLOGY', name: 'Cardiology', code: 'CA', color: 'bg-dept-cardiology', isActive: true },
];

const checkInSchema = z.object({
  departmentId: z.string().min(2),
  patientName: z.string().min(2).max(120),
  age: z.number().int().min(0).max(120),
  symptoms: z.array(z.string().min(1)).max(20),
  signedCheckinToken: z.string().min(20),
  restoreToken: z.string().min(8),
  idempotencyKey: z.string().min(8).max(120),
});

/** Phase-1: patient scans QR code — creates a SCANNED visit */
const qrScanSchema = z.object({
  departmentId: z.string().min(2),
  signedCheckinToken: z.string().min(20),
  restoreToken: z.string().min(8),
  idempotencyKey: z.string().min(8).max(120),
});

/** Phase-2: patient submits validated intake form — transitions SCANNED → WAITING/URGENT */
const activateSchema = z.object({
  visitId: z.string().uuid(),
  patientName: z.string().min(2).max(120),
  age: z.number().int().min(0).max(120),
  symptoms: z.array(z.string().min(1)).max(20),
});

const transitionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  prescriptionText: z.string().max(10_000).optional(),
});

export const createHttpApp = (
  useCases: QueueUseCases,
  audits: InMemoryAuditRepository,
  publisher: InMemoryQueuePublisher,
  resetState?: () => void,
) => {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: '64kb' }));
  app.use(correlationIdMiddleware);
  app.use(rateLimiter());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gravity-server', timestamp: Date.now() });
  });

  app.post('/api/v1/patient/checkin', async (req: Request, res) => {
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;
    const department = DEPARTMENT_REGISTRY.find((record) => record.id === payload.departmentId);
    if (!department || !department.isActive) {
      res.status(409).json({ error: 'Department unavailable for check-in' });
      return;
    }
    const validToken = verifyCheckinToken(payload.signedCheckinToken, payload.departmentId);
    if (!validToken) {
      res.status(401).json({ error: 'Invalid or expired check-in token' });
      return;
    }

    try {
      const visit = await useCases.checkIn({
        departmentId: payload.departmentId,
        patientName: payload.patientName,
        age: payload.age,
        symptoms: payload.symptoms,
        restoreToken: payload.restoreToken,
        idempotencyKey: payload.idempotencyKey,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.status(201).json(visit);
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Check-in failed' });
    }
  });

  app.get('/api/v1/patient/visits/:visitId', async (req, res) => {
    const visit = await useCases.getVisit(req.params.visitId);
    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }
    res.json(visit);
  });

  /**
   * Phase-1 endpoint: called immediately when a patient scans a QR code.
   * Validates the signed check-in token and creates a visit in SCANNED state.
   * The stream connection for this visit is established at this point —
   * exactly once — before any patient data is collected on the client.
   */
  app.post('/api/v1/patient/qr-scan', async (req: Request, res) => {
    const parsed = qrScanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
      return;
    }

    const payload = parsed.data;
    const department = DEPARTMENT_REGISTRY.find((record) => record.id === payload.departmentId);
    if (!department || !department.isActive) {
      res.status(409).json({ error: 'Department unavailable for check-in' });
      return;
    }
    const validToken = verifyCheckinToken(payload.signedCheckinToken, payload.departmentId);
    if (!validToken) {
      res.status(401).json({ error: 'Invalid or expired check-in token' });
      return;
    }

    try {
      const visit = await useCases.scanQr({
        departmentId: payload.departmentId,
        restoreToken: payload.restoreToken,
        idempotencyKey: payload.idempotencyKey,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.status(201).json(visit);
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'QR scan failed' });
    }
  });

  /**
   * Phase-2 endpoint: called exclusively after the patient has fully completed
   * and validated the intake form on the client side.
   * Transitions the existing SCANNED visit to WAITING (or URGENT) so the
   * payload is only committed server-side once client validation passes.
   */
  app.post('/api/v1/patient/activate', async (req: Request, res) => {
    const parsed = activateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
      return;
    }

    try {
      const visit = await useCases.activateVisit({
        visitId: parsed.data.visitId,
        patientName: parsed.data.patientName,
        age: parsed.data.age,
        symptoms: parsed.data.symptoms,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.status(200).json(visit);
    } catch (error) {
      if (error instanceof VisitNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof InvalidTransitionError) {
        res.status(422).json({ error: error.message });
        return;
      }
      res.status(409).json({ error: error instanceof Error ? error.message : 'Activation failed' });
    }
  });

  app.get('/api/v1/departments/:departmentId/queue', authMiddleware, requireRole(['ADMIN', 'DOCTOR', 'RECEPTION']), async (req, res) => {
    const departmentId = String(req.params.departmentId);
    const snapshot = await useCases.getDepartmentQueue(departmentId);
    res.json(snapshot);
  });

  app.post('/api/v1/doctor/visits/:visitId/call', authMiddleware, requireRole(['DOCTOR']), async (req: Request, res) => {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success || !req.auth) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    try {
      const result = await useCases.transitionVisit({
        visitId: String(req.params.visitId),
        toState: 'CALLED',
        actor: { role: req.auth.role, userId: req.auth.sub },
        expectedVersion: parsed.data.expectedVersion,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.json(result);
    } catch (error) {
      if (error instanceof VisitNotFoundError) { res.status(404).json({ error: error.message }); return; }
      if (error instanceof InvalidTransitionError) { res.status(422).json({ error: error.message }); return; }
      if (error instanceof VersionConflictError) { res.status(409).json({ error: error.message }); return; }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/v1/doctor/visits/:visitId/start', authMiddleware, requireRole(['DOCTOR']), async (req: Request, res) => {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success || !req.auth) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    try {
      const result = await useCases.transitionVisit({
        visitId: String(req.params.visitId),
        toState: 'IN_CONSULTATION',
        actor: { role: req.auth.role, userId: req.auth.sub },
        expectedVersion: parsed.data.expectedVersion,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.json(result);
    } catch (error) {
      if (error instanceof VisitNotFoundError) { res.status(404).json({ error: error.message }); return; }
      if (error instanceof InvalidTransitionError) { res.status(422).json({ error: error.message }); return; }
      if (error instanceof VersionConflictError) { res.status(409).json({ error: error.message }); return; }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/v1/doctor/visits/:visitId/complete', authMiddleware, requireRole(['DOCTOR']), async (req: Request, res) => {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success || !req.auth) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    try {
      const result = await useCases.transitionVisit({
        visitId: String(req.params.visitId),
        toState: 'COMPLETED',
        actor: { role: req.auth.role, userId: req.auth.sub },
        expectedVersion: parsed.data.expectedVersion,
        traceId: req.traceId ?? crypto.randomUUID(),
        prescriptionText: parsed.data.prescriptionText,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof VisitNotFoundError) { res.status(404).json({ error: error.message }); return; }
      if (error instanceof InvalidTransitionError) { res.status(422).json({ error: error.message }); return; }
      if (error instanceof VersionConflictError) { res.status(409).json({ error: error.message }); return; }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/v1/doctor/visits/:visitId/no-show', authMiddleware, requireRole(['DOCTOR']), async (req: Request, res) => {
    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success || !req.auth) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    try {
      const result = await useCases.transitionVisit({
        visitId: String(req.params.visitId),
        toState: 'NO_SHOW',
        actor: { role: req.auth.role, userId: req.auth.sub },
        expectedVersion: parsed.data.expectedVersion,
        traceId: req.traceId ?? crypto.randomUUID(),
      });
      res.json(result);
    } catch (error) {
      if (error instanceof VisitNotFoundError) { res.status(404).json({ error: error.message }); return; }
      if (error instanceof InvalidTransitionError) { res.status(422).json({ error: error.message }); return; }
      if (error instanceof VersionConflictError) { res.status(409).json({ error: error.message }); return; }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/v1/events/departments/:departmentId', authMiddleware, requireRole(['ADMIN', 'DOCTOR', 'RECEPTION']), (req, res) => {
    const departmentId = String(req.params.departmentId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    publisher.subscribe(departmentId, res);
    res.write(`event: connected\ndata: ${JSON.stringify({ departmentId, ts: Date.now() })}\n\n`);

    req.on('close', () => {
      publisher.unsubscribe(departmentId, res);
    });
  });

  app.get('/api/v1/admin/audit', authMiddleware, requireRole(['ADMIN']), async (_req, res) => {
    const records = await audits.list(500);
    res.json(records);
  });

  app.post('/api/v1/admin/checkin-token', authMiddleware, requireRole(['ADMIN']), (req, res) => {
    const schema = z.object({ departmentId: z.string(), expiresInSec: z.number().int().min(60).max(3600) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    const department = DEPARTMENT_REGISTRY.find((record) => record.id === parsed.data.departmentId);
    if (!department || !department.isActive) {
      res.status(409).json({ error: 'Department unavailable for check-in' });
      return;
    }
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + parsed.data.expiresInSec * 1000;
    const token = signCheckinToken(parsed.data.departmentId, expiresAt, nonce);
    res.json({ token, expiresAt, departmentId: parsed.data.departmentId });
  });

  // NOTE: This endpoint mints privileged staff JWTs without prior authentication.
  // It MUST NOT be exposed in production. Replace with real auth (OAuth/SSO) before go-live.
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/v1/auth/dev-token', (req, res) => {
      const schema = z.object({ userId: z.string().min(2), role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTION']) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }
      const token = signStaffToken({ sub: parsed.data.userId, role: parsed.data.role });
      res.json({ token });
    });
  } else {
    app.post('/api/v1/auth/dev-token', (_req, res) => res.status(404).end());
  }

  app.post('/api/v1/admin/reset', authMiddleware, requireRole(['ADMIN']), (_req, res) => {
    if (resetState) {
      resetState();
    }
    res.json({ ok: true });
  });

  app.get('/api/v1/admin/departments', authMiddleware, requireRole(['ADMIN', 'RECEPTION', 'DOCTOR']), (_req, res) => {
    res.json(DEPARTMENT_REGISTRY);
  });

  app.post('/api/v1/admin/departments', authMiddleware, requireRole(['ADMIN']), (req, res) => {
    const schema = z.object({
      id: z.string().min(2).max(24),
      name: z.string().min(2).max(120),
      code: z.string().min(2).max(5),
      color: z.string().min(2).max(64).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const id = parsed.data.id.trim().toUpperCase();
    const code = parsed.data.code.trim().toUpperCase();
    const exists = DEPARTMENT_REGISTRY.some((department) => department.id === id || department.code === code);
    if (exists) {
      res.status(409).json({ error: 'Department with this ID or code already exists' });
      return;
    }

    const department: DepartmentRecord = {
      id,
      name: parsed.data.name.trim(),
      code,
      color: parsed.data.color ?? 'bg-dept-general',
      isActive: true,
    };
    DEPARTMENT_REGISTRY.push(department);
    res.status(201).json(department);
  });

  app.put('/api/v1/admin/departments/:departmentId', authMiddleware, requireRole(['ADMIN']), (req, res) => {
    const schema = z.object({
      isActive: z.boolean().optional(),
      name: z.string().min(2).max(120).optional(),
      code: z.string().min(2).max(5).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const department = DEPARTMENT_REGISTRY.find((record) => record.id === String(req.params.departmentId));
    if (!department) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }

    if (typeof parsed.data.isActive === 'boolean') department.isActive = parsed.data.isActive;
    if (parsed.data.name) department.name = parsed.data.name;
    if (parsed.data.code) department.code = parsed.data.code.toUpperCase();
    res.json(department);
  });

  return app;
};
