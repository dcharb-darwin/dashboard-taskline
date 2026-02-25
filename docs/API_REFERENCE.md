# Darwin TaskLine — API Reference

All endpoints are tRPC procedures accessible via the tRPC client. Dates are serialized via SuperJSON. Currency values are integers (cents).

---

## Authentication

### `auth.me` — Query
Returns the current authenticated user or `null`.

### `auth.logout` — Mutation
Clears the session cookie. Returns `{ success: true }`.

---

## Templates

### `templates.list` — Query
Published templates only.
- **Input:** none
- **Returns:** `Template[]`

### `templates.listManage` — Query
All templates with filtering.
- **Input:** `{ status?: "All" | "Draft" | "Published" | "Archived", includeArchived?: boolean, templateGroupKey?: string }`
- **Returns:** `Template[]`

### `templates.getById` — Query
- **Input:** `{ id: number }`
- **Returns:** `Template | undefined`

### `templates.create` — Mutation
- **Input:** `{ name: string, templateKey: string, templateGroupKey?: string, version?: number, status?: "Draft" | "Published" | "Archived", description?: string, phases: string[], sampleTasks: TemplateTask[], uploadSource?: string }`
- **Returns:** `Template`

### `templates.update` — Mutation
- **Input:** `{ id: number, data?: Partial<TemplateInput>, sampleTasks?: TemplateTask[] }`
- **Returns:** `Template`

### `templates.createVersion` — Mutation
- **Input:** `{ sourceTemplateId: number }`
- **Returns:** `Template`

### `templates.publish` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `Template`

### `templates.archive` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `Template`

### `templates.importJson` — Mutation
- **Input:** `{ templates: TemplateInput[], publishImported?: boolean }`
- **Returns:** `{ createdCount: number, templates: Template[] }`

---

## Projects

### `projects.list` — Query
- **Input:** none
- **Returns:** `Project[]`

### `projects.getById` — Query
- **Input:** `{ id: number }`
- **Returns:** `Project | undefined`

### `projects.create` — Mutation
- **Input:**

| Field | Type | Required |
|-------|------|----------|
| name | string (min 1) | Yes |
| description | string | No |
| templateId | number | No |
| templateType | string | Yes |
| projectManager | string | No |
| startDate | Date | No |
| targetCompletionDate | Date | No |
| budget | integer (≥0) | No |
| actualBudget | integer (≥0) | No |
| externalId | string | No |
| metadata | string (JSON) | No |
| status | string | No (default: Planning) | Configurable via Admin — defaults: Planning, Active, On Hold, Closeout, Complete |

- **Returns:** `{ id: number }`

### `projects.update` — Mutation
- **Input:** `{ id: number }` + any fields from create (all optional). `externalId` and `metadata` accept `null` to clear.
- **Returns:** `{ success: true }`

### `projects.delete` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Tasks

### `tasks.listAll` — Query
All tasks across all projects.
- **Returns:** `Task[]`

### `tasks.listByProject` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `Task[]`

### `tasks.getById` — Query
- **Input:** `{ id: number }`
- **Returns:** `Task | undefined`

### `tasks.create` — Mutation
- **Input:**

| Field | Type | Required |
|-------|------|----------|
| projectId | number | Yes |
| taskId | string | No (auto-generated) |
| taskDescription | string (min 1) | Yes |
| startDate | Date | No |
| dueDate | Date | No |
| durationDays | integer (≥0) | No |
| dependency | string | No |
| owner | string | No |
| status | string | No | Configurable via Admin — defaults: Not Started, In Progress, Complete, On Hold |
| priority | string | No | Configurable via Admin — defaults: High, Medium, Low |
| phase | string | No |
| milestone | string | No |
| budget | integer (≥0) | No |
| actualBudget | integer (≥0) | No |
| approvalRequired | `Yes` \| `No` | No |
| approver | string | No |
| deliverableType | string | No |
| completionPercent | integer (0–100) | No |
| notes | string | No |
| metadata | string (JSON) | No |

- **Returns:** `Task`

### `tasks.update` — Mutation
- **Input:** `{ id: number }` + any fields from create (all optional)
- **Returns:** `{ success: true }`

### `tasks.bulkUpdate` — Mutation
- **Input:** `{ projectId: number, taskIds: number[], patch: { owner?, status?, priority?, phase?, milestone?, startDate?, dueDate?, completionPercent?, actualBudget?, clearOwner?, clearDates?, dateShiftDays?, enforceDependencyReadiness? } }`
- **Returns:** `{ updatedCount: number, failedIds: number[], validationIssues: DependencyValidationIssue[] }`

### `tasks.delete` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

### `tasks.validateDependencies` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `DependencyValidationIssue[]`

---

## Dashboard

### `dashboard.stats` — Query
Portfolio-level KPIs.
- **Returns:** `{ totalProjects, activeProjects, totalTasks, completedTasks, upcomingDeadlines: Task[] }`

### `dashboard.portfolioSummary` — Query
- **Returns:** `PortfolioSummary` (health, risks, throughput)

---

## Tags

### `tags.list` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `ProjectTag[]`

### `tags.listAll` — Query
- **Returns:** `ProjectTag[]`

### `tags.add` — Mutation
- **Input:** `{ projectId: number, label: string (1–50), color?: string (#hex6) }`
- **Returns:** `ProjectTag`

### `tags.remove` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Comments

### `comments.list` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `ProjectComment[]`

### `comments.create` — Mutation
- **Input:** `{ projectId: number, taskId?: number, content: string, mentions?: string }`
- **Returns:** `ProjectComment`

---

## Activities

### `activities.list` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `ProjectActivity[]`

---

## Notes

### `notes.listByProject` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `ProjectNote[]`

### `notes.createProjectNote` — Mutation
- **Input:** `{ projectId: number, content: string, authorName?: string }`
- **Returns:** `ProjectNote`

### `notes.listByTask` — Query
- **Input:** `{ taskId: number }`
- **Returns:** `TaskNote[]`

### `notes.createTaskNote` — Mutation
- **Input:** `{ taskId: number, content: string, authorName?: string }`
- **Returns:** `TaskNote`

---

## Risks

### `risks.list` — Query
- **Input:** `{ projectId: number }`
- **Returns:** `ProjectRisk[]`

### `risks.create` — Mutation
- **Input:** `{ projectId: number, title: string, description?: string, probability?: number, impact?: number, status?: string, mitigationPlan?: string, owner?: string, linkedTaskId?: number }`
- **Returns:** `ProjectRisk`

### `risks.update` — Mutation
- **Input:** `{ id: number, ... }` (same fields as create)
- **Returns:** `ProjectRisk`

### `risks.delete` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Notifications

### `notifications.getPreferences` — Query
- **Returns:** `NotificationPreference`

### `notifications.updatePreferences` — Mutation
- **Input:** Partial notification preference fields
- **Returns:** `NotificationPreference`

### `notifications.listEvents` — Query
- **Input:** `{ limit?: number }`
- **Returns:** `NotificationEvent[]`

---

## Webhooks

### `webhooks.list` — Query
- **Returns:** `WebhookSubscription[]`

### `webhooks.create` — Mutation
- **Input:** `{ name: string, endpointUrl: string, events: string, secret?: string, isActive?: "Yes" | "No" }`
- **Returns:** `WebhookSubscription`

### `webhooks.update` — Mutation
- **Input:** `{ id: number, name?, endpointUrl?, events?, secret?, isActive? }`
- **Returns:** `WebhookSubscription`

### `webhooks.delete` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Governance

### `governance.auditLog` — Query
- **Input:** `{ limit?: number, entityType?: string }`
- **Returns:** `AuditLog[]`

### `governance.listAccessPolicies` — Query
- **Returns:** `UserAccessPolicy[]`

### `governance.upsertAccessPolicy` — Mutation
- **Input:** `{ openId: string, accessRole: "Admin" | "Editor" | "Viewer" }`
- **Returns:** `UserAccessPolicy`

### `governance.deleteAccessPolicy` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Configurable Enums

### `enums.list` — Query
Returns all configurable enum groups with their current options.
- **Returns:** `{ projectStatus: EnumOption[], taskStatus: EnumOption[], taskPriority: EnumOption[], riskStatus: EnumOption[] }`

Each `EnumOption` has:
| Field | Type |
|-------|------|
| label | string |
| color | string (blue, green, yellow, orange, red, purple, pink, gray) |

### `enums.update` — Mutation
Replaces all options for a single enum group.
- **Input:** `{ group: "projectStatus" | "taskStatus" | "taskPriority" | "riskStatus", options: EnumOption[] }`
- **Returns:** `{ success: true }`

> [!NOTE]
> Enum options are stored in the `app_settings` table with `category = "enums"`. Shared type definitions live in `shared/enums.ts`.

---

## Admin / Branding

### `admin.getBranding` — Query
- **Returns:** `{ appName: string, logoUrl: string | null }`

### `admin.updateBranding` — Mutation
- **Input:** `{ appName?: string, logoUrl?: string | null }`
- **Returns:** `{ appName: string, logoUrl: string | null }`

---

## Saved Views

### `savedViews.list` — Query
- **Returns:** `SavedView[]`

### `savedViews.create` — Mutation
- **Input:** `{ name: string, description?: string, filters: string }`
- **Returns:** `SavedView`

### `savedViews.update` — Mutation
- **Input:** `{ id: number, name?, description?, filters? }`
- **Returns:** `SavedView`

### `savedViews.delete` — Mutation
- **Input:** `{ id: number }`
- **Returns:** `{ success: true }`

---

## Calendar

### `calendar.events` — Query
- **Input:** `{ start: Date, end: Date, mode?: "projects" | "tasks" }`
- **Returns:** Calendar event objects

---

## Gantt

### `gantt.data` — Query
- **Returns:** Hierarchical timeline data (projects → phases → tasks)
