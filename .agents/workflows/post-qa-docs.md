---
description: Update all project docs after successful QA of a feature
---

# Post-QA Documentation Update

After every successful QA session, update these docs to reflect the new feature. This ensures the handoff package stays current for the dev team and integrators.

// turbo-all

## Checklist

1. **PRD** (`docs/PRD.md`) — Update relevant sections: data models, page specs, admin tabs, appendix demo matrix. The PRD defines *what* the product does for the dev team handoff.

2. **Architecture** (`docs/ARCHITECTURE.md`) — Update: system overview, data model ER diagram, page map, server module map, frontend component tree, integration points, module decomposition roadmap.

3. **Data Model** (`docs/DATA_MODEL.md`) — Update table schemas: new columns, changed constraints, new tables. Mark configurable fields explicitly.

4. **API Reference** (`docs/API_REFERENCE.md`) — Add new endpoints, update input/output schemas, note field type changes (e.g. enum → configurable string).

5. **Integration Guide** (`docs/INTEGRATION_GUIDE.md`) — Add new integration points, update code examples, update Quick Reference table.

6. **CHANGELOG** (`CHANGELOG.md`) — Move completed Backlog items to Added/Changed/Fixed. Add entries for new features, API changes, and bug fixes.

7. **README** (`README.md`) — Update Features list if the feature is user-visible.

## After Updates

```bash
# Verify docs render as valid markdown (spot check)
# Commit with a clear message
git add -A
git commit -m "docs: update all docs for [feature name]"
git push origin gen2
```
