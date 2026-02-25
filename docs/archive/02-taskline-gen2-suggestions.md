# TaskLine gen2 — Suggested Changes

> These are lightweight, targeted suggestions to make TaskLine a better integration partner for micro apps on Launchpad. None of these turn TaskLine into something it isn't. It stays lightweight project/task management. These just make it easier for companion apps (like the Invoice Processing Coordinator) to talk to it.

> Principle: TaskLine should not grow into Project/Trello/Monday. It's a lightweight micro app. Every suggestion below should pass the test: "Does this make TaskLine better at being TaskLine, or does it make TaskLine try to be something else?"

---

## 1. External Reference ID on Projects

**Current:** Projects have an auto-increment `id` and no way for external systems to identify them.

**Suggestion:** Add an optional `externalId` text field to the `projects` table. Companion apps store their own project ID here so they can correlate without maintaining a separate mapping table.

```ts
externalId: text("externalId"), // optional, set by companion apps
```

**Why it matters:** The Invoice app needs to link its budget tracking to a TaskLine project. Right now it would have to maintain a `tasklineProjectId` mapping on its side. An `externalId` on TaskLine lets either app own the correlation. This is a generic integration pattern — useful for any companion app, not just invoicing.

**Does it bloat TaskLine?** No. One nullable text field. No UI change required. API just accepts it on create/update.

---

## 2. Metadata / Custom Fields (JSON bag)

**Current:** Projects and tasks have fixed fields. No way to attach domain-specific data without modifying the schema.

**Suggestion:** Add an optional `metadata` JSON text field to `projects` and `tasks`.

```ts
metadata: text("metadata"), // JSON — companion apps store domain-specific data here
```

**Why it matters:** The Invoice app might want to store `cfpNumber`, `projectNumber`, or `budgetHealthStatus` on the TaskLine project without TaskLine needing to know what those fields mean. This is the standard pattern for extensibility without schema bloat — Stripe, GitHub, and most API platforms do this.

**Does it bloat TaskLine?** No. One nullable JSON field. TaskLine UI can ignore it entirely. Companion apps read/write it via API. Optionally surface it as "Custom Fields" in the UI later — but that's not required now.

---

## 3. Webhook Payload Enhancement

**Current:** `webhookSubscriptions` table exists with event types and endpoint URLs. The PRD specs outbound webhooks but actual delivery is marked "Spec Only."

**Suggestion:** When webhook delivery is implemented, include the full entity payload in the webhook body (not just an event type and ID). This lets companion apps react without making a follow-up API call.

```json
{
  "event": "task_status_changed",
  "timestamp": "2026-02-25T...",
  "project": { "id": 1, "name": "Main Street Improvements", "externalId": "IPC-001", ... },
  "task": { "id": 42, "taskId": "T003", "status": "Complete", "completionPercent": 100, ... },
  "previous": { "status": "In Progress", "completionPercent": 75 }
}
```

**Why it matters:** The Invoice app subscribes to `task_status_changed` to update % scope complete on budget line items. If the webhook only says "task 42 changed," the Invoice app has to call back to get the details. Including the payload eliminates the round-trip.

**Does it bloat TaskLine?** No. It's a webhook delivery implementation detail. The schema doesn't change. Just a smarter serialization when firing webhooks.

---

## 4. Project Tags via API (already exists — confirm it's writable)

**Current:** `projectTags` table exists. Tags have a label and color. The PRD includes tags as Core.

**Suggestion:** Confirm that the tags API allows companion apps to create/update tags programmatically. The Invoice app would set tags like:

- `On Track` (green) — budget health is good
- `At Risk` (yellow) — % spent approaching threshold
- `Over Budget` (red) — invoices exceed budget

**Why it matters:** This is the lightest-weight integration possible. The Invoice app doesn't need to push a dashboard into TaskLine — it just sets a tag. TaskLine's existing dashboard, project list, and filtering all pick it up automatically. Zero UI change in TaskLine.

**Does it bloat TaskLine?** No. Tags already exist. This is just confirming they're API-writable by external callers.

---

## 5. Budget Fields — Clarify the Contract

**Current:** Projects have `budget` (planned) and `actualBudget` (spent), both stored in cents. Tasks have the same.

**Suggestion:** No schema change needed. Just document the contract: companion apps (like the Invoice app) are the authoritative writers of `actualBudget`. TaskLine displays it but doesn't compute it. This avoids conflicting sources.

For the PRD, add a note:

> `actualBudget` on projects may be updated by companion apps via the API. TaskLine displays this value but does not independently compute it. This enables financial tracking apps to push spend data into TaskLine's budget views without TaskLine needing to understand invoicing.

**Does it bloat TaskLine?** No. It's a documentation/contract clarification, not a code change.

---

## 6. Project Status — Add "Closeout" (maybe)

**Current:** Project status enum: `Planning | Active | On Hold | Complete`

**Suggestion:** Consider adding `Closeout` as a status. Capital projects (and many other project types) have a distinct closeout phase where the project is functionally complete but administrative work remains — final payments, documentation, grant reimbursement submissions.

Eric's Capital Gantt has "Final Payments and closeout" as a status. Shannon's projects have a similar wind-down period where invoicing continues after the work is done.

**Why it matters:** Without it, projects sit in "Active" during closeout (misleading) or get marked "Complete" before final invoices are processed (premature). This is a real workflow state, not a nice-to-have.

**Does it bloat TaskLine?** Borderline. One more enum value. If you're worried about scope creep, skip it — the Invoice app can track this state independently. But it's a common enough state that most project management contexts would benefit.

---

## 7. Read-Only / Viewer API Key (Future — not now)

**Current:** Auth is via OAuth. No API key pattern for service-to-service calls.

**Suggestion:** For production, the Invoice app will need a service account or API key to call TaskLine's tRPC endpoints. This doesn't need to be built now (prototype uses same-origin), but flag it for the dev team's PRD.

**Does it bloat TaskLine?** No. It's an auth-layer concern, not a feature. Just needs to be on the radar.

---

## What NOT to Suggest

These are things we explicitly do NOT want TaskLine to absorb:

| Feature | Why Not |
|---|---|
| Invoice tracking | That's the Invoice app's job |
| Contract management | That's the Invoice app's job |
| Financial reporting/dashboards | That's the Invoice app's job |
| SharePoint integration | Future integration layer or agent |
| Grant tracking | Future micro app |
| Budget code management | Springbrook owns this |
| Document management | SharePoint owns this |
| Approval workflows | Adobe Sign owns this, Invoice app coordinates |
| Resource management | Scope creep — not TaskLine's job |
| Time tracking | Scope creep — not TaskLine's job |
| Complex reporting/BI | Scope creep — Launchpad or agent layer |

TaskLine is lightweight project and task management with templates, timelines, and portfolio visibility. That's it. Everything else is a companion app or external system.

---

## Summary: 7 Suggestions, Ranked

| # | Suggestion | Effort | Impact | Recommendation |
|---|---|---|---|---|
| 1 | `externalId` on projects | Trivial | High | Do it — standard integration pattern |
| 2 | `metadata` JSON field | Trivial | High | Do it — extensibility without schema bloat |
| 3 | Full payload in webhooks | Small | Medium | Do when implementing webhook delivery |
| 4 | Tags writable via API | None (verify) | High | Confirm existing behavior |
| 5 | Document `actualBudget` contract | None (docs) | Medium | Add to PRD |
| 6 | `Closeout` project status | Trivial | Low-Medium | Optional — can live in Invoice app instead |
| 7 | Service API key pattern | Medium | Future | Flag for dev team, don't build now |
