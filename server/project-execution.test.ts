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

describe("Project Execution Features", () => {
  it("enforces workflow guardrails for completed tasks", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Workflow Guardrail Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const task = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Already complete task",
      status: "Complete",
      completionPercent: 100,
    });

    await expect(
      caller.tasks.update({
        id: task.id,
        status: "In Progress",
      })
    ).rejects.toThrow(/cannot move back/i);
  });

  it("validates dependency issues including missing and date conflicts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Dependency Validation Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    await caller.tasks.create({
      projectId: project.id,
      taskId: "T100",
      taskDescription: "Dependency source",
      startDate: new Date("2026-01-01"),
      dueDate: new Date("2026-01-10"),
      status: "In Progress",
    });

    await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Task with date conflict",
      startDate: new Date("2026-01-05"),
      dueDate: new Date("2026-01-12"),
      dependency: "T100",
      status: "Not Started",
    });

    await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Task with missing dependency",
      dependency: "T404",
      status: "Not Started",
    });

    const issues = await caller.tasks.validateDependencies({ projectId: project.id });

    expect(issues.some((issue) => issue.type === "date_conflict")).toBe(true);
    expect(issues.some((issue) => issue.type === "missing_dependency")).toBe(true);
  });

  it("bulk updates selected tasks and returns dependency warnings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Bulk Update Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const taskA = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Bulk A",
      status: "Not Started",
      completionPercent: 0,
    });

    const taskB = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Bulk B",
      status: "In Progress",
      completionPercent: 25,
    });

    const result = await caller.tasks.bulkUpdate({
      projectId: project.id,
      taskIds: [taskA.id, taskB.id],
      patch: {
        status: "Complete",
        owner: "Bulk Owner",
        actualBudget: 12345,
      },
    });

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(2);

    const updatedTasks = await caller.tasks.listByProject({ projectId: project.id });
    const updatedA = updatedTasks.find((task) => task.id === taskA.id);
    const updatedB = updatedTasks.find((task) => task.id === taskB.id);

    expect(updatedA?.status).toBe("Complete");
    expect(updatedB?.status).toBe("Complete");
    expect(updatedA?.completionPercent).toBe(100);
    expect(updatedB?.completionPercent).toBe(100);
    expect(updatedA?.owner).toBe("Bulk Owner");
    expect(updatedB?.owner).toBe("Bulk Owner");
    expect(updatedA?.actualBudget).toBe(12345);
    expect(updatedB?.actualBudget).toBe(12345);
  });
});
