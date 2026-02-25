# Docker Setup

This guide covers local Docker Compose operation for Dashboard Taskline.

## Prerequisites
- Docker Engine 20+
- Docker Compose v2+

Verify installation:
```bash
docker --version
docker compose version
```

## Services
- `app`: production-mode web app with embedded SQLite on port `3000`
- `migrate`: one-shot schema migration (`pnpm db:push`)
- `seed`: one-shot sample data loader (`pnpm db:seed`, profile `seed`)

## First Run

1. Configure environment:
```bash
cp .env.example .env
```

2. Build and start core services:
```bash
docker compose up -d --build migrate app
```

3. (Optional) seed sample data:
```bash
docker compose --profile seed up -d --build seed
```

4. Open the app:
- `http://localhost:3000`

## Daily Operations

View status:
```bash
docker compose ps
```

View logs:
```bash
docker compose logs -f app
```

Restart services:
```bash
docker compose restart app
```

Stop all services:
```bash
docker compose down
```

Stop and remove data volume:
```bash
docker compose down -v
```

## Database Operations

Re-run migration manually:
```bash
docker compose run --rm migrate
```

Re-run seed manually:
```bash
docker compose --profile seed run --rm seed
```

Open SQLite shell:
```bash
docker compose exec app sqlite3 /app/data/taskline.db
```

## Troubleshooting

App cannot start:
```bash
docker compose ps
docker compose logs app
```

Database path issues:
- Confirm `DATABASE_URL` in `.env` points to a valid SQLite file path.
- Ensure the data directory is mounted as a Docker volume for persistence.

Port conflict on `3000`:
- Change `APP_PORT` in `.env`.
- Or stop the process already using the port.

## Validation
After startup, verify repository quality gates:
```bash
npm run verify
```
