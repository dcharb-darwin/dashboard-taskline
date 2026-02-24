# RTC Project Manager - Docker Setup

This setup is optimized for fast pull-and-run onboarding.

## Prerequisites

- Docker Desktop or Docker Engine with Compose plugin (`docker compose`)
- Git

Verify:

```bash
docker --version
docker compose version
```

## Fastest Path (Recommended)

From a fresh clone:

```bash
git clone https://github.com/dcharb-darwin/dashboard-taskline.git
cd dashboard-taskline
./scripts/docker-quickstart.sh
```

This script performs:
1. Build images
2. Start MySQL
3. Run migrations
4. Seed sample data
5. Start the app

App URL: `http://localhost:3000`

## Script Options

```bash
./scripts/docker-quickstart.sh --no-seed
./scripts/docker-quickstart.sh --no-build
```

## Compose Services

- `db`: MySQL 8 with persistent volume `mysql_data`
- `migrate`: one-off service running `pnpm db:push`
- `seed`: optional one-off service (`--profile seed`) running sample data seed
- `app`: production runtime service

`app` waits for both `db` health and successful `migrate`.

## Manual Commands

### Bring up stack (without seed)

```bash
docker compose up -d --build
```

### Seed sample data manually

```bash
docker compose run --rm seed
```

### Logs and status

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
```

### Stop and cleanup

```bash
docker compose down
```

Remove volumes too (deletes DB data):

```bash
docker compose down -v
```

## Environment Variables

Defaults are provided in `docker-compose.yml` for local testing.

Override by creating `.env` in repo root:

```env
JWT_SECRET=replace-me
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
VITE_APP_ID=rtc-project-manager
OWNER_OPEN_ID=admin
OWNER_NAME=Administrator
```

Database URL used in containers:

`mysql://rtc_user:rtc_password@db:3306/rtc_project_manager`

## Troubleshooting

### App fails after schema changes

Rebuild and rerun migrations:

```bash
docker compose down
docker compose up -d --build db
docker compose run --rm migrate
docker compose up -d --build app
```

### Port conflicts

- App: change `3000:3000` in `docker-compose.yml`
- DB: change `3306:3306` in `docker-compose.yml`

### Reset local database state

```bash
docker compose down -v
./scripts/docker-quickstart.sh
```
