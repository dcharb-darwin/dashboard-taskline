# Changelog

All notable changes to the Darwin TaskLine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `externalId` field on projects — companion apps store their own correlation ID
- `metadata` JSON field on projects and tasks — domain-specific data bag for external systems
- `Closeout` project status — distinct phase for administrative wind-down after functional completion
- Full entity snapshot included in webhook payloads via `emitGovernanceEvent` entity param
- Gen2 integration test suite (`server/gen2-integration.test.ts`) — 15 tests covering externalId, metadata, Closeout, and tags API
- `docs/DATA_MODEL.md` — complete schema reference for all 16 tables
- `docs/API_REFERENCE.md` — all tRPC endpoints with input/output schemas
- `docs/INTEGRATION_GUIDE.md` — externalId, metadata, tags, actualBudget contract, webhooks, Closeout

### Changed
- Project status enum: `Planning | Active | On Hold | Closeout | Complete` (was: `Planning | Active | On Hold | Complete`)
- `emitGovernanceEvent` now accepts optional `entity` param, spread into webhook dispatch payload
- PRD §9.3 updated with externalId, metadata, Closeout, and actualBudget contract note
- PRD §10.1 updated with metadata field on tasks

### Backlog
- Refactor hardcoded project/task status enums to be DB-driven (single source of truth for UI dropdowns, filters, and badge colors)

## [2.0.0] - 2026-02-24 (gen2)

### Added
- White-label branding system (custom app name and logo via Admin → Branding)
- `BrandingContext` for live propagation of branding across entire UI
- Cross-project Tasks page with grouping (status/phase/project/priority/owner) and sorting
- Calendar Projects/Tasks toggle with phase color-coded task events
- Gantt Chart phase drill-down with `?phase=` URL navigation
- Project Detail phase grouping toggle with collapsible sections
- Admin Settings with Governance, Notifications, and Branding tabs
- Command Palette (`Cmd+K` / `Ctrl+K`) for quick navigation
- Clickable task rows in Project Detail (opens edit dialog)
- Task dependency picker and validation
- Project risks, notes/journal, tags, and activity feed components
- Unified activity feed and task slide-out panel

### Changed
- Renamed application from "RTC Project Manager" to "Darwin TaskLine"
- Renamed package from `rtc-project-manager` to `darwin-taskline`
- Dashboard subtitle updated to be brand-neutral
- Excel export creator updated to "Darwin TaskLine"

### Improved
- Project template schema now supports milestones
- Phase-aware sorting in task views
- Gantt drilldown map includes phase context

### Planned
- Bulk task operations
- Project cloning feature
- Task comments and activity log

## [1.3.0] - 2026-01-15

### Added
- Visual icons for all 14 template types using lucide-react components
- Icon indicators on template cards in CreateProject page
- Icon indicators on template cards in Templates page
- Icons change color when templates are selected (blue highlight)

### Changed
- Template cards now display distinctive icons (Megaphone, Calendar, Video, etc.)
- Improved visual recognition of template types

## [1.2.0] - 2026-01-15

### Changed
- **Improved project creation workflow**: Template selection now uses visual cards instead of dropdown
- Templates auto-select when clicked, eliminating redundant selection step
- Task preview shows immediately when template is selected with collapsible phase grouping
- Project details form only appears after template selection for clearer two-step workflow

### Added
- Task preview with phase grouping in project creation flow
- Visual template cards with selection indicators (checkmark icon)
- Collapsible task preview section

## [1.1.0] - 2026-01-14

### Added
- Edit Project functionality with comprehensive modal dialog
- Task filtering by status, priority, and owner
- Task sorting by due date, priority, and status
- Calendar view for visualizing projects by date
- Gantt Chart view for project timeline visualization
- Task editing modal with all 16 template fields
- Task creation modal for adding new tasks
- Excel export functionality for projects
- 14 project templates with pre-populated tasks (369 tasks total)
- Automatic task creation when selecting a template
- Database seeding script with sample projects and templates
- Comprehensive test suite (20 tests passing)
- Docker deployment configuration
- Local deployment documentation

### Changed
- Consolidated seed scripts (seed-database-updated.mjs → seed-database.mjs)
- Cleaned database to remove test data pollution
- Updated project schema to use projectManager instead of owner
- Improved project detail page layout with edit button

### Fixed
- TypeScript errors in EditProjectDialog component
- Calendar view now displays projects correctly
- Gantt Chart properly shows projects with date ranges
- Task ID auto-generation for new tasks

## [1.0.0] - 2026-01-14

### Added
- Initial release of Darwin TaskLine
- Project CRUD operations
- Task management with dependencies
- Dashboard with statistics and visualizations
- Template library with 14 project types
- User authentication via Manus OAuth
- SQLite database integration (via better-sqlite3 + Drizzle ORM)
- tRPC API with full type safety

---

**Author:** Daniel Charboneau  
**License:** MIT
