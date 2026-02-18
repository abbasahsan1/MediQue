# MediQue

MediQue is a hospital queue management system. The repository now includes:

- Frontend prototype (existing Vite app).
- New production-oriented backend foundation in [server/README.md](server/README.md).
- Supabase-native backend schema and RPC workflow in [docs/SUPABASE_SCHEMA.sql](docs/SUPABASE_SCHEMA.sql).
- Hard-gate architecture and compliance design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Prototype gap remediation plan in [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md).

## Frontend (prototype)

1. `npm install`
2. `cp .env.example .env` (optional, defaults are already set for provided Supabase project)
3. In Supabase SQL Editor, run [docs/SUPABASE_SCHEMA.sql](docs/SUPABASE_SCHEMA.sql)
4. In Supabase Auth settings, ensure Anonymous Sign-ins are enabled
5. `npm run dev`

## Backend (production foundation)

1. `cd server`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

## Validation

- Backend build: `cd server && npm run build`
- Backend tests: `cd server && npm test`

## Deployment

- Local container run: `docker compose up --build`
