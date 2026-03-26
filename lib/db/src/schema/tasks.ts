import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("task"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  sprintId: integer("sprint_id"),
  assigneeIds: jsonb("assignee_ids").$type<number[]>().notNull().default([]),
  points: integer("points").notNull().default(3),
  startDate: timestamp("start_date", { withTimezone: true }),
  due: timestamp("due", { withTimezone: true }),
  parentTaskId: integer("parent_task_id"),
  groupName: text("group_name").notNull().default("Default"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  subtasks: jsonb("subtasks").$type<{ title: string; done: boolean }[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  recurrence: jsonb("recurrence").$type<{ type: string; interval: number; endDate?: string } | null>(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
