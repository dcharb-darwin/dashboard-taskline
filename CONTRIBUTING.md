# Contributing

## Repository Model
- `dev`: integration branch for active work.
- `staging`: release validation branch.
- `main`: production-ready branch.

## Local Setup
1. Install Node.js 22 and pnpm 10.
2. Install dependencies: `pnpm install`.
3. Copy environment defaults: `cp .env.example .env`.
4. Start development server: `pnpm dev`.

## Branch and Commit Workflow
1. Sync your base branch:
   - `git fetch origin --prune`
   - `git switch dev`
   - `git pull --ff-only origin dev`
2. Create a feature branch from `dev` using `codex/` prefix:
   - `git switch -c codex/<short-scope>`
3. Make focused commits with clear scope in the message.
4. Push your branch and open a pull request to `dev`.

## Mandatory Validation
Run these before opening or merging a pull request:
- `npm run check`
- `npm run test`
- `npm run build`

Or run the full gate at once:
- `npm run verify`

## Required Preflight Checks
Before making edits, confirm:
- `git rev-parse --is-inside-work-tree` returns `true`
- `git rev-parse --show-toplevel` matches this repository
- `git branch --show-current` is known and intentional
- `git remote -v` includes `dcharb-darwin/dashboard-taskline`

## Documentation Standards
- Update `README.md` for any setup or workflow changes.
- Keep `docs/setup/QUICKSTART.md`, `docs/setup/DOCKER_SETUP.md`, and `docs/setup/LOCAL_DEPLOYMENT.md` aligned with actual commands.
- Record non-trivial process updates in `CHANGELOG.md`.

## Testing Guidance
- Add or update tests for behavior changes in `server/*.test.ts`.
- Keep tests deterministic and database-safe for repeated CI runs.

## Security and Secrets
- Never commit `.env`, credentials, tokens, or private keys.
- Use `.env.example` for non-secret defaults only.
