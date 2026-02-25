# Darwin TaskLine — Architecture Guide

A comprehensive developer guide covering the full system: architecture, data model, page map, component tree, auth/webhook flows, and development workflow.

---

## 1. System Overview

Darwin TaskLine is a project management application built for capital infrastructure and government work. It tracks projects, tasks, budgets, milestones, risks, and governance across a portfolio.

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript, Vite, wouter (routing), shadcn/ui components |
| API | tRPC v11 (end-to-end type-safe RPC) |
| Backend | Node.js + Express, TypeScript |
| Database | SQLite via Drizzle ORM |
| Serialization | SuperJSON (dates, bigints) |
| Auth | OAuth via external provider (configurable) |
| Testing | Vitest |

---

## 2. Architecture Diagram

```mermaid
graph TB
    subgraph Browser
        A[React SPA<br/>Vite + wouter]
    end

    subgraph Server["Node.js Server"]
        B[Express + Middleware]
        C[tRPC Router Layer<br/>routers.ts]
        D[Data Access Layer<br/>db.ts]
        E[Governance Engine<br/>audit logs + webhooks]
        F[Excel Export<br/>excelExport.ts]
    end

    subgraph Storage
        G[(SQLite<br/>Drizzle ORM)]
    end

    subgraph External
        H[OAuth Provider]
        I[Webhook Endpoints]
    end

    A -- "tRPC HTTP calls<br/>(SuperJSON)" --> B
    B --> C
    C --> D
    C --> E
    C --> F
    D --> G
    E --> G
    E -- "POST payloads<br/>(entity snapshots)" --> I
    B -- "Session cookie" --> H
```

---

## 3. Data Model

### Entity Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        text openId UK
        text name
        text email
        text role
    }

    templates {
        int id PK
        text name
        text templateKey UK
        text status
        text phases "JSON array"
        text sampleTasks "JSON array"
    }

    projects {
        int id PK
        text name
        int templateId FK
        text templateType
        text externalId "companion ID"
        text metadata "JSON bag"
        text status "Planning|Active|On Hold|Closeout|Complete"
        int budget "cents"
        int actualBudget "cents"
    }

    tasks {
        int id PK
        int projectId FK
        text taskId "T001 T002..."
        text taskDescription
        text status "Not Started|In Progress|Complete|On Hold"
        text priority "High|Medium|Low"
        text phase
        text metadata "JSON bag"
        int budget "cents"
        int actualBudget "cents"
    }

    project_tags {
        int id PK
        int projectId FK
        text label
        text color
    }

    project_notes {
        int id PK
        int projectId FK
        text content
    }

    task_notes {
        int id PK
        int taskId FK
        text content
    }

    project_comments {
        int id PK
        int projectId FK
        int taskId FK "nullable"
        text content
        text mentions "JSON array"
    }

    project_activities {
        int id PK
        int projectId FK
        int taskId FK "nullable"
        text eventType
        text summary
    }

    project_risks {
        int id PK
        int projectId
        text title
        int probability
        int impact
        int riskScore
        text status
    }

    audit_logs {
        int id PK
        text entityType
        text entityId
        text action
        text actorName
    }

    webhook_subscriptions {
        int id PK
        text name
        text endpointUrl
        text events "JSON array"
    }

    notification_preferences {
        int id PK
        text scopeType
        text scopeKey
    }

    notification_events {
        int id PK
        int projectId FK
        int taskId FK "nullable"
        text eventType
        text title
    }

    user_access_policies {
        int id PK
        text openId UK
        text accessRole
    }

    app_settings {
        int id PK
        text category
        text settingKey UK
        text value "JSON"
    }

    saved_views {
        int id PK
        text name
        text filters "JSON"
    }

    templates ||--o{ projects : "spawns"
    projects ||--o{ tasks : "contains"
    projects ||--o{ project_tags : "tagged with"
    projects ||--o{ project_notes : "has"
    projects ||--o{ project_comments : "has"
    projects ||--o{ project_activities : "logs"
    projects ||--o{ project_risks : "tracks"
    projects ||--o{ notification_events : "generates"
    tasks ||--o{ task_notes : "has"
    tasks ||--o| project_comments : "linked from"
    tasks ||--o| project_activities : "referenced by"
    tasks ||--o| notification_events : "referenced by"
```

### Key Relationships

| Parent | Child | Relationship | On Delete |
|--------|-------|-------------|-----------|
| templates | projects | 1:N (optional) | SET NULL |
| projects | tasks | 1:N | CASCADE |
| projects | project_tags | 1:N | CASCADE |
| projects | project_notes | 1:N | CASCADE |
| projects | project_comments | 1:N | CASCADE |
| projects | project_activities | 1:N | CASCADE |
| projects | notification_events | 1:N | CASCADE |
| tasks | task_notes | 1:N | CASCADE |
| tasks | project_comments | 1:N (nullable FK) | SET NULL |

### Conventions

- **Timestamps**: Unix epoch integers (seconds since 1970)
- **Currency**: Stored as integers in cents ($125.50 → `12550`)
- **Enums**: Stored as text. Project/task statuses, priorities, and risk statuses are configurable via Admin → Statuses & Labels tab. Defaults are defined in `shared/enums.ts` and seeded into `app_settings`. Validation at the Zod schema layer uses `z.string()` for configurable fields.
- **JSON fields**: Stored as text, parsed by application code
- **IDs**: Auto-increment integers (SQLite `integer primary key`)

---

## 4. Page Map

```mermaid
graph LR
    subgraph Routes
        R1["/ → Dashboard"]
        R2["/projects → Projects"]
        R3["/projects/new → CreateProject"]
        R4["/projects/:id → ProjectDetail"]
        R5["/templates → Templates"]
        R6["/calendar → Calendar"]
        R7["/tasks → Tasks"]
        R8["/gantt → GanttChart"]
        R9["/admin → AdminSettings"]
    end

    subgraph "Data Queries"
        Q1["dashboard.stats<br/>dashboard.portfolioSummary"]
        Q2["projects.list"]
        Q3["templates.list"]
        Q4["projects.getById<br/>tasks.listByProject<br/>comments + activities + risks"]
        Q5["templates.list<br/>templates.listManage"]
        Q6["calendar.events<br/>projects.list<br/>tasks.listAll"]
        Q7["tasks.listAll"]
        Q8["gantt.data"]
        Q9["governance + webhooks<br/>notifications + settings"]
    end

    R1 --> Q1
    R2 --> Q2
    R3 --> Q3
    R4 --> Q4
    R5 --> Q5
    R6 --> Q6
    R7 --> Q7
    R8 --> Q8
    R9 --> Q9
```

| Route | Page | Key Features |
|-------|------|-------------|
| `/` | Dashboard | Portfolio KPIs, health grid, top risks, recent projects, upcoming deadlines |
| `/projects` | Projects | Card/table grid, status filter, search, health filter |
| `/projects/new` | CreateProject | Template picker → details form → auto-task creation |
| `/projects/:id` | ProjectDetail | Info card, risk register, task table (filter/sort/bulk edit), activity feed, notes, Gantt-on-page |
| `/templates` | Templates | Template card/table grid, task library editor, import/export JSON |
| `/calendar` | Calendar | react-big-calendar with project/task toggle, color-coded by status/phase |
| `/tasks` | Tasks | Cross-project task table with status/priority filters, bulk actions |
| `/gantt` | GanttChart | Hierarchical timeline (projects → phases → tasks) |
| `/admin` | AdminSettings | Branding, governance, webhooks, access policies, saved views, notification prefs |

---

## 5. Server Module Map

```mermaid
graph TB
    subgraph "_core/"
        I["index.ts<br/>Express + tRPC mount"]
        CTX["context.ts<br/>TrpcContext type"]
        TRPC["trpc.ts<br/>initTRPC + middleware"]
        OAUTH["oauth.ts<br/>OAuth flow handlers"]
        COOK["cookies.ts<br/>Session cookie mgmt"]
        ENV["env.ts<br/>Environment config"]
        VITE["vite.ts<br/>Dev/prod static serving"]
        SDK["sdk.ts<br/>API SDK utilities"]
        NOTIF["notification.ts<br/>Due-date alert engine"]
        SYS["systemRouter.ts<br/>Health check endpoint"]
    end

    subgraph "Feature Layer"
        R["routers.ts<br/>All tRPC procedures"]
        DB["db.ts<br/>Data access + MemoryState"]
        XL["excelExport.ts<br/>XLSX generation"]
    end

    subgraph "Shared Layer"
        EN["shared/enums.ts<br/>Types, defaults, color maps"]
    end

    I --> TRPC
    I --> OAUTH
    I --> VITE
    TRPC --> CTX
    R --> DB
    R --> XL
    R --> NOTIF
    R --> SDK
    R --> EN
    DB --> EN
```

### Module Sizes (complexity indicators)

| Module | Lines | Notes |
|--------|-------|-------|
| `server/db.ts` | ~2,100 | Data access for all 16 tables. Candidate for decomposition into domain repositories |
| `server/routers.ts` | ~1,600 | All tRPC procedures. Candidate for splitting into feature routers |
| `client/src/pages/ProjectDetail.tsx` | ~1,226 | Heaviest UI page. Could split into section components |
| `client/src/pages/Templates.tsx` | ~651 | Template management with inline task editor |
| `client/src/pages/Tasks.tsx` | ~600 | Cross-project task view with bulk editing |

---

## 6. Frontend Component Tree

```mermaid
graph TB
    APP["App.tsx"]
    APP --> TP["ThemeProvider"]
    TP --> EP["EnumProvider<br/>(useEnums hook)"]
    EP --> TT["TooltipProvider"]
    TT --> TOAST["Toaster (sonner)"]
    TT --> ROUTER["Router (wouter)"]

    ROUTER --> DASH["Dashboard"]
    ROUTER --> PROJ["Projects"]
    ROUTER --> CREATE["CreateProject"]
    ROUTER --> DETAIL["ProjectDetail"]
    ROUTER --> TMPL["Templates"]
    ROUTER --> CAL["Calendar"]
    ROUTER --> TASKS["Tasks"]
    ROUTER --> GANTT["GanttChart"]
    ROUTER --> ADMIN["AdminSettings"]

    subgraph "Shared Components"
        AL["AppLayout (sidebar + header)"]
        CMD["CommandPalette (⌘K)"]
        VT["ViewToggle (card/table)"]
    end

    subgraph "Project Components"
        EPD["EditProjectDialog"]
        ATD["AddTaskDialog"]
        ETD["EditTaskDialog"]
        TSOP["TaskSlideOutPanel"]
        PR["ProjectRisks"]
        PTC["ProjectTagChips"]
        NJ["NotesJournal"]
        UAF["UnifiedActivityFeed"]
        DP["DependencyPicker"]
    end

    DETAIL --> EPD
    DETAIL --> ATD
    DETAIL --> ETD
    DETAIL --> TSOP
    DETAIL --> PR
    DETAIL --> PTC
    DETAIL --> NJ
    DETAIL --> UAF

    TMPL --> DP
    TASKS --> ETD

    DASH --> AL
    PROJ --> AL
    DETAIL --> AL
```

---

## 7. Authentication & Authorization

```mermaid
sequenceDiagram
    participant B as Browser
    participant S as Server
    participant O as OAuth Provider

    B->>S: GET /api/auth/login
    S->>O: Redirect to OAuth authorize URL
    O->>B: Show login form
    B->>O: Submit credentials
    O->>S: Callback with auth code
    S->>O: Exchange code for tokens
    S->>S: Find or create user in DB
    S->>B: Set session cookie + redirect to /

    Note over B,S: Subsequent requests
    B->>S: tRPC call (session cookie)
    S->>S: Parse cookie → lookup user
    S->>B: Response with user context
```

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| Admin | Full access: create/edit/delete projects, templates, settings, governance |
| Editor | Create/edit projects and tasks. No access to admin settings or governance |
| Viewer | Read-only access to all data |

Access policies are stored in `user_access_policies` and managed via the Admin panel.

---

## 8. Webhook & Governance Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Router
    participant G as emitGovernanceEvent
    participant AL as audit_logs
    participant WS as webhook_subscriptions
    participant EP as External Endpoint

    C->>R: project.create / task.update / etc.
    R->>R: Execute mutation
    R->>G: emitGovernanceEvent(entityType, action, entity)
    G->>AL: INSERT audit_log record
    G->>WS: Query active subscriptions matching event
    G->>EP: POST webhook payload with entity snapshot
    EP-->>G: 200 OK
    G->>WS: Update lastTriggeredAt, lastStatus
```

### Webhook Payload Shape

```json
{
  "event": "project.updated",
  "entityType": "project",
  "entityId": "42",
  "action": "project.update",
  "actorName": "John Doe",
  "actorOpenId": "user-123",
  "entity": { "id": 42, "name": "Main St CIP", "status": "Closeout", "..." }
}
```

---

## 9. Template System

```mermaid
flowchart LR
    T["Template<br/>(phases + sampleTasks)"]
    T -->|"user selects"| CP["CreateProject form"]
    CP -->|"creates"| P["Project record"]
    CP -->|"for each sampleTask"| TK["Task records<br/>(auto-generated T001, T002...)"]
    P --- TK
```

- Templates define reusable project blueprints with phases and sample tasks
- When a project is created from a template, tasks are auto-generated with sequential IDs
- Templates support versioning (`createVersion`), publishing (`publish`), and archiving (`archive`)
- Import/export via JSON for sharing template libraries

---

## 10. Integration Points

| Point | Field / Endpoint | Direction | Purpose |
|-------|-----------------|-----------|---------|
| External ID | `projects.externalId` | Companion → TaskLine | Correlation ID for external systems |
| Metadata | `projects.metadata`, `tasks.metadata` | Companion → TaskLine | Domain-specific JSON data bag |
| Budget actuals | `projects.actualBudget`, `tasks.actualBudget` | Companion → TaskLine | Financial tracking push |
| Tags | `tags.add` / `tags.remove` | Companion → TaskLine | Visual status indicators |
| Webhooks | `webhook_subscriptions` | TaskLine → Companion | Event-driven notifications with entity snapshots |
| Closeout status | `projects.status = "Closeout"` | Bidirectional | Administrative wind-down phase |
| Configurable Enums | `enums.list` / `enums.update` | Admin → TaskLine | Dynamic status/priority/risk options |

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for implementation details and code examples.

---

## 11. Development Workflow

### Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server (hot reload) |
| `npm run check` | TypeScript type check (`tsc --noEmit`) |
| `npm run test` | Run Vitest test suite |
| `npm run build` | Production build (Vite + esbuild) |
| `npm run verify` | Full gate: check + test + build |
| `pnpm db:push` | Apply schema to SQLite |
| `pnpm db:seed` | Seed database with sample data |

### Branch Model

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `gen2` | Current development branch |
| `staging` | Release validation |

### CI Pipeline

GitHub Actions runs on push/PR: `install → check → test → build`

### Preflight (before any commit)

```bash
npm run verify   # Must pass before committing
```

---

## 12. Module Decomposition Roadmap

These are known structural improvements tracked for future work:

| Current Module | Planned Split | Rationale |
|---------------|--------------|-----------|
| `server/db.ts` (2,100 lines) | Domain repositories: `projectRepo.ts`, `taskRepo.ts`, `templateRepo.ts`, etc. | Reduce change risk, enable focused testing |
| `server/routers.ts` (1,600 lines) | Feature routers: `projectRouter.ts`, `taskRouter.ts`, `templateRouter.ts`, composed in `routers.ts` | Smaller review surface per feature |
| `ProjectDetail.tsx` (1,226 lines) | Container + section components: `ProjectInfo`, `TaskTable`, `ActivityFeed`, `RiskRegister` | Reduce cognitive load, enable lazy loading |
| ~~Hardcoded status enums~~ | ~~DB-driven config table + shared constants~~ | ✅ **Done** — `shared/enums.ts` + `EnumContext` + Admin Statuses & Labels tab |
