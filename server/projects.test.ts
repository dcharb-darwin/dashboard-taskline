import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
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

  return ctx;
}

describe("Projects API", () => {
  let testProjectId: number;

  beforeAll(async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.create({
      name: "Test Project",
      description: "Test project description",
      templateType: "Marketing Campaign",
      status: "Planning",
    });

    testProjectId = result.id;
  });

  it("should have created test project in beforeAll", () => {
    expect(testProjectId).toBeGreaterThan(0);
  });

  it("should list all projects", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should get project by id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.getById({ id: testProjectId });

    expect(result).toBeDefined();
    expect(result?.id).toBe(testProjectId);
    expect(result?.name).toBe("Test Project");
  });

  it("should update a project", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.update({
      id: testProjectId,
      name: "Updated Test Project",
      status: "Active",
    });

    expect(result.success).toBe(true);

    const updated = await caller.projects.getById({ id: testProjectId });
    expect(updated?.name).toBe("Updated Test Project");
    expect(updated?.status).toBe("Active");
  });

  it("should delete a project", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.delete({ id: testProjectId });

    expect(result.success).toBe(true);

    const deleted = await caller.projects.getById({ id: testProjectId });
    expect(deleted).toBeUndefined();
  });
});

describe("Dashboard API", () => {
  it("should return dashboard statistics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toBeDefined();
    expect(result.totalProjects).toBeGreaterThanOrEqual(0);
    expect(result.activeProjects).toBeGreaterThanOrEqual(0);
    expect(result.totalTasks).toBeGreaterThanOrEqual(0);
    expect(result.completedTasks).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.upcomingDeadlines)).toBe(true);
  });
});

describe("Templates API", () => {
  it("should list all templates", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(14); // Should have 14 templates
  });

  it("should get template by id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.list();
    const firstTemplate = templates[0];

    if (firstTemplate) {
      const result = await caller.templates.getById({ id: firstTemplate.id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstTemplate.id);
      expect(result?.name).toBeDefined();
    }
  });
});
