# Agent Workflow Guardrails

This repository must be operated from a real git worktree.

## Mandatory preflight before any edits

Run and verify all of the following:

1. `git rev-parse --is-inside-work-tree` must return `true`
2. `git rev-parse --show-toplevel` must match this repository path
3. `git branch --show-current` must be printed in the kickoff update
4. `git remote -v` must include `dcharb-darwin/dashboard-taskline`

If any check fails, stop and ask for the correct repository path before making changes.

## Cleanup/change safety

Before deleting files or doing broad cleanup:

1. Generate candidate list with evidence (`rg` imports/references).
2. Keep a short keep/remove table in the working notes.
3. Apply changes only in the validated git worktree.

## Commit/push flow

1. Base from `gen2`.
2. Create or switch to target branch (for release testing use `staging`).
3. Run validation: `npm run check`, `npm run test`, `npm run build`.
4. Commit with clear scope and push branch to origin.

## Schema change rules

When modifying `drizzle/schema.ts`:

1. **New fields must be nullable** or have a default so existing data is unaffected.
2. **Enum changes must propagate** to all Zod schemas in `server/routers.ts` that reference the same enum.
3. After any schema change, update the in-memory state types/defaults in `server/db.ts` (`MemoryState`, copy helpers).
4. Run `npm run check` immediately after schema changes to catch type drift.
5. Update `docs/DATA_MODEL.md` to reflect the new schema.

## Testing requirements

1. All behavior changes **must** have corresponding tests in `server/*.test.ts`.
2. Tests use the tRPC caller pattern: `appRouter.createCaller(ctx)`.
3. Tests must be deterministic and safe for repeated CI runs — avoid side effects across test suites.
4. After adding tests, run `npm run test` to verify before proceeding.
5. Always run the full gate (`npm run verify`) before declaring a change complete.

## Documentation standards

1. Schema changes → update `docs/DATA_MODEL.md`.
2. API changes → update `docs/API_REFERENCE.md`.
3. Integration behavior changes → update `docs/INTEGRATION_GUIDE.md`.
4. PRD-level decisions → update `docs/PRD.md`.
5. All non-trivial changes → add entry to `CHANGELOG.md` under `[Unreleased]`.
6. New docs → add to `docs/README.md` index.

## Integration pattern rules

1. Integration fields (`externalId`, `metadata`) are **opaque to TaskLine UI** — they exist for companion apps.
2. `actualBudget` on projects/tasks may be written by external systems. TaskLine displays but does not compute.
3. Tags are writable via the API (`tags.add`, `tags.remove`). External apps use tags for lightweight status indicators.
4. Webhook payloads should include the full entity snapshot, not just event metadata.
5. Future: API key auth is flagged for implementation — do not build until explicitly requested.
