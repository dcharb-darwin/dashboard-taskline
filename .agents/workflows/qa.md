---
description: Spin up the dev server for real-time QA and browser testing
---

## Live QA Workflow

// turbo-all

### Start Dev Server
1. Run the dev server:
```bash
npm run dev
```
The app will be available at **http://localhost:3000**.

### Browser QA
2. Open the browser to http://localhost:3000 and verify the following per phase:

**Phase 0 (SQLite Migration)**
- App loads without errors
- Dashboard shows KPI cards, portfolio health, recent projects
- Projects list loads
- Template library shows 14 templates

**Phase 1 (Admin Settings & Dashboard Linking)**
- `/admin` page loads with tabs (General, Governance, Notifications)
- Dashboard KPIs are clickable and navigate to filtered views
- Portfolio health sections link to projects

**Phase 2 (Risk Entity & Template Import/Export)**
- Create/edit/delete risks on a project
- Top Risks section on dashboard shows real data
- Export a template as JSON, re-import it

**Phase 3 (Global Tasks & UX)**
- `/tasks` page shows cross-project tasks with filters
- Gantt bar click opens slide-out panel
- Bulk select + action bar works

**Phase 4 (Gen2 Integration Fields)**
- Create a new project — verify `Closeout` appears in status dropdown
- Edit an existing project — verify `Closeout` status is selectable
- Verify existing status workflow (Planning → Active → Complete) unchanged
- Projects page status filter includes `Closeout`
- Calendar and Gantt views render `Closeout` projects normally

### Stop Dev Server
3. When done, stop the server with Ctrl+C or by terminating the command.

### Automated Verification
4. Run the full verification gate:
```bash
npm run verify
```
This runs TypeScript check + test suite + production build.
