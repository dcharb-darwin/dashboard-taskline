# PRD-FE-002: Task Drill-Down and Template Dependency Guards

## Status
- Milestone A: Done
- Milestone B: Done

## Summary
Improve task-level navigation continuity and harden template task integrity so users can safely maintain template libraries without introducing invalid dependencies.

## Problem Statement
- Timeline views do not consistently drill down to task context in project detail.
- Template task editing can introduce duplicate task IDs or invalid dependency references.

## Goals
1. Enable end-to-end task drill-down from timeline views into project detail context.
2. Prevent invalid template task graphs at save time (duplicate IDs and unknown/self dependencies).
3. Keep the workflow lightweight and compatible with current data model.

## Non-Goals
- Full dependency graph visualization.
- Automatic dependency repair/migration for existing broken templates.
- Cross-template dependency references.

## Functional Requirements

### Milestone A: Task Drill-Down
- Gantt task selection routes to owning project detail with task context query.
- Project detail reads task context query and visibly highlights/anchors the referenced task.
- Dashboard upcoming deadlines links include task-level context.

### Milestone B: Template Dependency Guards
- Template update mutation rejects duplicate task IDs.
- Template update mutation rejects:
  - dependencies that reference non-existent task IDs
  - self-dependencies.
- Template editor surfaces save errors without silent failure.
- Tests cover valid update persistence and invalid update rejection.

## Acceptance Criteria
- Clicking a task in Gantt lands on project detail with highlighted task row.
- Dashboard deadline link lands on the specific task context in project detail.
- Saving template tasks with duplicate IDs or invalid dependencies fails with clear error.
- `npm run check`, `npm run test`, and `npm run build` pass.
