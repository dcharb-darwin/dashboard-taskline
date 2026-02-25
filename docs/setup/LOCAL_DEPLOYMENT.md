# Local Deployment

This guide runs Dashboard Taskline directly on your machine (without containerization).

## Prerequisites
- Node.js 22+
- pnpm 10+

> SQLite is embedded via `better-sqlite3` — no external database server required.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. (Optional) Adjust `DATABASE_URL` in `.env` — defaults to `file:./data/taskline.db`.
   Without a `.env` file the app runs in **memory mode** (data resets on restart).

4. Apply schema (if using SQLite persistence):
```bash
pnpm db:push
```

5. (Optional) seed sample data:
```bash
pnpm db:seed
```

6. Start development server:
```bash
pnpm dev
```

7. Open:
- `http://localhost:3000`

## Development Commands
- `pnpm dev`
- `pnpm check`
- `pnpm test`
- `pnpm build`
- `npm run verify`

## Troubleshooting

Cannot connect to DB:
- Ensure `DATABASE_URL` in `.env` is a valid SQLite file path (e.g. `file:./data/taskline.db`).
- Check that the `data/` directory exists and is writable.

Port 3000 in use:
- Stop the existing process, or change app port configuration.

## Validation
Before commit:
```bash
npm run verify
```
