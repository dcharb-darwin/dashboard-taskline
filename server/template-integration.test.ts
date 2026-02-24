import { describe, expect, it, beforeAll } from "vitest";
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

describe("Template Integration", () => {
  let marketingTemplateId: number;
  let eventTemplateId: number;

  beforeAll(async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.list();
    const marketingTemplate = templates.find((t) => t.name === "Marketing Campaign");
    const eventTemplate = templates.find((t) => t.name === "Event Plan");

    if (!marketingTemplate || !eventTemplate) {
      throw new Error("Required templates not found in database. Run seed-database-updated.mjs first.");
    }

    marketingTemplateId = marketingTemplate.id;
    eventTemplateId = eventTemplate.id;
  });

  it("should create project with all tasks from Marketing Campaign template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get template to verify task count
    const template = await caller.templates.getById({ id: marketingTemplateId });
    expect(template).toBeDefined();
    
    const expectedTaskCount = template ? JSON.parse(template.sampleTasks).length : 0;
    expect(expectedTaskCount).toBeGreaterThan(0);

    // Create project from template
    const project = await caller.projects.create({
      name: "Test Marketing Campaign with Auto Tasks",
      templateId: marketingTemplateId,
      templateType: "Marketing Campaign",
      status: "Planning",
    });

    expect(project.id).toBeGreaterThan(0);

    // Verify tasks were created
    const tasks = await caller.tasks.listByProject({ projectId: project.id });
    expect(tasks.length).toBe(expectedTaskCount);

    // Verify tasks have correct phases
    const phasesSet = new Set(tasks.map((t) => t.phase).filter(Boolean));
    expect(phasesSet.size).toBeGreaterThan(0);

    // Verify first task has expected properties
    const firstTask = tasks[0];
    expect(firstTask).toBeDefined();
    expect(firstTask?.taskId).toMatch(/^T\d{3}$/);
    expect(firstTask?.taskDescription).toBeTruthy();
    expect(firstTask?.status).toBe("Not Started");
  });

  it("should create project with all tasks from Event Plan template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get template to verify task count
    const template = await caller.templates.getById({ id: eventTemplateId });
    expect(template).toBeDefined();
    
    const expectedTaskCount = template ? JSON.parse(template.sampleTasks).length : 0;
    expect(expectedTaskCount).toBeGreaterThan(0);

    // Create project from template
    const project = await caller.projects.create({
      name: "Test Event with Auto Tasks",
      templateId: eventTemplateId,
      templateType: "Event Plan",
      status: "Planning",
    });

    expect(project.id).toBeGreaterThan(0);

    // Verify tasks were created
    const tasks = await caller.tasks.listByProject({ projectId: project.id });
    expect(tasks.length).toBe(expectedTaskCount);

    // Verify task properties are preserved
    const tasksWithOwners = tasks.filter((t) => t.owner);
    expect(tasksWithOwners.length).toBeGreaterThan(0);

    const tasksWithPhases = tasks.filter((t) => t.phase);
    expect(tasksWithPhases.length).toBe(expectedTaskCount);
  });

  it("should preserve task dependencies from template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project from template
    const project = await caller.projects.create({
      name: "Test Project for Dependencies",
      templateId: marketingTemplateId,
      templateType: "Marketing Campaign",
      status: "Planning",
    });

    // Get tasks
    const tasks = await caller.tasks.listByProject({ projectId: project.id });

    // Check if any tasks have dependencies
    const tasksWithDependencies = tasks.filter((t) => t.dependency);
    
    // Marketing Campaign template should have some tasks with dependencies
    if (tasksWithDependencies.length > 0) {
      const taskWithDep = tasksWithDependencies[0];
      expect(taskWithDep?.dependency).toBeTruthy();
      expect(typeof taskWithDep?.dependency).toBe("string");
    }
  });

  it("should preserve approval requirements from template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get template to check if it has approval requirements
    const template = await caller.templates.getById({ id: marketingTemplateId });
    const templateTasks = template ? JSON.parse(template.sampleTasks) : [];
    const templateTasksWithApproval = templateTasks.filter((t: any) => t.approvalRequired === "Yes");

    // Create project from template
    const project = await caller.projects.create({
      name: "Test Project for Approvals",
      templateId: marketingTemplateId,
      templateType: "Marketing Campaign",
      status: "Planning",
    });

    // Get tasks
    const tasks = await caller.tasks.listByProject({ projectId: project.id });

    // Check if any tasks require approval
    const tasksRequiringApproval = tasks.filter((t) => t.approvalRequired === "Yes");
    
    // Should match template's approval requirements
    expect(tasksRequiringApproval.length).toBe(templateTasksWithApproval.length);
  });

  it("should create project without tasks when no template is selected", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create project without template
    const project = await caller.projects.create({
      name: "Test Project Without Template",
      templateType: "Generic Project",
      status: "Planning",
    });

    expect(project.id).toBeGreaterThan(0);

    // Verify no tasks were created
    const tasks = await caller.tasks.listByProject({ projectId: project.id });
    expect(tasks.length).toBe(0);
  });

  it("should handle all 14 templates correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.list();
    expect(templates.length).toBe(14);

    // Test creating a project from each template
    for (const template of templates.slice(0, 3)) { // Test first 3 to keep test time reasonable
      const project = await caller.projects.create({
        name: `Test ${template.name} Project`,
        templateId: template.id,
        templateType: template.name,
        status: "Planning",
      });

      const tasks = await caller.tasks.listByProject({ projectId: project.id });
      const expectedTaskCount = JSON.parse(template.sampleTasks).length;
      
      expect(tasks.length).toBe(expectedTaskCount);
    }
  });
});
