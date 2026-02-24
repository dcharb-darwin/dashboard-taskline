# Frontend Audit - 2026-02-24

## Findings (Ordered by Severity)

1. [High] Dashboard aggregates lacked contextual drill-down
- Impact: users could see risk/volume but could not immediately reach actionable details.
- Location: `client/src/pages/Dashboard.tsx`
- Recommendation: link KPI surfaces to relevant detail views and deep-link deadline items to project detail.
- Status: Mitigated in Milestone A.

2. [High] Template lifecycle was read-only after initial seed
- Impact: teams could not evolve standard workflows in-app; template debt accumulated.
- Location: `client/src/pages/Templates.tsx`, `server/routers.ts`, `server/db.ts`
- Recommendation: add persistent template task library management with save path.
- Status: Mitigated in Milestone C.

3. [Medium] Template-to-project context was dropped at handoff
- Impact: users had to re-select context after choosing a template, increasing friction and mistakes.
- Location: `client/src/pages/Templates.tsx`, `client/src/pages/CreateProject.tsx`
- Recommendation: pass `templateId` through route and auto-select in create flow.
- Status: Mitigated in Milestone B.

4. [Medium] Aggregate filtering could not be driven by contextual links
- Impact: links from other views could not preload relevant project subsets.
- Location: `client/src/pages/Projects.tsx`
- Recommendation: support query-driven initial state (`status`, search).
- Status: Mitigated in Milestone A.

5. [Low] Template metadata used static text sections over live task library views
- Impact: users lacked confidence in what would actually be created from a template.
- Location: `client/src/pages/Templates.tsx`
- Recommendation: surface real task library details and editing affordances.
- Status: Mitigated in Milestone C.

## Recommended Next Execution
1. Add task-focused deep links from additional timeline contexts where available (calendar task-level expansion if/when task events are introduced).
2. Improve project detail filter/query interoperability (e.g., combine highlighted task context with saved user filters).
3. Add e2e coverage for dashboard -> gantt -> project detail -> highlighted task interaction path.
