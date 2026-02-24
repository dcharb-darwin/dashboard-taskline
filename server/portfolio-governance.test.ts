import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@rtc.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Portfolio and Governance Features", () => {
  it("returns portfolio summary with health, throughput, and risk rows", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const summary = await caller.dashboard.portfolioSummary();
    expect(summary.totals.totalProjects).toBeGreaterThanOrEqual(0);
    expect(summary.totals.onTrack + summary.totals.atRisk + summary.totals.offTrack).toBe(
      summary.totals.totalProjects
    );
    expect(Array.isArray(summary.throughputByWeek)).toBe(true);
    expect(Array.isArray(summary.topRisks)).toBe(true);
  });

  it("records lifecycle audit entries and supports integration inbound events", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Governance Audit Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Audited task",
      status: "Not Started",
    });

    await caller.integrations.ingestEvent({
      source: "external-system",
      eventType: "sync",
      entityType: "project",
      entityId: String(project.id),
      payload: { ok: true },
    });

    const logs = await caller.governance.audit.list({ limit: 200 });
    expect(logs.some((entry) => entry.action === "project.create")).toBe(true);
    expect(logs.some((entry) => entry.action === "task.create")).toBe(true);
    expect(logs.some((entry) => entry.action === "integration.ingest.sync")).toBe(true);
  });

  it("manages access policies and webhook subscriptions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const role = await caller.governance.access.myRole();
    expect(role.role).toBe("Admin");
    expect(role.canAdminister).toBe(true);

    const policy = await caller.governance.access.setPolicy({
      openId: "governance-viewer",
      accessRole: "Viewer",
    });
    expect(policy.openId).toBe("governance-viewer");
    expect(policy.accessRole).toBe("Viewer");

    const policies = await caller.governance.access.listPolicies();
    expect(policies.policies.some((item) => item.openId === "governance-viewer")).toBe(true);

    const webhook = await caller.governance.webhooks.create({
      name: "Lifecycle Webhook",
      endpointUrl: "https://example.com/hooks/test",
      events: ["project.updated", "task.updated"],
      isActive: true,
    });
    expect(webhook.id).toBeGreaterThan(0);
    expect(webhook.events).toContain("project.updated");

    const updated = await caller.governance.webhooks.update({
      id: webhook.id,
      isActive: false,
      events: ["project.created"],
    });
    expect(updated.events).toContain("project.created");

    const listed = await caller.governance.webhooks.list({ includeInactive: true });
    expect(listed.some((item) => item.id === webhook.id)).toBe(true);

    const removed = await caller.governance.webhooks.remove({ id: webhook.id });
    expect(removed.success).toBe(true);
  });
});
