# MediQue Hospital Queue Management System

## 1) Scope and Objectives

MediQue is a BYOD hospital queue management platform for patients, doctors, reception, and admins.

Hard constraints:
- Regulated-healthcare posture (HIPAA-like controls).
- Real-time queue operations with deterministic state transitions.
- Multi-department, multi-doctor, horizontally scalable architecture.
- Strict Clean/Hexagonal architecture with dependency inversion.

Non-goals:
- Native mobile app.
- Anonymous unrestricted queue access without signed check-in links.

## 2) Architecture Style

Pattern: **Hexagonal/Clean Architecture + DDD**

Layers:
1. Presentation layer (`HTTP controllers`, `WebSocket gateways`) 
2. Application layer (`use-cases`, `DTO mapping`, `authorization checks`)
3. Domain layer (`aggregates`, `entities`, `value objects`, `state machine`, `domain events`)
4. Infrastructure layer (`postgres adapters`, `redis pubsub`, `jwt`, `notifications`, `observability`)

Dependency rule:
- Outer layers depend inward.
- Domain depends on nothing external.
- Persistence and messaging are ports defined in application/domain and implemented in infrastructure.

## 3) Service Boundaries

### 3.1 API Gateway / BFF
- Terminates TLS.
- Authenticates JWT.
- Applies rate limits and request size limits.
- Forwards correlation id.

### 3.2 Queue Core Service
- Owns queue lifecycle.
- Owns visit aggregate and transition validation.
- Owns token issuance and idempotent check-in.

### 3.3 Identity & Access Service
- AuthN for staff (Admin/Doctor/Reception).
- Token issuance, refresh, revocation lists.
- Role and department-scoped claims.

### 3.4 Notification Service
- Web push/browser notify orchestration.
- Optional SMS/WhatsApp via provider abstraction.
- Non-blocking dispatch via outbox/event bus.

### 3.5 Analytics Service
- Consumes immutable transition events.
- Builds aggregated read models (wait times, no-show rate, throughput).
- Never blocks operational write path.

### 3.6 Audit Service
- Append-only immutable audit records.
- Tamper-evident hash-chain metadata.

## 4) Domain Model and Aggregates

## 4.1 Aggregates

### Visit (Aggregate Root)
- `visitId`
- `departmentId`
- `patientSessionId`
- `tokenId`
- `doctorId?`
- `state`
- `priority` (`NORMAL|URGENT`)
- `version` (optimistic lock)
- `timestamps` (`scannedAt`, `queuedAt`, `calledAt`, `consultationStartedAt`, `completedAt`, `noShowAt`)
- `prescriptionId?`
- emits domain events on each transition.

### Department
- `departmentId`, `name`, `status`, `timezone`, `queuePolicy`.

### Doctor
- `doctorId`, `departmentIds[]`, `availability` (`AVAILABLE|PAUSED|OFFLINE`), `activeVisitId?`.

### PatientSession
- `patientSessionId`, `deviceFingerprintHash`, `restoreTokenHash`, `expiresAt`, `clearedAt?`.

### Prescription
- `prescriptionId`, `visitId`, `version`, `contentSanitized`, `createdByDoctorId`, `signedAt`.

### Notification
- `notificationId`, `visitId`, `channel`, `template`, `dedupeKey`, `status`.

### AuditEvent
- `auditId`, `actorType`, `actorId`, `action`, `entityType`, `entityId`, `before`, `after`, `traceId`, `timestamp`.

## 4.2 Value Objects
- `TokenNumber` (department/day scoped, monotonic uniqueness)
- `DepartmentScopedSequence`
- `GeoAssertion` (optional proximity check verdict only, no raw history persistence)
- `IdempotencyKey`

## 5) Formal Visit State Machine

States:
- `SCANNED`
- `WAITING`
- `URGENT`
- `CALLED`
- `IN_CONSULTATION`
- `COMPLETED`
- `NO_SHOW`

Allowed transitions:
- `SCANNED -> WAITING`
- `WAITING -> URGENT`
- `WAITING -> CALLED`
- `URGENT -> CALLED`
- `CALLED -> IN_CONSULTATION`
- `CALLED -> NO_SHOW`
- `IN_CONSULTATION -> COMPLETED`

Rejected transitions:
- Any transition not listed above.
- Any transition from terminal states (`COMPLETED`, `NO_SHOW`).

Invariants:
- Exactly one active non-terminal state per visit.
- `doctorId` required for `CALLED`, `IN_CONSULTATION`, `COMPLETED`.
- `prescription` write allowed only during `IN_CONSULTATION -> COMPLETED` transaction.
- Every transition emits one audit + one domain event atomically.

## 6) Data Contracts

## 6.1 External API Contracts (JSON)

`POST /v1/patient/checkin`
- input: `departmentId`, `name`, `age`, `symptoms[]`, `signedCheckinToken`, `idempotencyKey`, `deviceFingerprint`
- output: `visitId`, `tokenNumber`, `state`, `position`, `restoreToken`, `expiresAt`

`GET /v1/patient/visits/{visitId}`
- output: `state`, `position`, `nowServing`, `department`, `prescription?`, `version`

`POST /v1/doctor/visits/{visitId}/call-next`
- input: `doctorId`, `expectedVersion`
- output: updated visit snapshot

`POST /v1/doctor/visits/{visitId}/complete`
- input: `doctorId`, `prescriptionText`, `expectedVersion`
- output: completed visit snapshot + prescription metadata

`POST /v1/admin/departments`
- create/activate/deactivate department

`POST /v1/admin/qrcodes`
- output: signed URL payload + QR asset metadata

## 6.2 Event Contracts

Topic naming:
- `dept.{departmentId}.visit.transitioned`
- `dept.{departmentId}.queue.updated`
- `system.audit.created`

Event envelope:
- `eventId` (uuid)
- `eventType`
- `occurredAt`
- `traceId`
- `actor`
- `entityId`
- `entityVersion`
- `payload`

Delivery semantics:
- At least once delivery; handlers must be idempotent by `eventId`.

## 7) Real-Time Architecture

Transport:
- WebSocket (department-scoped channels/rooms).

Flow:
1. Mutation committed in Queue Core DB transaction.
2. Outbox event written in same transaction.
3. Publisher relays outbox to Redis/NATS.
4. WebSocket gateway broadcasts to `department:{id}` subscribers.

Reconnect and replay:
- Client sends `lastReceivedEventId` on reconnect.
- Server replies with missing events from short-term event store, else snapshot resync.

Idempotency:
- Client commands include `idempotencyKey`.
- Server stores command results by key + actor + route for replay-safe retries.

## 8) Concurrency Control Strategy

- Optimistic locking on `visit.version` and doctor availability records.
- `SELECT ... FOR UPDATE` for token sequence and dequeue operations.
- Unique constraints to prevent duplicate active assignments.
- Compare-and-swap semantics for `call next`.

Concurrency race examples and mitigations:
- Two doctors click "Call Next": single transaction acquires first eligible visit lock; loser gets conflict response.
- Duplicate patient submit: idempotency key + signed check-in nonce uniqueness.
- Multiple doctor tabs: command accepted only when `expectedVersion` matches.

## 9) Security Model

Authentication:
- Staff: OIDC/JWT access tokens, short-lived, refresh token rotation.
- Patients: signed short-lived check-in links + restore token (httpOnly cookie or one-time token).

Authorization (RBAC):
- `ADMIN`: department, doctor, QR, analytics, audit read.
- `DOCTOR`: call/consult/complete within assigned departments.
- `RECEPTION`: manual entry and queue assist within assigned departments.

Controls:
- TLS 1.2+
- HSTS + secure cookies
- CSRF protection for cookie-auth endpoints
- strict input validation (schema validators)
- output encoding + CSP headers
- SQL injection prevention via parameterized queries/ORM
- rate limiting (IP + token + device key)
- anti-replay nonce for signed check-in URLs
- brute-force and flooding throttles

## 10) Compliance Posture

PII minimization:
- Store only required patient check-in data.
- Hash device identifiers.
- Never log prescription text or raw PII in application logs.

Auditability and traceability:
- Every state transition creates immutable audit record with actor, before/after, reason, trace id.
- Correlation id required on all requests/events.
- Audit retention policy and export controls.

Data protection:
- At-rest encryption for DB volumes.
- KMS-backed secret storage.
- Role-separated operational access.

## 11) Failure Modes and Recovery

Failure modes handled:
- Browser refresh/tab close/device sleep: restore by visit restore token.
- Network drop: websocket reconnect + replay/resync.
- Queue service restart: outbox replay and state rebuild from DB.
- Day rollover: department/day token sequence reset in transactional boundary.
- Admin tries delete active department: reject with conflict until queue drained.
- Doctor logout mid-visit: visit remains in `CALLED/IN_CONSULTATION`, reassignment flow required.

Degradation:
- If notification provider fails, queue workflow continues; notification marked failed + retried.
- If analytics pipeline fails, operational queue unaffected.

## 12) Database Schema (PostgreSQL)

Core tables:
- `departments`
- `doctors`
- `patient_sessions`
- `visits`
- `prescriptions`
- `notifications`
- `audit_events`
- `idempotency_keys`
- `outbox_events`
- `token_sequences`

Key constraints:
- unique `(department_id, token_date, token_number)`
- unique `outbox_events.event_id`
- unique `idempotency_keys.scope, idempotency_key`
- check constraints for state enum validity.

## 13) Observability and Operations

- Structured JSON logs.
- OpenTelemetry traces + spans for API/DB/pubsub.
- Prometheus metrics:
  - request latency
  - queue depth per department
  - transition failures
  - websocket connections
  - no-show rate
- Health endpoints: liveness/readiness/startup.
- Alert hooks: high wait time, high error rate, pubsub lag.

## 14) Testing Strategy

Mandatory suites:
- Domain unit tests: state machine, triage rule engine, doctor allocation.
- Integration tests: check-in → call → consultation → completion.
- Concurrency tests: simultaneous call-next, duplicate submissions.
- Security tests: RBAC boundaries, injection payload rejection, replay attempts.
- E2E tests: patient BYOD flow + doctor dashboard flow.
- Recovery tests: restart and reconnect replay.
- Load tests: sustained and burst department traffic.

Determinism controls:
- fixed seeded test data.
- fake clocks for timing-based behavior.
- explicit cleanup between tests.

## 15) Critical Design Evaluation

Strengths:
- Domain invariants centrally enforced.
- Event-driven real-time updates with replay and idempotency.
- Security controls embedded in architecture rather than added later.

Trade-offs:
- Event/outbox infrastructure adds operational complexity.
- Strong consistency for dequeue operations may reduce peak throughput but prevents unsafe race outcomes.

Risk register:
- Web push reliability varies by browser/device → fallback channels required.
- BYOD shared devices increase session hijack risk → clear-session UX and restore token hardening mandatory.
- Human workflows (doctor pauses/logouts) require explicit operational policy enforcement.

## 16) Implementation Gate Decision

Gate status: **APPROVED TO IMPLEMENT** with mandatory adherence to this document.

Initial implementation priorities:
1. Domain state machine + aggregates + tests.
2. Transactional queue APIs with RBAC and idempotency.
3. WebSocket event broadcast + reconnect resync.
4. Audit/outbox + observability + deployment assets.
