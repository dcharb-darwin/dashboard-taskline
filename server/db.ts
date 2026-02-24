import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  type InsertProject,
  type InsertTemplate,
  type InsertTask,
  type InsertUser,
  type Project,
  type Task,
  type Template,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type TemplateStatus = Template["status"];

type TemplateQueryOptions = {
  status?: TemplateStatus | "All";
  includeArchived?: boolean;
  templateGroupKey?: string;
};

type TemplateTaskSeed = {
  taskId: string;
  taskDescription: string;
  phase: string;
  priority?: Task["priority"];
  owner?: string;
  dependency?: string;
  approvalRequired?: Task["approvalRequired"];
};

type TemplateSeed = {
  name: string;
  key: string;
  description: string;
  phases: string[];
  tasks: TemplateTaskSeed[];
};

const templateTask = (
  taskId: string,
  taskDescription: string,
  phase: string,
  overrides: Partial<TemplateTaskSeed> = {}
): TemplateTaskSeed => ({
  taskId,
  taskDescription,
  phase,
  priority: "Medium",
  ...overrides,
});

const normalizeTemplateKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getTemplateGroupKey = (templateKey: string) =>
  normalizeTemplateKey(templateKey).replace(/_v\d+$/, "");

const TEMPLATE_SEED: TemplateSeed[] = [
  {
    name: "Generic Project",
    key: "generic_project",
    description: "Universal template for any project type",
    phases: ["Planning", "Execution", "Completion"],
    tasks: [
      templateTask("T001", "Define project scope and goals", "Planning", {
        priority: "High",
      }),
      templateTask("T002", "Execute primary deliverables", "Execution", {
        priority: "High",
      }),
    ],
  },
  {
    name: "Marketing Campaign",
    key: "marketing_campaign",
    description: "Marketing and promotional campaigns",
    phases: ["Planning", "Creative", "Approval", "Launch"],
    tasks: [
      templateTask("T001", "Define campaign objectives", "Planning", {
        priority: "High",
        owner: "Marketing Lead",
      }),
      templateTask("T002", "Create campaign messaging", "Creative", {
        dependency: "T001",
        owner: "Content Strategist",
      }),
      templateTask("T003", "Leadership approval", "Approval", {
        priority: "High",
        approvalRequired: "Yes",
        owner: "Director",
      }),
      templateTask("T004", "Launch campaign", "Launch", {
        dependency: "T003",
        priority: "High",
      }),
    ],
  },
  {
    name: "Event Plan",
    key: "event_plan",
    description: "Events, press conferences, and community gatherings",
    phases: ["Planning", "Logistics", "Execution"],
    tasks: [
      templateTask("T001", "Confirm venue and timeline", "Planning", {
        priority: "High",
        owner: "Events Lead",
      }),
      templateTask("T002", "Coordinate vendors and speakers", "Logistics", {
        owner: "Events Coordinator",
      }),
      templateTask("T003", "Run day-of event operations", "Execution", {
        priority: "High",
        owner: "Operations Team",
      }),
    ],
  },
  {
    name: "Presentation",
    key: "presentation",
    description: "Presentations, briefings, and meetings",
    phases: ["Outline", "Draft", "Delivery"],
    tasks: [
      templateTask("T001", "Draft presentation outline", "Outline"),
      templateTask("T002", "Finalize and deliver presentation", "Delivery", {
        priority: "High",
      }),
    ],
  },
  {
    name: "Survey",
    key: "survey",
    description: "Survey design and analysis",
    phases: ["Design", "Distribution", "Analysis"],
    tasks: [
      templateTask("T001", "Create survey questions", "Design"),
      templateTask("T002", "Analyze survey responses", "Analysis"),
    ],
  },
  {
    name: "Press Release",
    key: "press_release",
    description: "Press releases and announcements",
    phases: ["Draft", "Review", "Distribution"],
    tasks: [
      templateTask("T001", "Draft press release", "Draft", {
        priority: "High",
      }),
      templateTask("T002", "Distribute to media outlets", "Distribution"),
    ],
  },
  {
    name: "Social Media Campaign",
    key: "social_media_campaign",
    description: "Social media campaigns and content series",
    phases: ["Strategy", "Content", "Publishing"],
    tasks: [
      templateTask("T001", "Build social content calendar", "Strategy"),
      templateTask("T002", "Publish and monitor posts", "Publishing"),
    ],
  },
  {
    name: "Planning Study",
    key: "planning_study",
    description: "Planning studies and analysis",
    phases: ["Research", "Analysis", "Reporting"],
    tasks: [
      templateTask("T001", "Collect baseline research", "Research"),
      templateTask("T002", "Publish study findings", "Reporting", {
        priority: "High",
      }),
    ],
  },
  {
    name: "Poster",
    key: "poster",
    description: "Poster and print collateral",
    phases: ["Design", "Review", "Production"],
    tasks: [
      templateTask("T001", "Design poster layout", "Design"),
      templateTask("T002", "Send final file to print", "Production"),
    ],
  },
  {
    name: "Video Project",
    key: "video_project",
    description: "Video production projects",
    phases: ["Pre-Production", "Production", "Post-Production"],
    tasks: [
      templateTask("T001", "Prepare script and storyboard", "Pre-Production"),
      templateTask("T002", "Edit and finalize video", "Post-Production", {
        priority: "High",
      }),
    ],
  },
  {
    name: "Public Notice",
    key: "public_notice",
    description: "Public notices and official announcements",
    phases: ["Draft", "Approval", "Publication"],
    tasks: [
      templateTask("T001", "Draft notice content", "Draft"),
      templateTask("T002", "Publish public notice", "Publication"),
    ],
  },
  {
    name: "Media Buy",
    key: "media_buy",
    description: "Paid media campaigns",
    phases: ["Planning", "Placement", "Reporting"],
    tasks: [
      templateTask("T001", "Select media channels", "Planning"),
      templateTask("T002", "Launch paid placements", "Placement", {
        priority: "High",
      }),
    ],
  },
  {
    name: "Op-Ed",
    key: "op_ed",
    description: "Opinion editorials and thought leadership",
    phases: ["Draft", "Review", "Submission"],
    tasks: [
      templateTask("T001", "Draft op-ed", "Draft", { priority: "High" }),
      templateTask("T002", "Submit to publication", "Submission"),
    ],
  },
  {
    name: "Other/Custom",
    key: "other_custom",
    description: "Flexible template for custom projects",
    phases: ["Planning", "Execution", "Closeout"],
    tasks: [
      templateTask("T001", "Define custom requirements", "Planning"),
      templateTask("T002", "Deliver custom project output", "Execution"),
    ],
  },
];

type MemoryState = {
  templates: Template[];
  projects: Project[];
  tasks: Task[];
  nextProjectId: number;
  nextTaskId: number;
};

const copyTemplate = (template: Template): Template => ({ ...template });
const copyProject = (project: Project): Project => ({ ...project });
const copyTask = (task: Task): Task => ({ ...task });

const buildMemoryState = (): MemoryState => {
  const seedTimestamp = new Date("2025-01-01T00:00:00.000Z");

  const templates: Template[] = TEMPLATE_SEED.map((template, index) => ({
    id: index + 1,
    name: template.name,
    templateKey: template.key,
    templateGroupKey: template.key,
    version: 1,
    status: "Published",
    description: template.description,
    phases: JSON.stringify(template.phases),
    sampleTasks: JSON.stringify(template.tasks),
    uploadSource: "seed",
    createdAt: new Date(seedTimestamp),
    updatedAt: new Date(seedTimestamp),
  }));

  const marketingTemplate = templates.find((template) => template.name === "Marketing Campaign");
  const eventTemplate = templates.find((template) => template.name === "Event Plan");

  const projects: Project[] = [
    {
      id: 1,
      name: "Summer Heat Campaign 2025",
      description: "Awareness campaign for summer heat safety",
      templateId: marketingTemplate?.id ?? null,
      templateType: "Marketing Campaign",
      projectManager: "Communications Team",
      startDate: new Date("2025-05-01T00:00:00.000Z"),
      targetCompletionDate: new Date("2025-09-30T00:00:00.000Z"),
      budget: 1250000,
      status: "Active",
      createdAt: new Date("2025-04-15T00:00:00.000Z"),
      updatedAt: new Date("2025-04-15T00:00:00.000Z"),
    },
    {
      id: 2,
      name: "Alexander Dennis Grand Opening",
      description: "Grand opening event planning",
      templateId: eventTemplate?.id ?? null,
      templateType: "Event Plan",
      projectManager: "Events Team",
      startDate: new Date("2025-06-01T00:00:00.000Z"),
      targetCompletionDate: new Date("2025-07-16T00:00:00.000Z"),
      budget: 250000,
      status: "Planning",
      createdAt: new Date("2025-05-10T00:00:00.000Z"),
      updatedAt: new Date("2025-05-10T00:00:00.000Z"),
    },
  ];

  const tasks: Task[] = [
    {
      id: 1,
      projectId: 1,
      taskId: "T001",
      taskDescription: "Define campaign objectives",
      startDate: new Date("2025-05-01T00:00:00.000Z"),
      dueDate: new Date("2025-05-05T00:00:00.000Z"),
      durationDays: 4,
      dependency: null,
      owner: "Marketing Lead",
      status: "Complete",
      priority: "High",
      phase: "Planning",
      budget: 50000,
      approvalRequired: "No",
      approver: null,
      deliverableType: "Campaign Brief",
      completionPercent: 100,
      notes: null,
      createdAt: new Date("2025-05-01T00:00:00.000Z"),
      updatedAt: new Date("2025-05-05T00:00:00.000Z"),
    },
    {
      id: 2,
      projectId: 1,
      taskId: "T002",
      taskDescription: "Create campaign messaging",
      startDate: new Date("2025-05-06T00:00:00.000Z"),
      dueDate: new Date("2025-05-10T00:00:00.000Z"),
      durationDays: 4,
      dependency: "T001",
      owner: "Content Strategist",
      status: "In Progress",
      priority: "Medium",
      phase: "Creative",
      budget: 75000,
      approvalRequired: "No",
      approver: null,
      deliverableType: "Messaging Deck",
      completionPercent: 60,
      notes: null,
      createdAt: new Date("2025-05-06T00:00:00.000Z"),
      updatedAt: new Date("2025-05-08T00:00:00.000Z"),
    },
    {
      id: 3,
      projectId: 2,
      taskId: "T001",
      taskDescription: "Confirm venue and timeline",
      startDate: new Date("2025-06-01T00:00:00.000Z"),
      dueDate: new Date("2025-06-04T00:00:00.000Z"),
      durationDays: 3,
      dependency: null,
      owner: "Events Lead",
      status: "Not Started",
      priority: "High",
      phase: "Planning",
      budget: 25000,
      approvalRequired: "No",
      approver: null,
      deliverableType: "Event Plan",
      completionPercent: 0,
      notes: null,
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
      updatedAt: new Date("2025-06-01T00:00:00.000Z"),
    },
  ];

  return {
    templates,
    projects,
    tasks,
    nextProjectId: projects.length + 1,
    nextTaskId: tasks.length + 1,
  };
};

let memoryState = buildMemoryState();

const getNextTaskCode = (projectId: number) => {
  const existingTasks = memoryState.tasks.filter((task) => task.projectId === projectId);
  return `T${String(existingTasks.length + 1).padStart(3, "0")}`;
};

const computeDashboardStats = (allProjects: Project[], allTasks: Task[]) => {
  const totalProjects = allProjects.length;
  const activeProjects = allProjects.filter(
    (project) => project.status === "Active" || project.status === "Planning"
  ).length;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task) => task.status === "Complete").length;

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = allTasks
    .filter(
      (task) =>
        task.dueDate &&
        task.status !== "Complete" &&
        task.dueDate >= now &&
        task.dueDate <= twoWeeksLater
    )
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
    .slice(0, 10);

  return {
    totalProjects,
    activeProjects,
    totalTasks,
    completedTasks,
    upcomingDeadlines,
  };
};

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

const filterTemplates = (
  templates: Template[],
  options: TemplateQueryOptions = {}
) => {
  const status = options.status ?? "Published";
  const includeArchived = options.includeArchived ?? false;
  const templateGroupKey = options.templateGroupKey
    ? getTemplateGroupKey(options.templateGroupKey)
    : undefined;

  return templates
    .filter((template) => {
      if (status !== "All" && template.status !== status) return false;
      if (status === "All" && !includeArchived && template.status === "Archived") return false;
      if (templateGroupKey && template.templateGroupKey !== templateGroupKey) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.version - b.version;
    });
};

export async function getAllTemplates(options: TemplateQueryOptions = {}) {
  const db = await getDb();
  if (!db) {
    return filterTemplates([...memoryState.templates], options).map(copyTemplate);
  }

  const { templates } = await import("../drizzle/schema");
  const rows = await db.select().from(templates).orderBy(templates.name, templates.version);
  return filterTemplates(rows, options);
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) {
    const template = memoryState.templates.find((item) => item.id === id);
    return template ? copyTemplate(template) : undefined;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result[0];
}

export async function getTemplateByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const template = memoryState.templates.find((item) => item.templateKey === key);
    return template ? copyTemplate(template) : undefined;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db.select().from(templates).where(eq(templates.templateKey, key)).limit(1);
  return result[0];
}

export async function createTemplate(data: InsertTemplate) {
  const db = await getDb();
  const normalizedKey = normalizeTemplateKey(data.templateKey || data.name);
  const templateGroupKey = getTemplateGroupKey(data.templateGroupKey || normalizedKey);

  if (!db) {
    const template: Template = {
      id: memoryState.templates.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      name: data.name,
      templateKey: normalizedKey,
      templateGroupKey,
      version: data.version ?? 1,
      status: data.status ?? "Draft",
      description: data.description ?? null,
      phases: data.phases,
      sampleTasks: data.sampleTasks,
      uploadSource: data.uploadSource ?? "manual",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.templates.push(template);
    return template.id;
  }

  const { templates } = await import("../drizzle/schema");
  const result = await db
    .insert(templates)
    .values({
      ...data,
      templateKey: normalizedKey,
      templateGroupKey,
      version: data.version ?? 1,
      status: data.status ?? "Draft",
      uploadSource: data.uploadSource ?? "manual",
    })
    .$returningId();
  return result[0]?.id || 0;
}

export async function updateTemplate(id: number, data: Partial<InsertTemplate>) {
  const db = await getDb();

  if (!db) {
    const index = memoryState.templates.findIndex((template) => template.id === id);
    if (index < 0) return;
    const current = memoryState.templates[index]!;
    const templateKey = data.templateKey ? normalizeTemplateKey(data.templateKey) : current.templateKey;
    const templateGroupKey = data.templateGroupKey
      ? getTemplateGroupKey(data.templateGroupKey)
      : current.templateGroupKey;

    memoryState.templates[index] = {
      ...current,
      ...data,
      templateKey,
      templateGroupKey,
      description: data.description ?? current.description,
      phases: data.phases ?? current.phases,
      sampleTasks: data.sampleTasks ?? current.sampleTasks,
      uploadSource: data.uploadSource ?? current.uploadSource,
      updatedAt: new Date(),
    };
    return;
  }

  const { templates } = await import("../drizzle/schema");
  const updateData: Partial<InsertTemplate> = { ...data };

  if (data.templateKey) {
    updateData.templateKey = normalizeTemplateKey(data.templateKey);
  }
  if (data.templateGroupKey) {
    updateData.templateGroupKey = getTemplateGroupKey(data.templateGroupKey);
  }

  await db.update(templates).set(updateData).where(eq(templates.id, id));
}

export async function archiveTemplate(id: number) {
  return updateTemplate(id, { status: "Archived" });
}

export async function publishTemplate(id: number) {
  const target = await getTemplateById(id);
  if (!target) throw new Error("Template not found");
  const groupKey = target.templateGroupKey;

  const db = await getDb();
  if (!db) {
    memoryState.templates = memoryState.templates.map((template) => {
      if (template.templateGroupKey !== groupKey) return template;
      if (template.id === id) {
        return {
          ...template,
          status: "Published",
          updatedAt: new Date(),
        };
      }
      if (template.status === "Published") {
        return {
          ...template,
          status: "Archived",
          updatedAt: new Date(),
        };
      }
      return template;
    });
    return;
  }

  const { templates } = await import("../drizzle/schema");

  await db
    .update(templates)
    .set({ status: "Archived" })
    .where(and(eq(templates.templateGroupKey, groupKey), eq(templates.status, "Published")));

  await db.update(templates).set({ status: "Published" }).where(eq(templates.id, id));
}

export async function createTemplateVersion(sourceTemplateId: number) {
  const source = await getTemplateById(sourceTemplateId);
  if (!source) throw new Error("Source template not found");

  const groupTemplates = await getAllTemplates({
    status: "All",
    includeArchived: true,
    templateGroupKey: source.templateGroupKey,
  });

  const maxVersion = groupTemplates.reduce((max, template) => Math.max(max, template.version), 0);
  const nextVersion = maxVersion + 1;

  const newKey = `${source.templateGroupKey}_v${nextVersion}`;

  return createTemplate({
    name: source.name,
    templateKey: newKey,
    templateGroupKey: source.templateGroupKey,
    version: nextVersion,
    status: "Draft",
    description: source.description ?? undefined,
    phases: source.phases,
    sampleTasks: source.sampleTasks,
    uploadSource: "version",
  });
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

export async function getAllProjects() {
  const db = await getDb();
  if (!db) {
    return [...memoryState.projects]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyProject);
  }

  const { projects } = await import("../drizzle/schema");
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) {
    const project = memoryState.projects.find((item) => item.id === id);
    return project ? copyProject(project) : undefined;
  }

  const { projects } = await import("../drizzle/schema");
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) {
    const project: Project = {
      id: memoryState.nextProjectId++,
      name: data.name,
      description: data.description ?? null,
      templateId: data.templateId ?? null,
      templateType: data.templateType,
      projectManager: data.projectManager ?? null,
      startDate: data.startDate ?? null,
      targetCompletionDate: data.targetCompletionDate ?? null,
      budget: data.budget ?? null,
      status: data.status ?? "Planning",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.projects.push(project);
    return project.id;
  }

  const { projects } = await import("../drizzle/schema");
  const result = await db.insert(projects).values(data).$returningId();
  return result[0]?.id || 0;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.projects.findIndex((project) => project.id === id);
    if (index < 0) return;
    memoryState.projects[index] = {
      ...memoryState.projects[index],
      ...data,
      updatedAt: new Date(),
      description: data.description ?? memoryState.projects[index]!.description,
      templateId: data.templateId ?? memoryState.projects[index]!.templateId,
      projectManager: data.projectManager ?? memoryState.projects[index]!.projectManager,
      startDate: data.startDate ?? memoryState.projects[index]!.startDate,
      targetCompletionDate:
        data.targetCompletionDate ?? memoryState.projects[index]!.targetCompletionDate,
      budget: data.budget ?? memoryState.projects[index]!.budget,
    };
    return;
  }

  const { projects } = await import("../drizzle/schema");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.projects = memoryState.projects.filter((project) => project.id !== id);
    memoryState.tasks = memoryState.tasks.filter((task) => task.projectId !== id);
    return;
  }

  const { projects } = await import("../drizzle/schema");
  await db.delete(projects).where(eq(projects.id, id));
}

// ============================================================================
// TASK QUERIES
// ============================================================================

export async function getTasksByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.tasks
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => a.taskId.localeCompare(b.taskId))
      .map(copyTask);
  }

  const { tasks } = await import("../drizzle/schema");
  return db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(tasks.taskId);
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) {
    const task = memoryState.tasks.find((item) => item.id === id);
    return task ? copyTask(task) : undefined;
  }

  const { tasks } = await import("../drizzle/schema");
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) {
    const task: Task = {
      id: memoryState.nextTaskId++,
      projectId: data.projectId,
      taskId: data.taskId || getNextTaskCode(data.projectId),
      taskDescription: data.taskDescription,
      startDate: data.startDate ?? null,
      dueDate: data.dueDate ?? null,
      durationDays: data.durationDays ?? null,
      dependency: data.dependency ?? null,
      owner: data.owner ?? null,
      status: data.status ?? "Not Started",
      priority: data.priority ?? "Medium",
      phase: data.phase ?? null,
      budget: data.budget ?? null,
      approvalRequired: data.approvalRequired ?? "No",
      approver: data.approver ?? null,
      deliverableType: data.deliverableType ?? null,
      completionPercent: data.completionPercent ?? 0,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    memoryState.tasks.push(task);
    return task.id;
  }

  const { tasks } = await import("../drizzle/schema");

  if (!data.taskId) {
    const existingTasks = await db.select().from(tasks).where(eq(tasks.projectId, data.projectId));
    const nextNumber = existingTasks.length + 1;
    data.taskId = `T${String(nextNumber).padStart(3, "0")}`;
  }

  await db.insert(tasks).values(data);
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, data.projectId))
    .orderBy(desc(tasks.id))
    .limit(1);
  return result[0]?.id || 0;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    memoryState.tasks[index] = {
      ...memoryState.tasks[index],
      ...data,
      updatedAt: new Date(),
      startDate: data.startDate ?? memoryState.tasks[index]!.startDate,
      dueDate: data.dueDate ?? memoryState.tasks[index]!.dueDate,
      durationDays: data.durationDays ?? memoryState.tasks[index]!.durationDays,
      dependency: data.dependency ?? memoryState.tasks[index]!.dependency,
      owner: data.owner ?? memoryState.tasks[index]!.owner,
      phase: data.phase ?? memoryState.tasks[index]!.phase,
      budget: data.budget ?? memoryState.tasks[index]!.budget,
      approver: data.approver ?? memoryState.tasks[index]!.approver,
      deliverableType: data.deliverableType ?? memoryState.tasks[index]!.deliverableType,
      notes: data.notes ?? memoryState.tasks[index]!.notes,
      completionPercent: data.completionPercent ?? memoryState.tasks[index]!.completionPercent,
    };
    return;
  }

  const { tasks } = await import("../drizzle/schema");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.tasks = memoryState.tasks.filter((task) => task.id !== id);
    return;
  }

  const { tasks } = await import("../drizzle/schema");
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return memoryState.tasks.map(copyTask);

  const { tasks } = await import("../drizzle/schema");
  return db.select().from(tasks);
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) {
    return computeDashboardStats(memoryState.projects, memoryState.tasks);
  }

  const { projects, tasks } = await import("../drizzle/schema");
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);
  return computeDashboardStats(allProjects, allTasks);
}
