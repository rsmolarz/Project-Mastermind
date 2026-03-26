import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sharedViewsTable = pgTable("shared_views", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  projectId: integer("project_id"),
  viewType: text("view_type").notNull().default("board"),
  filters: text("filters").default("{}"),
  createdBy: integer("created_by"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSharedViewSchema = createInsertSchema(sharedViewsTable).omit({ id: true, createdAt: true });
export type InsertSharedView = z.infer<typeof insertSharedViewSchema>;
export type SharedView = typeof sharedViewsTable.$inferSelect;
