import type { AuthClaims } from '../infrastructure/security.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
      traceId?: string;
    }
  }
}

export {};
