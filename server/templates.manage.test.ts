import { beforeAll, describe, expect, it } from "vitest";
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

describe("Template Management API", () => {
  let sourceTemplateId = 0;

  beforeAll(async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const templates = await caller.templates.list();
    const marketingTemplate = templates.find((template) => template.templateKey === "marketing_campaign");
    sourceTemplateId = marketingTemplate?.id ?? 0;
  });

  it("lists templates in manager mode across statuses", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.listManage({
      status: "All",
      includeArchived: true,
    });

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThanOrEqual(14);
    expect(templates[0]).toHaveProperty("status");
    expect(templates[0]).toHaveProperty("version");
    expect(templates[0]).toHaveProperty("templateGroupKey");
  });

  it("creates and updates a draft template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.templates.create({
      name: "Community Outreach",
      templateKey: "community_outreach",
      description: "Outreach campaign template",
      status: "Draft",
      phases: ["Planning", "Execution", "Follow-up"],
      sampleTasks: [
        {
          taskId: "T001",
          taskDescription: "Define outreach objective",
          phase: "Planning",
          priority: "High",
        },
      ],
      uploadSource: "manual",
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe("Draft");

    const updated = await caller.templates.update({
      id: created.id,
      data: {
        description: "Updated outreach template",
        phases: ["Planning", "Execution", "Reporting"],
        sampleTasks: [
          {
            taskDescription: "Capture outreach report",
            phase: "Reporting",
          },
        ],
      },
    });

    expect(updated.description).toBe("Updated outreach template");
    expect(JSON.parse(updated.phases)).toEqual(["Planning", "Execution", "Reporting"]);
  });

  it("creates a new template version and publishes it", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    expect(sourceTemplateId).toBeGreaterThan(0);

    const version = await caller.templates.createVersion({
      sourceTemplateId,
    });

    expect(version.id).toBeGreaterThan(0);
    expect(version.status).toBe("Draft");
    expect(version.version).toBeGreaterThan(1);

    const published = await caller.templates.publish({ id: version.id });
    expect(published.status).toBe("Published");

    const groupTemplates = await caller.templates.listManage({
      status: "All",
      includeArchived: true,
      templateGroupKey: version.templateGroupKey,
    });
    const publishedVersions = groupTemplates.filter((template) => template.status === "Published");
    expect(publishedVersions).toHaveLength(1);
    expect(publishedVersions[0]?.id).toBe(version.id);
  });

  it("archives a template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.templates.create({
      name: "Archive Candidate",
      templateKey: "archive_candidate",
      description: "Template to archive",
      status: "Draft",
      phases: ["Planning"],
      sampleTasks: [{ taskDescription: "Temporary task", phase: "Planning" }],
      uploadSource: "manual",
    });

    const archived = await caller.templates.archive({ id: created.id });
    expect(archived.status).toBe("Archived");
  });

  it("imports templates from json payload", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.importJson({
      templates: [
        {
          name: "Imported Template A",
          templateKey: "imported_template_a",
          description: "Imported from JSON",
          phases: ["Planning", "Execution"],
          sampleTasks: [{ taskDescription: "Imported task", phase: "Planning" }],
        },
        {
          name: "Imported Template B",
          templateKey: "imported_template_b",
          description: "Imported from JSON",
          phases: ["Planning"],
          sampleTasks: [{ description: "Legacy field task", phase: "Planning" }],
        },
      ],
      publishImported: false,
    });

    expect(result.createdCount).toBe(2);
    expect(result.templates[0]?.status).toBe("Draft");
  });
});
