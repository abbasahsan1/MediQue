# MediQue Production Readiness Audit — Backend, Architecture, DevOps

## Phase 1: Planning

Audit strategy executed:
1. Trace server runtime composition from `server/src/index.ts` into `presentation/http.ts`, `application/useCases.ts`, `domain/*`, and `infrastructure/*`.
2. Validate Clean Architecture dependency direction and isolate boundary leaks.
3. Stress-review state transitions, optimistic concurrency, idempotency behavior, and in-memory persistence assumptions.
4. Review auth, token signing, endpoint exposure, and error taxonomy against OWASP/API hardening.
5. Review Docker and compose operational hardening for 24h-to-production context.

## Phase 2: Deep Dive Trace Notes

- Traced patient check-in: `PatientForm` -> `services/queueService.ts` -> `POST /api/v1/patient/checkin` -> `QueueUseCases.checkIn` -> `InMemoryVisitRepository`.
- Traced doctor transition: frontend `updateStatus` -> `POST /api/v1/doctor/visits/:id/*` -> `QueueUseCases.transitionVisit` -> `assertTransition` + optimistic version update.
- Traced live queue updates: `GET /api/v1/events/departments/:departmentId` -> in-memory SSE publisher fanout.
- Traced token issuance chain: frontend calls `/auth/dev-token` then privileged admin endpoints using that token.

## Architectural Integrity Verdict

- **Pass (narrow): Domain isolation is currently clean.** `server/src/domain/*` has no direct imports of infrastructure or presentation layers.
- **Fail (system-level): business and transport concerns are mixed in app/service boundaries.** Error semantics, concurrency, and infrastructure strategy are not production-grade.

---

## Findings

### 1) Critical: Fail-open secrets in authentication layer
- **Severity:** Critical
- **Location:** `server/src/infrastructure/security.ts:12-13`
- **Violation:** Hardcoded fallback secrets (`dev-secret-change-me`) violate OWASP ASVS V2 and secure configuration principles. If env injection fails, auth remains operational with predictable secrets.
- **Fix:** Fail fast when secrets are missing and enforce minimum entropy.

```ts
const jwtSecret = process.env.JWT_SECRET;
const checkinSecret = process.env.CHECKIN_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET missing or too weak');
}
if (!checkinSecret || checkinSecret.length < 32) {
  throw new Error('CHECKIN_SECRET missing or too weak');
}
```

### 2) High: Token verification can throw and return 500 (DoS vector)
- **Severity:** High
- **Location:** `server/src/infrastructure/security.ts:50`
- **Violation:** `crypto.timingSafeEqual` throws if buffer lengths differ. A malformed signature can trigger unhandled exception path (availability risk, OWASP A05/A09).
- **Fix:** Validate length before comparison.

```ts
const sigBuf = Buffer.from(signature, 'utf8');
const expBuf = Buffer.from(expected, 'utf8');
if (sigBuf.length !== expBuf.length) return false;
return crypto.timingSafeEqual(sigBuf, expBuf);
```

### 3) Critical: Unprotected dev token mint endpoint in production surface
- **Severity:** Critical
- **Location:** `server/src/presentation/http.ts:233`
- **Violation:** `POST /api/v1/auth/dev-token` mints staff JWTs without prior auth. This is complete privilege escalation and breaks least privilege.
- **Fix:** Remove in production builds or gate behind strict env and IP allowlist.

```ts
if (process.env.NODE_ENV !== 'development') {
  app.post('/api/v1/auth/dev-token', (_req, res) => res.status(404).end());
}
```

### 4) High: Queue SSE endpoint leaks operational data without auth
- **Severity:** High
- **Location:** `server/src/presentation/http.ts:195`
- **Violation:** Public SSE stream exposes queue activity by department. This is sensitive operational metadata and violates access control design.
- **Fix:** Require staff auth and role checks before subscribing.

```ts
app.get('/api/v1/events/departments/:departmentId', authMiddleware, requireRole(['ADMIN', 'DOCTOR', 'RECEPTION']), ...)
```

### 5) High: State machine throws generic errors; no typed domain failure model
- **Severity:** High
- **Location:** `server/src/domain/stateMachine.ts:19`, `server/src/application/useCases.ts:144`
- **Violation:** Domain rejects invalid transitions with generic `Error`, then HTTP layer maps broad failures to `409`. This leaks internal messages and blocks deterministic API contracts.
- **Fix:** Introduce typed domain errors and explicit HTTP mapping.

```ts
export class InvalidTransitionError extends Error {
  constructor(from: VisitState, to: VisitState) {
    super(`Invalid transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}
```

### 6) Critical: Idempotency and check-in are non-atomic (double-create risk)
- **Severity:** Critical
- **Location:** `server/src/application/useCases.ts:89-90,115`
- **Violation:** Read idempotency key -> create visit -> write idempotency key is a race window. Concurrent identical requests can create duplicate visits.
- **Fix:** Use atomic reservation (`SETNX`/transaction) before creation, then finalize.

**Architectural change:**
- Add `IdempotencyRepository.reserve(scope,key): Promise<boolean>`.
- In Redis: `SET key value NX EX ttl`.
- Only winner proceeds to create visit; losers fetch stored response.

### 7) High: In-memory token sequence and version checks are process-local only
- **Severity:** High
- **Location:** `server/src/infrastructure/inMemory.ts:34,45`
- **Violation:** Version conflict and token generation are unsafe across multi-instance deployments; two pods will generate colliding token sequences and inconsistent versions.
- **Fix:** Move to DB-backed repository with transactional guarantees.

**Concrete design:**
- `VisitRepository` stays in `application/ports.ts`.
- Implement `PostgresVisitRepository` with `SELECT ... FOR UPDATE` and unique `(department_id, day, seq)` constraints.
- Use DB-level optimistic concurrency: `WHERE id = $1 AND version = $2`.

### 8) Critical: Primary persistence is volatile; restart = data loss
- **Severity:** Critical
- **Location:** `server/src/index.ts:5`, `server/src/infrastructure/inMemory.ts`
- **Violation:** All critical patient flow data is memory-only. Container restart or deployment wipes queue, audit, idempotency. This is unacceptable for healthcare workflow continuity.
- **Fix:** Replace in-memory adapters with persistent implementations.

**Minimum production target:**
- Postgres for `visits` and `audit_events`.
- Redis for idempotency keys + SSE fanout channels.
- Boot migration check before server start.

### 9) Medium: API error mapping is too coarse and semantically incorrect
- **Severity:** Medium
- **Location:** `server/src/presentation/http.ts:127,148,170,191`
- **Violation:** All transition failures return `409`, including not-found, auth-state mismatch, malformed transitions, and internal errors. Violates predictable REST semantics.
- **Fix:** Map typed errors to status: `404`, `409`, `422`, `500`.

```ts
if (error instanceof NotFoundError) return res.status(404).json(...);
if (error instanceof InvalidTransitionError) return res.status(422).json(...);
if (error instanceof VersionConflictError) return res.status(409).json(...);
return res.status(500).json({ error: 'Internal server error' });
```

### 10) High: Docker runtime runs as root and installs at runtime stage
- **Severity:** High
- **Location:** `server/Dockerfile:12,16`
- **Violation:** Runtime container defaults to root and executes package install in final image. Violates least privilege and increases attack surface.
- **Fix:** Create non-root user, copy built artifact + production node_modules from builder only.

```dockerfile
FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER app
CMD ["node", "dist/index.js"]
```

### 11) High: Compose loads `.env.example` as real secrets source
- **Severity:** High
- **Location:** `docker-compose.yml:6-7`
- **Violation:** Example file is not a secret source. This encourages placeholder secrets in deployed environments.
- **Fix:** Use `.env` for local only and secret manager for production.

**Concrete change:**
- Replace with `env_file: ./server/.env` for local dev.
- In production, inject via orchestrator secrets (Kubernetes secrets, ECS task secrets, etc.).

### 12) Medium: AI integration lacks timeout/retry/circuit-breaker and injection controls
- **Severity:** Medium
- **Location:** `services/geminiService.ts:20,34-35`
- **Violation:** External call has no timeout, no retry policy, and no prompt hardening. Operationally brittle and vulnerable to prompt pollution by untrusted input structures.
- **Fix:** Add bounded retries with jitter, timeout via `AbortController`, and structured prompt guardrails.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 4000);
try {
  // invoke model with retry wrapper and strict response schema
} finally {
  clearTimeout(timeout);
}
```

---

## Required Remediation Order (24h Go-Live)

1. Remove/gate `/auth/dev-token`, enforce strong secrets, protect SSE endpoint.
2. Replace in-memory persistence for visits/idempotency before release.
3. Implement atomic idempotency and transactional token sequencing.
4. Introduce typed domain errors with deterministic HTTP status mapping.
5. Harden Docker runtime (non-root, no runtime package install).

## Final Go/No-Go

**No-Go for production in current state.**

Core risks include privilege escalation, volatile patient data, and race windows that can duplicate/lose queue state under realistic load or deployment events.
