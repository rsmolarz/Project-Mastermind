import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const automationsTable = pgTable("automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  trigger: text("trigger").notNull(),
  conditions: jsonb("conditions").$type<Record<string, any>>().notNull().default({}),
  actions: jsonb("actions").$type<{ type: string; params: Record<string, any> }[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automationsTable).omit({ id: true, createdAt: true, runCount: true, lastRunAt: true });
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automationsTable.$inferSelect;
