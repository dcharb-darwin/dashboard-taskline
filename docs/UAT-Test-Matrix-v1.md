# UAT Test Matrix v1: Project Tracking Micro-App

## Usage Notes
- This matrix is for implementation partner handoff and production readiness UAT.
- Execute in a staging environment with host-platform identity enabled.
- Roles used: Viewer, Contributor, Manager, Admin.
- Record Pass/Fail and evidence link for each case.

## Status Legend
- `Not Started`
- `In Progress`
- `Pass`
- `Fail`
- `Blocked`

## Test Matrix

| ID | Area | Role | Preconditions | Test Steps | Expected Result | Priority | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| UAT-001 | Identity | Viewer | User authenticated in host platform | Open micro-app | User enters app with no local login prompt | High | Not Started |  |
| UAT-002 | Identity | Viewer | Host token valid | Refresh app session | Session persists as expected | High | Not Started |  |
| UAT-003 | Permissions | Viewer | Viewer role | Attempt template publish action | Action blocked with permission message | High | Not Started |  |
| UAT-004 | Permissions | Contributor | Contributor role | Attempt template archive action | Action blocked with permission message | High | Not Started |  |
| UAT-005 | Permissions | Admin | Admin role | Open template management actions | Create/edit/publish/archive controls available | High | Not Started |  |
| UAT-006 | Template | Admin | Template manager open | Create template with valid metadata and tasks | Draft template created successfully | High | Not Started |  |
| UAT-007 | Template | Admin | Existing template | Add task to template task library and save | Task persists in template details after refresh | High | Not Started |  |
| UAT-008 | Template | Admin | Existing template | Save template with duplicate task IDs | Validation error shown; save prevented | High | Not Started |  |
| UAT-009 | Template | Admin | Existing template | Save template with unknown dependency task ID | Validation error shown; save prevented | High | Not Started |  |
| UAT-010 | Template | Admin | Draft template | Publish template | Template appears in project create flow | High | Not Started |  |
| UAT-011 | Template | Admin | Published template | Archive template | Archived template removed from default selection list | Medium | Not Started |  |
| UAT-012 | Project Create | Manager | Published template exists | Open template detail and click create project | Create flow preselects chosen template | High | Not Started |  |
| UAT-013 | Project Create | Manager | Create form open | Submit with required fields only | Project created successfully | High | Not Started |  |
| UAT-014 | Project Create | Manager | Create form open | Enter target completion before start date | Validation error; submit blocked | High | Not Started |  |
| UAT-015 | Project Create | Manager | Create form open | Create project from template | Tasks auto-generated from template defaults | High | Not Started |  |
| UAT-016 | Project Edit | Manager | Existing project | Update project metadata/status | Changes persist and reflect in list/detail | Medium | Not Started |  |
| UAT-017 | Project Delete | Manager | Existing project | Trigger delete and confirm | Project removed per policy with success feedback | Medium | Not Started |  |
| UAT-018 | Task Create | Contributor | Project detail open | Add task with valid values | Task appears in list with correct values | High | Not Started |  |
| UAT-019 | Task Create | Contributor | Add task dialog open | Save with empty description | Validation error; save prevented | High | Not Started |  |
| UAT-020 | Task Create | Contributor | Add task dialog open | Save with due date before start date | Validation error; save prevented | High | Not Started |  |
| UAT-021 | Task Edit | Contributor | Existing task | Set completion > 100 | Validation error; save prevented | High | Not Started |  |
| UAT-022 | Task Edit | Contributor | Existing task | Set negative budget or duration | Validation error; save prevented | High | Not Started |  |
| UAT-023 | Task IDs | Manager | Project has deleted prior tasks | Add new task after deletion | New task ID is unique and non-colliding | Medium | Not Started |  |
| UAT-024 | Task Bulk Update | Manager | Multiple tasks selected | Bulk update owner/status/priority | Selected tasks updated correctly | Medium | Not Started |  |
| UAT-025 | Task Bulk Update | Manager | Multiple tasks selected | Bulk date shift forward/backward | Dates shift correctly and persist | Medium | Not Started |  |
| UAT-026 | Dependencies | Manager | Task with unmet dependencies | Attempt mark dependent task complete (enforced) | Completion blocked with clear message | Medium | Not Started |  |
| UAT-027 | Dashboard | Viewer | Dashboard loaded | Click total projects KPI | Navigates to project list context | High | Not Started |  |
| UAT-028 | Dashboard | Viewer | Dashboard loaded | Click upcoming deadline row | Navigates to project detail with task context | High | Not Started |  |
| UAT-029 | Projects List | Viewer | Projects view loaded | Open with query filters in URL | Filters applied correctly on load | Medium | Not Started |  |
| UAT-030 | Calendar | Viewer | Calendar view loaded | Click project event | Opens corresponding project detail | Medium | Not Started |  |
| UAT-031 | Gantt | Viewer | Gantt view loaded | Render project with incomplete task dates | Gantt still renders with inferred schedule notice | High | Not Started |  |
| UAT-032 | Gantt | Viewer | Gantt task bar visible | Click task bar | Opens project detail with task context | High | Not Started |  |
| UAT-033 | Collaboration | Contributor | Project detail open | Add comment with mention | Comment saved; mention reflected in activity/notification | Medium | Not Started |  |
| UAT-034 | Notifications | Contributor | Notification settings available | Toggle preference and trigger event | Preference persists; feed behavior matches setting | Medium | Not Started |  |
| UAT-035 | Export | Manager | Existing project with tasks | Run export | Export file generated with expected fields | Medium | Not Started |  |
| UAT-036 | API | Manager | Valid auth context | Create/update entities via API | API succeeds and enforces same validation as UI | High | Not Started |  |
| UAT-037 | API | Viewer | Viewer role | Attempt restricted write via API | API denies action with permission error | High | Not Started |  |
| UAT-038 | AI-Ready | Manager | AI suggestions feature enabled | Request task breakdown suggestion | Suggestion generated without auto-saving | Medium | Not Started |  |
| UAT-039 | AI-Ready | Manager | Suggestion generated | Accept edited suggestion | Data writes only after explicit confirmation | High | Not Started |  |
| UAT-040 | AI-Ready | Viewer | Viewer role | Attempt AI-assisted write action | Action blocked by permission checks | High | Not Started |  |

## Signoff Checklist
1. All High priority tests are `Pass`.
2. No unresolved blocking defects.
3. Permission model verified against host-platform roles.
4. API behavior consistent with UI validation and authorization.
5. UAT artifacts archived (screenshots, logs, defect references).
