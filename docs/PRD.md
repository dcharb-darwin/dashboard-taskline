# Darwin TaskLine — Product Requirements Document (PRD)

## Document Control

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Date | February 24, 2026 |
| Product | Darwin TaskLine — Project & Task Management Micro-App |
| Audience | Product, Design, Engineering, QA, Implementation Partner |
| Status | Approved for Development |

---

## 1. Product Summary

Darwin TaskLine is a white-label project and task management micro-app designed for template-based delivery tracking, timeline visualization, and portfolio reporting. It provides fast project setup through reusable templates, clear execution tracking across phases, and actionable drill-down from summary views to task-level detail.

The application supports customizable branding (organization name and logo) and is designed as an embeddable micro-app where user identity and authentication may be inherited from a host platform.

---

## 2. Product Principles

1. **Lightweight by default** — Minimal required fields, fast daily use.
2. **Template-first** — Reuse through pre-defined project templates with phases and task libraries.
3. **Actionable drill-down** — Every summary metric links to the detail behind it.
4. **White-label ready** — Administrators customize branding without code changes.
5. **Cross-project visibility** — Tasks, calendar, and Gantt views span the full portfolio.
6. **API-first** — All functionality must be accessible through a well-defined API surface.
7. **AI-assistive readiness** — Design for future AI integrations (non-destructive, permission-aware).

---

## 3. Explicit Non-Goals (Out of Scope)

1. ERP or financial system integration.
2. Complex business rules engine or workflow automation.
3. Enterprise portfolio governance beyond basic access policies.
4. Local user management (signup, login, password lifecycle) — authentication is inherited.
5. Deep resource/capacity optimization modules.
6. Real-time multi-user collaboration (e.g., live cursors, co-editing).

---

## 4. Users and Roles

Roles may be passed from a host platform or managed within the app.

| Role | Permissions |
|------|------------|
| **Viewer** | View dashboard, projects, tasks, timelines, and comments. Read-only. |
| **Editor** | Update assigned tasks, add comments, update progress, create projects. |
| **Admin** | All Editor permissions plus: manage templates, governance settings, notification configuration, branding, user access policies, and integration settings. |

---

## 5. Navigation and Application Shell

### 5.1 Global Navigation Bar
The application must provide a persistent top navigation bar on all pages containing:
- Organization logo (custom or default icon) and application name (both configurable via branding)
- Navigation links to: Dashboard, Projects, Templates, Tasks, Calendar, Gantt, Admin
- "New Project" action button
- The logo and app name must link to the Dashboard

### 5.2 Command Palette
- Accessible via `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) from any page
- Provides quick navigation to any page, project, or action via keyboard search
- Results must include all navigable pages and recent projects
- Selected result navigates to the corresponding page

### 5.3 Toast Notifications
- Success, error, and informational messages must display as non-blocking toast notifications
- Toasts must auto-dismiss after a reasonable duration

### 5.4 Error Handling
- A global error boundary must catch unhandled exceptions and display a user-friendly fallback
- API errors must surface as toast messages with clear descriptions

---

## 6. Dashboard

The Dashboard is the landing page and provides a portfolio-level overview.

### 6.1 Summary Metrics (KPI Cards)
Display the following metrics as discrete cards:

| Metric | Description |
|--------|-------------|
| Total Projects | Count of all projects |
| Total Tasks | Count of all tasks across all projects |
| Completed Tasks | Count of tasks with status "Complete" and completion rate percentage |
| Upcoming Deadlines | Count of tasks due within the next 14 days |

### 6.2 Portfolio Health
- **Health distribution**: Count of projects categorized as On Track / At Risk / Off Track
- **Average completion**: Mean completion percentage across all projects
- **Milestone confidence**: Count of projects with High / Medium / Low milestone confidence

### 6.3 Top Risks
- List of projects with the most overdue tasks and blocked items
- Each entry must show project name, health status, overdue count, and blocked count
- Clicking a project must navigate to its detail page

### 6.4 Upcoming Deadlines
- List of tasks due within the next 14 days
- Each entry must show task description, project name (with phase context), due date, owner, priority, and status
- Clicking a task must navigate to its project detail page with the task highlighted

### 6.5 Recent Activity
- List of the most recent project activities across all projects
- Each entry must show timestamp, project name, event type, and description

### 6.6 Budget Summary
- Total planned budget vs. actual spend across all projects
- Budget utilization percentage

---

## 7. Template Management

### 7.1 Template Library
- Browse all templates with search and filtering
- Filter by status: All, Draft, Published, Archived
- Filter by template group
- Display template name, group, version, task count, status, and last updated date
- Only "Published" templates are available for project creation

### 7.2 Template Data Model
Each template must store:
- **Name** — Display name
- **Template Key** — Unique identifier string
- **Template Group Key** — Category grouping (e.g., "Marketing", "Planning", "Event")
- **Version** — Integer version number
- **Status** — Draft | Published | Archived
- **Description** — Optional text description
- **Phases** — Ordered list of phase names (e.g., "Phase 1: Concept & Planning", "Phase 2: Logistics")
- **Sample Tasks** — Array of task definitions (see section 7.3)
- **Upload Source** — Origin of template data ("manual", "xlsx", etc.)

### 7.3 Template Task Definition
Each sample task within a template includes:
- Task ID code (e.g., "T001")
- Description (required)
- Phase assignment
- Priority (High / Medium / Low)
- Duration in days
- Owner role
- Dependencies (list of task ID codes)
- Approval required flag
- Approver role
- Deliverable type
- Milestone name (optional)

### 7.4 Template Lifecycle
- **Create**: New template with phases and task library
- **Edit**: Modify template metadata, phases, and task definitions
- **Duplicate**: Copy template to create a variant
- **Publish**: Make template available for project creation
- **Archive**: Remove template from active use (retain for audit)
- **Version**: Increment version number on significant changes
- Template changes apply to future projects only; existing projects are unaffected

### 7.5 Template Validation
- No duplicate task IDs within a template
- No self-dependency (task cannot depend on itself)
- No dependency on unknown task IDs
- At least one task must have a description

---

## 8. Project Management

### 8.1 Project Creation
- Create from a published template (pre-populates phases and tasks) or as a blank project
- Template selection shows published templates with search/filter
- Project creation form fields:
  - Name (required)
  - Description
  - Template type (auto-filled from selected template)
  - Project manager
  - Start date
  - Target completion date
  - Budget (monetary value)
- Date validation: target completion date must be after start date
- Template-based creation auto-generates all tasks from the template's task library with auto-generated sequential task IDs

### 8.2 Project List View
- Display all projects with: name, template type, status, start date, target completion date, completion percentage, and task count
- Filter by status: All, Planning, Active, On Hold, Complete
- Search by project name
- Sort by various fields
- Click a project to navigate to its detail page

### 8.3 Project Data Model
Each project must store:
- Name, description
- Template reference (optional) and template type
- Project manager
- Start date and target completion date
- Planned budget and actual budget (monetary values stored in cents)
- Status: Planning | Active | On Hold | Complete
- Timestamps (created, updated)

### 8.4 Project Detail Page
The project detail page is the primary workspace and must include these sections:

#### 8.4.1 Project Header
- Project name, template type, and status
- Edit and delete actions (with confirmation for delete)
- Project metadata: manager, dates, budget, completion percentage, task counts

#### 8.4.2 Task List
- Display all tasks for the project grouped by configurable criteria
- **Group by options**: Status (default), Phase
- **Phase grouping with collapsible sections**: When grouped by phase, each phase section is collapsible and shows the phase name with task count
- Each task row must display: task ID code, description, phase, status, priority, owner, due date, completion %, planned/actual budget
- **Clickable rows**: Clicking anywhere on a task row opens the edit dialog (excluding checkbox and action buttons)
- Task selection checkboxes for bulk operations
- Add Task button

#### 8.4.3 Bulk Task Operations
- Select multiple tasks via checkboxes or "Select Visible" action
- Bulk edit supports: owner, status, priority, phase, start date, due date, completion %, planned budget, actual budget
- "Validate Dependencies" action checks all selected tasks for unmet dependency conditions

#### 8.4.4 Risk Register
- Add, view, and manage project risks
- Each risk has: title, description, probability (1-5), impact (1-5), risk score (probability × impact), status, mitigation plan, owner, linked task
- Risk statuses: Open, Mitigated, Accepted, Closed
- Display risks sorted by score (highest first)

#### 8.4.5 Project Tags
- Add lightweight labels/tags to categorize projects
- Each tag has a label and a color
- Tags are displayed as colored chips

#### 8.4.6 Project Notes / Journal
- Append-only journal entries per project
- Each note has author, content, and timestamp
- Notes are displayed in reverse chronological order

#### 8.4.7 Activity Feed
- Unified timeline of project activities
- Activity types: comment added, task status changed, task assignment changed, due soon, overdue
- Each entry has actor, event type, summary, and timestamp

#### 8.4.8 Comments
- Threaded comments on the project with @mention support
- Comments can optionally be associated with a specific task
- Display author, content, mentions, and timestamp

---

## 9. Task Management

### 9.1 Task Data Model
Each task must store:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Task ID Code | String | Auto-generated | Sequential (T001, T002, ...), unique within project |
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

### 9.2 Task Creation
- Add tasks from project detail page
- Option to select from template's task library or create freeform
- Task ID codes auto-generate sequentially (T001, T002, ...) and must avoid collisions with existing tasks

### 9.3 Task Editing
- Edit all task fields via a dialog/modal
- Inline editing via clicking any task row (opens edit dialog)
- Dedicated pencil icon also opens edit dialog

### 9.4 Task Validation
- Description is required
- Due date cannot be earlier than start date
- Completion % must be between 0 and 100
- Budget values must be non-negative
- Setting status to "Complete" should enforce 100% completion
- Setting completion to 100% should suggest status change to "Complete"

### 9.5 Task Dependency Management
- Tasks can declare dependencies on other tasks (by task ID code)
- Visual dependency picker showing available tasks
- Dependency validation: warn when completing a task whose dependencies are not yet complete
- "Validate Dependencies" bulk action checks readiness of selected tasks

### 9.6 Task Notes
- Append-only notes/journal per task
- Each note has author, content, and timestamp

---

## 10. Cross-Project Tasks View

A dedicated "Tasks" page provides a unified view of all tasks across all projects.

### 10.1 Filtering
- Filter by status: All, Not Started, In Progress, Complete, On Hold
- Filter by priority: All, High, Medium, Low
- Filter by owner: All, or specific owner name
- Text search across task descriptions

### 10.2 Grouping
Tasks can be grouped by any of the following axes:
- **Status** (default) — Groups tasks under status headers
- **Phase** — Groups tasks under project-scoped phase headers (format: "Project Name → Phase Name")
- **Project** — Groups tasks under project name headers
- **Priority** — Groups tasks under priority headers
- **Owner** — Groups tasks under owner name headers

### 10.3 Sorting
Within each group, tasks can be sorted by:
- Due Date (default)
- Priority
- Status
- Phase (alphabetical within project)

### 10.4 Task Display
Each task row must show:
- Task ID code and description
- Phase badge (with project name context)
- Status badge with color coding
- Priority indicator with color coding
- Owner
- Due date
- Completion percentage
- Clicking a task navigates to its project detail page with the task highlighted

---

## 11. Calendar View

### 11.1 View Modes
- Month, week, and day views
- Navigate forward/back and return to "Today"

### 11.2 Projects/Tasks Toggle
- **Projects mode** (default): Shows project schedule windows as time-range events
- **Tasks mode**: Shows individual tasks as events, color-coded by their project phase

### 11.3 Event Display
- Project events show project name and status
- Task events show task description, project name, phase name, and owner
- Color coding differentiates phases/projects

### 11.4 Interaction
- Clicking a project event navigates to the project detail page
- Clicking a task event navigates to the project detail page with the task highlighted

---

## 12. Gantt Chart View

### 12.1 Timeline Display
- Interactive horizontal timeline with project bars, phase bars, and task bars
- Hierarchical: Projects > Phases > Tasks (collapsible/expandable)
- View mode options: Day, Week, Month
- Auto-scroll to the earliest upcoming date

### 12.2 Visual Indicators
- Tasks with inferred dates (no explicit dates set) must be visually distinguished
- Date inference count must be displayed to users
- Critical path tasks (if identified) must be visually highlighted

### 12.3 Drill-Down Navigation
- Clicking a project bar navigates to the project detail page
- Clicking a phase bar navigates to the project detail page with `?phase=PhaseName` context
- Clicking a task bar navigates to the project detail page with `?task=TaskId` context (task highlighted)

### 12.4 Task List Panel
- Left-side panel showing task/project names with expand/collapse functionality
- Column width configurable per view mode

---

## 13. Admin Settings

The Admin page provides system-wide configuration organized in tabs.

### 13.1 Governance & Access Tab
- **User Access Policies**: Add, view, and manage user role assignments
  - Each policy maps a user identifier to a role (Admin / Editor / Viewer)
  - Display current policies in a table
  - Add new policies with user ID and role selection
- **Audit Log**: Paginated, filterable list of all governance actions
  - Each entry shows: timestamp, entity type, entity ID, action, actor name, details
  - Entity types: project, task, template, integration, webhook, user_access

### 13.2 Notifications Tab
- **Notification Preferences**: Configure delivery channels per scope
  - Scope types: user, team
  - Channels: In-App, Email, Slack, Webhook (with URL)
  - Event toggles: Overdue, Due Soon, Assignment, Status Change
  - Each preference can independently enable/disable channels and events
- **Webhook Subscriptions**: Manage outbound webhook endpoints
  - Each subscription: name, endpoint URL, subscribed events, secret, active/inactive status
  - Event types: project.created, project.updated, project.deleted, task.created, task.updated, task.deleted, template.created, template.updated, template.published, template.archived, integration.external_event
- **Recent Notifications**: View recent notification events with type, project, title, message, channels, and timestamp

### 13.3 Branding Tab
- **Application Name**: Text input to customize the display name shown in navigation bar, browser tab/title, and exports (default: "Darwin TaskLine")
- **Organization Logo**: Image upload for custom logo
  - Supports click-to-upload and drag-and-drop
  - Accepted formats: PNG, JPG, SVG
  - Maximum file size: 2MB
  - Preview of uploaded logo with change and remove actions
- **Save/Reset**: Save changes or reset to current values
- Branding changes must propagate immediately to all parts of the application without page reload

---

## 14. Data Export

### 14.1 Excel Export
- Export project and task data as a formatted spreadsheet
- Workbook must include the branding name as the creator
- Include project metadata and task detail sheets

---

## 15. Data Entities Summary

The application requires the following data entities:

| Entity | Description |
|--------|-------------|
| Users | User identity (SSO/OAuth), name, email, role |
| Templates | Reusable project templates with phases and task library |
| Projects | Project instances with lifecycle, dates, budget, status |
| Tasks | Individual work items within projects |
| Task Notes | Append-only journal entries per task |
| Project Notes | Append-only journal entries per project |
| Project Comments | Threaded discussion with @mention support |
| Project Activities | Immutable timeline of project events |
| Notification Preferences | Delivery channel and event toggle configuration |
| Notification Events | Generated alert/notification records |
| Audit Logs | Immutable governance record of all critical actions |
| Webhook Subscriptions | Outbound integration endpoint configuration |
| User Access Policies | Role-based access control mappings |
| App Settings | Key-value configuration store (branding, etc.) |
| Project Risks | Risk register entries with scoring |
| Project Tags | Labeled color-coded categorization chips |
| Saved Views | Named filter/sort presets for task views |

---

## 16. API Requirements

### 16.1 API Surface
All data entities listed in section 15 must have corresponding API endpoints supporting CRUD operations where applicable. Specifically:

- **Templates**: List (with status/group filters), Get, Create, Update, Delete
- **Projects**: List (with status filter), Get, Create, Update, Delete
- **Tasks**: List by project, List all (cross-project), Get, Create, Update, Delete, Bulk Update
- **Comments**: List by project, Create
- **Activities**: List by project
- **Notifications**: List preferences, Update preferences, List events
- **Webhooks**: List, Create, Update, Delete
- **User Access**: List policies, Add policy
- **Audit Logs**: List (with pagination and filtering)
- **Branding**: Get, Update
- **Risks**: List by project, Create, Update, Delete
- **Tags**: List by project, Create, Delete
- **Notes**: List by project/task, Create
- **Saved Views**: List, Create, Delete
- **Calendar**: API to return project and task events for date ranges
- **Gantt**: API to return hierarchical timeline data for all projects
- **Dashboard**: API to return portfolio summary, health, risk, and deadline data

### 16.2 API Validation
- API validation must match UI validation behavior exactly
- Required fields, date range checks, and enum constraints must be enforced server-side

### 16.3 API Authorization
- API must enforce role-based access per section 4
- Authentication via host-platform identity (OAuth/SSO)

---

## 17. Business Rules and Workflow Guardrails

### 17.1 Task Status Workflow
- When status is set to "Complete", completion % must be set to 100%
- When status is set to "Not Started", completion % must be set to 0%
- When completion % is manually set to 100%, prompt user to change status to "Complete"

### 17.2 Project Date Enforcement
- Target completion date must be on or after start date
- Tasks should not have due dates beyond the project's target completion date (warning, not hard block)

### 17.3 Dependency Enforcement
- When attempting to complete a task with incomplete dependencies, display a warning
- "Validate Dependencies" action must check all selected tasks and report unmet dependencies

### 17.4 Template-to-Project Flow
- When creating a project from a template, all sample tasks are instantiated with new sequential IDs
- Task dates may be offset from the project start date based on template duration definitions
- Template modifications do not retroactively affect existing projects

### 17.5 Governance Events
- All create, update, and delete operations on projects, tasks, and templates must generate audit log entries
- Webhook subscriptions must be triggered for matching events
- Activity feed entries must be generated for task status changes, assignment changes, and comments

---

## 18. AI / Agentic Readiness

AI features are optional and assistive. Design the system to support:

1. Suggesting task breakdown from a project brief or description
2. Summarizing project risk and blockers
3. Suggesting remediation actions for overdue tasks
4. Natural-language retrieval of project/task status
5. Any write action proposed by AI requires explicit user confirmation
6. AI actions must be permission-aware and role-compliant
7. AI output must be editable before save

---

## 19. Future Integrations (Not in Current Scope)

The following must be considered in architecture but not implemented:

1. **O365 Calendar** — Link Outlook events to projects/tasks
2. **SharePoint** — Link documents/list items to project context
3. **Generic Connectors** — Framework for third-party data sources
4. **Integration Governance** — Connector permissions, source attribution, conflict handling

---

## 20. Acceptance Criteria

1. A new user can create a project from a published template and have all tasks pre-populated within 60 seconds.
2. Template task library is editable and persistent for future project creation.
3. Dashboard metrics are accurate and link to actionable detail views.
4. Calendar and Gantt views display project and task data correctly, including edge cases with missing dates.
5. Gantt remains functional with incomplete task dates by inferring a timeline (with visual disclosure).
6. Tasks can be created, edited, and bulk-updated without runtime errors.
7. Cross-project Tasks page correctly groups and sorts tasks across all projects.
8. Admin branding changes (name and logo) propagate immediately across all pages without reload.
9. Audit log captures all critical lifecycle actions.
10. Notification preferences correctly control event delivery channels.
11. Role-based access is enforced on all API endpoints.
12. Excel export produces a complete, formatted workbook.

---

## 21. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first project creation from template | < 60 seconds |
| Template reuse rate | > 70% of projects use templates |
| Task field completion (owner + due date) | > 80% |
| On-time task completion rate | > 75% |
| Drill-down interaction rate (dashboard → detail) | > 50% of sessions |
| API error rate for create/update operations | < 1% |

---

## 22. Open Decisions for Build Partner

1. Final role mapping from host-platform identity claims to application permissions.
2. Export format preferences beyond Excel (PDF, CSV, etc.).
3. Notification delivery integration details (email provider, Slack workspace config).
4. Logo storage approach (cloud object storage vs. inline data URI vs. CDN).
5. AI feature rollout order and provider selection.
6. Saved view sharing scope (personal vs. team-wide).
7. Real-time update strategy (polling interval vs. WebSocket/SSE for live data).
