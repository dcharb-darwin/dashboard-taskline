import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Project templates table - stores the 14 standardized project types
 */
export const templates = sqliteTable("templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  templateKey: text("templateKey").notNull().unique(),
  templateGroupKey: text("templateGroupKey").notNull(),
  version: integer("version", { mode: "number" }).default(1).notNull(),
  status: text("status", { enum: ["Draft", "Published", "Archived"] }).default("Published").notNull(),
  description: text("description"),
  phases: text("phases").notNull(), // JSON array of phase names
  sampleTasks: text("sampleTasks").notNull(), // JSON array of sample task objects
  uploadSource: text("uploadSource").default("manual").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Projects table - stores all project instances
 */
export const projects = sqliteTable("projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("templateId", { mode: "number" }).references(() => templates.id),
  templateType: text("templateType").notNull(),
  projectManager: text("projectManager"),
  startDate: integer("startDate", { mode: "timestamp" }),
  targetCompletionDate: integer("targetCompletionDate", { mode: "timestamp" }),
  budget: integer("budget", { mode: "number" }), // stored as cents
  actualBudget: integer("actualBudget", { mode: "number" }), // stored as cents
  externalId: text("externalId"), // optional — companion apps store their own ID here
  metadata: text("metadata"), // JSON — companion apps store domain-specific data here
  status: text("status").default("Planning").notNull(), // managed via app_settings enums
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Tasks table - stores all tasks for projects with dependency tracking
 */
export const tasks = sqliteTable("tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("taskId").notNull().$defaultFn(() => ''), // T001, T002, etc. - auto-generated
  taskDescription: text("taskDescription").notNull(),
  startDate: integer("startDate", { mode: "timestamp" }),
  dueDate: integer("dueDate", { mode: "timestamp" }),
  durationDays: integer("durationDays", { mode: "number" }),
  dependency: text("dependency"), // comma-separated task IDs
  owner: text("owner"),
  status: text("status").default("Not Started").notNull(), // managed via app_settings enums
  priority: text("priority").default("Medium").notNull(), // managed via app_settings enums
  phase: text("phase"),
  milestone: text("milestone"),
  budget: integer("budget", { mode: "number" }), // stored as cents
  actualBudget: integer("actualBudget", { mode: "number" }), // stored as cents
  approvalRequired: text("approvalRequired", { enum: ["Yes", "No"] }).default("No").notNull(),
  approver: text("approver"),
  deliverableType: text("deliverableType"),
  completionPercent: integer("completionPercent", { mode: "number" }).default(0).notNull(),
  notes: text("notes"),
  metadata: text("metadata"), // JSON — companion apps store domain-specific data here
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Task notes table — append-only journal entries per task.
 */
export const taskNotes = sqliteTable("task_notes", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskId: integer("taskId", { mode: "number" }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorName: text("authorName").notNull().default("System"),
  content: text("content").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type TaskNote = typeof taskNotes.$inferSelect;
export type InsertTaskNote = typeof taskNotes.$inferInsert;

/**
 * Project notes table — append-only journal entries per project.
 */
export const projectNotes = sqliteTable("project_notes", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  authorName: text("authorName").notNull().default("System"),
  content: text("content").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ProjectNote = typeof projectNotes.$inferSelect;
export type InsertProjectNote = typeof projectNotes.$inferInsert;

/**
 * Project comments table - contextual collaboration on projects and tasks.
 */
export const projectComments = sqliteTable("project_comments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("taskId", { mode: "number" }).references(() => tasks.id, { onDelete: "set null" }),
  authorName: text("authorName").notNull(),
  content: text("content").notNull(),
  mentions: text("mentions"), // JSON array of mention handles
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = typeof projectComments.$inferInsert;

/**
 * Project activity timeline table - immutable record of key project changes.
 */
export const projectActivities = sqliteTable("project_activities", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("taskId", { mode: "number" }).references(() => tasks.id, { onDelete: "set null" }),
  actorName: text("actorName").notNull(),
  eventType: text("eventType", {
    enum: [
      "comment_added",
      "task_status_changed",
      "task_assignment_changed",
      "due_soon",
      "overdue",
    ]
  }).notNull(),
  summary: text("summary").notNull(),
  metadata: text("metadata"), // JSON object for event details
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ProjectActivity = typeof projectActivities.$inferSelect;
export type InsertProjectActivity = typeof projectActivities.$inferInsert;

/**
 * Notification preferences table - per user/team routing and event toggles.
 */
export const notificationPreferences = sqliteTable("notification_preferences", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  scopeType: text("scopeType", { enum: ["user", "team"] }).default("team").notNull(),
  scopeKey: text("scopeKey").notNull(),
  inAppEnabled: text("inAppEnabled", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  emailEnabled: text("emailEnabled", { enum: ["Yes", "No"] }).default("No").notNull(),
  slackEnabled: text("slackEnabled", { enum: ["Yes", "No"] }).default("No").notNull(),
  webhookEnabled: text("webhookEnabled", { enum: ["Yes", "No"] }).default("No").notNull(),
  webhookUrl: text("webhookUrl"),
  overdueEnabled: text("overdueEnabled", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  dueSoonEnabled: text("dueSoonEnabled", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  assignmentEnabled: text("assignmentEnabled", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  statusChangeEnabled: text("statusChangeEnabled", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Notification events table - generated events to support in-app timeline/feeds.
 */
export const notificationEvents = sqliteTable("notification_events", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: integer("taskId", { mode: "number" }).references(() => tasks.id, { onDelete: "set null" }),
  eventType: text("eventType", {
    enum: [
      "overdue",
      "due_soon",
      "assignment_changed",
      "status_changed",
    ]
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  channels: text("channels").notNull(), // JSON array: in_app, email, slack, webhook
  metadata: text("metadata"), // JSON object for dedupe and routing metadata
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type InsertNotificationEvent = typeof notificationEvents.$inferInsert;

/**
 * Audit log table - governance record of critical lifecycle actions.
 */
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  entityType: text("entityType", {
    enum: [
      "project",
      "task",
      "template",
      "integration",
      "webhook",
      "user_access",
    ]
  }).notNull(),
  entityId: text("entityId").notNull(),
  action: text("action").notNull(),
  actorOpenId: text("actorOpenId"),
  actorName: text("actorName").notNull(),
  details: text("details"), // JSON object with structured audit metadata
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Webhook subscription table - outbound integration endpoint management.
 */
export const webhookSubscriptions = sqliteTable("webhook_subscriptions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  endpointUrl: text("endpointUrl").notNull(),
  events: text("events").notNull(), // JSON array of event names
  secret: text("secret"),
  isActive: text("isActive", { enum: ["Yes", "No"] }).default("Yes").notNull(),
  lastTriggeredAt: integer("lastTriggeredAt", { mode: "timestamp" }),
  lastStatus: text("lastStatus"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type InsertWebhookSubscription = typeof webhookSubscriptions.$inferInsert;

/**
 * User access policy table - role mapping for viewer/editor/admin access control.
 */
export const userAccessPolicies = sqliteTable("user_access_policies", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  accessRole: text("accessRole", { enum: ["Admin", "Editor", "Viewer"] }).default("Editor").notNull(),
  updatedBy: text("updatedBy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type UserAccessPolicy = typeof userAccessPolicies.$inferSelect;
export type InsertUserAccessPolicy = typeof userAccessPolicies.$inferInsert;

/**
 * Application settings table - key/value config for admin-managed settings.
 * Categories: "general", "governance", "notifications", "templates".
 */
export const appSettings = sqliteTable("app_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // "general" | "governance" | "notifications" | "templates"
  settingKey: text("settingKey").notNull().unique(),
  value: text("value").notNull(), // JSON-encoded value
  updatedBy: text("updatedBy"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Project risks — dedicated risk register per project.
 * probability/impact are 1-5 integers, riskScore = probability * impact.
 */
export const projectRisks = sqliteTable("project_risks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  probability: integer("probability").notNull().default(3),  // 1-5
  impact: integer("impact").notNull().default(3),            // 1-5
  riskScore: integer("riskScore").notNull().default(9),      // probability * impact
  status: text("status").notNull().default("Open"),          // "Open" | "Mitigated" | "Accepted" | "Closed"
  mitigationPlan: text("mitigationPlan"),
  owner: text("owner"),
  linkedTaskId: integer("linkedTaskId"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ProjectRisk = typeof projectRisks.$inferSelect;
export type InsertProjectRisk = typeof projectRisks.$inferInsert;

/**
 * Project tags — lightweight labels for categorizing projects.
 * Each tag has a label and optional color. Tags are scoped globally
 * and linked to projects via projectId.
 */
export const projectTags = sqliteTable("project_tags", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color").default("#3b82f6").notNull(), // default blue
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type ProjectTag = typeof projectTags.$inferSelect;
export type InsertProjectTag = typeof projectTags.$inferInsert;

/**
 * Saved views — named filter/sort presets for the global Tasks page.
 * Stores filter state as JSON so users can save and reload task views.
 */
export const savedViews = sqliteTable("saved_views", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  filters: text("filters").notNull(), // JSON: { status, priority, project, search, sortBy }
  createdBy: text("createdBy").default("System").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type SavedView = typeof savedViews.$inferSelect;
export type InsertSavedView = typeof savedViews.$inferInsert;
