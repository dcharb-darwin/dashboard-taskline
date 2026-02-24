# PRD-FE-003: Functional Recovery and Gantt Resilience

## Status
In Progress

## Summary
The current alpha includes strong dashboard and template lifecycle improvements, but core execution workflows still degrade when inputs are partial or malformed. This PRD restores reliability in three critical areas: task creation/editing, schedule consistency, and Gantt rendering.

## Problem Statement
- Task create/edit flows can fail on invalid numeric/date inputs with unclear recovery.
- Date range integrity is not consistently enforced across project/task APIs.
- Gantt rendering depends on complete task dates; sparse data appears broken and blocks timeline review.

## Goals
1. Make task/project form submissions deterministic with clear validation feedback.
2. Enforce server-side date/number guards so invalid timeline data cannot persist.
3. Render usable Gantt timelines even when tasks have partial or missing dates.
4. Preserve drill-down behavior from Gantt to project/task context.

## Non-Goals
- Full critical-path analytics in this milestone.
- Bulk rescheduling engine changes.
- Historical migration of legacy records.

## Functional Requirements

### Milestone A: Input and API Guardrails
- Validate client date ranges (`start <= due`) before mutation.
- Reject invalid values server-side:
  - negative budgets/durations
  - completion outside `0..100`
  - inverted date ranges
- Normalize and trim task/project text payloads.

### Milestone B: Gantt Resilience
- Build timeline rows from project/task data with fallback sequencing:
  - use explicit dates when present
  - infer missing endpoints from duration
  - synthesize sequence when task dates are absent
- Ensure rendered bars always have valid start/end ordering.
- Preserve task and project drill-down links.

### Milestone C: Regression Coverage
- Add automated tests for:
  - task date-range validation
  - completion percent bounds
  - deterministic task ID sequencing after deletions

## Acceptance Criteria
- Creating or editing tasks with invalid date ranges fails with clear user feedback.
- API rejects invalid timeline/numeric payloads even if sent outside UI.
- Gantt shows timeline rows for seeded projects/tasks without requiring perfect date fields.
- Clicking Gantt task rows still navigates to `/projects/{id}?task={taskId}`.
- New validation tests pass in CI/local test runs.

## Risks
- Synthetic sequencing may not match every team’s desired schedule.
  - Mitigation: explicitly label inferred timeline rows and keep real dates authoritative.
- Stricter validation may surface existing data quality gaps.
  - Mitigation: constrain checks to mutation paths and avoid destructive migrations.
