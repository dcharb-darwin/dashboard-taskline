# Functionality Audit - 2026-02-24

## Scope
Holistic review of current RTC Project Manager alpha functionality across dashboard, navigation, templates, projects, tasks, and timeline views.

## Working Baseline (Verified)
- Unified shell navigation across Dashboard, Projects, Templates, Calendar, Gantt.
- Dashboard KPI and upcoming-deadline drill-down links.
- Template-to-project continuity via `/projects/new?templateId=...`.
- Persistent template task library editing with save path.
- Project/task CRUD (including add/edit task dialogs).
- Template task dependency guards (duplicate/self/unknown dependency checks).
- Project export to Excel.
- Docker runtime with DB seed path and sample data.

## Enhancements Added Recently
- Contextual drill-down from Gantt and dashboard into project detail task highlights.
- Query-driven project list filters (`status`, `q`) from contextual routes.
- Template parsing compatible with legacy and current task shapes.
- Template task lifecycle now supports add/edit/remove/save in-app.
- Improved visual dashboard quality and summary density.

## Regressions / Gaps Found
1. [High] Gantt degrades with sparse task dates
- Symptom: timeline appears empty or misleading when tasks lack explicit start+due values.
- Cause: prior transform rendered child tasks only when both dates existed.

2. [High] Form validation gaps caused mutation failures
- Symptom: task/project create/edit can error on malformed numeric/date values.
- Cause: client-side parsing allowed invalid values to reach API.

3. [Medium] API mutation guardrails were inconsistent
- Symptom: invalid schedule constraints possible via direct payloads.
- Cause: schema constraints did not fully enforce range and bounds consistency.

4. [Medium] Auto-generated task ID sequencing risked collisions
- Symptom: after deletions, generated IDs could reuse lower numbers.
- Cause: next code used row count instead of max existing code.

## Fix Execution (This Pass)
- Implemented PRD-FE-003 (`docs/PRD-FE-003-functional-recovery-and-gantt-resilience.md`).
- Added robust client validation for task/project forms.
- Added server-side date/number guardrails for project/task mutations.
- Reworked Gantt data build path with inferred sequencing for partial/missing dates.
- Added deterministic max-based task ID generation.
- Added regression tests for validation and sequencing.

## Remaining Recommended Follow-Ups
1. Add e2e workflow tests (`template -> project -> add/edit task -> gantt -> drill-down`).
2. Add optional critical-path highlighting once date completeness improves.
3. Add explicit UI toggle to show/hide inferred schedule rows in Gantt.
