# PRD-002A: Critical Path and Bulk Rule Hardening

## Goal
Deepen project execution quality from PRD-002 by adding actionable critical-path visualization and safer, more expressive bulk update behavior.

## Scope
- Compute project critical path from task dependencies and durations.
- Visualize critical-path tasks clearly in Gantt for selected project views.
- Expand bulk update controls:
  - date shifting for selected tasks
  - clearing owner/dates in one operation
  - optional dependency-readiness enforcement before setting tasks to `Complete`
- Add strict date validation during bulk edits (`startDate <= dueDate`).

## Acceptance criteria
- PM can identify the critical path visually in Gantt when viewing a single project.
- Bulk updates support shift/clear operations without manual per-task edits.
- Bulk status completion can be blocked when dependencies are not complete.
- Invalid bulk date ranges are rejected with clear error messages.
