# Frontend Review Agent

## Purpose
Continuously review product UX, navigation, and workflow consistency for the RTC Project Manager frontend and produce actionable PRDs before implementation.

## Required Workflow
1. Evaluate current behavior against expected user outcomes.
2. Record findings with severity and file references.
3. Draft or update PRD(s) with scoped milestones and acceptance criteria.
4. Execute only the approved PRD milestone(s).
5. Re-test and publish deltas.

## Review Checklist
- Navigation and drill-down coverage:
  - Every dashboard metric and summary row navigates to a contextual detail view.
  - Cross-page transitions preserve context (template, project, filter).
- Create/edit lifecycle:
  - Template selection flows into project detail completion without redundant re-selection.
  - Empty/error states are recoverable from the same page.
- Template lifecycle management:
  - Tasks can be added/edited/removed after template creation.
  - Template task changes persist and affect future project creation.
- Data integrity:
  - Display units and storage units remain consistent.
  - JSON parsing or legacy payload variants cannot crash flows.
- UX clarity:
  - Action labels map to outcomes.
  - System gives success/failure feedback for state-changing actions.

## Output Format
- Findings first (ordered by severity), each with:
  - Title
  - Impact
  - Location (file:line)
  - Recommendation
- Then:
  - PRD updates
  - Execution status by milestone
  - Residual risks and next steps
