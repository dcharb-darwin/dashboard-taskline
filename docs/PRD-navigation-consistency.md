# PRD: Navigation and UI Consistency Hardening

## Summary
This alpha release has fragmented navigation patterns, duplicated page shell logic, and a few high-impact data/UI bugs that reduce trust during project setup and template-based workflows. This PRD defines a lightweight consistency pass that keeps the current architecture but removes breakpoints in core user flows.

## Problem Statement
- Navigation is inconsistent across pages:
  - Some pages have full top nav, some are missing links (Calendar/Gantt).
  - Route labels and active state behavior are not centralized.
- Shared page shell is duplicated in multiple files, causing drift.
- Template and budget flows have correctness issues:
  - Template detail dialog renders incorrect icon output.
  - Template task parsing is brittle across legacy/new task payload shapes.
  - Project budget values are treated inconsistently between UI and DB units.

## Goals
1. Provide one shared navigation shell across all main pages.
2. Ensure all primary views are reachable with consistent affordances.
3. Fix template and project creation/editing issues that cause invalid or confusing behavior.
4. Preserve current product scope and avoid a large architectural rewrite.

## Non-Goals
- New authentication model or role-based access redesign.
- Database schema migration.
- Full UI redesign or component-system overhaul.

## Requirements
### Navigation and Layout
- Introduce a shared app layout component with:
  - Brand/title
  - Primary nav links (`/`, `/projects`, `/templates`, `/calendar`, `/gantt`)
  - Primary action (`New Project`)
- Use shared layout on all core pages:
  - Dashboard, Projects, Templates, Create Project, Project Detail, Calendar, Gantt.
- Show clear active nav state for current route.

### Consistency and Data Integrity
- Normalize template key handling so icon mapping works for both underscore and hyphen styles.
- Render human-friendly template labels in project cards/details.
- Parse template task JSON safely (invalid JSON cannot crash the page).
- Support both `taskDescription` and legacy `description` fields when creating tasks from templates.
- Standardize project budget handling:
  - UI input/display in dollars.
  - API payload/storage in cents.

## Acceptance Criteria
- Users can navigate to all major sections from a consistent header on every core page.
- Template details always show the correct icon.
- Creating a project from any valid template produces tasks when sample task data exists (legacy/new task field support).
- Project budget values remain numerically consistent after create/edit cycles.
- `npx pnpm check` and `npx pnpm build` pass.

## Risks and Mitigations
- Risk: mixed template key formats in existing data.
  - Mitigation: normalize keys before icon/label lookup.
- Risk: legacy template task shape mismatch.
  - Mitigation: dual-field handling (`taskDescription` + `description`) and defensive parsing.
- Risk: lingering UI drift in future pages.
  - Mitigation: reuse `AppLayout` for all newly added top-level pages.
