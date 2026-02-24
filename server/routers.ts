import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

import * as db from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Templates router
  templates: router({
    list: publicProcedure.query(async () => {
      const { getAllTemplates } = await import("./db");
      return getAllTemplates();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getTemplateById } = await import("./db");
      return getTemplateById(input.id);
    }),
  }),

  // Projects router
  projects: router({
    list: publicProcedure.query(async () => {
      const { getAllProjects } = await import("./db");
      return getAllProjects();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getProjectById } = await import("./db");
      return getProjectById(input.id);
    }),
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          templateId: z.number().optional(),
          templateType: z.string(),
          projectManager: z.string().optional(),
          startDate: z.date().optional(),
          targetCompletionDate: z.date().optional(),
          budget: z.number().optional(),
          status: z.enum(["Planning", "Active", "On Hold", "Complete"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { createProject, createTask, getTemplateById } = await import("./db");
        const projectId = await createProject(input);
        
        // If template is selected, auto-create tasks from template
        if (input.templateId) {
          const template = await getTemplateById(input.templateId);
          if (template && template.sampleTasks) {
            let templateTasks: unknown = [];

            try {
              templateTasks = JSON.parse(template.sampleTasks);
            } catch (error) {
              console.warn(
                `[templates] Failed to parse sampleTasks for template ${template.id}:`,
                error
              );
            }

            if (Array.isArray(templateTasks)) {
              for (const rawTask of templateTasks) {
                if (!rawTask || typeof rawTask !== "object") continue;
                const taskDef = rawTask as Record<string, unknown>;
                const taskDescription = String(
                  taskDef.taskDescription ?? taskDef.description ?? ""
                ).trim();
                if (!taskDescription) continue;

                await createTask({
                  projectId,
                  taskId:
                    typeof taskDef.taskId === "string" && taskDef.taskId.trim()
                      ? taskDef.taskId
                      : undefined,
                  taskDescription,
                  phase:
                    typeof taskDef.phase === "string" ? taskDef.phase : null,
                  priority:
                    taskDef.priority === "High" ||
                    taskDef.priority === "Medium" ||
                    taskDef.priority === "Low"
                      ? taskDef.priority
                      : "Medium",
                  status: "Not Started",
                  owner:
                    typeof taskDef.owner === "string" ? taskDef.owner : null,
                  dependency:
                    typeof taskDef.dependency === "string"
                      ? taskDef.dependency
                      : null,
                  durationDays:
                    typeof taskDef.durationDays === "number"
                      ? taskDef.durationDays
                      : null,
                  approvalRequired:
                    taskDef.approvalRequired === "Yes" ||
                    taskDef.approvalRequired === "No"
                      ? taskDef.approvalRequired
                      : "No",
                  deliverableType:
                    typeof taskDef.deliverableType === "string"
                      ? taskDef.deliverableType
                      : null,
                  notes:
                    typeof taskDef.notes === "string" ? taskDef.notes : null,
                });
              }
            }
          }
        }
        
        return { id: projectId };
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          projectManager: z.string().optional(),
          startDate: z.date().optional(),
          targetCompletionDate: z.date().optional(),
          budget: z.number().optional(),
          status: z.enum(["Planning", "Active", "On Hold", "Complete"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateProject } = await import("./db");
        await updateProject(id, data);
        return { success: true };
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { deleteProject } = await import("./db");
      await deleteProject(input.id);
      return { success: true };
    }),
  }),

  // Tasks router
  tasks: router({
    listAll: publicProcedure.query(async () => {
      const { getAllTasks } = await import("./db");
      return getAllTasks();
    }),
    listByProject: publicProcedure.input(z.object({ projectId: z.number() })).query(async ({ input }) => {
      const { getTasksByProjectId } = await import("./db");
      return getTasksByProjectId(input.projectId);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getTaskById } = await import("./db");
      return getTaskById(input.id);
    }),
    create: publicProcedure
      .input(
        z.object({
          projectId: z.number(),
          taskId: z.string().optional(),
          taskDescription: z.string().min(1),
          startDate: z.date().optional(),
          dueDate: z.date().optional(),
          durationDays: z.number().optional(),
          dependency: z.string().optional(),
          owner: z.string().optional(),
          status: z.enum(["Not Started", "In Progress", "Complete", "On Hold"]).optional(),
          priority: z.enum(["High", "Medium", "Low"]).optional(),
          phase: z.string().optional(),
          budget: z.number().optional(),
          approvalRequired: z.enum(["Yes", "No"]).optional(),
          approver: z.string().optional(),
          deliverableType: z.string().optional(),
          completionPercent: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { createTask, getTaskById } = await import("./db");
        const id = await createTask(input);
        const task = await getTaskById(id);
        if (!task) throw new Error("Failed to retrieve created task");
        return task;
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          taskDescription: z.string().min(1).optional(),
          startDate: z.date().optional(),
          dueDate: z.date().optional(),
          durationDays: z.number().optional(),
          dependency: z.string().optional(),
          owner: z.string().optional(),
          status: z.enum(["Not Started", "In Progress", "Complete", "On Hold"]).optional(),
          priority: z.enum(["High", "Medium", "Low"]).optional(),
          phase: z.string().optional(),
          budget: z.number().optional(),
          approvalRequired: z.enum(["Yes", "No"]).optional(),
          approver: z.string().optional(),
          deliverableType: z.string().optional(),
          completionPercent: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateTask } = await import("./db");
        await updateTask(id, data);
        return { success: true };
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { deleteTask } = await import("./db");
      await deleteTask(input.id);
      return { success: true };
    }),
  }),

  // Dashboard router
  dashboard: router({
    stats: publicProcedure.query(async () => {
      const { getDashboardStats } = await import("./db");
      return getDashboardStats();
    }),
  }),

  // Export router
  export: router({
    projectToExcel: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        const { getProjectById, getTasksByProjectId } = await import("./db");
        const { generateProjectExcel } = await import("./excelExport");

        const project = await getProjectById(input.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        const tasks = await getTasksByProjectId(input.projectId);
        const buffer = await generateProjectExcel(project, tasks);

        // Return base64 encoded buffer
        return {
          filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}_Project_Plan.xlsx`,
          data: buffer.toString("base64"),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
