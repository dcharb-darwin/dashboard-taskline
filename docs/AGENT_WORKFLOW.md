# Project-Aware Agent Routing

## Goal

Provide one high-level workflow that adapts automatically to the current project context.

## Files

- `.codex/agent-router.config.json`: profile definitions and matching rules
- `scripts/agent-profile.mjs`: resolver script
- `AGENTS.md`: repository-level operating guide

## Usage

```bash
pnpm agent:profile
```

JSON output for tooling:

```bash
pnpm agent:profile -- --json
```

## Routing Model

The resolver computes a match score per profile using:
1. Repository name matches
2. Path token matches
3. Presence of profile-specific anchor files

The highest score wins; if no strong match is found, the default profile is used.

## Current Profiles

1. `dashboard-taskline`
- PRD-first lane for this product.
- Enforces full-stack slice workflow (db + api + ui + tests).
- Uses quality gates: `pnpm check`, `pnpm test`, `pnpm build`.

2. `typescript-fullstack` (fallback)
- Generic TypeScript full-stack profile for unknown repos.

## Extending to More Projects

Add a profile in `.codex/agent-router.config.json` with:
- `id` and `description`
- `match` block (`repos`, `pathContains`, `filesExist`)
- `agentConfig` defaults
- `workflow` checklists and quality gates

After updates, run:

```bash
pnpm agent:profile -- --json
```

and verify the selected profile for each target repository path.
