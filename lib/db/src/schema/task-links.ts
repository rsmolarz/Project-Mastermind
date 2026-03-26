import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const taskLinksTable = pgTable("task_links", {
  id: serial("id").primaryKey(),
  sourceTaskId: integer("source_task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  targetTaskId: integer("target_task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  linkType: text("link_type").notNull().default("related"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskLinkSchema = createInsertSchema(taskLinksTable).omit({ id: true, createdAt: true });
export type InsertTaskLink = z.infer<typeof insertTaskLinkSchema>;
export type TaskLink = typeof taskLinksTable.$inferSelect;
