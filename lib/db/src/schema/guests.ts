import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const guestsTable = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull().default(""),
  role: text("role").notNull().default("viewer"),
  accessLevel: text("access_level").notNull().default("view_only"),
  projectIds: jsonb("project_ids").$type<number[]>().notNull().default([]),
  inviteToken: text("invite_token"),
  invitedBy: integer("invited_by"),
  active: boolean("active").notNull().default(true),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Guest = typeof guestsTable.$inferSelect;
