# Darwin TaskLine — Integration Guide

This guide explains how companion apps (like the Invoice Processing Coordinator) integrate with Darwin TaskLine via its tRPC API.

---

## External Reference ID (`externalId`)

Companion apps can store their own identifier on a TaskLine project so both systems can correlate records without maintaining a separate mapping table.

```bash
# Create a project with an external reference
projects.create({ name: "Main Street CIP", templateType: "Generic Project", externalId: "IPC-001" })

# Look up the project later
projects.list()  # → find by externalId === "IPC-001"

# Update or clear the reference
projects.update({ id: 42, externalId: "IPC-002" })  # change
projects.update({ id: 42, externalId: null })         # clear
```

**Contract:**
- `externalId` is an opaque text field. TaskLine does not validate or index it.
- The UI does not display it — it exists purely for API consumers.
- Companion apps are responsible for uniqueness within their domain.

---

## Metadata (JSON bag)

Both projects and tasks support an optional `metadata` field for storing domain-specific data without schema changes. This follows the standard extensibility pattern used by Stripe, GitHub, and similar platforms.

```bash
# Store companion app data on a project
projects.create({
  name: "Water Main Replacement",
  templateType: "Generic Project",
  metadata: JSON.stringify({ cfpNumber: "CFP-2026-01", budgetHealth: "green" })
})

# Read it back
const project = projects.getById({ id: 42 })
const meta = JSON.parse(project.metadata)  # → { cfpNumber: "CFP-2026-01", budgetHealth: "green" }

# Store data on a task
tasks.create({
  projectId: 42,
  taskDescription: "Process final invoice",
  metadata: JSON.stringify({ invoiceRef: "INV-100", vendorId: "V-042" })
})
```

**Contract:**
- `metadata` must be a valid JSON string if provided.
- TaskLine stores it as-is and does not parse, index, or display it.
- Companion apps own the schema within the JSON bag.

---

## Project Tags

Tags are the lightest-weight integration point. Companion apps can set colored tags via the API, and TaskLine's existing dashboard, project list, and filtering automatically pick them up.

```bash
# Set a budget health tag
tags.add({ projectId: 42, label: "On Track", color: "#22c55e" })

# Update health status (remove old, add new)
tags.remove({ id: tagId })
tags.add({ projectId: 42, label: "At Risk", color: "#eab308" })

# Suggested tag conventions for the Invoice app
# "On Track"   (green  #22c55e) — budget health is good
# "At Risk"    (yellow #eab308) — % spent approaching threshold
# "Over Budget" (red   #ef4444) — invoices exceed budget
```

**Contract:**
- Tags are writable via the tRPC API (`tags.add`, `tags.remove`).
- No duplicate-label enforcement — companion apps manage their own conventions.
- Tags appear as colored chips on project cards and detail pages.

---

## Budget Fields — `actualBudget` Contract

Projects and tasks both have `budget` (planned) and `actualBudget` (spent) fields, stored as integers in cents.

> **`actualBudget` on projects and tasks may be updated by companion apps via the API. TaskLine displays this value but does not independently compute it.** This enables financial tracking apps to push spend data into TaskLine's budget views without TaskLine needing to understand invoicing.

```bash
# Invoice app updates actual spend
projects.update({ id: 42, actualBudget: 1250000 })  # $12,500.00

# Task-level spend
tasks.update({ id: 99, actualBudget: 350000 })      # $3,500.00
```

---

## Webhook Payloads

When webhook delivery is active, TaskLine includes the full entity snapshot in the webhook body:

```json
{
  "event": "task.updated",
  "entityType": "task",
  "entityId": "99",
  "action": "task.update",
  "actorName": "System",
  "actorOpenId": "service-account",
  "projectId": 42,
  "taskId": "T003",
  "status": "Complete",
  "entity": {
    "id": 99,
    "projectId": 42,
    "taskId": "T003",
    "taskDescription": "Process final invoice",
    "status": "Complete",
    "completionPercent": 100,
    "metadata": "{\"invoiceRef\":\"INV-100\"}",
    "externalId": null
  }
}
```

This eliminates the need for companion apps to make follow-up API calls to get entity details after receiving a webhook event.

---

## Closeout Project Status

The default project status enum includes a `Closeout` state between `On Hold` and `Complete`:

```
Planning → Active → On Hold → Closeout → Complete
```

> [!NOTE]
> Project statuses are **configurable** via Admin → Statuses & Labels. The above is the default set. Custom statuses can be added, removed, or reordered through the API or the Admin UI.

**Use case:** Capital projects and many other project types have a distinct closeout phase where the project is functionally complete but administrative work remains — final payments, documentation, grant reimbursement submissions.

```bash
# Move a project to closeout
projects.update({ id: 42, status: "Closeout" })
```

---

## Configurable Enums

Project statuses, task statuses, task priorities, and risk statuses are all admin-configurable. This allows integrators to work with the exact options their organization uses.

```bash
# Read all enum groups
const enums = enums.list()
# → { projectStatus: [...], taskStatus: [...], taskPriority: [...], riskStatus: [...] }

# Each option has a label and color
# { label: "Active", color: "green" }

# Update an enum group (replaces all options)
enums.update({
  group: "projectStatus",
  options: [
    { label: "Planning", color: "blue" },
    { label: "Active", color: "green" },
    { label: "On Hold", color: "yellow" },
    { label: "Closeout", color: "orange" },
    { label: "Complete", color: "gray" },
    { label: "Archived", color: "gray" }
  ]
})
```

**Contract:**
- Enum options are stored in `app_settings` with `category = "enums"`.
- All status/priority fields on projects, tasks, and risks are `text` — not constrained enums. Any string value can be stored.
- The enum options define what appears in UI dropdowns, filters, and badge colors.
- Shared type definitions are in `shared/enums.ts`.
- Changes propagate immediately to all connected clients via React context (`EnumProvider`).

---

## Future: API Key Authentication

For production service-to-service calls, TaskLine will support API key authentication. This is **flagged for future implementation** — the current prototype uses same-origin OAuth. Do not build API key consumers until this feature is explicitly available.

---

## Quick Reference

| Integration Point | Field/Endpoint | Direction |
|-------------------|---------------|-----------|
| External ID | `projects.externalId` | Write (companion) → Read (TaskLine) |
| Metadata | `projects.metadata`, `tasks.metadata` | Write (companion) → Ignored (TaskLine UI) |
| Budget actuals | `projects.actualBudget`, `tasks.actualBudget` | Write (companion) → Display (TaskLine) |
| Tags | `tags.add`, `tags.remove` | Write (companion) → Display (TaskLine) |
| Webhooks | `webhook_subscriptions` | TaskLine → Push (companion) |
| Closeout status | `projects.status = "Closeout"` | Bidirectional |
| Configurable Enums | `enums.list`, `enums.update` | Read (companion) / Write (Admin) |
