import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

import * as db from "./db";

const templateTaskInputSchema = z
  .object({
    taskId: z.string().optional(),
    taskDescription: z.string().optional(),
    description: z.string().optional(),
    phase: z.string().optional(),
    priority: z.enum(["High", "Medium", "Low"]).optional(),
    owner: z.string().optional(),
    dependency: z.string().optional(),
    durationDays: z.number().int().positive().optional(),
    approvalRequired: z.enum(["Yes", "No"]).optional(),
    deliverableType: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const taskDescription = value.taskDescription ?? value.description;
    if (!taskDescription || !taskDescription.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each template task needs taskDescription (or description).",
      });
    }
  });

const templateInputSchema = z.object({
  name: z.string().min(1),
  templateKey: z.string().min(1),
  templateGroupKey: z.string().optional(),
  version: z.number().int().positive().optional(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
  description: z.string().optional(),
  phases: z.array(z.string().min(1)),
  sampleTasks: z.array(templateTaskInputSchema),
  uploadSource: z.string().optional(),
});

const normalizeTemplateTasks = (
  tasks: Array<z.infer<typeof templateTaskInputSchema>>
) =>
  tasks.map((task, index) => ({
    taskId: task.taskId?.trim() || `T${String(index + 1).padStart(3, "0")}`,
    taskDescription: (task.taskDescription ?? task.description ?? "").trim(),
    phase: task.phase?.trim() || "Uncategorized",
    priority: task.priority ?? "Medium",
    owner: task.owner?.trim() || null,
    dependency: task.dependency?.trim() || null,
    durationDays: task.durationDays ?? null,
    approvalRequired: task.approvalRequired ?? "No",
    deliverableType: task.deliverableType?.trim() || null,
    notes: task.notes?.trim() || null,
  }));

const toTemplateInsert = (input: z.infer<typeof templateInputSchema>) => {
  const templateKey = input.templateKey.trim();
  const templateGroupKey =
    input.templateGroupKey?.trim() || templateKey.replace(/_v\d+$/, "");

  return {
    name: input.name.trim(),
    templateKey,
    templateGroupKey,
  version: input.version,
  status: input.status ?? "Draft",
  description: input.description?.trim() || undefined,
  phases: JSON.stringify(input.phases.map((phase) => phase.trim()).filter(Boolean)),
  sampleTasks: JSON.stringify(normalizeTemplateTasks(input.sampleTasks)),
  uploadSource: input.uploadSource ?? "manual",
  };
};

const applyTaskWorkflowGuardrails = (
  current: { status: string; completionPercent: number },
  patch: {
    status?: "Not Started" | "In Progress" | "Complete" | "On Hold";
    completionPercent?: number;
  }
) => {
  if (current.status === "Complete" && patch.status && patch.status !== "Complete") {
    throw new Error("Completed tasks cannot move back to non-complete status.");
  }

  const normalized = { ...patch };

  if (normalized.status === "Complete") {
    normalized.completionPercent = 100;
  } else if (normalized.completionPercent === 100) {
    normalized.status = "Complete";
  }

  if (
    normalized.status &&
    normalized.status !== "Complete" &&
    normalized.completionPercent !== undefined &&
    normalized.completionPercent >= 100
  ) {
    normalized.completionPercent = 99;
  }

  return normalized;
};

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
      return getAllTemplates({ status: "Published" });
    }),
    listManage: publicProcedure
      .input(
        z
          .object({
            status: z.enum(["All", "Draft", "Published", "Archived"]).optional(),
            includeArchived: z.boolean().optional(),
            templateGroupKey: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const { getAllTemplates } = await import("./db");
        return getAllTemplates({
          status: input?.status ?? "All",
          includeArchived: input?.includeArchived ?? true,
          templateGroupKey: input?.templateGroupKey,
        });
      }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getTemplateById } = await import("./db");
      return getTemplateById(input.id);
    }),
    create: publicProcedure.input(templateInputSchema).mutation(async ({ input }) => {
      const { createTemplate, getTemplateById } = await import("./db");
      const id = await createTemplate(toTemplateInsert(input));
      const template = await getTemplateById(id);
      if (!template) throw new Error("Failed to create template");
      return template;
    }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          data: templateInputSchema.partial(),
        })
      )
      .mutation(async ({ input }) => {
        const { updateTemplate, getTemplateById } = await import("./db");
        const updateData = input.data;

        const normalizedUpdate: Record<string, unknown> = {};
        if (updateData.name !== undefined) normalizedUpdate.name = updateData.name.trim();
        if (updateData.templateKey !== undefined) normalizedUpdate.templateKey = updateData.templateKey.trim();
        if (updateData.templateGroupKey !== undefined) {
          normalizedUpdate.templateGroupKey = updateData.templateGroupKey.trim();
        }
        if (updateData.version !== undefined) normalizedUpdate.version = updateData.version;
        if (updateData.status !== undefined) normalizedUpdate.status = updateData.status;
        if (updateData.description !== undefined) {
          normalizedUpdate.description = updateData.description.trim() || null;
        }
        if (updateData.uploadSource !== undefined) {
          normalizedUpdate.uploadSource = updateData.uploadSource;
        }
        if (updateData.phases !== undefined) {
          normalizedUpdate.phases = JSON.stringify(
            updateData.phases.map((phase) => phase.trim()).filter(Boolean)
          );
        }
        if (updateData.sampleTasks !== undefined) {
          normalizedUpdate.sampleTasks = JSON.stringify(
            normalizeTemplateTasks(updateData.sampleTasks)
          );
        }

        await updateTemplate(input.id, normalizedUpdate as any);
        const template = await getTemplateById(input.id);
        if (!template) throw new Error("Template not found after update");
        return template;
      }),
    createVersion: publicProcedure
      .input(z.object({ sourceTemplateId: z.number() }))
      .mutation(async ({ input }) => {
        const { createTemplateVersion, getTemplateById } = await import("./db");
        const id = await createTemplateVersion(input.sourceTemplateId);
        const template = await getTemplateById(id);
        if (!template) throw new Error("Failed to create template version");
        return template;
      }),
    publish: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { publishTemplate, getTemplateById } = await import("./db");
      await publishTemplate(input.id);
      const template = await getTemplateById(input.id);
      if (!template) throw new Error("Template not found after publish");
      return template;
    }),
    archive: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { archiveTemplate, getTemplateById } = await import("./db");
      await archiveTemplate(input.id);
      const template = await getTemplateById(input.id);
      if (!template) throw new Error("Template not found after archive");
      return template;
    }),
    importJson: publicProcedure
      .input(
        z.object({
          templates: z.array(templateInputSchema).min(1),
          publishImported: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { createTemplate, publishTemplate, getTemplateById } = await import("./db");

        const created = [];
        for (const templateInput of input.templates) {
          const id = await createTemplate(
            toTemplateInsert({
              ...templateInput,
              status: input.publishImported
                ? "Published"
                : templateInput.status ?? "Draft",
              uploadSource: "import_json",
            })
          );
          if (input.publishImported) {
            await publishTemplate(id);
          }
          const template = await getTemplateById(id);
          if (template) created.push(template);
        }

        return {
          createdCount: created.length,
          templates: created,
        };
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
          actualBudget: z.number().optional(),
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
          actualBudget: z.number().optional(),
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
          actualBudget: z.number().optional(),
          approvalRequired: z.enum(["Yes", "No"]).optional(),
          approver: z.string().optional(),
          deliverableType: z.string().optional(),
          completionPercent: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { createTask, getTaskById } = await import("./db");
        const normalizedInput = {
          ...input,
          ...(input.status === "Complete" ? { completionPercent: 100 } : {}),
          ...(input.completionPercent === 100 ? { status: "Complete" as const } : {}),
        };
        const id = await createTask(normalizedInput);
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
          actualBudget: z.number().optional(),
          approvalRequired: z.enum(["Yes", "No"]).optional(),
          approver: z.string().optional(),
          deliverableType: z.string().optional(),
          completionPercent: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { getTaskById, updateTask } = await import("./db");
        const current = await getTaskById(id);
        if (!current) throw new Error("Task not found");

        const normalized = applyTaskWorkflowGuardrails(current, {
          status: data.status,
          completionPercent: data.completionPercent,
        });

        await updateTask(id, {
          ...data,
          status: normalized.status ?? data.status,
          completionPercent:
            normalized.completionPercent ?? data.completionPercent,
        });
        return { success: true };
      }),
    bulkUpdate: publicProcedure
      .input(
        z.object({
          projectId: z.number(),
          taskIds: z.array(z.number()).min(1),
          patch: z
            .object({
              owner: z.string().optional(),
              status: z.enum(["Not Started", "In Progress", "Complete", "On Hold"]).optional(),
              priority: z.enum(["High", "Medium", "Low"]).optional(),
              startDate: z.date().optional(),
              dueDate: z.date().optional(),
              completionPercent: z.number().min(0).max(100).optional(),
              actualBudget: z.number().optional(),
            })
            .refine((value) => Object.keys(value).length > 0, {
              message: "Patch must include at least one field.",
            }),
        })
      )
      .mutation(async ({ input }) => {
        const { bulkUpdateTasks, getTasksByIds, validateTaskDependencies } = await import("./db");
        const tasks = await getTasksByIds(input.taskIds);
        if (tasks.length !== input.taskIds.length) {
          throw new Error("One or more tasks were not found.");
        }

        for (const task of tasks) {
          if (task.projectId !== input.projectId) {
            throw new Error("All selected tasks must belong to the same project.");
          }
        }

        for (const task of tasks) {
          const normalized = applyTaskWorkflowGuardrails(task, {
            status: input.patch.status,
            completionPercent: input.patch.completionPercent,
          });
          await bulkUpdateTasks([task.id], {
            ...input.patch,
            status: normalized.status ?? input.patch.status,
            completionPercent:
              normalized.completionPercent ?? input.patch.completionPercent,
          });
        }

        const dependencyWarnings = await validateTaskDependencies(input.projectId);

        return {
          success: true,
          updatedCount: tasks.length,
          dependencyWarnings,
        };
      }),
    validateDependencies: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { validateTaskDependencies } = await import("./db");
        return validateTaskDependencies(input.projectId);
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
