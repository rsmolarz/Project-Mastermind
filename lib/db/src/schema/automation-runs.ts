import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { automationsTable } from "./automations";

export const automationRunsTable = pgTable("automation_runs", {
  id: serial("id").primaryKey(),
  automationId: integer("automation_id").notNull().references(() => automationsTable.id, { onDelete: "cascade" }),
  trigger: text("trigger").notNull(),
  context: jsonb("context").$type<Record<string, any>>().notNull().default({}),
  actionsExecuted: integer("actions_executed").notNull().default(0),
  actionsTotal: integer("actions_total").notNull().default(0),
  success: boolean("success").notNull().default(true),
  error: text("error"),
  duration: integer("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAutomationRunSchema = createInsertSchema(automationRunsTable).omit({ id: true, createdAt: true });
export type InsertAutomationRun = z.infer<typeof insertAutomationRunSchema>;
export type AutomationRun = typeof automationRunsTable.$inferSelect;
