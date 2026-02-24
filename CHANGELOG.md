# Changelog

All notable changes to the RTC Project Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Initial release of RTC Project Manager
- Project CRUD operations
- Task management with dependencies
- Dashboard with statistics and visualizations
- Template library with 14 project types
- User authentication via Manus OAuth
- MySQL database integration
- tRPC API with full type safety

---

**Author:** Daniel Charboneau  
**License:** MIT
