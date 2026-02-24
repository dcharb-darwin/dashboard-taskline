# PRD-001: Template Platform (Upload, Manage, Version)

## Goal
Ship a production-ready template lifecycle for creating, importing, editing, versioning, publishing, and archiving project templates.

## Problem
- Template management is read-only today.
- Teams cannot upload new template types at runtime.
- No controlled versioning/publish process exists.

## Scope
### Backend
- Add template lifecycle APIs:
  - `listManage`
  - `create`
  - `update`
  - `createVersion`
  - `publish`
  - `archive`
  - `importJson`
- Support robust task payload parsing:
  - Accept both `taskDescription` and legacy `description`.
  - Validate and normalize incoming task fields.

### Data model
- Extend template model to support:
  - `templateGroupKey`
  - `version`
  - `status` (`Draft`, `Published`, `Archived`)
  - `uploadSource`
  - `updatedAt`

### Frontend
- Add template management page (`/templates/manage`) with:
  - List + status filtering
  - Create/edit modal
  - Create new version action
  - Publish/archive actions
  - JSON upload/import
- Keep existing `/templates` browser page for end users.

## Non-goals
- Excel/CSV parser in this phase (JSON import only).
- Advanced approval workflow for template publication.

## Acceptance criteria
- Admin can create a new template and see it in manager list.
- Admin can edit template metadata/tasks.
- Admin can create a new version from existing template.
- Admin can publish one version and archive others.
- Admin can import one or many templates from JSON.
- Existing project creation flow continues to work.

## Risks
- Existing DB instances need migration for new columns.
- Template JSON quality may vary; normalization must be defensive.
