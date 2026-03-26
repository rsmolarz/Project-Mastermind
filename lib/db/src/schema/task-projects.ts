import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { projectsTable } from "./projects";

export const taskProjectsTable = pgTable("task_projects", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskProjectSchema = createInsertSchema(taskProjectsTable).omit({ id: true, createdAt: true });
export type InsertTaskProject = z.infer<typeof insertTaskProjectSchema>;
export type TaskProject = typeof taskProjectsTable.$inferSelect;
