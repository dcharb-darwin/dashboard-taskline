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

describe("Collaboration and Notification Features", () => {
  it("creates project comments with mentions and writes activity timeline entries", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Collaboration Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const task = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Comment target task",
      status: "Not Started",
    });

    const comment = await caller.collaboration.comments.create({
      projectId: project.id,
      taskId: task.id,
      content: "Please review @alex and @sam before launch.",
    });

    expect(comment.mentions).toContain("alex");
    expect(comment.mentions).toContain("sam");

    const comments = await caller.collaboration.comments.list({
      projectId: project.id,
    });
    expect(comments.some((item) => item.id === comment.id)).toBe(true);

    const activity = await caller.collaboration.activity.list({
      projectId: project.id,
      limit: 20,
    });
    expect(activity.some((item) => item.eventType === "comment_added")).toBe(true);
  });

  it("records task assignment/status changes into activity and notification events", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.collaboration.notificationPreferences.set({
      scopeType: "team",
      scopeKey: "default",
      channels: {
        inApp: true,
        email: false,
        slack: false,
        webhook: false,
        webhookUrl: "",
      },
      events: {
        overdue: true,
        dueSoon: true,
        assignmentChanged: true,
        statusChanged: true,
      },
    });

    const project = await caller.projects.create({
      name: "Task Change Notification Project",
      templateType: "Generic Project",
      status: "Planning",
    });

    const task = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Needs reassignment",
      owner: "Owner A",
      status: "Not Started",
      completionPercent: 0,
    });

    await caller.tasks.update({
      id: task.id,
      owner: "Owner B",
      status: "In Progress",
    });

    const activity = await caller.collaboration.activity.list({
      projectId: project.id,
      limit: 30,
    });
    const taskActivity = activity.filter((item) => item.taskId === task.id);
    expect(
      taskActivity.some((item) => item.eventType === "task_assignment_changed")
    ).toBe(true);
    expect(taskActivity.some((item) => item.eventType === "task_status_changed")).toBe(
      true
    );

    const notifications = await caller.collaboration.notifications.list({
      projectId: project.id,
      limit: 30,
    });
    const taskNotifications = notifications.filter((item) => item.taskId === task.id);
    expect(
      taskNotifications.some((item) => item.eventType === "assignment_changed")
    ).toBe(true);
    expect(taskNotifications.some((item) => item.eventType === "status_changed")).toBe(
      true
    );
  });

  it("generates overdue and due-soon alerts once per task/date fingerprint", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.collaboration.notificationPreferences.set({
      scopeType: "team",
      scopeKey: "default",
      channels: {
        inApp: true,
        email: false,
        slack: false,
        webhook: false,
        webhookUrl: "",
      },
      events: {
        overdue: true,
        dueSoon: true,
        assignmentChanged: true,
        statusChanged: true,
      },
    });

    const project = await caller.projects.create({
      name: "Schedule Alert Project",
      templateType: "Generic Project",
      status: "Active",
    });

    const now = Date.now();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000);

    const overdueTask = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Overdue task",
      dueDate: yesterday,
      status: "In Progress",
    });

    const dueSoonTask = await caller.tasks.create({
      projectId: project.id,
      taskDescription: "Due soon task",
      dueDate: tomorrow,
      status: "Not Started",
    });

    const firstRun = await caller.collaboration.notifications.generateDueAlerts({
      projectId: project.id,
      scopeType: "team",
      scopeKey: "default",
    });
    expect(firstRun.generatedCount).toBe(2);

    const secondRun = await caller.collaboration.notifications.generateDueAlerts({
      projectId: project.id,
      scopeType: "team",
      scopeKey: "default",
    });
    expect(secondRun.generatedCount).toBe(0);

    const notifications = await caller.collaboration.notifications.list({
      projectId: project.id,
      limit: 50,
    });
    const targetTaskIds = new Set([overdueTask.id, dueSoonTask.id]);
    const relevant = notifications.filter(
      (item) => item.taskId !== null && targetTaskIds.has(item.taskId)
    );

    expect(relevant.some((item) => item.eventType === "overdue")).toBe(true);
    expect(relevant.some((item) => item.eventType === "due_soon")).toBe(true);
  });
});
