import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedViewsTable = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📋"),
  projectId: integer("project_id"),
  viewType: text("view_type").notNull().default("list"),
  filters: jsonb("filters").$type<Record<string, any>>().notNull().default({}),
  sortBy: text("sort_by"),
  sortDirection: text("sort_direction").notNull().default("asc"),
  columns: jsonb("columns").$type<string[]>(),
  isDefault: boolean("is_default").notNull().default(false),
  isShared: boolean("is_shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedViewSchema = createInsertSchema(savedViewsTable).omit({ id: true, createdAt: true });
export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;
export type SavedView = typeof savedViewsTable.$inferSelect;
