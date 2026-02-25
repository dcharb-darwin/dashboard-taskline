# Docker Setup

This guide covers local Docker Compose operation for Darwin TaskLine.

## Prerequisites
- Docker Engine 20+
- Docker Compose v2+

Verify installation:
```bash
docker --version
docker compose version
```

## Service

The Compose file defines a single `app` service that runs the production-mode web server with embedded SQLite on port `3000`.

Optional seeding is controlled by the `SEED_ON_START` environment variable rather than a separate service.

## First Run

1. Configure environment:
```bash
cp .env.example .env
```

2. Build and start:
```bash
docker compose up -d --build
```

3. (Optional) seed sample data — set the env var before starting:
```bash
SEED_ON_START=true docker compose up -d --build
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

Restart:
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

Open SQLite shell:
```bash
docker compose exec app sqlite3 /app/data/taskline.db
```

Re-seed (wipes and re-populates templates, projects, tasks):
```bash
docker compose down
SEED_ON_START=true docker compose up -d --build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PORT` | `3000` | Host port mapped to container port 3000 |
| `SEED_ON_START` | `false` | Set to `true` to populate DB with sample data on container start |
| `DATABASE_URL` | `file:./data/taskline.db` | SQLite file path inside the container |
| `JWT_SECRET` | (see `.env.example`) | Session signing key — change for production |

See `.env.example` for the full list.

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
