# Darwin TaskLine — Handoff PRD (Minimum Viable Product)

## Document Control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | February 26, 2026 |
| Product | Darwin TaskLine — Project & Task Management |
| Audience | Product Manager, Development Team |
| Status | Draft — Pending PM Review |

---

## Purpose

This document defines the **minimum viable functionality** for Darwin TaskLine v1 as user stories and acceptance criteria. It is intentionally **technology-agnostic** — the development team owns all architecture, infrastructure, and tooling decisions.

A working prototype is available as a Docker container for interactive reference:

```bash
SEED_ON_START=true docker compose up -d --build
open http://localhost:3000
```

> [!IMPORTANT]
> The prototype is a proof-of-concept. It demonstrates behavior, not production quality. Use it alongside this document to clarify intent.

---

## Scope

This PRD covers **only** the minimum functionality required for v1 launch:

| In Scope | Out of Scope |
|----------|-------------|
| Template management | Authentication / authorization |
| Project creation from templates | Infrastructure & deployment |
| Task assignment and tracking | Notifications & webhooks |
| Owner assignment | Risk register |
| Gantt chart view | Audit logging |
| Calendar view | Data export |
| Dashboard overview | AI features |
| Project detail workspace | Mobile responsiveness |

---

## Users and Roles

| Role | Description |
|------|-------------|
| **Admin** | Manages templates, configures application settings, full access to all features |
| **Project Manager** | Creates projects from templates, assigns tasks and owners, tracks progress |
| **Team Member** | Views assigned tasks, updates task status and completion |

> [!NOTE]
> Authentication and role enforcement are out of scope for this document. The dev team decides how to implement user identity and permissions.

---

## Epic 1: Template Management

Templates are reusable blueprints that define the phases and tasks for a project type. They ensure consistency across similar projects.

### US-1.1 — Browse Template Library

**As a** Project Manager  
**I want to** browse a library of project templates  
**So that** I can find the right starting point for a new project  

**Acceptance Criteria:**
- Display all templates with: name, group/category, version, task count, status, last updated
- Filter by status: All, Draft, Published, Archived
- Search by template name
- Only "Published" templates are available for project creation

### US-1.2 — Create a Template

**As an** Admin  
**I want to** create a new project template with phases and tasks  
**So that** my team can reuse it for future projects  

**Acceptance Criteria:**
- Template requires: Name, unique Template Key, Group, Version
- Template includes an ordered list of phases (e.g., "Planning", "Execution", "Closeout")
- Template includes a library of sample tasks, each with:
  - Task ID code (e.g., "T001")
  - Description (required)
  - Phase assignment
  - Priority (High / Medium / Low)
  - Duration in days
  - Default owner role
  - Dependencies (references to other task ID codes)
- New templates default to "Draft" status

### US-1.3 — Edit and Version a Template

**As an** Admin  
**I want to** edit an existing template's phases and tasks  
**So that** I can improve it based on lessons learned  

**Acceptance Criteria:**
- All template fields are editable
- Version number increments on significant changes
- Changes apply to **future** projects only — existing projects are unaffected
- Validation: no duplicate task IDs, no self-dependencies, no references to unknown task IDs

### US-1.4 — Publish, Archive, and Duplicate Templates

**As an** Admin  
**I want to** control the lifecycle of templates  
**So that** only approved templates are available for project creation  

**Acceptance Criteria:**
- **Publish**: Makes template available for project creation
- **Archive**: Removes from active use but retains for reference
- **Duplicate**: Creates a copy for variant creation

---

## Epic 2: Project Creation and Setup

Projects are created from templates to kick off work. The template pre-populates the project's phases and tasks.

### US-2.1 — Create a Project from a Template

**As a** Project Manager  
**I want to** create a new project by selecting a published template  
**So that** I start with a pre-built task list instead of building from scratch  

**Acceptance Criteria:**
- Step 1: Select from published templates (searchable/filterable list)
- Step 2: Fill in project details:
  - Project Name (required)
  - Description
  - Project Manager
  - Start Date
  - Target Completion Date (must be ≥ start date)
  - Budget
- On creation, all template tasks are cloned into the project with new sequential IDs (T001, T002…)
- Project creation should be achievable in **under 60 seconds**

### US-2.2 — Create a Blank Project

**As a** Project Manager  
**I want to** create a project without a template  
**So that** I can define tasks from scratch for unique projects  

**Acceptance Criteria:**
- Same project detail form as template-based creation, but no pre-populated tasks
- User can add tasks manually after creation

### US-2.3 — View Project List

**As a** Project Manager  
**I want to** see all projects in a filterable list  
**So that** I can find and navigate to any project quickly  

**Acceptance Criteria:**
- Display: name, template type, status, start date, target date, completion %, task count
- Filter by project status (Planning, Active, On Hold, Closeout, Complete)
- Search by project name
- Sort by various fields
- Clicking a project navigates to its detail page

### US-2.4 — Edit Project Details

**As a** Project Manager  
**I want to** update a project's metadata (name, dates, budget, status)  
**So that** I can keep project information current  

**Acceptance Criteria:**
- All project fields are editable
- Date validation: target completion ≥ start date
- Status options: Planning, Active, On Hold, Closeout, Complete

### US-2.5 — Delete a Project

**As a** Project Manager  
**I want to** delete a project I no longer need  
**So that** the project list stays clean  

**Acceptance Criteria:**
- Delete requires explicit confirmation
- Deleting a project removes all associated tasks

---

## Epic 3: Task Management and Assignment

Tasks are the individual work items within a project. They can be assigned to owners and tracked through status, priority, and completion.

### US-3.1 — View Tasks within a Project

**As a** Project Manager  
**I want to** see all tasks in a project, organized by phase or status  
**So that** I can understand the current state of work  

**Acceptance Criteria:**
- Tasks displayed in a list/table with: task ID, description, phase, status, priority, owner, due date, completion %
- Grouping options: by Status (default) or by Phase
- Phase grouping shows collapsible sections with phase name and task count
- Clickable rows open the task for editing

### US-3.2 — Add a Task to a Project

**As a** Project Manager  
**I want to** add new tasks to a project  
**So that** I can capture additional work items discovered during execution  

**Acceptance Criteria:**
- Task requires: Description (all other fields optional)
- Task ID auto-generates sequentially (avoids collisions with existing IDs)
- Option to select from the project's template task library or create freeform

### US-3.3 — Edit a Task

**As a** Project Manager or Team Member  
**I want to** update task details (status, owner, dates, completion %)  
**So that** the project reflects current progress  

**Acceptance Criteria:**
- Editable fields: description, phase, status, priority, owner, start date, due date, duration, completion %, notes
- Due date must be ≥ start date
- Completion % between 0 and 100
- Setting status to "Complete" → auto-set completion to 100%
- Setting completion to 100% → prompt to change status to "Complete"

### US-3.4 — Assign an Owner to a Task

**As a** Project Manager  
**I want to** assign a team member as the owner of a task  
**So that** there is clear accountability for each work item  

**Acceptance Criteria:**
- Owner field accepts a name or user identifier
- Owner is displayed on all task views (project detail, Gantt, calendar, cross-project tasks)
- Tasks can be filtered by owner

### US-3.5 — Bulk Edit Tasks

**As a** Project Manager  
**I want to** select multiple tasks and update them at once  
**So that** I can efficiently reassign or re-prioritize work  

**Acceptance Criteria:**
- Select tasks via checkboxes or "Select All Visible"
- Bulk edit supports: owner, status, priority, phase, dates, completion %
- Changes apply to all selected tasks

### US-3.6 — Manage Task Dependencies

**As a** Project Manager  
**I want to** declare dependencies between tasks  
**So that** the team knows which tasks must complete before others can start  

**Acceptance Criteria:**
- Tasks declare dependencies by referencing other task ID codes
- Visual dependency picker showing available tasks
- Warning when completing a task whose dependencies are incomplete
- Bulk "Validate Dependencies" action reports all unmet dependencies

### US-3.7 — View Tasks Across All Projects

**As a** Project Manager  
**I want to** see all tasks across every project in a single view  
**So that** I can track workload and deadlines across my portfolio  

**Acceptance Criteria:**
- Unified task list spanning all projects
- Filter by: status, priority, owner
- Search across task descriptions
- Group by: Status (default), Phase, Project, Priority, Owner
- Sort within groups by: due date (default), priority, status
- Clicking a task opens it for inline editing with a link back to the full project

---

## Epic 4: Gantt Chart

The Gantt chart provides a visual timeline of all projects and their tasks, supporting drill-down from portfolio level to individual tasks.

### US-4.1 — View Portfolio Gantt Chart

**As a** Project Manager  
**I want to** see all projects as horizontal bars on a timeline  
**So that** I can visualize overlapping schedules and resource conflicts  

**Acceptance Criteria:**
- Interactive horizontal timeline with collapsible hierarchy: Projects > Phases > Tasks
- Left panel shows project/phase/task names with expand/collapse controls
- Timeline columns support: Day, Week, Month view modes
- Auto-scrolls to the earliest upcoming date

### US-4.2 — Drill Down from Gantt

**As a** Project Manager  
**I want to** click on Gantt bars to see details  
**So that** I can quickly inspect or edit without leaving the timeline view  

**Acceptance Criteria:**
- Clicking a project bar → navigates to project detail page
- Clicking a phase bar → navigates to project detail filtered to that phase
- Clicking a task bar → opens a slide-out panel for inline task editing (status, priority, owner, dates, completion %, notes)
- Slide-out panel includes a "Go to Project" link for full context

### US-4.3 — Handle Missing Dates Gracefully

**As a** Project Manager  
**I want** the Gantt chart to still render tasks that don't have explicit dates  
**So that** incomplete data doesn't break the timeline view  

**Acceptance Criteria:**
- Tasks without dates are placed using inferred sequencing (based on project dates and task order)
- Inferred-date tasks are visually distinguished (e.g., lighter color, dashed border)
- A count of inferred-date tasks is displayed to the user

---

## Epic 5: Calendar View

The calendar provides a date-oriented view of project schedules and task deadlines.

### US-5.1 — View Calendar

**As a** Project Manager  
**I want to** see project timelines and task deadlines on a calendar  
**So that** I can plan around dates and identify conflicts  

**Acceptance Criteria:**
- Month, Week, and Day view modes
- Navigate forward/back and "Today" button
- Toggle between two modes:
  - **Projects mode** (default): project schedule windows shown as time-range bars
  - **Tasks mode**: individual tasks shown as events, color-coded by phase

### US-5.2 — Navigate from Calendar to Detail

**As a** Project Manager  
**I want to** click a calendar event to see its details  
**So that** I can quickly act on upcoming deadlines  

**Acceptance Criteria:**
- Clicking a project event → navigates to project detail page
- Clicking a task event → navigates to project detail with that task highlighted

---

## Epic 6: Dashboard Overview

The dashboard is the landing page providing a portfolio-level summary.

### US-6.1 — View Portfolio Summary

**As a** Project Manager  
**I want to** see key metrics at a glance when I open the app  
**So that** I know the overall health of my portfolio  

**Acceptance Criteria:**
- KPI cards showing:
  - Total Projects (count)
  - Total Tasks (count across all projects)
  - Completed Tasks (count + completion rate %)
  - Upcoming Deadlines (tasks due within 14 days)
- Each card is clickable and navigates to a relevant filtered view

### US-6.2 — Portfolio Health

**As a** Project Manager  
**I want to** see which projects are on track, at risk, or off track  
**So that** I can focus attention on struggling projects  

**Acceptance Criteria:**
- Health distribution: On Track / At Risk / Off Track counts
- Average completion percentage across all projects
- Top risks section: projects with the most overdue or blocked tasks (clickable → project detail)

### US-6.3 — Upcoming Deadlines

**As a** Project Manager  
**I want to** see tasks due in the next 14 days  
**So that** I don't miss approaching deadlines  

**Acceptance Criteria:**
- List of tasks due within 14 days
- Each entry: task description, project name, phase, due date, owner, priority, status
- Clickable → navigates to project detail with task highlighted

---

## Epic 7: Application Shell

### US-7.1 — Global Navigation

**As a** user  
**I want** persistent navigation across all pages  
**So that** I can move between features quickly  

**Acceptance Criteria:**
- Top navigation bar on all pages
- Links: Dashboard, Projects, Templates, Calendar, Gantt
- "New Project" action button always visible
- Application name and logo displayed (configurable by admin)

---

## Data Model Reference

The following data entities are required for minimum functionality. Field types and constraints are described here for PM and dev team alignment. No technology choices are implied.

### Project

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | |
| Description | No | |
| Template Reference | No | Link to source template |
| Project Manager | No | |
| Start Date | No | |
| Target Completion Date | No | Must be ≥ start date |
| Budget (planned) | No | |
| Budget (actual) | No | |
| Status | Yes | Planning, Active, On Hold, Closeout, Complete |

### Task

| Field | Required | Notes |
|-------|----------|-------|
| Task ID Code | Auto | Sequential within project (T001, T002…) |
| Description | Yes | |
| Project | Yes | Parent project |
| Phase | No | Must match a project/template phase |
| Status | Yes | Not Started, In Progress, Complete, On Hold |
| Priority | Yes | High, Medium, Low |
| Owner | No | |
| Start Date | No | |
| Due Date | No | Must be ≥ start date |
| Duration (days) | No | |
| Dependencies | No | References to other task ID codes |
| Completion % | Yes | 0–100 |
| Notes | No | |

### Template

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | |
| Template Key | Yes | Unique identifier |
| Group | Yes | Category grouping |
| Version | Yes | Integer |
| Status | Yes | Draft, Published, Archived |
| Phases | Yes | Ordered list of phase names |
| Sample Tasks | No | Array of task definitions |

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Status → Complete** | Setting a task to "Complete" sets completion to 100% |
| **Status → Not Started** | Setting a task to "Not Started" sets completion to 0% |
| **100% Completion** | Setting completion to 100% prompts user to mark as "Complete" |
| **Date Validation** | Target completion date ≥ start date (projects and tasks) |
| **Dependency Warning** | Warn when completing a task with incomplete dependencies |
| **Template Isolation** | Template changes apply to future projects only; existing projects unaffected |
| **Template Validation** | No duplicate task IDs, no self-dependencies, no references to unknown IDs |

---

## Demo Reference Screenshots

The following screenshots are from the working prototype running at `http://localhost:3000`:

````carousel
![Dashboard — Portfolio summary with KPI cards, health status, and top risks](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/dashboard_page_1772116343150.png)
<!-- slide -->
![Projects — Filterable project list with status, dates, and completion](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/projects_page_1772116352630.png)
<!-- slide -->
![Templates — Template library with group, version, and status](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/templates_page_1772116362324.png)
<!-- slide -->
![New Project — Step 1: Template selection](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/new_project_form_step1_1772116398215.png)
<!-- slide -->
![New Project — Step 2: Project details form](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/new_project_form_step2_1772116426912.png)
<!-- slide -->
![Calendar — Monthly view of project schedules](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/calendar_page_1772116372378.png)
<!-- slide -->
![Gantt — Timeline with collapsible project hierarchy](/Users/dcharb/.gemini/antigravity/brain/1a530235-c707-4753-8b57-2f5e00787a60/gantt_page_1772116384729.png)
````

---

## Acceptance Criteria Summary

1. A user can create a project from a published template with pre-populated tasks in **under 60 seconds**
2. Tasks can be assigned to owners and tracked by status, priority, and completion %
3. The Gantt chart renders a collapsible project > phase > task hierarchy on a timeline
4. The Gantt chart handles missing dates gracefully with inferred sequencing
5. The Calendar shows project schedules and task deadlines in month/week/day views
6. The Dashboard shows accurate portfolio-level KPIs that link to detail views
7. Templates are managed through a lifecycle: Draft → Published → Archived
8. Bulk task editing supports owner, status, priority, and date changes
9. Cross-project task view shows all tasks with filtering and grouping
10. All navigation is accessible from a persistent global nav bar
