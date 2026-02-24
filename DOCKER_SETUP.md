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
- `db`: MySQL 8 database with persistent volume
- `migrate`: one-shot schema migration (`pnpm db:push`)
- `seed`: one-shot sample data loader (`pnpm db:seed`, profile `seed`)
- `app`: production-mode web app on port `3000`

## First Run

1. Configure environment:
```bash
cp .env.example .env
```

2. Build and start core services:
```bash
docker compose up -d --build db migrate app
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
docker compose logs -f db
```

Restart services:
```bash
docker compose restart app
```

Stop all services:
```bash
docker compose down
```

Stop and remove DB volume:
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

Open MySQL shell:
```bash
docker compose exec db mysql -u rtc_user -prtc_password rtc_project_manager
```

## Troubleshooting

Database not healthy:
```bash
docker compose ps
docker compose logs db
```

App cannot connect to DB:
- Confirm `db` is healthy before `app` starts.
- Confirm `DATABASE_URL` values in `docker-compose.yml` match intended credentials.

Port conflict on `3000`:
- Change `APP_PORT` in `.env`.
- Or stop the process already using the port.

## Validation
After startup, verify repository quality gates:
```bash
npm run verify
```
