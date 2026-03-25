import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export const projectUpdatesTable = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => membersTable.id),
  status: text("status").notNull().default("on_track"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  blockers: jsonb("blockers").$type<string[]>().notNull().default([]),
  nextSteps: jsonb("next_steps").$type<string[]>().notNull().default([]),
  reactions: jsonb("reactions").$type<Record<string, number>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectUpdateSchema = createInsertSchema(projectUpdatesTable).omit({ id: true, createdAt: true });
export type InsertProjectUpdate = z.infer<typeof insertProjectUpdateSchema>;
export type ProjectUpdate = typeof projectUpdatesTable.$inferSelect;
