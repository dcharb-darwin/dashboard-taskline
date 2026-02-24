import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Project templates table - stores the 14 standardized project types
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  templateKey: varchar("templateKey", { length: 64 }).notNull().unique(),
  templateGroupKey: varchar("templateGroupKey", { length: 64 }).notNull(),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["Draft", "Published", "Archived"]).default("Published").notNull(),
  description: text("description"),
  phases: text("phases").notNull(), // JSON array of phase names
  sampleTasks: text("sampleTasks").notNull(), // JSON array of sample task objects
  uploadSource: varchar("uploadSource", { length: 32 }).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Projects table - stores all project instances
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: int("templateId").references(() => templates.id),
  templateType: varchar("templateType", { length: 64 }).notNull(),
  projectManager: text("projectManager"),
  startDate: timestamp("startDate"),
  targetCompletionDate: timestamp("targetCompletionDate"),
  budget: int("budget"), // stored as cents
  actualBudget: int("actualBudget"), // stored as cents
  status: mysqlEnum("status", ["Planning", "Active", "On Hold", "Complete"]).default("Planning").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Tasks table - stores all tasks for projects with dependency tracking
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: varchar("taskId", { length: 16 }).notNull().$defaultFn(() => ''), // T001, T002, etc. - auto-generated
  taskDescription: text("taskDescription").notNull(),
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate"),
  durationDays: int("durationDays"),
  dependency: text("dependency"), // comma-separated task IDs
  owner: text("owner"),
  status: mysqlEnum("status", ["Not Started", "In Progress", "Complete", "On Hold"]).default("Not Started").notNull(),
  priority: mysqlEnum("priority", ["High", "Medium", "Low"]).default("Medium").notNull(),
  phase: text("phase"),
  budget: int("budget"), // stored as cents
  actualBudget: int("actualBudget"), // stored as cents
  approvalRequired: mysqlEnum("approvalRequired", ["Yes", "No"]).default("No").notNull(),
  approver: text("approver"),
  deliverableType: text("deliverableType"),
  completionPercent: int("completionPercent").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
