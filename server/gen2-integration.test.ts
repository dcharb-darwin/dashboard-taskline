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
            clearCookie: () => { },
        } as unknown as TrpcContext["res"],
    };

    return ctx;
}

describe("Gen2 Integration: externalId", () => {
    let projectId: number;

    it("should create a project with externalId", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const result = await caller.projects.create({
            name: "ExternalId Test Project",
            templateType: "Generic Project",
            externalId: "IPC-001",
        });
        projectId = result.id;
        expect(projectId).toBeGreaterThan(0);
    });

    it("should read back externalId", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const project = await caller.projects.getById({ id: projectId });
        expect(project).toBeDefined();
        expect(project?.externalId).toBe("IPC-001");
    });

    it("should update externalId", async () => {
        const caller = appRouter.createCaller(createTestContext());
        await caller.projects.update({ id: projectId, externalId: "IPC-002" });
        const project = await caller.projects.getById({ id: projectId });
        expect(project?.externalId).toBe("IPC-002");
    });

    it("should clear externalId with null", async () => {
        const caller = appRouter.createCaller(createTestContext());
        await caller.projects.update({ id: projectId, externalId: null });
        const project = await caller.projects.getById({ id: projectId });
        expect(project?.externalId).toBeNull();
    });
});

describe("Gen2 Integration: metadata on projects", () => {
    let projectId: number;

    it("should create a project with metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const meta = JSON.stringify({ cfpNumber: "CFP-2026-01", budgetHealth: "green" });
        const result = await caller.projects.create({
            name: "Metadata Test Project",
            templateType: "Generic Project",
            metadata: meta,
        });
        projectId = result.id;
        expect(projectId).toBeGreaterThan(0);
    });

    it("should read back metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const project = await caller.projects.getById({ id: projectId });
        expect(project).toBeDefined();
        const meta = JSON.parse(project!.metadata!);
        expect(meta.cfpNumber).toBe("CFP-2026-01");
        expect(meta.budgetHealth).toBe("green");
    });

    it("should update metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const newMeta = JSON.stringify({ cfpNumber: "CFP-2026-02" });
        await caller.projects.update({ id: projectId, metadata: newMeta });
        const project = await caller.projects.getById({ id: projectId });
        const meta = JSON.parse(project!.metadata!);
        expect(meta.cfpNumber).toBe("CFP-2026-02");
    });
});

describe("Gen2 Integration: metadata on tasks", () => {
    let projectId: number;
    let taskId: number;

    beforeAll(async () => {
        const caller = appRouter.createCaller(createTestContext());
        const result = await caller.projects.create({
            name: "Task Metadata Host",
            templateType: "Generic Project",
        });
        projectId = result.id;
    });

    it("should create a task with metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const meta = JSON.stringify({ invoiceRef: "INV-100" });
        const task = await caller.tasks.create({
            projectId,
            taskDescription: "Task with metadata",
            metadata: meta,
        });
        taskId = task.id;
        expect(task.metadata).toBe(meta);
    });

    it("should read back task metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const task = await caller.tasks.getById({ id: taskId });
        expect(task).toBeDefined();
        const meta = JSON.parse(task!.metadata!);
        expect(meta.invoiceRef).toBe("INV-100");
    });

    it("should update task metadata", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const newMeta = JSON.stringify({ invoiceRef: "INV-200" });
        await caller.tasks.update({ id: taskId, metadata: newMeta });
        const task = await caller.tasks.getById({ id: taskId });
        const meta = JSON.parse(task!.metadata!);
        expect(meta.invoiceRef).toBe("INV-200");
    });
});

describe("Gen2 Integration: Closeout project status", () => {
    let projectId: number;

    it("should create a project with Closeout status", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const result = await caller.projects.create({
            name: "Closeout Status Project",
            templateType: "Generic Project",
            status: "Closeout",
        });
        projectId = result.id;
        const project = await caller.projects.getById({ id: projectId });
        expect(project?.status).toBe("Closeout");
    });

    it("should update a project to Closeout status", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const result = await caller.projects.create({
            name: "Active Then Closeout",
            templateType: "Generic Project",
            status: "Active",
        });
        await caller.projects.update({ id: result.id, status: "Closeout" });
        const project = await caller.projects.getById({ id: result.id });
        expect(project?.status).toBe("Closeout");
    });
});

describe("Gen2 Integration: tags API writability", () => {
    let projectId: number;

    beforeAll(async () => {
        const caller = appRouter.createCaller(createTestContext());
        const result = await caller.projects.create({
            name: "Tags Test Project",
            templateType: "Generic Project",
        });
        projectId = result.id;
    });

    it("should add a tag via API", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const tag = await caller.tags.add({
            projectId,
            label: "On Track",
            color: "#22c55e",
        });
        expect(tag).toBeDefined();
        expect(tag.label).toBe("On Track");
        expect(tag.color).toBe("#22c55e");
    });

    it("should list tags for a project", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const tags = await caller.tags.list({ projectId });
        expect(tags.length).toBeGreaterThanOrEqual(1);
        expect(tags.some((t: { label: string }) => t.label === "On Track")).toBe(true);
    });

    it("should remove a tag via API", async () => {
        const caller = appRouter.createCaller(createTestContext());
        const tags = await caller.tags.list({ projectId });
        const target = tags.find((t: { label: string }) => t.label === "On Track");
        expect(target).toBeDefined();

        const result = await caller.tags.remove({ id: target!.id });
        expect(result.success).toBe(true);

        const remaining = await caller.tags.list({ projectId });
        expect(remaining.some((t: { label: string }) => t.label === "On Track")).toBe(false);
    });
});
