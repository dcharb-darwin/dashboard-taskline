import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

import * as db from "./db";

const templateTaskSchema = z.object({
  taskId: z.string().trim().min(1).optional(),
  taskDescription: z.string().trim().min(1),
  phase: z.string().trim().min(1).optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  owner: z.string().trim().min(1).optional(),
  dependency: z.string().trim().min(1).optional(),
  durationDays: z.number().int().min(0).optional(),
  approvalRequired: z.enum(["Yes", "No"]).optional(),
  deliverableType: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

const projectStatusSchema = z.enum(["Planning", "Active", "On Hold", "Complete"]);
const taskStatusSchema = z.enum(["Not Started", "In Progress", "Complete", "On Hold"]);
const taskPrioritySchema = z.enum(["High", "Medium", "Low"]);
const approvalRequiredSchema = z.enum(["Yes", "No"]);

const ensureProjectDateRange = (
  value: { startDate?: Date; targetCompletionDate?: Date },
  ctx: z.RefinementCtx,
) => {
  if (
    value.startDate &&
    value.targetCompletionDate &&
    value.targetCompletionDate.getTime() < value.startDate.getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetCompletionDate"],
      message: "Target completion date cannot be earlier than start date.",
    });
  }
};

const projectCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().optional(),
    templateId: z.number().optional(),
    templateType: z.string().trim().min(1),
    projectManager: z.string().optional(),
    startDate: z.date().optional(),
    targetCompletionDate: z.date().optional(),
    budget: z.number().int().min(0).optional(),
    status: projectStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    ensureProjectDateRange(value, ctx);
  });

const projectUpdateSchema = z
  .object({
    id: z.number(),
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    projectManager: z.string().optional(),
    startDate: z.date().optional(),
    targetCompletionDate: z.date().optional(),
    budget: z.number().int().min(0).optional(),
    status: projectStatusSchema.optional(),
  })
  .superRefine((value, ctx) => {
    ensureProjectDateRange(value, ctx);
  });

const ensureTaskDateRange = (value: { startDate?: Date; dueDate?: Date }, ctx: z.RefinementCtx) => {
  if (value.startDate && value.dueDate && value.dueDate.getTime() < value.startDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "Due date cannot be earlier than start date.",
    });
  }
};

const taskCreateSchema = z
  .object({
    projectId: z.number(),
    taskId: z.string().trim().min(1).optional(),
    taskDescription: z.string().trim().min(1),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
    durationDays: z.number().int().min(0).optional(),
    dependency: z.string().optional(),
    owner: z.string().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    phase: z.string().optional(),
    budget: z.number().int().min(0).optional(),
    approvalRequired: approvalRequiredSchema.optional(),
    approver: z.string().optional(),
    deliverableType: z.string().optional(),
    completionPercent: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    ensureTaskDateRange(value, ctx);
  });

const taskUpdateSchema = z
  .object({
    id: z.number(),
    taskId: z.string().trim().min(1).optional(),
    taskDescription: z.string().trim().min(1).optional(),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
    durationDays: z.number().int().min(0).optional(),
    dependency: z.string().optional(),
    owner: z.string().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    phase: z.string().optional(),
    budget: z.number().int().min(0).optional(),
    approvalRequired: approvalRequiredSchema.optional(),
    approver: z.string().optional(),
    deliverableType: z.string().optional(),
    completionPercent: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    ensureTaskDateRange(value, ctx);
  });

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
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().trim().min(1).optional(),
          description: z.string().trim().optional().nullable(),
          sampleTasks: z.array(templateTaskSchema).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, sampleTasks, ...rawData } = input;
        const { updateTemplate } = await import("./db");

        const updateData: {
          name?: string;
          description?: string | null;
          sampleTasks?: string;
          phases?: string;
        } = {};

        if (rawData.name !== undefined) updateData.name = rawData.name;
        if (rawData.description !== undefined) {
          updateData.description =
            rawData.description && rawData.description.length > 0 ? rawData.description : null;
        }

        if (sampleTasks !== undefined) {
          const normalizedTasks = sampleTasks.map((task, index) => ({
            taskId: task.taskId?.trim() || `T${String(index + 1).padStart(3, "0")}`,
            taskDescription: task.taskDescription.trim(),
            phase: task.phase?.trim() || null,
            priority: task.priority ?? "Medium",
            owner: task.owner?.trim() || null,
            dependency: task.dependency?.trim() || null,
            durationDays: task.durationDays ?? null,
            approvalRequired: task.approvalRequired ?? "No",
            deliverableType: task.deliverableType?.trim() || null,
            notes: task.notes?.trim() || null,
          }));

          const normalizedTaskIds = normalizedTasks.map((task) => task.taskId.toUpperCase());
          const duplicateTaskIds = Array.from(
            new Set(
              normalizedTaskIds.filter((taskId, index) => normalizedTaskIds.indexOf(taskId) !== index)
            )
          );

          if (duplicateTaskIds.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Duplicate template task IDs are not allowed: ${duplicateTaskIds.join(", ")}`,
            });
          }

          const taskIdSet = new Set(normalizedTaskIds);
          const invalidDependencies: string[] = [];

          for (const task of normalizedTasks) {
            if (!task.dependency) continue;

            const dependencies = task.dependency
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value) => value.toUpperCase());

            for (const dependencyId of dependencies) {
              if (dependencyId === task.taskId.toUpperCase()) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Task ${task.taskId} cannot depend on itself.`,
                });
              }
              if (!taskIdSet.has(dependencyId)) {
                invalidDependencies.push(`${task.taskId} -> ${dependencyId}`);
              }
            }
          }

          if (invalidDependencies.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown template task dependencies: ${invalidDependencies.slice(0, 5).join(", ")}`,
            });
          }

          const phases = Array.from(
            new Set(
              normalizedTasks
                .map((task) => task.phase)
                .filter((phase): phase is string => Boolean(phase))
            )
          );

          updateData.sampleTasks = JSON.stringify(normalizedTasks);
          updateData.phases = JSON.stringify(phases);
        }

        await updateTemplate(id, updateData);
        return { success: true };
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
      .input(projectCreateSchema)
      .mutation(async ({ input }) => {
        const { createProject, createTask, getTemplateById } = await import("./db");
        const projectData = {
          ...input,
          name: input.name.trim(),
          description: input.description?.trim() || undefined,
          templateType: input.templateType.trim(),
          projectManager: input.projectManager?.trim() || undefined,
        };
        const projectId = await createProject(projectData);

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
                      ? taskDef.taskId.trim()
                      : undefined,
                  taskDescription,
                  phase:
                    typeof taskDef.phase === "string" ? taskDef.phase.trim() : null,
                  priority:
                    taskDef.priority === "High" ||
                    taskDef.priority === "Medium" ||
                    taskDef.priority === "Low"
                      ? taskDef.priority
                      : "Medium",
                  status: "Not Started",
                  owner:
                    typeof taskDef.owner === "string" ? taskDef.owner.trim() : null,
                  dependency:
                    typeof taskDef.dependency === "string"
                      ? taskDef.dependency.trim()
                      : null,
                  durationDays:
                    typeof taskDef.durationDays === "number"
                      ? Math.max(0, Math.floor(taskDef.durationDays))
                      : null,
                  approvalRequired:
                    taskDef.approvalRequired === "Yes" ||
                    taskDef.approvalRequired === "No"
                      ? taskDef.approvalRequired
                      : "No",
                  deliverableType:
                    typeof taskDef.deliverableType === "string"
                      ? taskDef.deliverableType.trim()
                      : null,
                  notes:
                    typeof taskDef.notes === "string" ? taskDef.notes.trim() : null,
                });
              }
            }
          }
        }
        
        return { id: projectId };
      }),
    update: publicProcedure
      .input(projectUpdateSchema)
      .mutation(async ({ input }) => {
        const { id, ...rawData } = input;
        const data = {
          ...rawData,
          name: rawData.name?.trim(),
          description:
            rawData.description !== undefined ? rawData.description.trim() : undefined,
          projectManager:
            rawData.projectManager !== undefined ? rawData.projectManager.trim() : undefined,
        };
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
      .input(taskCreateSchema)
      .mutation(async ({ input }) => {
        const { createTask, getTaskById } = await import("./db");
        const taskData = {
          ...input,
          taskId: input.taskId?.trim() || undefined,
          taskDescription: input.taskDescription.trim(),
          dependency: input.dependency?.trim() || undefined,
          owner: input.owner?.trim() || undefined,
          phase: input.phase?.trim() || undefined,
          approver: input.approver?.trim() || undefined,
          deliverableType: input.deliverableType?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
        };
        const id = await createTask(taskData);
        const task = await getTaskById(id);
        if (!task) throw new Error("Failed to retrieve created task");
        return task;
      }),
    update: publicProcedure
      .input(taskUpdateSchema)
      .mutation(async ({ input }) => {
        const { id, ...rawData } = input;
        const data = {
          ...rawData,
          taskId: rawData.taskId?.trim(),
          taskDescription:
            rawData.taskDescription !== undefined ? rawData.taskDescription.trim() : undefined,
          dependency:
            rawData.dependency !== undefined ? rawData.dependency.trim() : undefined,
          owner: rawData.owner !== undefined ? rawData.owner.trim() : undefined,
          phase: rawData.phase !== undefined ? rawData.phase.trim() : undefined,
          approver: rawData.approver !== undefined ? rawData.approver.trim() : undefined,
          deliverableType:
            rawData.deliverableType !== undefined ? rawData.deliverableType.trim() : undefined,
          notes: rawData.notes !== undefined ? rawData.notes.trim() : undefined,
        };
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
