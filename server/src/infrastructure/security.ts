import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '../domain/models.js';

export interface AuthClaims {
  sub: string;
  role: Role;
  departmentIds?: string[];
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const checkinSecret = process.env.CHECKIN_SECRET ?? 'dev-checkin-secret-change-me';

export const signStaffToken = (claims: AuthClaims): string => {
  return jwt.sign(claims, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
};

export const verifyStaffToken = (token: string): AuthClaims => {
  return jwt.verify(token, jwtSecret) as AuthClaims;
};

export const signCheckinToken = (departmentId: string, expiresAt: number, nonce: string): string => {
  const payload = `${departmentId}.${expiresAt}.${nonce}`;
  const signature = crypto.createHmac('sha256', checkinSecret).update(payload).digest('hex');
  return `${payload}.${signature}`;
};

export const verifyCheckinToken = (token: string, departmentId: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 4) {
    return false;
  }

  const [tokenDepartmentId, expiresAtRaw, nonce, signature] = parts;
  if (tokenDepartmentId !== departmentId) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', checkinSecret)
    .update(`${tokenDepartmentId}.${expiresAt}.${nonce}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = req.header('x-correlation-id');
  const traceId = incoming || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader('x-correlation-id', traceId);
  next();
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const raw = req.header('authorization');
  if (!raw?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    req.auth = verifyStaffToken(raw.replace('Bearer ', ''));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
};

export const rateLimiter = () => {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 120;

  return ((req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health' || req.path.startsWith('/api/v1/events/')) {
      next();
      return;
    }

    const key = req.ip || 'unknown';
    const current = buckets.get(key) ?? { count: 0, windowStart: Date.now() };
    const elapsed = Date.now() - current.windowStart;

    if (elapsed > WINDOW_MS) {
      current.count = 0;
      current.windowStart = Date.now();
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > MAX_REQUESTS) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }
    next();
  }) as RequestHandler;
};
