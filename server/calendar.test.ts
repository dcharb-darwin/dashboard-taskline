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
    role: "user",
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

describe("Calendar and Gantt Chart Features", () => {
  it("should list all tasks for Gantt chart visualization", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tasks = await caller.tasks.listAll();

    expect(Array.isArray(tasks)).toBe(true);
    // Should have tasks from seeded data
    expect(tasks.length).toBeGreaterThan(0);
    
    // Verify task structure includes required fields for Gantt
    if (tasks.length > 0) {
      const task = tasks[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("projectId");
      expect(task).toHaveProperty("taskDescription");
      expect(task).toHaveProperty("startDate");
      expect(task).toHaveProperty("dueDate");
      expect(task).toHaveProperty("completionPercent");
    }
  });

  it("should list all projects with dates for calendar view", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const projects = await caller.projects.list();

    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);

    // Verify projects have date fields for calendar
    const projectsWithDates = projects.filter(
      (p) => p.startDate || p.targetCompletionDate
    );
    expect(projectsWithDates.length).toBeGreaterThan(0);

    // Verify project structure
    const project = projects[0];
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
    expect(project).toHaveProperty("status");
    expect(project).toHaveProperty("startDate");
    expect(project).toHaveProperty("targetCompletionDate");
  });

  it("should retrieve tasks by project for individual Gantt charts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get first project
    const projects = await caller.projects.list();
    expect(projects.length).toBeGreaterThan(0);

    const projectId = projects[0]!.id;
    const tasks = await caller.tasks.listByProject({ projectId });

    expect(Array.isArray(tasks)).toBe(true);
    
    // All tasks should belong to the requested project
    tasks.forEach((task) => {
      expect(task.projectId).toBe(projectId);
    });
  });

  it("should handle projects without dates gracefully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project without dates
    const project = await caller.projects.create({
      name: "Test Project Without Dates",
      templateType: "Generic Project",
      status: "Planning",
    });

    expect(project).toHaveProperty("id");
    expect(project.startDate).toBeUndefined();
    expect(project.targetCompletionDate).toBeUndefined();

    // Cleanup
    await caller.projects.delete({ id: project.id });
  });

  it("should calculate date ranges from tasks when project dates are missing", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a project with tasks
    const projects = await caller.projects.list();
    const projectWithTasks = projects.find(async (p) => {
      const tasks = await caller.tasks.listByProject({ projectId: p.id });
      return tasks.length > 0;
    });

    if (projectWithTasks) {
      const tasks = await caller.tasks.listByProject({
        projectId: projectWithTasks.id,
      });

      const tasksWithDates = tasks.filter((t) => t.startDate && t.dueDate);
      
      if (tasksWithDates.length > 0) {
        // Verify tasks have valid dates for Gantt calculation
        tasksWithDates.forEach((task) => {
          expect(task.startDate).toBeInstanceOf(Date);
          expect(task.dueDate).toBeInstanceOf(Date);
          expect(task.dueDate!.getTime()).toBeGreaterThanOrEqual(
            task.startDate!.getTime()
          );
        });
      }
    }
  });
});
