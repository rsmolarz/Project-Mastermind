import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const changelogEntriesTable = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  version: text("version"),
  type: text("type").notNull().default("improvement"),
  status: text("status").notNull().default("draft"),
  projectId: integer("project_id"),
  authorId: integer("author_id"),
  tags: jsonb("tags").$type<string[]>().default([]),
  relatedTaskIds: jsonb("related_task_ids").$type<number[]>().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChangelogEntry = typeof changelogEntriesTable.$inferSelect;
