# PRD-FE-001: Frontend Drill-Down and Template Lifecycle

## Status
- Milestone A: Done
- Milestone B: Done
- Milestone C: Done

## Summary
The frontend needs tighter workflow continuity: dashboard summaries must drill into contextual detail, template-based project creation must preserve selected context, and templates must support persistent post-creation task management.

## Problem Statement
- Dashboard cards and summary blocks are partially non-actionable, forcing extra navigation hops.
- Template-to-project flow loses selected template context when moving to project creation.
- Template task libraries are read-only after initial setup, preventing iterative process refinement.

## Goals
1. Make all key dashboard surfaces navigable to contextual details.
2. Make template selection sticky through project creation.
3. Enable permanent template task management directly in-app.

## Non-Goals
- Full IA redesign or new route architecture.
- New auth/permissions model for template edits.
- Backfilling historical projects when template libraries change.

## Functional Requirements

### Milestone A: Drill-Down Navigation
- Dashboard KPI cards link to contextual views.
- Upcoming deadline entries route to the owning project detail.
- Projects page supports query-driven contextual filters.

### Milestone B: Template-to-Project Continuity
- Template detail provides "Create Project from Template" with selected template context.
- Create Project page auto-selects template from URL context and opens details flow.

### Milestone C: Persistent Template Task Management
- Template detail supports add/edit/remove task defaults.
- Save action persists task library to template storage.
- Subsequent project creation uses the updated task library.

## Acceptance Criteria
- Dashboard summary actions require no manual search to reach related detail context.
- `/projects/new?templateId={id}` preselects the template and enables immediate form completion.
- Template task edits survive refresh and are reflected in newly created projects.
- `npm run check`, `npm run test`, and `npm run build` pass.

## Execution Order
1. Implement Milestone A.
2. Implement Milestone B.
3. Implement Milestone C.
4. Validate and document residual risks.

## Risks
- Templates with malformed task payloads.
  - Mitigation: normalize task shape before save.
- Ambiguous drill-down destinations for aggregate KPIs.
  - Mitigation: route to the nearest actionable context (project list, calendar, gantt).
