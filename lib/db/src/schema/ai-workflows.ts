import { pgTable, serial, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiWorkflowsTable = pgTable("ai_workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  trigger: text("trigger").notNull().default("manual"),
  steps: jsonb("steps").$type<{
    id: string;
    type: string;
    label: string;
    config: Record<string, any>;
    position: { x: number; y: number };
  }[]>().notNull().default([]),
  connections: jsonb("connections").$type<{ from: string; to: string }[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiWorkflowSchema = createInsertSchema(aiWorkflowsTable).omit({ id: true, createdAt: true, updatedAt: true, runCount: true, lastRunAt: true, lastRunStatus: true });
export type InsertAiWorkflow = z.infer<typeof insertAiWorkflowSchema>;
export type AiWorkflow = typeof aiWorkflowsTable.$inferSelect;
