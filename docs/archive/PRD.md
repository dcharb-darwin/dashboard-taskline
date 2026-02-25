# Darwin TaskLine — Product Requirements Document

## Document Control

| Field | Value |
|-------|-------|
| Version | 3.0 |
| Date | February 25, 2026 |
| Product | Darwin TaskLine — Project & Task Management |
| Audience | Development Team, Product, QA |
| Status | Approved for Development |

---

## How to Use This Document

This PRD defines **what** Darwin TaskLine must do — not **how** to build it. A working prototype is provided as a running Docker container that demonstrates all core functionality. Use it as an interactive reference alongside this document.

```bash
# Run the demo
docker compose up -d --build
open http://localhost:3000
```

> [!IMPORTANT]
> The prototype is a proof-of-concept built for speed, not production quality. Your team owns all technology choices, architecture, infrastructure, authentication, authorization enforcement, performance, accessibility, and deployment.

### Priority Tiers

Features are classified as:

| Tier | Meaning |
|------|---------|
| **Core** | Must-have for v1 launch |
| **Enhanced** | Nice-to-have — build if schedule permits |
| **Future** | Out of scope for v1 — design for extensibility only |

---

## 1. Product Summary

Darwin TaskLine is a white-label project and task management application for template-based delivery tracking, timeline visualization, and portfolio reporting. It enables fast project setup through reusable templates, clear execution tracking across phases, and actionable drill-down from summary views to task-level detail.

The application supports customizable branding (organization name and logo) and is designed as an embeddable module where user identity may be inherited from a host platform.

---

## 2. Product Principles

1. **Lightweight by default** — Minimal required fields, fast daily use.
2. **Template-first** — Reuse through pre-defined project templates with phases and task libraries.
3. **Actionable drill-down** — Every summary metric links to the detail behind it.
4. **White-label ready** — Branding customizable without code changes.
5. **Cross-project visibility** — Tasks, calendar, and Gantt views span the full portfolio.
6. **API-first** — All functionality accessible through a well-defined API surface.

---

## 3. Non-Goals (Out of Scope)

1. ERP or financial system integration.
2. Complex workflow automation or business rules engine.
3. Real-time multi-user collaboration (live cursors, co-editing).
4. Deep resource/capacity optimization.

---

## 4. Development Handoff

The following areas are **not specified in this PRD** 

| Area | Notes |
|------|-------|
| **Authentication** | SSO/OAuth integration with the host platform. The prototype uses a placeholder auth flow. |
| **Authorization / RBAC** | Role enforcement on all API endpoints. Roles defined in §5 below. |
| **Infrastructure** | Hosting, CI/CD, monitoring, logging, database selection, backup/recovery. |
| **Performance** | Caching, pagination strategy, query optimization, CDN for assets. |
| **Accessibility** | WCAG 2.1 AA compliance. |
| **Internationalization** | If required by your deployment context. |
| **Security** | Input sanitization, CSRF, rate limiting, secrets management. |
| **Mobile responsiveness** | The prototype is desktop-first; responsive design is expected. |

---

## 5. Users and Roles

Roles may be passed from a host platform or managed within the app.

| Role | Permissions |
|------|------------|
| **Viewer** | View dashboard, projects, tasks, timelines, and comments. Read-only. |
| **Editor** | Update assigned tasks, add comments, update progress, create projects. |
| **Admin** | All Editor permissions plus: manage templates, governance settings, notification configuration, branding, and user access policies. |

---

## 6. Navigation and Application Shell — Core

### 6.1 Global Navigation Bar
- Persistent top navigation on all pages
- Organization logo (configurable) and application name (configurable)
- Navigation links: Dashboard, Projects, Templates, Tasks, Calendar, Gantt, Admin
- "New Project" action button
- Logo and app name link to Dashboard

### 6.2 Command Palette
- Accessible via `Cmd+K` / `Ctrl+K` from any page
- Keyboard search across all pages, projects, and actions
- Selected result navigates to the corresponding page

### 6.3 Toast Notifications
- Non-blocking toast messages for success, error, and informational feedback
- Auto-dismiss after a reasonable duration

### 6.4 Error Handling
- Global error boundary catches unhandled exceptions with a user-friendly fallback
- API errors surface as toast messages with clear descriptions

---

## 7. Dashboard — Core

The Dashboard is the landing page and provides a portfolio-level overview.

### 7.1 Summary Metrics (KPI Cards)

| Metric | Description |
|--------|-------------|
| Total Projects | Count of all projects |
| Total Tasks | Count of all tasks across all projects |
| Completed Tasks | Count + completion rate percentage |
| Upcoming Deadlines | Count of tasks due within 14 days |

Each card must be clickable and navigate to a relevant filtered view.

### 7.2 Portfolio Health
- Health distribution: On Track / At Risk / Off Track project counts
- Average completion percentage across all projects
- Milestone confidence: High / Medium / Low counts

### 7.3 Top Risks
- Projects with the most overdue and blocked tasks
- Each entry: project name, health status, overdue count, blocked count
- Clickable → navigates to project detail

### 7.4 Upcoming Deadlines
- Tasks due within 14 days
- Each entry: task description, project name, phase, due date, owner, priority, status
- Clickable → navigates to project detail with task highlighted

### 7.5 Recent Activity
- Most recent project activities across all projects
- Each entry: timestamp, project name, event type, description

### 7.6 Budget Summary
- Total planned budget vs. actual spend
- Budget utilization percentage

---

## 8. Template Management — Core

### 8.1 Template Library
- Browse templates with search and filtering
- Filter by status: All, Draft, Published, Archived
- Filter by template group
- Display: name, group, version, task count, status, last updated
- Only Published templates available for project creation

### 8.2 Template Data Model

| Field | Type | Required |
|-------|------|----------|
| Name | String | Yes |
| Template Key | String | Yes (unique identifier) |
| Template Group Key | String | Yes (category grouping) |
| Version | Integer | Yes |
| Status | Enum: Draft, Published, Archived | Yes |
| Description | Text | No |
| Phases | Ordered list of phase names | Yes |
| Sample Tasks | Array of task definitions (see §8.3) | No |
| Upload Source | String ("manual", "xlsx", etc.) | No |

### 8.3 Template Task Definition
Each sample task within a template includes:
- Task ID code (e.g., "T001")
- Description (required)
- Phase assignment
- Priority (High / Medium / Low)
- Duration in days
- Owner role
- Dependencies (list of task ID codes)
- Approval required flag and approver role
- Deliverable type
- Milestone name (optional)

### 8.4 Template Lifecycle
- **Create** — New template with phases and task library
- **Edit** — Modify metadata, phases, and task definitions
- **Duplicate** — Copy to create a variant
- **Publish** — Make available for project creation
- **Archive** — Remove from active use (retain for audit)
- **Version** — Increment version on significant changes
- Template changes apply to future projects only; existing projects are unaffected

### 8.5 Template Validation
- No duplicate task IDs within a template
- No self-dependency
- No dependency on unknown task IDs
- At least one task must have a description

---

## 9. Project Management — Core

### 9.1 Project Creation
- Create from a published template (pre-populates phases and tasks) or as a blank project
- Template selection with search/filter
- Form fields: Name (required), Description, Template type (auto-filled), Project manager, Start date, Target completion date, Budget
- Date validation: target completion ≥ start date
- Template-based creation auto-generates all tasks with sequential IDs

### 9.2 Project List
- Display: name, template type, status, dates, completion %, task count
- Filter by status: All, Planning, Active, On Hold, Complete
- Search by name, sort by various fields
- Click → navigate to project detail

### 9.3 Project Data Model

| Field | Type | Required |
|-------|------|----------|
| Name | String | Yes |
| Description | Text | No |
| Template Reference | Foreign key | No |
| Template Type | String | No |
| Project Manager | String | No |
| Start Date | Date | No |
| Target Completion Date | Date | No |
| Planned Budget | Currency (cents) | No |
| Actual Budget | Currency (cents) | No |
| External ID | String | No | Opaque — companion apps store their own ID here |
| Metadata | Text (JSON) | No | Opaque — companion apps store domain-specific data here |
| Status | Enum: Planning, Active, On Hold, Closeout, Complete | Yes |

> [!NOTE]
> `actualBudget` on projects may be updated by companion apps via the API. TaskLine displays this value but does not independently compute it. This enables financial tracking apps to push spend data into TaskLine's budget views without TaskLine needing to understand invoicing.

### 9.4 Project Detail Page

The project detail page is the primary workspace with these sections:

#### Project Header
- Name, template type, status badge
- Edit and delete actions (delete requires confirmation)
- Metadata: manager, dates, budget, completion %, task counts

#### Task List
- All tasks grouped by configurable criteria (Status default, or Phase)
- Phase grouping: collapsible sections with phase name and task count
- Each row: task ID, description, phase, status, priority, owner, due date, completion %, budget
- Clickable rows open edit dialog
- Checkboxes for bulk selection

#### Bulk Task Operations
- Select via checkboxes or "Select Visible"
- Bulk edit: owner, status, priority, phase, dates, completion %, budgets
- "Validate Dependencies" checks selected tasks for unmet dependency conditions

#### Project Tags
- Lightweight labels/tags to categorize projects
- Each tag: label + color
- Displayed as colored chips

#### Project Notes / Journal
- Append-only journal entries per project
- Each note: author, content, timestamp
- Displayed in reverse chronological order

#### Activity Feed
- Unified timeline of project events
- Event types: comment added, task status changed, assignment changed, due soon, overdue
- Each entry: actor, event type, summary, timestamp

#### Comments
- Threaded comments with @mention support
- Comments can optionally be associated with a specific task
- Display: author, content, mentions, timestamp

---

## 10. Task Management — Core

### 10.1 Task Data Model

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Task ID Code | String | Auto-generated | Sequential (T001, T002...), unique within project |
| Description | String | Yes | |
| Project | Reference | Yes | Parent project |
| Phase | String | No | Must match a project/template phase |
| Status | Enum | Yes | Not Started, In Progress, Complete, On Hold |
| Priority | Enum | Yes | High, Medium, Low |
| Owner | String | No | |
| Start Date | Date | No | |
| Due Date | Date | No | Must be ≥ start date |
| Duration (days) | Integer | No | |
| Dependencies | String list | No | Comma-separated task ID codes |
| Completion % | Integer | Yes | 0–100 |
| Milestone | String | No | |
| Planned Budget | Currency | No | Stored in cents |
| Actual Budget | Currency | No | Stored in cents |
| Approval Required | Boolean | No | Default: No |
| Approver | String | No | |
| Deliverable Type | String | No | |
| Notes | Text | No | |
| Metadata | Text (JSON) | No | Opaque — companion apps store domain-specific data |

### 10.2 Task Creation
- Add from project detail page
- Option to select from template task library or create freeform
- Task IDs auto-generate sequentially, avoid collisions

### 10.3 Task Editing
- Edit all fields via dialog/modal
- Inline editing via clicking any task row
- Dedicated edit icon also available

### 10.4 Task Validation
- Description required
- Due date ≥ start date
- Completion % between 0 and 100
- Budget values non-negative
- Setting status to "Complete" → enforce 100% completion
- Setting completion to 100% → suggest status change to "Complete"

### 10.5 Dependency Management
- Tasks declare dependencies on other tasks by ID code
- Visual dependency picker showing available tasks
- Warning when completing a task with incomplete dependencies
- Bulk "Validate Dependencies" action

### 10.6 Task Notes
- Append-only notes/journal per task
- Each note: author, content, timestamp

### 10.7 Task Slide-Out Panel
- Triggered from Gantt bar click or cross-project Tasks page
- Inline editing of key fields (status, priority, owner, completion %, dates, notes)
- "Go to Project" link for full context
- Task notes journal embedded in panel

---

## 11. Cross-Project Tasks View — Core

A dedicated "Tasks" page provides a unified view of all tasks across all projects.

### 11.1 Filtering
- By status, priority, owner
- Text search across task descriptions

### 11.2 Grouping
Tasks can be grouped by:
- **Status** (default)
- **Phase** — grouped as "Project Name → Phase Name"
- **Project**
- **Priority**
- **Owner**

### 11.3 Sorting
Within each group, sort by: Due Date (default), Priority, Status, Phase

### 11.4 Bulk Operations
- Select multiple tasks via checkboxes
- Bulk status change
- "Select All" visible tasks

### 11.5 Task Interaction
- Clicking a task opens the slide-out panel for inline editing
- Link to navigate to full project detail

---

## 12. Calendar View — Core

### 12.1 View Modes
- Month, week, and day views
- Navigate forward/back and "Today" button

### 12.2 Projects/Tasks Toggle
- **Projects mode** (default): Project schedule windows as time-range events
- **Tasks mode**: Individual tasks as events, color-coded by project phase

### 12.3 Interaction
- Clicking a project event → navigates to project detail
- Clicking a task event → navigates to project detail with task highlighted

---

## 13. Gantt Chart — Core

### 13.1 Timeline Display
- Interactive horizontal timeline: Projects > Phases > Tasks (collapsible hierarchy)
- View mode options: Day, Week, Month
- Auto-scroll to earliest upcoming date

### 13.2 Visual Indicators
- Tasks with inferred dates (no explicit dates) visually distinguished
- Inferred date count displayed to users

### 13.3 Drill-Down
- Clicking a project bar → project detail
- Clicking a phase bar → project detail with `?phase=PhaseName`
- Clicking a task bar → opens slide-out panel for inline editing

### 13.4 Left Panel
- Task/project names with expand/collapse

---

## 14. Admin Settings — Core

### 14.1 Branding Tab
- **Application Name**: Text input — displayed in nav bar, browser title, exports (default: "Darwin TaskLine")
- **Organization Logo**: Image upload (PNG, JPG, SVG, max 2MB) with drag-and-drop, preview, change, and remove
- Changes propagate immediately across all pages without reload

### 14.2 Notifications Tab
- **Notification Preferences**: Per user/team delivery channels (In-App, Email, Slack, Webhook) and event toggles (Overdue, Due Soon, Assignment, Status Change)
- **Webhook Subscriptions**: Outbound endpoints with event selection, secret, and active/inactive toggle
- **Recent Notifications**: View recent events with type, project, title, message, channels, timestamp

---

## 15. Risk Register — Enhanced

> [!NOTE]
> Risk management is **nice-to-have**. Include if schedule permits.

### 15.1 Risk Data Model

| Field | Type |
|-------|------|
| Title | String (required) |
| Description | Text |
| Probability | Integer 1–5 |
| Impact | Integer 1–5 |
| Risk Score | Computed: probability × impact |
| Status | Enum: Open, Mitigated, Accepted, Closed |
| Mitigation Plan | Text |
| Owner | String |
| Linked Task | Reference (optional) |

### 15.2 Behavior
- Managed per project on the project detail page
- Sorted by risk score (highest first)
- Create, edit, delete via inline forms

---

## 16. Governance — Enhanced

> [!NOTE]
> Governance features are **nice-to-have**.

### 16.1 User Access Policies
- Map user identifiers to roles (Admin / Editor / Viewer)
- Display as a table with add/remove actions

### 16.2 Audit Log
- Paginated, filterable list of all critical lifecycle actions
- Entity types: project, task, template, integration, webhook, user_access
- Each entry: timestamp, entity type, entity ID, action, actor, details

---

## 17. Data Export — Core

### 17.1 Excel Export
- Export project and task data as a formatted spreadsheet
- Workbook creator name uses the configured branding name
- Include project metadata and task detail sheets

---

## 18. Business Rules

### 18.1 Task Status Workflow
- Status → "Complete" enforces completion % = 100%
- Status → "Not Started" enforces completion % = 0%
- Completion % set to 100% → prompt to change status to "Complete"

### 18.2 Project Date Enforcement
- Target completion date ≥ start date
- Tasks with due dates beyond project target → warning (not hard block)

### 18.3 Dependency Enforcement
- Completing a task with incomplete dependencies → display warning
- "Validate Dependencies" action reports all unmet dependencies

### 18.4 Template-to-Project Flow
- Template selection pre-populates all tasks with new sequential IDs
- Task dates may offset from project start date based on template durations
- Template modifications do not affect existing projects

### 18.5 Governance Events
- All create/update/delete operations on projects, tasks, templates → audit log entries
- Webhook subscriptions triggered for matching events
- Activity feed entries for status changes, assignment changes, comments

---

## 19. Data Entities Summary

| Entity | Description | Tier |
|--------|-------------|------|
| Templates | Reusable project templates with phases and task library | Core |
| Projects | Project instances with lifecycle, dates, budget, status | Core |
| Tasks | Individual work items within projects | Core |
| Task Notes | Append-only journal entries per task | Core |
| Project Notes | Append-only journal entries per project | Core |
| Project Comments | Threaded discussion with @mention support | Core |
| Project Activities | Immutable timeline of project events | Core |
| Project Tags | Labeled color-coded categorization chips | Core |
| App Settings | Key-value config (branding, etc.) | Core |
| Notification Preferences | Delivery channel and event toggle config | Core |
| Notification Events | Generated alert/notification records | Core |
| Webhook Subscriptions | Outbound integration endpoints | Core |
| Project Risks | Risk register entries with scoring | Enhanced |
| User Access Policies | Role-based access control mappings | Enhanced |
| Audit Logs | Immutable governance record | Enhanced |
| Saved Views | Named filter/sort presets for task views | Future |
| Users | User identity — owned by host platform / auth layer | Dev Team |

---

## 20. API Requirements

### 20.1 API Surface
All data entities in §19 must have corresponding API endpoints supporting CRUD operations. Key operations:

- **Templates**: List (filter by status/group), Get, Create, Update, Delete
- **Projects**: List (filter by status), Get, Create, Update, Delete
- **Tasks**: List by project, List all (cross-project), Get, Create, Update, Delete, Bulk Update
- **Comments**: List by project, Create
- **Activities**: List by project
- **Notifications**: List/Update preferences, List events
- **Webhooks**: List, Create, Update, Delete
- **Branding**: Get, Update
- **Risks**: List by project, Create, Update, Delete *(Enhanced)*
- **Tags**: List by project, Create, Delete
- **Notes**: List by project/task, Create
- **Dashboard**: Portfolio summary, health, risk, and deadline data
- **Calendar**: Project and task events for date ranges
- **Gantt**: Hierarchical timeline data for all projects

### 20.2 API Validation
- Must match UI validation rules exactly (required fields, date ranges, enums)

### 20.3 API Authorization
- Enforce role-based access per §5
- Authentication mechanism is the development team's decision

---

## 21. AI / Agentic Readiness — Future

> [!NOTE]
> AI features are **future scope**. Design the data model and API to support these use cases, but do not implement them in v1.

Potential use cases to design for:
1. **Task breakdown suggestion** — Given a project brief, suggest a task list
2. **Risk summarization** — Summarize blockers and overdue items across a portfolio
3. **Status Q&A** — Natural-language queries about project/task status
4. **Remediation suggestions** — Suggest next steps for overdue tasks

Design constraints:
- Any AI-proposed write action requires explicit user confirmation
- AI actions must be permission-aware and role-compliant
- AI output must be editable before save

---

## 22. Future Integrations (Not in v1)

Design extensibility hooks but do not implement:

1. **O365 Calendar** — Link Outlook events to projects/tasks
2. **SharePoint** — Link documents/list items to project context
3. **Generic Connectors** — Framework for third-party data sources
4. **Integration Governance** — Connector-level permissions, source attribution, conflict resolution

---

## 23. Acceptance Criteria

1. Users can create a project from a published template with pre-populated tasks within 60 seconds.
2. Template task library is editable and persistent for future use.
3. Dashboard metrics are accurate and link to actionable detail.
4. Calendar and Gantt display project/task data correctly, including missing-date edge cases.
5. Gantt remains functional with incomplete dates by inferring a timeline (visually disclosed).
6. Tasks can be created, edited, and bulk-updated without errors.
7. Cross-project Tasks page correctly groups and sorts across all projects.
8. Slide-out panel allows inline task editing from Gantt and Tasks pages.
9. Admin branding changes propagate immediately without reload.
10. Excel export produces a complete, formatted workbook.
11. Role-based access is enforced on all API endpoints.

---

## 24. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first project creation from template | < 60 seconds |
| Template reuse rate | > 70% of projects use templates |
| Task field completion (owner + due date) | > 80% |
| On-time task completion rate | > 75% |
| Drill-down interaction rate (dashboard → detail) | > 50% of sessions |
| API error rate for create/update operations | < 1% |

---

## 25. Open Decisions for Development Team

1. Authentication and identity provider integration approach.
2. Role mapping from host-platform identity claims to app permissions.
3. Export format preferences beyond Excel (PDF, CSV, etc.).
4. Notification delivery integration (email provider, Slack config).
5. Logo storage approach (object storage, CDN, inline data URI).
6. Real-time update strategy (polling vs. WebSocket/SSE).
7. Saved view sharing scope (personal vs. team).

---

## Appendix: Demo Feature Matrix

| Feature | Page/Component | Status |
|---------|---------------|--------|
| Global nav bar with branding | AppLayout | ✅ In Demo |
| Command palette (Cmd+K) | CommandPalette | ✅ In Demo |
| Dashboard KPIs, health, risks, deadlines | Dashboard | ✅ In Demo |
| Project list with filters | Projects | ✅ In Demo |
| Project creation from template | CreateProject | ✅ In Demo |
| Project detail (header, tasks, bulk ops) | ProjectDetail | ✅ In Demo |
| Task add/edit dialogs | AddTaskDialog, EditTaskDialog | ✅ In Demo |
| Task dependency picker | DependencyPicker | ✅ In Demo |
| Bulk task operations | ProjectDetail | ✅ In Demo |
| Project tags | ProjectTagChips | ✅ In Demo |
| Project notes / journal | NotesJournal | ✅ In Demo |
| Task notes / journal | NotesJournal + TaskSlideOutPanel | ✅ In Demo |
| Activity feed & comments | UnifiedActivityFeed | ✅ In Demo |
| Cross-project Tasks view | Tasks | ✅ In Demo |
| Task slide-out panel | TaskSlideOutPanel | ✅ In Demo |
| Calendar (projects/tasks toggle) | Calendar | ✅ In Demo |
| Gantt chart with drill-down | GanttChart | ✅ In Demo |
| Template library (CRUD, publish, archive) | Templates | ✅ In Demo |
| Admin: Branding tab | AdminSettings | ✅ In Demo |
| Admin: Notifications & webhooks | AdminSettings | ✅ In Demo |
| Excel export | excelExport | ✅ In Demo |
| Risk register | ProjectRisks | ✅ In Demo |
| Admin: Governance & access policies | AdminSettings | ✅ In Demo |
| Audit log | AdminSettings | ✅ In Demo |
| Error boundary | ErrorBoundary | ✅ In Demo |
| Saved views UI | — | 📋 Spec Only |
| Webhook delivery (outbound calls) | — | 📋 Spec Only |
| RBAC enforcement on API | — | 📋 Spec Only |
| Authentication flow | — | 🔧 Dev Team |
