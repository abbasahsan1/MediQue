# Prototype-to-Production Gap Analysis

## Current Prototype Risks
- Client-only localStorage state (no authoritative backend).
- No authentication, RBAC, session isolation, or audit log.
- No deterministic state machine enforcement.
- No transactional concurrency control for "call next".
- No signed QR links / anti-replay controls.
- No structured observability or health checks.
- No deterministic automated tests.

## Remediation Work Packages

### WP1 Domain Core
- Introduce strict visit state machine in domain layer.
- Enforce transition validation centrally.
- Add deterministic unit tests for allowed/blocked transitions.

### WP2 Application + Ports
- Add use-cases for check-in, call-next, start consultation, complete, no-show.
- Add repository and event-publisher interfaces.
- Add idempotency port for retry-safe commands.

### WP3 Infrastructure + API
- Add server API with role-based auth middleware.
- Add in-memory adapters (dev) with upgrade path to Postgres/Redis.
- Add SSE/WebSocket-ready event streaming endpoint.

### WP4 Security/Compliance Controls
- Signed check-in token verification.
- Rate limiting middleware.
- Correlation ID propagation and audit events.
- Input schema validation and sanitization.

### WP5 Testing + Operations
- Domain, integration, and RBAC tests.
- Health endpoint and structured logs.
- Containerization and CI workflows.

## Incremental Delivery Order
1. Backend core and APIs (authoritative state).
2. Frontend integration replacing localStorage service.
3. Real-time subscription and reconnect resync.
4. Full test and deployment hardening.
