import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("on_track"),
  progress: integer("progress").notNull().default(0),
  due: timestamp("due", { withTimezone: true }).notNull(),
  ownerId: integer("owner_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id"),
  keyResults: jsonb("key_results").$type<{ id: number; title: string; progress: number; target: number; current: number; unit: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
