import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@rtc.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Task Validation and Sequencing", () => {
  it("rejects task creation when due date is before start date", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const project = await caller.projects.create({
      name: "Validation Date Range Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    await expect(
      caller.tasks.create({
        projectId: project.id,
        taskDescription: "Invalid date task",
        startDate: new Date("2026-03-10"),
        dueDate: new Date("2026-03-01"),
      }),
    ).rejects.toThrow(/Due date cannot be earlier than start date/i);
  });

  it("rejects task updates with completion percent above 100", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const project = await caller.projects.create({
      name: "Validation Completion Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const task = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Initial task",
      completionPercent: 10,
    });

    await expect(
      caller.tasks.update({
        id: task.id,
        completionPercent: 101,
      }),
    ).rejects.toThrow(/<=100|too big|completionPercent/i);
  });

  it("allocates the next task code from max existing value instead of row count", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const project = await caller.projects.create({
      name: "Task Code Sequence Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const first = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "First task",
    });
    const second = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Second task",
    });

    expect(first.taskId).toBe("T001");
    expect(second.taskId).toBe("T002");

    await caller.tasks.delete({ id: first.id });

    const third = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Third task",
    });

    expect(third.taskId).toBe("T003");
  });
});
