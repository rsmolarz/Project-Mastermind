import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const taskDependenciesTable = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  dependsOnId: integer("depends_on_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("finish_to_start"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskDependencySchema = createInsertSchema(taskDependenciesTable).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependenciesTable.$inferSelect;
