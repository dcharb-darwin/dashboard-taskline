import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  type AuditLog,
  type InsertAuditLog,
  type InsertNotificationEvent,
  type InsertNotificationPreference,
  type InsertProjectActivity,
  type InsertProjectComment,
  type InsertProject,
  type InsertTemplate,
  type InsertTask,
  type InsertUserAccessPolicy,
  type InsertUser,
  type InsertWebhookSubscription,
  type NotificationEvent,
  type NotificationPreference,
  type ProjectActivity,
  type ProjectComment,
  type Project,
  type Task,
  type Template,
  type UserAccessPolicy,
  type WebhookSubscription,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type TemplateStatus = Template["status"];
export type NotificationScopeType = NotificationPreference["scopeType"];
export type NotificationEventType = NotificationEvent["eventType"];
export type GovernanceRole = UserAccessPolicy["accessRole"];

const YES_NO_YES = "Yes" as const;
const YES_NO_NO = "No" as const;
const DUE_SOON_WINDOW_DAYS = 3;

const DEFAULT_NOTIFICATION_SCOPE = {
  scopeType: "team" as const,
  scopeKey: "default",
};

type TemplateQueryOptions = {
  status?: TemplateStatus | "All";
  includeArchived?: boolean;
  templateGroupKey?: string;
};

export type DependencyValidationIssue = {
  type: "missing_dependency" | "date_conflict" | "cycle";
  taskId: string;
  dependencyTaskId?: string;
  message: string;
};

export type CriticalPathSummary = {
  projectId: number;
  taskIds: number[];
  taskCodes: string[];
  totalDurationDays: number;
  blockedByCycle: boolean;
};

export type PortfolioProjectHealth = "On Track" | "At Risk" | "Off Track";

export type PortfolioSummary = {
  totals: {
    totalProjects: number;
    activeProjects: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
    averageCompletionPercent: number;
  };
  milestoneConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  throughputByWeek: Array<{
    weekStart: string;
    completedTasks: number;
  }>;
  topRisks: Array<{
    projectId: number;
    projectName: string;
    health: PortfolioProjectHealth;
    overdueTasks: number;
    blockedTasks: number;
  }>;
};

export type AuditEntityType = AuditLog["entityType"];

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

type DeliveryChannel = "in_app" | "email" | "slack" | "webhook";

type NotificationPreferencesPatch = Partial<
  Pick<
    NotificationPreference,
    | "inAppEnabled"
    | "emailEnabled"
    | "slackEnabled"
    | "webhookEnabled"
    | "webhookUrl"
    | "overdueEnabled"
    | "dueSoonEnabled"
    | "assignmentEnabled"
    | "statusChangeEnabled"
  >
>;

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
  projectComments: ProjectComment[];
  projectActivities: ProjectActivity[];
  notificationPreferences: NotificationPreference[];
  notificationEvents: NotificationEvent[];
  auditLogs: AuditLog[];
  webhookSubscriptions: WebhookSubscription[];
  userAccessPolicies: UserAccessPolicy[];
  nextProjectId: number;
  nextTaskId: number;
  nextProjectCommentId: number;
  nextProjectActivityId: number;
  nextNotificationPreferenceId: number;
  nextNotificationEventId: number;
  nextAuditLogId: number;
  nextWebhookSubscriptionId: number;
  nextUserAccessPolicyId: number;
};

const copyTemplate = (template: Template): Template => ({ ...template });
const copyProject = (project: Project): Project => ({ ...project });
const copyTask = (task: Task): Task => ({ ...task });
const copyProjectComment = (comment: ProjectComment): ProjectComment => ({ ...comment });
const copyProjectActivity = (activity: ProjectActivity): ProjectActivity => ({ ...activity });
const copyNotificationPreference = (
  preference: NotificationPreference
): NotificationPreference => ({ ...preference });
const copyNotificationEvent = (event: NotificationEvent): NotificationEvent => ({ ...event });
const copyAuditLog = (auditLog: AuditLog): AuditLog => ({ ...auditLog });
const copyWebhookSubscription = (
  webhook: WebhookSubscription
): WebhookSubscription => ({ ...webhook });
const copyUserAccessPolicy = (policy: UserAccessPolicy): UserAccessPolicy => ({ ...policy });

const asYesNo = (value: boolean) => (value ? YES_NO_YES : YES_NO_NO);
const isEnabled = (value: "Yes" | "No" | null | undefined) => value === YES_NO_YES;

const defaultNotificationPreference = (
  scopeType: NotificationScopeType,
  scopeKey: string
): Omit<NotificationPreference, "id" | "createdAt" | "updatedAt"> => ({
  scopeType,
  scopeKey,
  inAppEnabled: YES_NO_YES,
  emailEnabled: YES_NO_NO,
  slackEnabled: YES_NO_NO,
  webhookEnabled: YES_NO_NO,
  webhookUrl: null,
  overdueEnabled: YES_NO_YES,
  dueSoonEnabled: YES_NO_YES,
  assignmentEnabled: YES_NO_YES,
  statusChangeEnabled: YES_NO_YES,
});

const normalizeWebhookUrl = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDeliveryChannels = (
  preference: NotificationPreference
): DeliveryChannel[] => {
  const channels: DeliveryChannel[] = [];
  if (isEnabled(preference.inAppEnabled)) channels.push("in_app");
  if (isEnabled(preference.emailEnabled)) channels.push("email");
  if (isEnabled(preference.slackEnabled)) channels.push("slack");
  if (isEnabled(preference.webhookEnabled) && preference.webhookUrl) {
    channels.push("webhook");
  }
  return channels;
};

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
      actualBudget: 640000,
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
      actualBudget: 90000,
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
      actualBudget: 52000,
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
      actualBudget: 26000,
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
      actualBudget: 0,
      approvalRequired: "No",
      approver: null,
      deliverableType: "Event Plan",
      completionPercent: 0,
      notes: null,
      createdAt: new Date("2025-06-01T00:00:00.000Z"),
      updatedAt: new Date("2025-06-01T00:00:00.000Z"),
    },
  ];

  const notificationPreferences: NotificationPreference[] = [
    {
      id: 1,
      ...defaultNotificationPreference(DEFAULT_NOTIFICATION_SCOPE.scopeType, DEFAULT_NOTIFICATION_SCOPE.scopeKey),
      createdAt: new Date(seedTimestamp),
      updatedAt: new Date(seedTimestamp),
    },
  ];

  const userAccessPolicies: UserAccessPolicy[] = [
    {
      id: 1,
      openId: "test-user",
      accessRole: "Admin",
      updatedBy: "System",
      createdAt: new Date(seedTimestamp),
      updatedAt: new Date(seedTimestamp),
    },
  ];

  return {
    templates,
    projects,
    tasks,
    projectComments: [],
    projectActivities: [],
    notificationPreferences,
    notificationEvents: [],
    auditLogs: [],
    webhookSubscriptions: [],
    userAccessPolicies,
    nextProjectId: projects.length + 1,
    nextTaskId: tasks.length + 1,
    nextProjectCommentId: 1,
    nextProjectActivityId: 1,
    nextNotificationPreferenceId: notificationPreferences.length + 1,
    nextNotificationEventId: 1,
    nextAuditLogId: 1,
    nextWebhookSubscriptionId: 1,
    nextUserAccessPolicyId: userAccessPolicies.length + 1,
  };
};

let memoryState = buildMemoryState();

const parseTaskCodeNumber = (taskId: string): number | null => {
  const match = /^T(\d+)$/i.exec(taskId.trim());
  if (!match) return null;
  const parsed = Number.parseInt(match[1] || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getNextTaskCodeFromIds = (taskIds: string[]) => {
  const upperTaskIds = new Set(taskIds.map((taskId) => taskId.trim().toUpperCase()));
  const highestNumber = taskIds.reduce((max, taskId) => {
    const parsed = parseTaskCodeNumber(taskId);
    if (parsed === null) return max;
    return Math.max(max, parsed);
  }, 0);

  let next = highestNumber + 1;
  let candidate = `T${String(next).padStart(3, "0")}`;
  while (upperTaskIds.has(candidate)) {
    next += 1;
    candidate = `T${String(next).padStart(3, "0")}`;
  }

  return candidate;
};

const getNextTaskCode = (projectId: number) => {
  const taskIds = memoryState.tasks
    .filter((task) => task.projectId === projectId)
    .map((task) => task.taskId);
  return getNextTaskCodeFromIds(taskIds);
};

const parseJsonArray = (value: string | null | undefined): string[] => {
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

const toNotificationFingerprint = (
  eventType: NotificationEventType,
  taskId: number | null | undefined,
  dueDate: Date | null | undefined
) => {
  const dayKey = dueDate ? dueDate.toISOString().slice(0, 10) : "no-date";
  return `${eventType}:${taskId ?? "none"}:${dayKey}`;
};

const parseEventMetadata = (value: string | null | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const getMentionHandles = (content: string) => {
  const handles = new Set<string>();
  const regex = /@([a-zA-Z0-9._-]+)/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(content)) !== null) {
    const handle = match[1]?.trim();
    if (handle) handles.add(handle);
  }
  return Array.from(handles);
};

const parseWebhookEvents = (value: string | null | undefined): WebhookEventName[] =>
  parseJsonArray(value).filter((event): event is WebhookEventName => event.length > 0);

const computeProjectHealthFromTasks = (
  project: Project,
  projectTasks: Task[]
): PortfolioProjectHealth => {
  const now = new Date();
  const openTasks = projectTasks.filter((task) => task.status !== "Complete");
  const overdueOpenTasks = openTasks.filter(
    (task) => task.dueDate && task.dueDate.getTime() < now.getTime()
  ).length;
  const blockedTasks = projectTasks.filter((task) => task.status === "On Hold").length;

  if (overdueOpenTasks > 0 || blockedTasks >= 3 || project.status === "On Hold") {
    return "Off Track";
  }
  if (blockedTasks > 0 || overdueOpenTasks > 0 || project.status === "Planning") {
    return "At Risk";
  }
  return "On Track";
};

const getWeekStartIso = (date: Date) => {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + shift);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().slice(0, 10);
};

const parseDependencies = (dependency: string | null) =>
  dependency
    ? dependency
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

const uniqueIssues = (issues: DependencyValidationIssue[]) => {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}:${issue.taskId}:${issue.dependencyTaskId ?? ""}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const detectCycles = (taskMap: Map<string, Task>) => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const cycleIssues: DependencyValidationIssue[] = [];

  const dfs = (taskId: string, path: string[]) => {
    if (visiting.has(taskId)) {
      cycleIssues.push({
        type: "cycle",
        taskId,
        message: `Dependency cycle detected: ${[...path, taskId].join(" -> ")}`,
      });
      return;
    }
    if (visited.has(taskId)) return;

    visiting.add(taskId);
    const task = taskMap.get(taskId);
    const dependencies = parseDependencies(task?.dependency ?? null);
    for (const dependencyTaskId of dependencies) {
      if (!taskMap.has(dependencyTaskId)) continue;
      dfs(dependencyTaskId, [...path, taskId]);
    }
    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const taskId of Array.from(taskMap.keys())) {
    if (!visited.has(taskId)) {
      dfs(taskId, []);
    }
  }

  return cycleIssues;
};

const buildDependencyIssues = (tasks: Task[]): DependencyValidationIssue[] => {
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const issues: DependencyValidationIssue[] = [];

  for (const task of tasks) {
    const dependencies = parseDependencies(task.dependency);
    for (const dependencyTaskId of dependencies) {
      const dependencyTask = taskMap.get(dependencyTaskId);
      if (!dependencyTask) {
        issues.push({
          type: "missing_dependency",
          taskId: task.taskId,
          dependencyTaskId,
          message: `Task ${task.taskId} references missing dependency ${dependencyTaskId}.`,
        });
        continue;
      }

      if (
        dependencyTask.dueDate &&
        task.startDate &&
        dependencyTask.dueDate.getTime() > task.startDate.getTime()
      ) {
        issues.push({
          type: "date_conflict",
          taskId: task.taskId,
          dependencyTaskId,
          message: `Task ${task.taskId} starts before dependency ${dependencyTaskId} is due.`,
        });
      }
    }
  }

  return uniqueIssues([...issues, ...detectCycles(taskMap)]);
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

const computePortfolioSummary = (
  allProjects: Project[],
  allTasks: Task[]
): PortfolioSummary => {
  const now = new Date();
  const tasksByProject = new Map<number, Task[]>();
  for (const task of allTasks) {
    if (!tasksByProject.has(task.projectId)) {
      tasksByProject.set(task.projectId, []);
    }
    tasksByProject.get(task.projectId)!.push(task);
  }

  const projectHealthRows = allProjects.map((project) => {
    const projectTasks = tasksByProject.get(project.id) ?? [];
    const health = computeProjectHealthFromTasks(project, projectTasks);
    const overdueTasks = projectTasks.filter(
      (task) =>
        task.status !== "Complete" &&
        task.dueDate &&
        task.dueDate.getTime() < now.getTime()
    ).length;
    const blockedTasks = projectTasks.filter((task) => task.status === "On Hold").length;

    return {
      projectId: project.id,
      projectName: project.name,
      health,
      overdueTasks,
      blockedTasks,
      completionPercent:
        projectTasks.length > 0
          ? Math.round(
              projectTasks.reduce(
                (sum, task) => sum + (task.completionPercent ?? 0),
                0
              ) / projectTasks.length
            )
          : 0,
    };
  });

  const onTrack = projectHealthRows.filter((row) => row.health === "On Track").length;
  const atRisk = projectHealthRows.filter((row) => row.health === "At Risk").length;
  const offTrack = projectHealthRows.filter((row) => row.health === "Off Track").length;

  const confidence = {
    high: projectHealthRows.filter((row) => row.health === "On Track").length,
    medium: projectHealthRows.filter((row) => row.health === "At Risk").length,
    low: projectHealthRows.filter((row) => row.health === "Off Track").length,
  };

  const throughputCounter = new Map<string, number>();
  for (const task of allTasks) {
    if (task.status !== "Complete") continue;
    const completionDate = task.updatedAt ?? task.createdAt;
    const weekStart = getWeekStartIso(completionDate);
    throughputCounter.set(weekStart, (throughputCounter.get(weekStart) ?? 0) + 1);
  }

  const throughputByWeek = Array.from(throughputCounter.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([weekStart, completedTasks]) => ({
      weekStart,
      completedTasks,
    }));

  const topRisks = projectHealthRows
    .filter((row) => row.health !== "On Track")
    .sort((a, b) => {
      if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
      if (a.blockedTasks !== b.blockedTasks) return b.blockedTasks - a.blockedTasks;
      return a.projectName.localeCompare(b.projectName);
    })
    .slice(0, 5)
    .map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      health: row.health,
      overdueTasks: row.overdueTasks,
      blockedTasks: row.blockedTasks,
    }));

  const totalCompletionPercent =
    projectHealthRows.length > 0
      ? Math.round(
          projectHealthRows.reduce((sum, row) => sum + row.completionPercent, 0) /
            projectHealthRows.length
        )
      : 0;

  return {
    totals: {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(
        (project) => project.status === "Active" || project.status === "Planning"
      ).length,
      onTrack,
      atRisk,
      offTrack,
      averageCompletionPercent: totalCompletionPercent,
    },
    milestoneConfidence: confidence,
    throughputByWeek,
    topRisks,
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

export async function listUsers(limit = 100) {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const db = await getDb();
  if (!db) {
    return [] as Array<{
      openId: string;
      name: string | null;
      email: string | null;
      role: "user" | "admin";
    }>;
  }

  const rows = await db.select().from(users).orderBy(desc(users.updatedAt)).limit(boundedLimit);
  return rows.map((row) => ({
    openId: row.openId,
    name: row.name ?? null,
    email: row.email ?? null,
    role: row.role,
  }));
}

export async function updateUserBaseRole(openId: string, role: "user" | "admin") {
  const db = await getDb();
  if (!db) {
    return;
  }
  await db.update(users).set({ role }).where(eq(users.openId, openId));
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
      actualBudget: data.actualBudget ?? null,
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
      actualBudget: data.actualBudget ?? memoryState.projects[index]!.actualBudget,
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

export async function getTasksByIds(taskIds: number[]) {
  if (taskIds.length === 0) return [];
  const allTasks = await getAllTasks();
  const taskIdSet = new Set(taskIds);
  return allTasks.filter((task) => taskIdSet.has(task.id));
}

export async function validateTaskDependencies(projectId: number) {
  const tasks = await getTasksByProjectId(projectId);
  return buildDependencyIssues(tasks);
}

const estimateTaskDurationDays = (task: Task) => {
  if (task.durationDays && task.durationDays > 0) return task.durationDays;
  if (task.startDate && task.dueDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.ceil(
      (task.dueDate.getTime() - task.startDate.getTime()) / msPerDay
    );
    return Math.max(1, diff);
  }
  return 1;
};

export async function getProjectCriticalPath(
  projectId: number
): Promise<CriticalPathSummary> {
  const tasks = await getTasksByProjectId(projectId);
  if (tasks.length === 0) {
    return {
      projectId,
      taskIds: [],
      taskCodes: [],
      totalDurationDays: 0,
      blockedByCycle: false,
    };
  }

  const taskByCode = new Map(tasks.map((task) => [task.taskId, task]));
  const dependencyMap = new Map<string, string[]>();
  for (const task of tasks) {
    const dependencies = parseDependencies(task.dependency).filter((dependencyCode) =>
      taskByCode.has(dependencyCode)
    );
    dependencyMap.set(task.taskId, dependencies);
  }

  const memo = new Map<string, { duration: number; path: string[] }>();
  const visiting = new Set<string>();
  let blockedByCycle = false;

  const longestEndingAt = (taskCode: string): { duration: number; path: string[] } => {
    const memoized = memo.get(taskCode);
    if (memoized) return memoized;

    if (visiting.has(taskCode)) {
      blockedByCycle = true;
      const cycleTask = taskByCode.get(taskCode);
      const fallback = {
        duration: cycleTask ? estimateTaskDurationDays(cycleTask) : 1,
        path: [taskCode],
      };
      memo.set(taskCode, fallback);
      return fallback;
    }

    const task = taskByCode.get(taskCode);
    if (!task) {
      const fallback = { duration: 1, path: [taskCode] };
      memo.set(taskCode, fallback);
      return fallback;
    }

    visiting.add(taskCode);
    let bestDependencyDuration = 0;
    let bestDependencyPath: string[] = [];

    for (const dependencyCode of dependencyMap.get(taskCode) ?? []) {
      const dependencyCandidate = longestEndingAt(dependencyCode);
      if (dependencyCandidate.duration > bestDependencyDuration) {
        bestDependencyDuration = dependencyCandidate.duration;
        bestDependencyPath = dependencyCandidate.path;
      }
    }
    visiting.delete(taskCode);

    const duration = estimateTaskDurationDays(task) + bestDependencyDuration;
    const result = {
      duration,
      path: [...bestDependencyPath, taskCode],
    };
    memo.set(taskCode, result);
    return result;
  };

  let best = { duration: 0, path: [] as string[] };
  for (const task of tasks) {
    const candidate = longestEndingAt(task.taskId);
    if (candidate.duration > best.duration) {
      best = candidate;
    }
  }

  return {
    projectId,
    taskIds: best.path
      .map((taskCode) => taskByCode.get(taskCode)?.id)
      .filter((id): id is number => typeof id === "number"),
    taskCodes: best.path,
    totalDurationDays: best.duration,
    blockedByCycle,
  };
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
      actualBudget: data.actualBudget ?? null,
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
    data.taskId = getNextTaskCodeFromIds(existingTasks.map((task) => task.taskId));
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
    const current = memoryState.tasks[index]!;
    const pick = <T>(value: T | undefined, fallback: T) =>
      value === undefined ? fallback : value;
    memoryState.tasks[index] = {
      ...current,
      ...data,
      updatedAt: new Date(),
      startDate: pick(data.startDate, current.startDate),
      dueDate: pick(data.dueDate, current.dueDate),
      durationDays: pick(data.durationDays, current.durationDays),
      dependency: pick(data.dependency, current.dependency),
      owner: pick(data.owner, current.owner),
      phase: pick(data.phase, current.phase),
      budget: pick(data.budget, current.budget),
      actualBudget: pick(data.actualBudget, current.actualBudget),
      approver: pick(data.approver, current.approver),
      deliverableType: pick(data.deliverableType, current.deliverableType),
      notes: pick(data.notes, current.notes),
      completionPercent: pick(data.completionPercent, current.completionPercent),
    };
    return;
  }

  const { tasks } = await import("../drizzle/schema");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

export async function bulkUpdateTasks(taskIds: number[], data: Partial<InsertTask>) {
  if (taskIds.length === 0) return 0;

  for (const taskId of taskIds) {
    await updateTask(taskId, data);
  }
  return taskIds.length;
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

export async function getPortfolioSummary() {
  const db = await getDb();
  if (!db) {
    return computePortfolioSummary(memoryState.projects, memoryState.tasks);
  }

  const { projects, tasks } = await import("../drizzle/schema");
  const allProjects = await db.select().from(projects);
  const allTasks = await db.select().from(tasks);
  return computePortfolioSummary(allProjects, allTasks);
}

// ============================================================================
// COLLABORATION QUERIES
// ============================================================================

export async function getProjectComments(projectId: number, taskId?: number) {
  const db = await getDb();
  if (!db) {
    return memoryState.projectComments
      .filter((comment) => {
        if (comment.projectId !== projectId) return false;
        if (taskId === undefined) return true;
        return comment.taskId === taskId;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(copyProjectComment);
  }

  const { projectComments } = await import("../drizzle/schema");
  if (taskId === undefined) {
    return db
      .select()
      .from(projectComments)
      .where(eq(projectComments.projectId, projectId))
      .orderBy(desc(projectComments.createdAt));
  }

  return db
    .select()
    .from(projectComments)
    .where(and(eq(projectComments.projectId, projectId), eq(projectComments.taskId, taskId)))
    .orderBy(desc(projectComments.createdAt));
}

export async function createProjectComment(
  data: Omit<InsertProjectComment, "mentions"> & { mentions?: string[] | null }
) {
  const serializedMentions = JSON.stringify(data.mentions ?? getMentionHandles(data.content));
  const db = await getDb();
  if (!db) {
    const comment: ProjectComment = {
      id: memoryState.nextProjectCommentId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      authorName: data.authorName,
      content: data.content,
      mentions: serializedMentions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.projectComments.push(comment);
    return copyProjectComment(comment);
  }

  const { projectComments } = await import("../drizzle/schema");
  const result = await db
    .insert(projectComments)
    .values({
      ...data,
      mentions: serializedMentions,
    })
    .$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create project comment");
  const created = await db
    .select()
    .from(projectComments)
    .where(eq(projectComments.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch project comment");
  return created[0];
}

export async function getProjectActivities(projectId: number, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(200, limit));
  const db = await getDb();
  if (!db) {
    return memoryState.projectActivities
      .filter((activity) => activity.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, boundedLimit)
      .map(copyProjectActivity);
  }

  const { projectActivities } = await import("../drizzle/schema");
  return db
    .select()
    .from(projectActivities)
    .where(eq(projectActivities.projectId, projectId))
    .orderBy(desc(projectActivities.createdAt))
    .limit(boundedLimit);
}

export async function createProjectActivity(data: InsertProjectActivity) {
  const db = await getDb();
  if (!db) {
    const activity: ProjectActivity = {
      id: memoryState.nextProjectActivityId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      actorName: data.actorName,
      eventType: data.eventType,
      summary: data.summary,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    memoryState.projectActivities.push(activity);
    return copyProjectActivity(activity);
  }

  const { projectActivities } = await import("../drizzle/schema");
  const result = await db.insert(projectActivities).values(data).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create project activity");
  const created = await db
    .select()
    .from(projectActivities)
    .where(eq(projectActivities.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch project activity");
  return created[0];
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

export async function getNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const db = await getDb();
  if (!db) {
    const item = memoryState.notificationPreferences.find(
      (preference) =>
        preference.scopeType === scopeType && preference.scopeKey === scopeKey
    );
    return item ? copyNotificationPreference(item) : undefined;
  }

  const { notificationPreferences } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.scopeType, scopeType),
        eq(notificationPreferences.scopeKey, scopeKey)
      )
    )
    .limit(1);
  return result[0];
}

export async function upsertNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey,
  patch: NotificationPreferencesPatch = {}
) {
  const normalizedPatch: NotificationPreferencesPatch = {
    ...patch,
    webhookUrl: normalizeWebhookUrl(patch.webhookUrl),
  };
  const db = await getDb();

  if (!db) {
    const index = memoryState.notificationPreferences.findIndex(
      (preference) =>
        preference.scopeType === scopeType && preference.scopeKey === scopeKey
    );
    const now = new Date();

    if (index >= 0) {
      const current = memoryState.notificationPreferences[index]!;
      const next: NotificationPreference = {
        ...current,
        ...normalizedPatch,
        updatedAt: now,
      };
      memoryState.notificationPreferences[index] = next;
      return copyNotificationPreference(next);
    }

    const next: NotificationPreference = {
      id: memoryState.nextNotificationPreferenceId++,
      ...defaultNotificationPreference(scopeType, scopeKey),
      ...normalizedPatch,
      createdAt: now,
      updatedAt: now,
    };
    memoryState.notificationPreferences.push(next);
    return copyNotificationPreference(next);
  }

  const existing = await getNotificationPreference(scopeType, scopeKey);
  const { notificationPreferences } = await import("../drizzle/schema");

  if (existing) {
    await db
      .update(notificationPreferences)
      .set(normalizedPatch as Partial<InsertNotificationPreference>)
      .where(eq(notificationPreferences.id, existing.id));
    const updated = await getNotificationPreference(scopeType, scopeKey);
    if (!updated) throw new Error("Failed to update notification preference");
    return updated;
  }

  const result = await db
    .insert(notificationPreferences)
    .values({
      ...defaultNotificationPreference(scopeType, scopeKey),
      ...normalizedPatch,
    })
    .$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create notification preference");
  const created = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch notification preference");
  return created[0];
}

export async function ensureNotificationPreference(
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const existing = await getNotificationPreference(scopeType, scopeKey);
  if (existing) return existing;
  return upsertNotificationPreference(scopeType, scopeKey, {});
}

export async function listNotificationEvents(projectId: number, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(200, limit));
  const db = await getDb();
  if (!db) {
    return memoryState.notificationEvents
      .filter((event) => event.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, boundedLimit)
      .map(copyNotificationEvent);
  }

  const { notificationEvents } = await import("../drizzle/schema");
  return db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.projectId, projectId))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(boundedLimit);
}

export async function createNotificationEvent(data: InsertNotificationEvent) {
  const db = await getDb();
  if (!db) {
    const event: NotificationEvent = {
      id: memoryState.nextNotificationEventId++,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      eventType: data.eventType,
      title: data.title,
      message: data.message,
      channels: data.channels,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    memoryState.notificationEvents.push(event);
    return copyNotificationEvent(event);
  }

  const { notificationEvents } = await import("../drizzle/schema");
  const result = await db.insert(notificationEvents).values(data).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create notification event");
  const created = await db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch notification event");
  return created[0];
}

export async function recordTaskChangeActivityAndNotifications(args: {
  before: Task;
  after: Task;
  actorName: string;
  scopeType?: NotificationScopeType;
  scopeKey?: string;
}) {
  const activities: ProjectActivity[] = [];
  const notifications: NotificationEvent[] = [];
  const preference = await ensureNotificationPreference(
    args.scopeType ?? DEFAULT_NOTIFICATION_SCOPE.scopeType,
    args.scopeKey ?? DEFAULT_NOTIFICATION_SCOPE.scopeKey
  );
  const channels = getDeliveryChannels(preference);

  const ownerChanged = (args.before.owner ?? "") !== (args.after.owner ?? "");
  const statusChanged = args.before.status !== args.after.status;

  if (ownerChanged) {
    activities.push(
      await createProjectActivity({
        projectId: args.after.projectId,
        taskId: args.after.id,
        actorName: args.actorName,
        eventType: "task_assignment_changed",
        summary: `${args.actorName} reassigned ${args.after.taskId} to ${args.after.owner ?? "Unassigned"}.`,
        metadata: JSON.stringify({
          from: args.before.owner ?? null,
          to: args.after.owner ?? null,
        }),
      })
    );

    if (isEnabled(preference.assignmentEnabled) && channels.length > 0) {
      notifications.push(
        await createNotificationEvent({
          projectId: args.after.projectId,
          taskId: args.after.id,
          eventType: "assignment_changed",
          title: `${args.after.taskId} assignment changed`,
          message: `Task ${args.after.taskId} is now assigned to ${args.after.owner ?? "Unassigned"}.`,
          channels: JSON.stringify(channels),
          metadata: JSON.stringify({
            from: args.before.owner ?? null,
            to: args.after.owner ?? null,
          }),
        })
      );
    }
  }

  if (statusChanged) {
    activities.push(
      await createProjectActivity({
        projectId: args.after.projectId,
        taskId: args.after.id,
        actorName: args.actorName,
        eventType: "task_status_changed",
        summary: `${args.actorName} changed ${args.after.taskId} status to ${args.after.status}.`,
        metadata: JSON.stringify({
          from: args.before.status,
          to: args.after.status,
        }),
      })
    );

    if (isEnabled(preference.statusChangeEnabled) && channels.length > 0) {
      notifications.push(
        await createNotificationEvent({
          projectId: args.after.projectId,
          taskId: args.after.id,
          eventType: "status_changed",
          title: `${args.after.taskId} status changed`,
          message: `Task ${args.after.taskId} moved from ${args.before.status} to ${args.after.status}.`,
          channels: JSON.stringify(channels),
          metadata: JSON.stringify({
            from: args.before.status,
            to: args.after.status,
          }),
        })
      );
    }
  }

  return { activities, notifications };
}

export async function generateScheduleNotifications(
  projectId: number,
  actorName = "System",
  scopeType: NotificationScopeType = DEFAULT_NOTIFICATION_SCOPE.scopeType,
  scopeKey: string = DEFAULT_NOTIFICATION_SCOPE.scopeKey
) {
  const preference = await ensureNotificationPreference(scopeType, scopeKey);
  const channels = getDeliveryChannels(preference);
  if (channels.length === 0) {
    return {
      generatedCount: 0,
      notifications: [] as NotificationEvent[],
    };
  }

  const tasks = await getTasksByProjectId(projectId);
  const existingEvents = await listNotificationEvents(projectId, 200);
  const existingFingerprints = new Set<string>();
  for (const event of existingEvents) {
    const metadata = parseEventMetadata(event.metadata);
    const fingerprint = metadata.fingerprint;
    if (typeof fingerprint === "string") {
      existingFingerprints.add(fingerprint);
    }
  }

  const now = new Date();
  const dueSoonThreshold = new Date(
    now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const created: NotificationEvent[] = [];

  for (const task of tasks) {
    if (!task.dueDate || task.status === "Complete") continue;

    let eventType: NotificationEventType | null = null;
    if (task.dueDate.getTime() < now.getTime() && isEnabled(preference.overdueEnabled)) {
      eventType = "overdue";
    } else if (
      task.dueDate.getTime() >= now.getTime() &&
      task.dueDate.getTime() <= dueSoonThreshold.getTime() &&
      isEnabled(preference.dueSoonEnabled)
    ) {
      eventType = "due_soon";
    }

    if (!eventType) continue;
    const fingerprint = toNotificationFingerprint(eventType, task.id, task.dueDate);
    if (existingFingerprints.has(fingerprint)) continue;
    existingFingerprints.add(fingerprint);

    const title =
      eventType === "overdue"
        ? `${task.taskId} is overdue`
        : `${task.taskId} is due soon`;
    const message =
      eventType === "overdue"
        ? `Task ${task.taskId} is overdue (due ${task.dueDate.toISOString().slice(0, 10)}).`
        : `Task ${task.taskId} is due soon (${task.dueDate.toISOString().slice(0, 10)}).`;

    const notification = await createNotificationEvent({
      projectId,
      taskId: task.id,
      eventType,
      title,
      message,
      channels: JSON.stringify(channels),
      metadata: JSON.stringify({
        fingerprint,
        dueDate: task.dueDate.toISOString(),
      }),
    });
    created.push(notification);

    await createProjectActivity({
      projectId,
      taskId: task.id,
      actorName,
      eventType: eventType === "overdue" ? "overdue" : "due_soon",
      summary: message,
      metadata: JSON.stringify({
        notificationEventId: notification.id,
      }),
    });
  }

  return {
    generatedCount: created.length,
    notifications: created,
  };
}

export function toNotificationPreferenceView(preference: NotificationPreference) {
  return {
    id: preference.id,
    scopeType: preference.scopeType,
    scopeKey: preference.scopeKey,
    channels: {
      inApp: isEnabled(preference.inAppEnabled),
      email: isEnabled(preference.emailEnabled),
      slack: isEnabled(preference.slackEnabled),
      webhook: isEnabled(preference.webhookEnabled),
      webhookUrl: preference.webhookUrl ?? "",
    },
    events: {
      overdue: isEnabled(preference.overdueEnabled),
      dueSoon: isEnabled(preference.dueSoonEnabled),
      assignmentChanged: isEnabled(preference.assignmentEnabled),
      statusChanged: isEnabled(preference.statusChangeEnabled),
    },
    createdAt: preference.createdAt,
    updatedAt: preference.updatedAt,
  };
}

export function toNotificationEventView(event: NotificationEvent) {
  return {
    ...event,
    channels: parseJsonArray(event.channels),
  };
}

// ============================================================================
// GOVERNANCE AND INTEGRATIONS
// ============================================================================

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    const auditLog: AuditLog = {
      id: memoryState.nextAuditLogId++,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actorOpenId: data.actorOpenId ?? null,
      actorName: data.actorName,
      details: data.details ?? null,
      createdAt: new Date(),
    };
    memoryState.auditLogs.push(auditLog);
    return copyAuditLog(auditLog);
  }

  const { auditLogs } = await import("../drizzle/schema");
  const result = await db.insert(auditLogs).values(data).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create audit log");
  const created = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to fetch audit log");
  return created[0];
}

export async function listAuditLogs(options?: {
  limit?: number;
  entityType?: AuditEntityType;
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 200, 500));
  const db = await getDb();
  if (!db) {
    return memoryState.auditLogs
      .filter((item) =>
        options?.entityType ? item.entityType === options.entityType : true
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(copyAuditLog);
  }

  const { auditLogs } = await import("../drizzle/schema");
  if (options?.entityType) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, options.entityType))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function listWebhookSubscriptions(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  const db = await getDb();
  if (!db) {
    return memoryState.webhookSubscriptions
      .filter((webhook) => includeInactive || webhook.isActive === YES_NO_YES)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(copyWebhookSubscription);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  if (includeInactive) {
    return db.select().from(webhookSubscriptions).orderBy(webhookSubscriptions.name);
  }
  return db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.isActive, YES_NO_YES))
    .orderBy(webhookSubscriptions.name);
}

export async function createWebhookSubscription(data: {
  name: string;
  endpointUrl: string;
  events: WebhookEventName[];
  secret?: string | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    const webhook: WebhookSubscription = {
      id: memoryState.nextWebhookSubscriptionId++,
      name: data.name,
      endpointUrl: data.endpointUrl,
      events: JSON.stringify(data.events),
      secret: data.secret ?? null,
      isActive: asYesNo(data.isActive ?? true),
      lastTriggeredAt: null,
      lastStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.webhookSubscriptions.push(webhook);
    return copyWebhookSubscription(webhook);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  const result = await db
    .insert(webhookSubscriptions)
    .values({
      name: data.name,
      endpointUrl: data.endpointUrl,
      events: JSON.stringify(data.events),
      secret: data.secret ?? null,
      isActive: asYesNo(data.isActive ?? true),
    })
    .$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Failed to create webhook subscription");
  const created = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Failed to fetch webhook subscription");
  return created[0];
}

export async function updateWebhookSubscription(
  id: number,
  patch: Partial<{
    name: string;
    endpointUrl: string;
    events: WebhookEventName[];
    secret: string | null;
    isActive: boolean;
    lastStatus: string | null;
    lastTriggeredAt: Date | null;
  }>
) {
  const db = await getDb();
  const normalizedPatch: Partial<InsertWebhookSubscription> = {};
  if (patch.name !== undefined) normalizedPatch.name = patch.name;
  if (patch.endpointUrl !== undefined) normalizedPatch.endpointUrl = patch.endpointUrl;
  if (patch.events !== undefined) normalizedPatch.events = JSON.stringify(patch.events);
  if (patch.secret !== undefined) normalizedPatch.secret = patch.secret;
  if (patch.isActive !== undefined) normalizedPatch.isActive = asYesNo(patch.isActive);
  if (patch.lastStatus !== undefined) normalizedPatch.lastStatus = patch.lastStatus;
  if (patch.lastTriggeredAt !== undefined) {
    normalizedPatch.lastTriggeredAt = patch.lastTriggeredAt;
  }

  if (!db) {
    const index = memoryState.webhookSubscriptions.findIndex((webhook) => webhook.id === id);
    if (index < 0) return undefined;
    const current = memoryState.webhookSubscriptions[index]!;
    const updated: WebhookSubscription = {
      ...current,
      ...normalizedPatch,
      updatedAt: new Date(),
    };
    memoryState.webhookSubscriptions[index] = updated;
    return copyWebhookSubscription(updated);
  }

  const { webhookSubscriptions } = await import("../drizzle/schema");
  await db.update(webhookSubscriptions).set(normalizedPatch).where(eq(webhookSubscriptions.id, id));
  const updated = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id))
    .limit(1);
  return updated[0];
}

export async function deleteWebhookSubscription(id: number) {
  const db = await getDb();
  if (!db) {
    memoryState.webhookSubscriptions = memoryState.webhookSubscriptions.filter(
      (webhook) => webhook.id !== id
    );
    return;
  }
  const { webhookSubscriptions } = await import("../drizzle/schema");
  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
}

export async function dispatchWebhookEvent(args: {
  event: WebhookEventName;
  payload: Record<string, unknown>;
}) {
  const subscriptions = await listWebhookSubscriptions({ includeInactive: false });
  const eligible = subscriptions.filter((subscription) =>
    parseWebhookEvents(subscription.events).includes(args.event)
  );

  const deliveries: Array<{
    webhookId: number;
    success: boolean;
    status: number | null;
    error?: string;
  }> = [];

  for (const subscription of eligible) {
    try {
      const response = await fetch(subscription.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rtc-event": args.event,
          ...(subscription.secret ? { "x-rtc-webhook-secret": subscription.secret } : {}),
        },
        body: JSON.stringify({
          event: args.event,
          occurredAt: new Date().toISOString(),
          payload: args.payload,
        }),
      });

      const success = response.ok;
      deliveries.push({
        webhookId: subscription.id,
        success,
        status: response.status,
      });
      await updateWebhookSubscription(subscription.id, {
        lastTriggeredAt: new Date(),
        lastStatus: success
          ? `ok:${response.status}`
          : `error:${response.status} ${response.statusText}`,
      });
    } catch (error) {
      deliveries.push({
        webhookId: subscription.id,
        success: false,
        status: null,
        error: error instanceof Error ? error.message : "unknown error",
      });
      await updateWebhookSubscription(subscription.id, {
        lastTriggeredAt: new Date(),
        lastStatus:
          error instanceof Error ? `error:${error.message}` : "error:unknown",
      });
    }
  }

  return {
    attempted: deliveries.length,
    delivered: deliveries.filter((delivery) => delivery.success).length,
    deliveries,
  };
}

export async function getUserAccessPolicy(openId: string) {
  const db = await getDb();
  if (!db) {
    const policy = memoryState.userAccessPolicies.find((item) => item.openId === openId);
    return policy ? copyUserAccessPolicy(policy) : undefined;
  }
  const { userAccessPolicies } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(userAccessPolicies)
    .where(eq(userAccessPolicies.openId, openId))
    .limit(1);
  return result[0];
}

export async function upsertUserAccessPolicy(args: {
  openId: string;
  accessRole: GovernanceRole;
  updatedBy?: string | null;
}) {
  const db = await getDb();
  if (!db) {
    const index = memoryState.userAccessPolicies.findIndex(
      (policy) => policy.openId === args.openId
    );
    if (index >= 0) {
      const current = memoryState.userAccessPolicies[index]!;
      const updated: UserAccessPolicy = {
        ...current,
        accessRole: args.accessRole,
        updatedBy: args.updatedBy ?? null,
        updatedAt: new Date(),
      };
      memoryState.userAccessPolicies[index] = updated;
      return copyUserAccessPolicy(updated);
    }

    const created: UserAccessPolicy = {
      id: memoryState.nextUserAccessPolicyId++,
      openId: args.openId,
      accessRole: args.accessRole,
      updatedBy: args.updatedBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryState.userAccessPolicies.push(created);
    return copyUserAccessPolicy(created);
  }

  const { userAccessPolicies } = await import("../drizzle/schema");
  const existing = await getUserAccessPolicy(args.openId);
  if (existing) {
    await db
      .update(userAccessPolicies)
      .set({
        accessRole: args.accessRole,
        updatedBy: args.updatedBy ?? null,
      })
      .where(eq(userAccessPolicies.id, existing.id));
  } else {
    await db.insert(userAccessPolicies).values({
      openId: args.openId,
      accessRole: args.accessRole,
      updatedBy: args.updatedBy ?? null,
    });
  }
  const policy = await getUserAccessPolicy(args.openId);
  if (!policy) throw new Error("Failed to upsert user access policy");
  return policy;
}

export async function listUserAccessPolicies(limit = 200) {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  const db = await getDb();
  if (!db) {
    return memoryState.userAccessPolicies
      .slice()
      .sort((a, b) => a.openId.localeCompare(b.openId))
      .slice(0, boundedLimit)
      .map(copyUserAccessPolicy);
  }
  const { userAccessPolicies } = await import("../drizzle/schema");
  return db
    .select()
    .from(userAccessPolicies)
    .orderBy(userAccessPolicies.openId)
    .limit(boundedLimit);
}

export async function resolveGovernanceRole(openId: string | null | undefined): Promise<GovernanceRole> {
  if (!openId) return "Viewer";

  const policy = await getUserAccessPolicy(openId);
  if (policy) return policy.accessRole;

  const user = await getUserByOpenId(openId);
  if (user?.role === "admin") return "Admin";
  if (user) return "Editor";
  return "Viewer";
}
