# PRD-004A: Portfolio Governance MVP

## Goal
Deliver a practical first governance release that provides leadership visibility and admin controls without blocking daily delivery flows.

## Scope implemented
- Portfolio dashboard summary:
  - project health distribution (on track / at risk / off track)
  - milestone confidence buckets
  - throughput trend by week
  - top risk projects list
- Governance backend:
  - audit logs for template/project/task lifecycle + integration events
  - webhook subscription registry and outbound dispatch pipeline
  - user access policy mapping (Admin, Editor, Viewer)
- Integration endpoint:
  - inbound event ingestion with optional token gate (`INTEGRATION_INBOUND_TOKEN`)

## Acceptance criteria
- Leadership can inspect portfolio health and risk from the dashboard.
- Admins can review audit logs and manage webhook/user access policies.
- External systems can ingest and receive lifecycle events through integration endpoints/webhooks.
