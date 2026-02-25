# Darwin TaskLine

A full-stack project and task management platform for template-based delivery tracking, calendar and Gantt visualization, and portfolio reporting.

## Features

- **Project Management** — Create, track, and manage projects with phases, milestones, and budgets
- **Task Board** — Cross-project task view with filtering, grouping (phase/project/priority/owner), and sorting
- **Template System** — Reusable project templates with task definitions and phase structures
- **Gantt Chart** — Interactive timeline with collapsible project/phase hierarchy and drill-down navigation
- **Calendar** — Projects/Tasks toggle view with phase color-coded task events
- **Dashboard** — Portfolio health, risk tracking, upcoming deadlines, and governance overview
- **Admin Settings** — Governance & access policies, notification preferences, and white-label branding
- **Configurable Statuses & Labels** — Admin-editable project/task statuses, priorities, and risk statuses with color badges
- **White-Label Branding** — Customizable app name and logo via Admin settings
- **Command Palette** — Quick navigation with `Cmd+K` / `Ctrl+K`
- **Excel Export** — Download project and task data as formatted spreadsheets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI | Radix UI, shadcn/ui, Recharts |
| Backend | Express, tRPC, SuperJSON |
| Database | SQLite via Drizzle ORM |
| Gantt | gantt-task-react |
| Calendar | react-big-calendar |

## Quick Start

### Docker (recommended)
```bash
cp .env.example .env
docker compose up -d --build
# Optional: rebuild with sample data
SEED_ON_START=true docker compose up -d --build
open http://localhost:3000
```

### Local Development
```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed   # optional
pnpm dev
```

See detailed guides in [`docs/setup/`](docs/setup/).

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm check` | TypeScript type check |
| `pnpm test` | Run test suite (vitest) |
| `pnpm build` | Production build (frontend + backend) |
| `npm run verify` | Full gate: check + test + build |

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/         # Utilities, context, tRPC client
│   │   └── pages/       # Route pages
│   └── index.html
├── server/          # Express + tRPC backend
├── drizzle/         # Database schema and migrations
├── shared/          # Shared types and constants
└── docs/            # Documentation
```

## Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready |
| `gen2` | Current development |
| `staging` | Release validation |

## Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Setup Guides](docs/setup/)
- [Data Model](docs/DATA_MODEL.md)
- [API Reference](docs/API_REFERENCE.md)
- [Integration Guide](docs/INTEGRATION_GUIDE.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
