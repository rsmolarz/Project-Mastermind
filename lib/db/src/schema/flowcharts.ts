import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const flowchartsTable = pgTable("flowcharts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  type: text("type").notNull().default("flowchart"),
  nodes: jsonb("nodes").$type<{
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    data?: Record<string, any>;
  }[]>().notNull().default([]),
  edges: jsonb("edges").$type<{
    id: string;
    from: string;
    to: string;
    label?: string;
    type?: string;
  }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlowchartSchema = createInsertSchema(flowchartsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFlowchart = z.infer<typeof insertFlowchartSchema>;
export type Flowchart = typeof flowchartsTable.$inferSelect;
