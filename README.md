# Dashboard Taskline

Dashboard Taskline is a full-stack project and task management application for template-based delivery tracking, calendar and Gantt visualization, and portfolio reporting.

## What This Repository Contains
- React + TypeScript frontend (`client/`)
- Express + tRPC backend (`server/`)
- Drizzle schema and migrations (`drizzle/`)
- Shared types/constants (`shared/`)

## Quick Start

### Docker (recommended for fastest start)
```bash
cp .env.example .env
docker compose up -d --build db migrate app
# Optional sample data
docker compose --profile seed up -d --build seed
open http://localhost:3000
```

### Local development
```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed   # optional
pnpm dev
```

See detailed guides:
- `QUICKSTART.md`
- `DOCKER_SETUP.md`
- `LOCAL_DEPLOYMENT.md`

## Development Commands
- `pnpm dev`: run local dev server
- `pnpm check`: TypeScript type check
- `pnpm test`: run test suite
- `pnpm build`: build frontend and backend bundles
- `npm run verify`: run check + test + build gate

## Branching and Release Flow
- `dev`: integration branch
- `staging`: release validation
- `main`: production-ready

Use short-lived feature branches from `dev` with `codex/` prefix.

## Documentation
- [docs/README.md](docs/README.md)
- [docs/PRD-HANDOFF.md](docs/PRD-HANDOFF.md)
- [docs/REPO_CLEANUP_2026-02-24.md](docs/REPO_CLEANUP_2026-02-24.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

## Validation Standard
Before merge, all of the following must pass:
```bash
npm run verify
```
