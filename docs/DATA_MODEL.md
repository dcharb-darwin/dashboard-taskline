# Darwin TaskLine — Data Model Reference

All tables use SQLite via Drizzle ORM. Timestamps are Unix epoch integers. Currency fields (budget, actualBudget) are stored as cents.

---

## users

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| openId | text | NOT NULL, UNIQUE |
| name | text | nullable |
| email | text | nullable |
| loginMethod | text | nullable |
| role | text | enum: `user`, `admin` — default `user` |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |
| lastSignedIn | integer (timestamp) | NOT NULL, default now |

---

## templates

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | text | NOT NULL |
| templateKey | text | NOT NULL, UNIQUE |
| templateGroupKey | text | NOT NULL |
| version | integer | default 1, NOT NULL |
| status | text | enum: `Draft`, `Published`, `Archived` — default `Published` |
| description | text | nullable |
| phases | text | NOT NULL — JSON array of phase names |
| sampleTasks | text | NOT NULL — JSON array of task objects |
| uploadSource | text | default `manual`, NOT NULL |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## projects

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | text | NOT NULL |
| description | text | nullable |
| templateId | integer | FK → templates.id, nullable |
| templateType | text | NOT NULL |
| projectManager | text | nullable |
| startDate | integer (timestamp) | nullable |
| targetCompletionDate | integer (timestamp) | nullable |
| budget | integer | nullable — cents |
| actualBudget | integer | nullable — cents |
| externalId | text | nullable — companion app correlation ID |
| metadata | text | nullable — JSON bag for companion app data |
| status | text | configurable via Admin — defaults: `Planning`, `Active`, `On Hold`, `Closeout`, `Complete` |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## tasks

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| taskId | text | NOT NULL — sequential code (T001, T002…) |
| taskDescription | text | NOT NULL |
| startDate | integer (timestamp) | nullable |
| dueDate | integer (timestamp) | nullable |
| durationDays | integer | nullable |
| dependency | text | nullable — comma-separated task ID codes |
| owner | text | nullable |
| status | text | configurable via Admin — defaults: `Not Started`, `In Progress`, `Complete`, `On Hold` |
| priority | text | configurable via Admin — defaults: `High`, `Medium`, `Low` |
| phase | text | nullable |
| milestone | text | nullable |
| budget | integer | nullable — cents |
| actualBudget | integer | nullable — cents |
| approvalRequired | text | enum: `Yes`, `No` — default `No` |
| approver | text | nullable |
| deliverableType | text | nullable |
| completionPercent | integer | default 0, NOT NULL — 0–100 |
| notes | text | nullable |
| metadata | text | nullable — JSON bag for companion app data |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## task_notes

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| taskId | integer | FK → tasks.id (cascade delete), NOT NULL |
| authorName | text | NOT NULL, default `System` |
| content | text | NOT NULL |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## project_notes

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| authorName | text | NOT NULL, default `System` |
| content | text | NOT NULL |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## project_comments

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| taskId | integer | FK → tasks.id (set null on delete), nullable |
| authorName | text | NOT NULL |
| content | text | NOT NULL |
| mentions | text | nullable — JSON array of handles |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## project_activities

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| taskId | integer | FK → tasks.id (set null on delete), nullable |
| actorName | text | NOT NULL |
| eventType | text | enum: `comment_added`, `task_status_changed`, `task_assignment_changed`, `due_soon`, `overdue` |
| summary | text | NOT NULL |
| metadata | text | nullable — JSON |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## notification_preferences

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| scopeType | text | enum: `user`, `team` — default `team` |
| scopeKey | text | NOT NULL |
| inAppEnabled | text | enum: `Yes`, `No` — default `Yes` |
| emailEnabled | text | enum: `Yes`, `No` — default `No` |
| slackEnabled | text | enum: `Yes`, `No` — default `No` |
| webhookEnabled | text | enum: `Yes`, `No` — default `No` |
| webhookUrl | text | nullable |
| overdueEnabled | text | enum: `Yes`, `No` — default `Yes` |
| dueSoonEnabled | text | enum: `Yes`, `No` — default `Yes` |
| assignmentEnabled | text | enum: `Yes`, `No` — default `Yes` |
| statusChangeEnabled | text | enum: `Yes`, `No` — default `Yes` |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## notification_events

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| taskId | integer | FK → tasks.id (set null on delete), nullable |
| eventType | text | enum: `overdue`, `due_soon`, `assignment_changed`, `status_changed` |
| title | text | NOT NULL |
| message | text | NOT NULL |
| channels | text | NOT NULL — JSON array |
| metadata | text | nullable — JSON |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| entityType | text | enum: `project`, `task`, `template`, `integration`, `webhook`, `user_access` |
| entityId | text | NOT NULL |
| action | text | NOT NULL |
| actorOpenId | text | nullable |
| actorName | text | NOT NULL |
| details | text | nullable — JSON |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## webhook_subscriptions

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | text | NOT NULL |
| endpointUrl | text | NOT NULL |
| events | text | NOT NULL — JSON array of event names |
| secret | text | nullable |
| isActive | text | enum: `Yes`, `No` — default `Yes` |
| lastTriggeredAt | integer (timestamp) | nullable |
| lastStatus | text | nullable |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## user_access_policies

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| openId | text | NOT NULL, UNIQUE |
| accessRole | text | enum: `Admin`, `Editor`, `Viewer` — default `Editor` |
| updatedBy | text | nullable |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## app_settings

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| category | text | NOT NULL — `general`, `governance`, `notifications`, `templates`, `enums` |
| settingKey | text | NOT NULL, UNIQUE |
| value | text | NOT NULL — JSON-encoded |
| updatedBy | text | nullable |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## project_risks

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | NOT NULL |
| title | text | NOT NULL |
| description | text | nullable |
| probability | integer | NOT NULL, default 3 — 1–5 |
| impact | integer | NOT NULL, default 3 — 1–5 |
| riskScore | integer | NOT NULL, default 9 — probability × impact |
| status | text | configurable via Admin — defaults: `Open`, `Mitigated`, `Accepted`, `Closed` |
| mitigationPlan | text | nullable |
| owner | text | nullable |
| linkedTaskId | integer | nullable |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |

---

## project_tags

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| projectId | integer | FK → projects.id (cascade delete), NOT NULL |
| label | text | NOT NULL |
| color | text | NOT NULL, default `#3b82f6` |
| createdAt | integer (timestamp) | NOT NULL, default now |

---

## saved_views

| Column | Type | Constraints |
|--------|------|-------------|
| id | integer | PK, auto-increment |
| name | text | NOT NULL |
| description | text | nullable |
| filters | text | NOT NULL — JSON |
| createdBy | text | NOT NULL, default `System` |
| createdAt | integer (timestamp) | NOT NULL, default now |
| updatedAt | integer (timestamp) | NOT NULL, default now |
