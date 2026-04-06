import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const retrospectivesTable = pgTable("retrospectives", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sprintId: integer("sprint_id"),
  projectId: integer("project_id"),
  format: text("format").notNull().default("start_stop_continue"),
  status: text("status").notNull().default("open"),
  facilitatorId: integer("facilitator_id"),
  summary: text("summary"),
  actionItems: jsonb("action_items").$type<Array<{ text: string; assigneeId?: number; done: boolean }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type Retrospective = typeof retrospectivesTable.$inferSelect;

export const retroItemsTable = pgTable("retro_items", {
  id: serial("id").primaryKey(),
  retroId: integer("retro_id").notNull(),
  memberId: integer("member_id").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  votes: integer("votes").notNull().default(0),
  votedBy: jsonb("voted_by").$type<number[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RetroItem = typeof retroItemsTable.$inferSelect;
