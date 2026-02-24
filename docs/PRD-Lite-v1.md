# PRD Lite v1: Project Tracking Micro-App

## Document Control
- Version: 1.0
- Date: February 24, 2026
- Product: Project Tracking and Templates Micro-App
- Audience: Product, Design, Engineering, QA, Implementation Partner

## 1. Product Summary
This micro-app provides lightweight project and task tracking using reusable templates. It is designed for fast setup, clear execution, and contextual visibility without enterprise PM overhead.

The application is embedded in a larger platform. User identity and authentication are inherited from the parent platform.

## 2. Product Principles
1. Lightweight by default.
2. Fast setup and fast daily use.
3. Reuse through templates.
4. Actionable drill-down from summary views.
5. Minimal required fields.
6. API-first readiness for future integrations.
7. AI assistive, never autonomous for destructive actions.

## 3. Explicit Non-Goals
1. ERP integration in v1.
2. Complex business rules engine.
3. Heavy enterprise portfolio governance workflows.
4. Local user management (signup/login/password lifecycle).
5. Deep resource/capacity optimization modules.

## 4. Users and Roles
Roles are passed from the host platform and enforced inside the micro-app.

1. Viewer
- Can view dashboard, projects, tasks, timelines, and comments.

2. Contributor
- Can update assigned tasks, add comments, and update progress.

3. Manager
- Can create/edit projects, manage tasks broadly, and use template workflows.

4. Admin
- Can manage template lifecycle (publish/archive/version), governance settings, and integration configuration.

## 5. In Scope (v1)
1. Template library and lifecycle.
2. Project creation and lifecycle.
3. Task management (single and bulk edit).
4. Dashboard and drill-down navigation.
5. Calendar and Gantt timeline views.
6. Comments, activity feed, and in-app notifications.
7. Export of project/task plan data.
8. Stable API surface for future integrations and AI.

## 6. Core User Journeys
1. Template manager updates and publishes a reusable template.
2. Project manager creates a project from template and gets pre-populated tasks.
3. Team updates tasks and status daily.
4. Program lead uses dashboard and timeline views to identify and open risks.
5. User drills from timeline to specific task context and takes action.

## 7. Functional Requirements

### 7.1 Navigation and Context Continuity
1. All primary pages must use a consistent app shell and navigation pattern.
2. Dashboard KPIs and summary lists must deep-link to relevant filtered views.
3. Template selection must persist into project creation flow.
4. Timeline selections must open linked project/task context.
5. Filter context should persist across drill-down where practical.

### 7.2 Template Management
1. Browse templates with search/filter.
2. View template details including phases and task library.
3. Create, edit, duplicate, version, publish, and archive templates (role-based).
4. Add/edit/remove template tasks after template creation.
5. Template changes apply to future projects by default.
6. Template validation rules:
- No duplicate task IDs.
- No self-dependency.
- No dependency on unknown task IDs.

### 7.3 Project Management
1. Create projects from template or as blank project.
2. Project form supports name, description, manager, status, dates, budget.
3. Template-based creation auto-generates tasks from template defaults.
4. Edit project metadata and status.
5. Delete project with explicit confirmation.
6. Project statuses: Planning, Active, On Hold, Complete.

### 7.4 Task Management
1. Create, edit, delete tasks in project context.
2. Supported task fields:
- Task ID
- Description
- Owner
- Phase
- Priority
- Status
- Start date
- Due date
- Duration
- Dependency
- Completion %
- Approval required / approver
- Deliverable type
- Planned budget / actual spend
- Notes
3. Validation rules:
- Description required.
- Due date cannot be earlier than start date.
- Numeric values must be non-negative where applicable.
- Completion % must be between 0 and 100.
4. Task IDs auto-generate and must avoid collisions.
5. Bulk updates supported for core fields (owner, status, priority, phase, dates, completion, budgets).
6. Optional dependency-readiness enforcement for completion updates.

### 7.5 Dashboard and Reporting Views
1. Dashboard displays:
- Total projects
- Active projects
- Total tasks
- Completed tasks
- Upcoming deadlines
2. Recent projects and upcoming deadlines must be directly actionable.
3. Export must produce shareable project/task detail output.

### 7.6 Timeline Views
1. Calendar shows project-level schedule windows.
2. Gantt shows project and task timeline bars with dependency relationships.
3. Gantt remains usable when task dates are partial/missing by inferring a timeline.
4. Inferred scheduling must be visually disclosed to users.
5. Timeline click behavior opens project or task detail context.

### 7.7 Collaboration and Notifications
1. Project/task comments with mentions.
2. Activity feed for major changes.
3. In-app notification feed with user preferences.
4. Notification events include: assignment, status changes, due-soon, overdue, mentions.

## 8. API Requirements (Integration-Ready Design)
1. Provide versioned API endpoints for templates, projects, tasks, comments, activity, and notifications.
2. API validation must match UI validation behavior.
3. API authorization must rely on host-platform identity and role claims.
4. Support event hooks/webhooks for outbound notifications to future connectors.
5. API contracts must remain stable across minor releases.

## 9. AI / Agentic Readiness Requirements
1. AI features are optional and assistive.
2. Initial AI-ready use cases:
- Suggesting task breakdown from project brief.
- Summarizing project risk and blockers.
- Suggesting overdue task remediation actions.
- Natural-language retrieval of project/task status.
3. Any write action proposed by AI requires explicit user confirmation.
4. AI actions must be permission-aware and role-compliant.
5. AI output must be editable before save.

## 10. Future Integrations (Not Built in v1)
The following capabilities are future scope and must be considered in design, but not implemented now:

1. O365 calendar integration
- Link Outlook/Calendar events to projects and tasks.
- Optional sync for due dates and milestones.

2. SharePoint integration
- Link SharePoint list items/documents to project/task context.
- Track source references and sync history.

3. Other data source connectors
- Generic connector framework for future systems.
- Field mapping, one-way/two-way sync modes, and conflict handling.

4. Integration governance
- Connector-level permissions.
- Source attribution and audit trail.
- Manual conflict resolution workflow.

## 11. Acceptance Criteria (v1)
1. Users can create projects from published templates with valid task payloads.
2. Template task library is editable and persistent for future project creation.
3. Users can manage tasks without runtime errors from invalid inputs.
4. Dashboard and timeline views consistently drill into actionable detail.
5. Gantt remains functional even with incomplete task dates.
6. Role-based access and host-platform identity enforcement are applied correctly.
7. API endpoints are available for core entities and aligned to app behavior.

## 12. Success Metrics
1. Time to first project creation from template.
2. Template reuse rate.
3. % tasks with owner and due date populated.
4. On-time completion rate.
5. Drill-down interaction rate from dashboard/timeline to detail views.
6. Error rate for create/update actions.

## 13. Open Decisions for Build Partner
1. Final role mapping from host-platform claims to app permissions.
2. Export format(s) and data schema for downstream reporting.
3. Notification preference granularity in v1 launch.
4. API versioning policy and deprecation cadence.
5. AI feature rollout order (which assistive capability first).
