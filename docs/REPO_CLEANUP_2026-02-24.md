# Repository Cleanup Audit and Execution

- Date: 2026-02-24
- Repository: `dcharb-darwin/dashboard-taskline`
- Branch: `codex/repo-hygiene-cleanup-20260224`

## Baseline Validation

Preflight and quality gates were run before cleanup:
- Worktree validation passed (`git rev-parse --is-inside-work-tree` -> `true`)
- Remote validation passed (origin points to `dcharb-darwin/dashboard-taskline`)
- Type check passed (`npm run check`)
- Tests passed (`npm run test`)
- Build passed (`npm run build`)

## Issues Found

1. Documentation drift and stale setup instructions.
- Multiple docs referenced archive extraction (`tar -xzf` / `unzip`) instead of repository-first setup.
- Commands were mixed between `docker-compose` and `docker compose`.
- Test expectation text was stale (`20/20`) while suite now runs 32 tests.

2. Missing contributor and CI guardrails.
- No GitHub Actions workflow to enforce type check, tests, and build on push/PR.
- No PR template/checklist to keep validation and docs updates consistent.

3. Documentation discoverability gap.
- No index page in `docs/` describing what each document is for.

4. Structural risk (deferred refactor backlog).
- Backend and UI contain large modules (`server/db.ts`, `server/routers.ts`, `client/src/pages/ProjectDetail.tsx`) that increase change risk and review cost.

## Cleanup Plan

### Phase 1: Hygiene and process safety (executed)
- Standardize setup/run docs to current commands.
- Add repository contribution standards.
- Add CI pipeline for `check`, `test`, `build`.
- Add PR checklist template.
- Add `npm run verify` script for local full-gate validation.
- Add docs index for discoverability.

### Phase 2: Structural modularization (planned)
- Split server data/query logic into domain repositories.
- Split API router surface into feature routers and compose in `routers.ts`.
- Break large page components into container + sections + hooks.
- Add focused unit tests around extracted modules before moving logic.

## Changes Executed

- Added `CONTRIBUTING.md` with branch model, validation requirements, and preflight checks.
- Added `.github/workflows/ci.yml` to run install/check/test/build.
- Added `.github/pull_request_template.md` with validation and risk checklist.
- Added `docs/README.md` as documentation index.
- Added `npm run verify` script in `package.json`.
- Rewrote setup docs for consistency:
  - `README.md`
  - `QUICKSTART.md`
  - `DOCKER_SETUP.md`
  - `LOCAL_DEPLOYMENT.md`

## Follow-Up Backlog

1. Decompose `server/db.ts` into feature-specific repository modules.
2. Decompose `server/routers.ts` into feature routers with shared middleware utilities.
3. Extract heavy UI logic from `ProjectDetail.tsx` into dedicated components/hooks.
4. Add linting workflow (ESLint) after module boundaries are stabilized.
