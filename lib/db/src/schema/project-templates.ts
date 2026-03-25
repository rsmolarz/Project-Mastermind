import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectTemplatesTable = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("📁"),
  color: text("color").notNull().default("#6366f1"),
  category: text("category").notNull().default("general"),
  defaultPhase: text("default_phase").notNull().default("Planning"),
  defaultTasks: jsonb("default_tasks").$type<{ title: string; type: string; status: string; priority: string; points: number }[]>().notNull().default([]),
  defaultMilestones: jsonb("default_milestones").$type<{ title: string; offsetDays: number }[]>().notNull().default([]),
  defaultTags: jsonb("default_tags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectTemplateSchema = createInsertSchema(projectTemplatesTable).omit({ id: true, createdAt: true });
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplatesTable.$inferSelect;
