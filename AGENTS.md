# Agent Workflow Guide

This repository includes a project-aware agent routing config so the assistant can automatically select the best execution workflow for the current project path.

## Entry Point

Run:

```bash
pnpm agent:profile
```

This resolves the active profile from `.codex/agent-router.config.json` using:
- Repository name
- Current path hints
- Key file presence

Expected profile for this repository: `dashboard-taskline`.

## Standard Workflow

1. Resolve profile (`pnpm agent:profile`) and follow the emitted checklists.
2. Review active PRD documents in `docs/` before implementation.
3. Implement features in vertical slices:
   - schema/migration
   - server routes and business logic
   - UI
   - tests
4. Validate before handoff:
   - `pnpm check`
   - `pnpm test`
   - `pnpm build`
5. Summarize behavior changes and unresolved risks.

## Memory Protocol

For persistent context:
- project tag: `codex:project:{repo_name}`
- global tag: `codex:global`

Store only durable facts (decisions, fixes, constraints, follow-ups). Never store secrets.
