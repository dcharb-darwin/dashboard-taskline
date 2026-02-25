# Quickstart

Fastest path to run Dashboard Taskline.

## Prerequisites
- Node.js 22+
- pnpm 10+
- Docker Desktop (optional, for container workflow)

## Option A: Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
# Optional: rebuild with sample data
SEED_ON_START=true docker compose up -d --build
open http://localhost:3000
```

Useful commands:
```bash
docker compose ps
docker compose logs -f app
docker compose down
```

## Option B: Local Development

1. Install deps and configure env:
```bash
pnpm install
cp .env.example .env
```

2. Apply schema and optional seed:
```bash
pnpm db:push
pnpm db:seed
```

3. Start app:
```bash
pnpm dev
```

4. Open:
- `http://localhost:3000`

## Validate Before Commit
```bash
npm run verify
```

Current baseline: typecheck, tests, and build all pass on this repository as of February 24, 2026.
