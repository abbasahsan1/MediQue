# MediQue Server

Production-oriented backend foundation for MediQue queue lifecycle.

## Included
- Clean architecture layering (`domain`, `application`, `infrastructure`, `presentation`).
- Centralized visit state machine validation.
- Deterministic idempotent check-in.
- Role-based access controls (`ADMIN`, `DOCTOR`, `RECEPTION`).
- Signed check-in token verification.
- Optimistic version checks for concurrent transitions.
- Audit event persistence (in-memory adapter).
- Department-scoped real-time queue stream (SSE).
- Health endpoint and structured startup logging.

## Run locally
1. `cp .env.example .env`
2. `npm install`
3. `npm run dev`

## Test
- `npm test`

## Build
- `npm run build`

## Key Endpoints
- `POST /api/v1/patient/checkin`
- `GET /api/v1/patient/visits/:visitId`
- `GET /api/v1/departments/:departmentId/queue`
- `POST /api/v1/doctor/visits/:visitId/call`
- `POST /api/v1/doctor/visits/:visitId/start`
- `POST /api/v1/doctor/visits/:visitId/complete`
- `POST /api/v1/doctor/visits/:visitId/no-show`
- `GET /api/v1/events/departments/:departmentId`
- `GET /api/v1/admin/audit`
- `POST /api/v1/admin/checkin-token`
- `POST /api/v1/auth/dev-token`

## Notes
- Current infrastructure adapters are in-memory for deterministic local testing.
- Swap adapters with Postgres/Redis implementations via ports in `src/application/ports.ts` for production rollout.
