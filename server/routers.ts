import { COOKIE_NAME } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

import * as db from "./db";

const templateTaskInputSchema = z
  .object({
    taskId: z.string().optional(),
    taskDescription: z.string().optional(),
    description: z.string().optional(),
    phase: z.string().optional(),
    milestone: z.string().optional(),
    priority: z.string().optional(),
    owner: z.string().optional(),
    dependency: z.string().optional(),
    durationDays: z.number().int().min(0).optional(),
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

const ensureProjectDateRange = (
  value: { startDate?: Date; targetCompletionDate?: Date },
  ctx: z.RefinementCtx
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

const ensureTaskDateRange = (
  value: { startDate?: Date; dueDate?: Date },
  ctx: z.RefinementCtx
) => {
  if (value.startDate && value.dueDate && value.dueDate.getTime() < value.startDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueDate"],
      message: "Due date cannot be earlier than start date.",
    });
  }
};

const applyTaskWorkflowGuardrails = (
  current: { status: string; completionPercent: number },
  patch: {
    status?: string;
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

const getActorName = (user: TrpcContext["user"]) => {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email;
  return "System";
};

const parseStringArray = (value: string | null | undefined) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const parseDependencyCodes = (value: string | null | undefined) =>
  value
    ? value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

const shiftDateByDays = (value: Date | null | undefined, days: number) => {
  if (!value) return value ?? null;
  const shifted = new Date(value);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
};

type GovernanceEntityType =
  | "project"
  | "task"
  | "template"
  | "integration"
  | "webhook"
  | "user_access";

type WebhookEventName =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "template.created"
  | "template.updated"
  | "template.published"
  | "template.archived"
  | "integration.external_event";

const emitGovernanceEvent = async (args: {
  ctx: TrpcContext;
  entityType: GovernanceEntityType;
  entityId: string;
  action: string;
  webhookEvent?: WebhookEventName;
  payload?: Record<string, unknown>;
  entity?: Record<string, unknown>;
}) => {
  const actorName = getActorName(args.ctx.user);
  const actorOpenId = args.ctx.user?.openId ?? null;
  const { createAuditLog, dispatchWebhookEvent } = await import("./db");
  await createAuditLog({
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    actorOpenId,
    actorName,
    details: args.payload ? JSON.stringify(args.payload) : null,
  });

  if (args.webhookEvent) {
    await dispatchWebhookEvent({
      event: args.webhookEvent,
      payload: {
        entityType: args.entityType,
        entityId: args.entityId,
        action: args.action,
        actorName,
        actorOpenId,
        ...(args.payload ?? {}),
        ...(args.entity ? { entity: args.entity } : {}),
      },
    });
  }
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

  // Configurable enums
  enums: router({
    list: publicProcedure.query(async () => {
      const { getAllEnums } = await import("./db");
      return getAllEnums();
    }),
    update: publicProcedure
      .input(
        z.object({
          group: z.enum(["projectStatus", "taskStatus", "taskPriority", "riskStatus"]),
          options: z.array(
            z.object({
              label: z.string().min(1),
              color: z.string().min(1),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { setEnumOptions } = await import("./db");
        return setEnumOptions(input.group, input.options);
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
    create: publicProcedure.input(templateInputSchema).mutation(async ({ input, ctx }) => {
      const { createTemplate, getTemplateById } = await import("./db");
      const id = await createTemplate(toTemplateInsert(input));
      const template = await getTemplateById(id);
      if (!template) throw new Error("Failed to create template");
      await emitGovernanceEvent({
        ctx,
        entityType: "template",
        entityId: String(template.id),
        action: "template.create",
        webhookEvent: "template.created",
        payload: {
          templateKey: template.templateKey,
          status: template.status,
          version: template.version,
        },
      });
      return template;
    }),
    update: publicProcedure
      .input(
        z
          .object({
            id: z.number(),
            data: templateInputSchema.partial().optional(),
            sampleTasks: z.array(templateTaskInputSchema).optional(),
          })
          .superRefine((value, ctx) => {
            if (!value.data && !value.sampleTasks) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["data"],
                message: "Template update requires data or sampleTasks.",
              });
            }
          })
      )
      .mutation(async ({ input, ctx }) => {
        const { updateTemplate, getTemplateById } = await import("./db");
        const updateData = {
          ...(input.data ?? {}),
          ...(input.sampleTasks ? { sampleTasks: input.sampleTasks } : {}),
        };

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
          const normalizedTasks = normalizeTemplateTasks(updateData.sampleTasks);
          const normalizedTaskIds = normalizedTasks.map((task) => task.taskId.toUpperCase());
          const duplicateTaskIds = Array.from(
            new Set(
              normalizedTaskIds.filter(
                (taskId, index) => normalizedTaskIds.indexOf(taskId) !== index
              )
            )
          );

          if (duplicateTaskIds.length > 0) {
            throw new Error(
              `Duplicate template task IDs are not allowed: ${duplicateTaskIds.join(", ")}`
            );
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
                throw new Error(`Task ${task.taskId} cannot depend on itself.`);
              }
              if (!taskIdSet.has(dependencyId)) {
                invalidDependencies.push(`${task.taskId} -> ${dependencyId}`);
              }
            }
          }

          if (invalidDependencies.length > 0) {
            throw new Error(
              `Unknown template task dependencies: ${invalidDependencies.slice(0, 5).join(", ")}`
            );
          }

          const phases = Array.from(
            new Set(
              normalizedTasks
                .map((task) => task.phase)
                .filter((phase): phase is string => Boolean(phase))
            )
          );

          normalizedUpdate.sampleTasks = JSON.stringify(normalizedTasks);
          normalizedUpdate.phases = JSON.stringify(phases);
        }

        await updateTemplate(input.id, normalizedUpdate as any);
        const template = await getTemplateById(input.id);
        if (!template) throw new Error("Template not found after update");
        await emitGovernanceEvent({
          ctx,
          entityType: "template",
          entityId: String(template.id),
          action: "template.update",
          webhookEvent: "template.updated",
          payload: {
            changedFields: Object.keys(normalizedUpdate),
            status: template.status,
            version: template.version,
          },
        });
        return template;
      }),
    createVersion: publicProcedure
      .input(z.object({ sourceTemplateId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const { createTemplateVersion, getTemplateById } = await import("./db");
        const id = await createTemplateVersion(input.sourceTemplateId);
        const template = await getTemplateById(id);
        if (!template) throw new Error("Failed to create template version");
        await emitGovernanceEvent({
          ctx,
          entityType: "template",
          entityId: String(template.id),
          action: "template.create_version",
          webhookEvent: "template.created",
          payload: {
            templateGroupKey: template.templateGroupKey,
            version: template.version,
          },
        });
        return template;
      }),
    publish: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const { publishTemplate, getTemplateById } = await import("./db");
      await publishTemplate(input.id);
      const template = await getTemplateById(input.id);
      if (!template) throw new Error("Template not found after publish");
      await emitGovernanceEvent({
        ctx,
        entityType: "template",
        entityId: String(template.id),
        action: "template.publish",
        webhookEvent: "template.published",
        payload: {
          templateGroupKey: template.templateGroupKey,
          version: template.version,
        },
      });
      return template;
    }),
    archive: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const { archiveTemplate, getTemplateById } = await import("./db");
      await archiveTemplate(input.id);
      const template = await getTemplateById(input.id);
      if (!template) throw new Error("Template not found after archive");
      await emitGovernanceEvent({
        ctx,
        entityType: "template",
        entityId: String(template.id),
        action: "template.archive",
        webhookEvent: "template.archived",
        payload: {
          templateGroupKey: template.templateGroupKey,
          version: template.version,
        },
      });
      return template;
    }),
    importJson: publicProcedure
      .input(
        z.object({
          templates: z.array(templateInputSchema).min(1),
          publishImported: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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
          if (template) {
            created.push(template);
            await emitGovernanceEvent({
              ctx,
              entityType: "template",
              entityId: String(template.id),
              action: "template.import",
              webhookEvent: "template.created",
              payload: {
                templateKey: template.templateKey,
                imported: true,
                published: input.publishImported === true,
              },
            });
          }
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
        z
          .object({
            name: z.string().min(1),
            description: z.string().optional(),
            templateId: z.number().optional(),
            templateType: z.string(),
            projectManager: z.string().optional(),
            startDate: z.date().optional(),
            targetCompletionDate: z.date().optional(),
            budget: z.number().int().min(0).optional(),
            actualBudget: z.number().int().min(0).optional(),
            externalId: z.string().optional(),
            metadata: z.string().optional(),
            status: z.string().optional(),
          })
          .superRefine((value, ctx) => {
            ensureProjectDateRange(value, ctx);
          })
      )
      .mutation(async ({ input, ctx }) => {
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

        const { getProjectById } = await import("./db");
        const createdProject = await getProjectById(projectId);
        await emitGovernanceEvent({
          ctx,
          entityType: "project",
          entityId: String(projectId),
          action: "project.create",
          webhookEvent: "project.created",
          payload: {
            templateType: input.templateType,
            status: input.status ?? "Planning",
          },
          entity: createdProject ? { ...createdProject } as unknown as Record<string, unknown> : undefined,
        });

        return { id: projectId };
      }),
    update: publicProcedure
      .input(
        z
          .object({
            id: z.number(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            projectManager: z.string().optional(),
            startDate: z.date().optional(),
            targetCompletionDate: z.date().optional(),
            budget: z.number().int().min(0).optional(),
            actualBudget: z.number().int().min(0).optional(),
            externalId: z.string().nullable().optional(),
            metadata: z.string().nullable().optional(),
            status: z.string().optional(),
          })
          .superRefine((value, ctx) => {
            ensureProjectDateRange(value, ctx);
          })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const { updateProject, getProjectById } = await import("./db");
        await updateProject(id, data);
        const updatedProject = await getProjectById(id);
        await emitGovernanceEvent({
          ctx,
          entityType: "project",
          entityId: String(id),
          action: "project.update",
          webhookEvent: "project.updated",
          payload: {
            changedFields: Object.keys(data),
            status: data.status,
          },
          entity: updatedProject ? { ...updatedProject } as unknown as Record<string, unknown> : undefined,
        });
        return { success: true };
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const { deleteProject } = await import("./db");
      await deleteProject(input.id);
      await emitGovernanceEvent({
        ctx,
        entityType: "project",
        entityId: String(input.id),
        action: "project.delete",
        webhookEvent: "project.deleted",
      });
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
        z
          .object({
            projectId: z.number(),
            taskId: z.string().optional(),
            taskDescription: z.string().min(1),
            startDate: z.date().optional(),
            dueDate: z.date().optional(),
            durationDays: z.number().int().min(0).optional(),
            dependency: z.string().optional(),
            owner: z.string().optional(),
            status: z.string().optional(),
            priority: z.string().optional(),
            phase: z.string().optional(),
            milestone: z.string().optional(),
            budget: z.number().int().min(0).optional(),
            actualBudget: z.number().int().min(0).optional(),
            approvalRequired: z.enum(["Yes", "No"]).optional(),
            approver: z.string().optional(),
            deliverableType: z.string().optional(),
            completionPercent: z.number().int().min(0).max(100).optional(),
            notes: z.string().optional(),
            metadata: z.string().optional(),
          })
          .superRefine((value, ctx) => {
            ensureTaskDateRange(value, ctx);
          })
      )
      .mutation(async ({ input, ctx }) => {
        const { createTask, getTaskById } = await import("./db");
        const normalizedInput = {
          ...input,
          ...(input.status === "Complete" ? { completionPercent: 100 } : {}),
          ...(input.completionPercent === 100 ? { status: "Complete" as const } : {}),
        };
        const id = await createTask(normalizedInput);
        const task = await getTaskById(id);
        if (!task) throw new Error("Failed to retrieve created task");
        await emitGovernanceEvent({
          ctx,
          entityType: "task",
          entityId: String(task.id),
          action: "task.create",
          webhookEvent: "task.created",
          payload: {
            projectId: task.projectId,
            taskId: task.taskId,
            status: task.status,
          },
          entity: { ...task } as unknown as Record<string, unknown>,
        });
        return task;
      }),
    update: publicProcedure
      .input(
        z
          .object({
            id: z.number(),
            taskDescription: z.string().min(1).optional(),
            startDate: z.date().optional(),
            dueDate: z.date().optional(),
            durationDays: z.number().int().min(0).optional(),
            dependency: z.string().optional(),
            owner: z.string().optional(),
            status: z.string().optional(),
            priority: z.string().optional(),
            phase: z.string().optional(),
            milestone: z.string().optional(),
            budget: z.number().int().min(0).optional(),
            actualBudget: z.number().int().min(0).optional(),
            approvalRequired: z.enum(["Yes", "No"]).optional(),
            approver: z.string().optional(),
            deliverableType: z.string().optional(),
            completionPercent: z.number().int().min(0).max(100).optional(),
            notes: z.string().optional(),
            metadata: z.string().optional(),
          })
          .superRefine((value, ctx) => {
            ensureTaskDateRange(value, ctx);
          })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const { getTaskById, recordTaskChangeActivityAndNotifications, updateTask } =
          await import("./db");
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
        const updated = await getTaskById(id);
        if (updated) {
          await recordTaskChangeActivityAndNotifications({
            before: current,
            after: updated,
            actorName: getActorName(ctx.user),
          });
          await emitGovernanceEvent({
            ctx,
            entityType: "task",
            entityId: String(updated.id),
            action: "task.update",
            webhookEvent: "task.updated",
            payload: {
              projectId: updated.projectId,
              taskId: updated.taskId,
              status: updated.status,
            },
            entity: { ...updated } as unknown as Record<string, unknown>,
          });
        }
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
              status: z.string().optional(),
              priority: z.string().optional(),
              phase: z.string().optional(),
              milestone: z.string().optional(),
              startDate: z.date().optional(),
              dueDate: z.date().optional(),
              completionPercent: z.number().min(0).max(100).optional(),
              actualBudget: z.number().optional(),
              clearOwner: z.boolean().optional(),
              clearDates: z.boolean().optional(),
              dateShiftDays: z.number().int().min(-3650).max(3650).optional(),
              enforceDependencyReadiness: z.boolean().optional(),
            })
            .refine((value) => {
              const hasDirectField =
                value.owner !== undefined ||
                value.status !== undefined ||
                value.priority !== undefined ||
                value.phase !== undefined ||
                value.startDate !== undefined ||
                value.dueDate !== undefined ||
                value.completionPercent !== undefined ||
                value.actualBudget !== undefined;
              const hasRules =
                value.clearOwner === true ||
                value.clearDates === true ||
                (value.dateShiftDays ?? 0) !== 0;
              return hasDirectField || hasRules;
            }, {
              message: "Patch must include at least one field.",
            }),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const {
          getTaskById,
          getTasksByIds,
          getTasksByProjectId,
          recordTaskChangeActivityAndNotifications,
          updateTask,
          validateTaskDependencies,
        } = await import("./db");
        const tasks = await getTasksByIds(input.taskIds);
        if (tasks.length !== input.taskIds.length) {
          throw new Error("One or more tasks were not found.");
        }

        for (const task of tasks) {
          if (task.projectId !== input.projectId) {
            throw new Error("All selected tasks must belong to the same project.");
          }
        }

        const clearOwner = input.patch.clearOwner === true;
        const clearDates = input.patch.clearDates === true;
        const dateShiftDays = input.patch.dateShiftDays ?? 0;
        const enforceDependencyReadiness =
          input.patch.enforceDependencyReadiness ?? true;

        const predictedStatusByTaskId = new Map<number, string>();
        for (const task of tasks) {
          const normalized = applyTaskWorkflowGuardrails(task, {
            status: input.patch.status,
            completionPercent: input.patch.completionPercent,
          });
          predictedStatusByTaskId.set(task.id, normalized.status ?? task.status);
        }

        const projectTasks = await getTasksByProjectId(input.projectId);
        const projectTaskByCode = new Map(
          projectTasks.map((task) => [task.taskId, task])
        );

        for (const task of tasks) {
          const normalized = applyTaskWorkflowGuardrails(task, {
            status: input.patch.status,
            completionPercent: input.patch.completionPercent,
          });

          const targetStatus = predictedStatusByTaskId.get(task.id) ?? task.status;
          if (enforceDependencyReadiness && targetStatus === "Complete") {
            const unresolvedDependencies = parseDependencyCodes(task.dependency).filter(
              (dependencyCode) => {
                const dependencyTask = projectTaskByCode.get(dependencyCode);
                if (!dependencyTask) return false;
                const predictedDependencyStatus =
                  predictedStatusByTaskId.get(dependencyTask.id) ??
                  dependencyTask.status;
                return predictedDependencyStatus !== "Complete";
              }
            );
            if (unresolvedDependencies.length > 0) {
              throw new Error(
                `Cannot set ${task.taskId} to Complete while dependencies are not complete: ${unresolvedDependencies.join(", ")}.`
              );
            }
          }

          let nextStartDate = clearDates
            ? null
            : input.patch.startDate !== undefined
              ? input.patch.startDate
              : task.startDate;
          let nextDueDate = clearDates
            ? null
            : input.patch.dueDate !== undefined
              ? input.patch.dueDate
              : task.dueDate;

          if (!clearDates && dateShiftDays !== 0) {
            nextStartDate = shiftDateByDays(nextStartDate, dateShiftDays);
            nextDueDate = shiftDateByDays(nextDueDate, dateShiftDays);
          }

          if (
            nextStartDate &&
            nextDueDate &&
            nextStartDate.getTime() > nextDueDate.getTime()
          ) {
            throw new Error(
              `Invalid date range for ${task.taskId}: start date cannot be after due date.`
            );
          }

          const updatePayload: Record<string, unknown> = {
            status: normalized.status ?? input.patch.status,
            completionPercent:
              normalized.completionPercent ?? input.patch.completionPercent,
            priority: input.patch.priority,
            actualBudget: input.patch.actualBudget,
          };

          if (input.patch.phase !== undefined) {
            updatePayload.phase = input.patch.phase.trim() || null;
          }

          if (clearOwner) {
            updatePayload.owner = null;
          } else if (input.patch.owner !== undefined) {
            updatePayload.owner = input.patch.owner.trim() || null;
          }

          if (clearDates || input.patch.startDate !== undefined || dateShiftDays !== 0) {
            updatePayload.startDate = nextStartDate ?? null;
          }
          if (clearDates || input.patch.dueDate !== undefined || dateShiftDays !== 0) {
            updatePayload.dueDate = nextDueDate ?? null;
          }

          await updateTask(task.id, updatePayload as any);
          const updated = await getTaskById(task.id);
          if (updated) {
            await recordTaskChangeActivityAndNotifications({
              before: task,
              after: updated,
              actorName: getActorName(ctx.user),
            });
          }
        }

        const dependencyWarnings = await validateTaskDependencies(input.projectId);
        await emitGovernanceEvent({
          ctx,
          entityType: "task",
          entityId: `bulk:${input.taskIds.join(",")}`,
          action: "task.bulk_update",
          webhookEvent: "task.updated",
          payload: {
            projectId: input.projectId,
            updatedCount: tasks.length,
            appliedDateShiftDays: dateShiftDays,
            fields: Object.keys(input.patch),
          },
        });

        return {
          success: true,
          updatedCount: tasks.length,
          appliedDateShiftDays: dateShiftDays,
          dependencyWarnings,
        };
      }),
    validateDependencies: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { validateTaskDependencies } = await import("./db");
        return validateTaskDependencies(input.projectId);
      }),
    criticalPath: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { getProjectCriticalPath } = await import("./db");
        return getProjectCriticalPath(input.projectId);
      }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const { deleteTask } = await import("./db");
      await deleteTask(input.id);
      await emitGovernanceEvent({
        ctx,
        entityType: "task",
        entityId: String(input.id),
        action: "task.delete",
        webhookEvent: "task.deleted",
      });
      return { success: true };
    }),
  }),

  // Collaboration router
  collaboration: router({
    comments: router({
      list: publicProcedure
        .input(
          z.object({
            projectId: z.number(),
            taskId: z.number().optional(),
          })
        )
        .query(async ({ input }) => {
          const { getProjectComments } = await import("./db");
          const comments = await getProjectComments(input.projectId, input.taskId);
          return comments.map((comment) => ({
            ...comment,
            mentions: parseStringArray(comment.mentions),
          }));
        }),
      create: publicProcedure
        .input(
          z.object({
            projectId: z.number(),
            taskId: z.number().optional(),
            content: z.string().min(1),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createProjectActivity, createProjectComment } = await import("./db");
          const authorName = getActorName(ctx.user);
          const trimmedContent = input.content.trim();
          const comment = await createProjectComment({
            projectId: input.projectId,
            taskId: input.taskId,
            authorName,
            content: trimmedContent,
          });
          const mentionHandles = parseStringArray(comment.mentions);
          await createProjectActivity({
            projectId: input.projectId,
            taskId: input.taskId,
            actorName: authorName,
            eventType: "comment_added",
            summary:
              input.taskId !== undefined
                ? `${authorName} commented on task #${input.taskId}.`
                : `${authorName} commented on the project.`,
            metadata: JSON.stringify({
              commentId: comment.id,
              mentions: mentionHandles,
            }),
          });

          return {
            ...comment,
            mentions: mentionHandles,
          };
        }),
    }),
    activity: router({
      list: publicProcedure
        .input(
          z.object({
            projectId: z.number(),
            limit: z.number().min(1).max(200).optional(),
          })
        )
        .query(async ({ input }) => {
          const { getProjectActivities } = await import("./db");
          return getProjectActivities(input.projectId, input.limit ?? 100);
        }),
    }),
    notificationPreferences: router({
      get: publicProcedure
        .input(
          z
            .object({
              scopeType: z.enum(["user", "team"]).optional(),
              scopeKey: z.string().min(1).optional(),
            })
            .optional()
        )
        .query(async ({ input }) => {
          const { ensureNotificationPreference, toNotificationPreferenceView } =
            await import("./db");
          const preference = await ensureNotificationPreference(
            input?.scopeType ?? "team",
            input?.scopeKey ?? "default"
          );
          return toNotificationPreferenceView(preference);
        }),
      set: publicProcedure
        .input(
          z.object({
            scopeType: z.enum(["user", "team"]).optional(),
            scopeKey: z.string().min(1).optional(),
            channels: z.object({
              inApp: z.boolean(),
              email: z.boolean(),
              slack: z.boolean(),
              webhook: z.boolean(),
              webhookUrl: z.string().optional(),
            }),
            events: z.object({
              overdue: z.boolean(),
              dueSoon: z.boolean(),
              assignmentChanged: z.boolean(),
              statusChanged: z.boolean(),
            }),
          })
        )
        .mutation(async ({ input }) => {
          const { toNotificationPreferenceView, upsertNotificationPreference } =
            await import("./db");
          const preference = await upsertNotificationPreference(
            input.scopeType ?? "team",
            input.scopeKey ?? "default",
            {
              inAppEnabled: input.channels.inApp ? "Yes" : "No",
              emailEnabled: input.channels.email ? "Yes" : "No",
              slackEnabled: input.channels.slack ? "Yes" : "No",
              webhookEnabled: input.channels.webhook ? "Yes" : "No",
              webhookUrl: input.channels.webhookUrl ?? null,
              overdueEnabled: input.events.overdue ? "Yes" : "No",
              dueSoonEnabled: input.events.dueSoon ? "Yes" : "No",
              assignmentEnabled: input.events.assignmentChanged ? "Yes" : "No",
              statusChangeEnabled: input.events.statusChanged ? "Yes" : "No",
            }
          );
          return toNotificationPreferenceView(preference);
        }),
    }),
    notifications: router({
      list: publicProcedure
        .input(
          z.object({
            projectId: z.number(),
            limit: z.number().min(1).max(200).optional(),
          })
        )
        .query(async ({ input }) => {
          const { listNotificationEvents, toNotificationEventView } = await import("./db");
          const events = await listNotificationEvents(input.projectId, input.limit ?? 100);
          return events.map(toNotificationEventView);
        }),
      generateDueAlerts: publicProcedure
        .input(
          z.object({
            projectId: z.number(),
            scopeType: z.enum(["user", "team"]).optional(),
            scopeKey: z.string().min(1).optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { generateScheduleNotifications, toNotificationEventView } = await import("./db");
          const result = await generateScheduleNotifications(
            input.projectId,
            getActorName(ctx.user),
            input.scopeType ?? "team",
            input.scopeKey ?? "default"
          );
          return {
            generatedCount: result.generatedCount,
            notifications: result.notifications.map(toNotificationEventView),
          };
        }),
    }),
  }),

  // Dashboard router
  dashboard: router({
    stats: publicProcedure.query(async () => {
      const { getDashboardStats } = await import("./db");
      return getDashboardStats();
    }),
    portfolioSummary: publicProcedure.query(async () => {
      const { getPortfolioSummary } = await import("./db");
      return getPortfolioSummary();
    }),
  }),

  // Governance router
  governance: router({
    audit: router({
      list: publicProcedure
        .input(
          z
            .object({
              limit: z.number().min(1).max(500).optional(),
              entityType: z
                .enum(["project", "task", "template", "integration", "webhook", "user_access"])
                .optional(),
            })
            .optional()
        )
        .query(async ({ input }) => {
          const { listAuditLogs } = await import("./db");
          return listAuditLogs({
            limit: input?.limit ?? 200,
            entityType: input?.entityType,
          });
        }),
    }),
    webhooks: router({
      list: publicProcedure
        .input(z.object({ includeInactive: z.boolean().optional() }).optional())
        .query(async ({ input }) => {
          const { listWebhookSubscriptions } = await import("./db");
          const items = await listWebhookSubscriptions({
            includeInactive: input?.includeInactive ?? true,
          });
          return items.map((item) => ({
            ...item,
            events: parseStringArray(item.events),
          }));
        }),
      create: publicProcedure
        .input(
          z.object({
            name: z.string().min(1),
            endpointUrl: z.string().url(),
            events: z
              .array(
                z.enum([
                  "project.created",
                  "project.updated",
                  "project.deleted",
                  "task.created",
                  "task.updated",
                  "task.deleted",
                  "template.created",
                  "template.updated",
                  "template.published",
                  "template.archived",
                  "integration.external_event",
                ])
              )
              .min(1),
            secret: z.string().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { createWebhookSubscription } = await import("./db");
          const created = await createWebhookSubscription({
            name: input.name.trim(),
            endpointUrl: input.endpointUrl.trim(),
            events: input.events as WebhookEventName[],
            secret: input.secret?.trim() || null,
            isActive: input.isActive ?? true,
          });
          await emitGovernanceEvent({
            ctx,
            entityType: "webhook",
            entityId: String(created.id),
            action: "webhook.create",
            payload: {
              name: created.name,
              events: input.events,
              isActive: created.isActive === "Yes",
            },
          });
          return {
            ...created,
            events: parseStringArray(created.events),
          };
        }),
      update: publicProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            endpointUrl: z.string().url().optional(),
            events: z
              .array(
                z.enum([
                  "project.created",
                  "project.updated",
                  "project.deleted",
                  "task.created",
                  "task.updated",
                  "task.deleted",
                  "template.created",
                  "template.updated",
                  "template.published",
                  "template.archived",
                  "integration.external_event",
                ])
              )
              .optional(),
            secret: z.string().nullable().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { updateWebhookSubscription } = await import("./db");
          const updated = await updateWebhookSubscription(input.id, {
            name: input.name?.trim(),
            endpointUrl: input.endpointUrl?.trim(),
            events: input.events as WebhookEventName[] | undefined,
            secret: input.secret === undefined ? undefined : input.secret?.trim() ?? null,
            isActive: input.isActive,
          });
          if (!updated) throw new Error("Webhook subscription not found");
          await emitGovernanceEvent({
            ctx,
            entityType: "webhook",
            entityId: String(updated.id),
            action: "webhook.update",
            payload: {
              changedFields: Object.keys(input).filter((key) => key !== "id"),
            },
          });
          return {
            ...updated,
            events: parseStringArray(updated.events),
          };
        }),
      remove: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          const { deleteWebhookSubscription } = await import("./db");
          await deleteWebhookSubscription(input.id);
          await emitGovernanceEvent({
            ctx,
            entityType: "webhook",
            entityId: String(input.id),
            action: "webhook.delete",
          });
          return { success: true };
        }),
    }),
    access: router({
      myRole: publicProcedure.query(async ({ ctx }) => {
        const { resolveGovernanceRole } = await import("./db");
        const role = await resolveGovernanceRole(ctx.user?.openId);
        return {
          role,
          canEdit: role === "Admin" || role === "Editor",
          canAdminister: role === "Admin",
        };
      }),
      listPolicies: publicProcedure.query(async () => {
        const { listUserAccessPolicies, listUsers } = await import("./db");
        const [policies, users] = await Promise.all([
          listUserAccessPolicies(500),
          listUsers(500),
        ]);
        return {
          policies,
          users,
        };
      }),
      setPolicy: publicProcedure
        .input(
          z.object({
            openId: z.string().min(1),
            accessRole: z.enum(["Admin", "Editor", "Viewer"]),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const { upsertUserAccessPolicy, updateUserBaseRole } = await import("./db");
          const policy = await upsertUserAccessPolicy({
            openId: input.openId,
            accessRole: input.accessRole,
            updatedBy: getActorName(ctx.user),
          });
          if (input.accessRole === "Admin") {
            await updateUserBaseRole(input.openId, "admin");
          } else {
            await updateUserBaseRole(input.openId, "user");
          }
          await emitGovernanceEvent({
            ctx,
            entityType: "user_access",
            entityId: input.openId,
            action: "user_access.set_policy",
            payload: {
              accessRole: input.accessRole,
            },
          });
          return policy;
        }),
    }),
  }),

  // Integrations router
  integrations: router({
    ingestEvent: publicProcedure
      .input(
        z.object({
          token: z.string().optional(),
          source: z.string().min(1),
          eventType: z.string().min(1),
          entityType: z.string().optional(),
          entityId: z.string().optional(),
          payload: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ENV.integrationInboundToken && input.token !== ENV.integrationInboundToken) {
          throw new Error("Invalid integration token");
        }
        await emitGovernanceEvent({
          ctx,
          entityType: "integration",
          entityId: input.entityId ?? `${input.source}:${input.eventType}`,
          action: `integration.ingest.${input.eventType}`,
          webhookEvent: "integration.external_event",
          payload: {
            source: input.source,
            eventType: input.eventType,
            entityType: input.entityType ?? null,
            payload: input.payload ?? {},
          },
        });
        return { success: true };
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

  // =========================================================================
  // Project Risks
  // =========================================================================
  risks: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { listProjectRisks } = await import("./db");
        return listProjectRisks(input.projectId);
      }),

    create: publicProcedure
      .input(
        z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          probability: z.number().int().min(1).max(5).optional(),
          impact: z.number().int().min(1).max(5).optional(),
          status: z.string().optional(),
          mitigationPlan: z.string().optional(),
          owner: z.string().optional(),
          linkedTaskId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { createProjectRisk } = await import("./db");
        return createProjectRisk(input);
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          probability: z.number().int().min(1).max(5).optional(),
          impact: z.number().int().min(1).max(5).optional(),
          status: z.string().optional(),
          mitigationPlan: z.string().optional(),
          owner: z.string().optional(),
          linkedTaskId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateProjectRisk } = await import("./db");
        return updateProjectRisk(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteProjectRisk } = await import("./db");
        await deleteProjectRisk(input.id);
        return { success: true };
      }),

    topRisks: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        const { getTopRisks } = await import("./db");
        return getTopRisks(input?.limit);
      }),
  }),

  // =========================================================================
  // Template Export / Import
  // =========================================================================
  templateTransfer: router({
    export: publicProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        const { exportTemplate } = await import("./db");
        const payload = await exportTemplate(input.templateId);
        if (!payload) throw new Error("Template not found");
        return payload;
      }),

    import: publicProcedure
      .input(
        z.object({
          payload: z.object({
            version: z.literal(1),
            exportedAt: z.string(),
            template: z.object({
              name: z.string().min(1),
              templateKey: z.string().min(1),
              description: z.string().nullable(),
              phases: z.array(z.string()),
              sampleTasks: z.array(
                z.object({
                  taskId: z.string(),
                  taskDescription: z.string(),
                  phase: z.string(),
                  priority: z.string(),
                  owner: z.string().nullable(),
                  dependency: z.string().nullable(),
                  approvalRequired: z.string(),
                })
              ),
            }),
          }),
          createAsDraft: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { importTemplate } = await import("./db");
        return importTemplate(input.payload, {
          createAsDraft: input.createAsDraft,
        });
      }),
  }),

  // =========================================================================
  // Project Tags
  // =========================================================================
  tags: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { listProjectTags } = await import("./db");
        return listProjectTags(input.projectId);
      }),

    listAll: publicProcedure.query(async () => {
      const { getAllProjectTags } = await import("./db");
      return getAllProjectTags();
    }),

    add: publicProcedure
      .input(
        z.object({
          projectId: z.number(),
          label: z.string().min(1).max(50),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { addProjectTag } = await import("./db");
        return addProjectTag(input);
      }),

    remove: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { removeProjectTag } = await import("./db");
        await removeProjectTag(input.id);
        return { success: true };
      }),
  }),

  // =========================================================================
  // Saved Views
  // =========================================================================
  savedViews: router({
    list: publicProcedure.query(async () => {
      const { listSavedViews } = await import("./db");
      return listSavedViews();
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          filters: z.string(), // JSON string
        })
      )
      .mutation(async ({ input }) => {
        const { createSavedView } = await import("./db");
        return createSavedView(input);
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          filters: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateSavedView } = await import("./db");
        return updateSavedView(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteSavedView } = await import("./db");
        await deleteSavedView(input.id);
        return { success: true };
      }),
  }),

  // ── Notes Journal ───────────────────────────────────────────────────
  taskNotes: router({
    list: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const { listTaskNotes } = await import("./db");
        return listTaskNotes(input.taskId);
      }),

    create: publicProcedure
      .input(z.object({ taskId: z.number(), content: z.string().min(1), authorName: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { createTaskNote } = await import("./db");
        return createTaskNote(input);
      }),

    listByProject: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { listTaskNotesByProject } = await import("./db");
        return listTaskNotesByProject(input.projectId);
      }),
  }),

  projectNotes: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { listProjectNotes } = await import("./db");
        return listProjectNotes(input.projectId);
      }),

    create: publicProcedure
      .input(z.object({ projectId: z.number(), content: z.string().min(1), authorName: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { createProjectNote } = await import("./db");
        return createProjectNote(input);
      }),
  }),

  // Branding router
  branding: router({
    get: publicProcedure.query(async () => {
      const { getBranding } = await import("./db");
      return getBranding();
    }),

    update: publicProcedure
      .input(z.object({
        appName: z.string().min(1).max(100).optional(),
        logoUrl: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateBranding } = await import("./db");
        return updateBranding(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
