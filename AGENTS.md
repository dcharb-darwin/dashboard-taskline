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
