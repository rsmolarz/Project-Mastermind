import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taskTemplatesTable = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("📋"),
  category: text("category").notNull().default("general"),
  defaultStatus: text("default_status").notNull().default("todo"),
  defaultPriority: text("default_priority").notNull().default("medium"),
  defaultPoints: integer("default_points").notNull().default(3),
  defaultTags: jsonb("default_tags").$type<string[]>().notNull().default([]),
  subtaskTemplates: jsonb("subtask_templates").$type<{ title: string }[]>().notNull().default([]),
  notesTemplate: text("notes_template").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplatesTable).omit({ id: true, createdAt: true });
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplatesTable.$inferSelect;
