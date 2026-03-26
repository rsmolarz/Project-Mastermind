import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  emailDigestFrequency: text("email_digest_frequency").notNull().default("daily"),
  notifyTaskAssigned: boolean("notify_task_assigned").notNull().default(true),
  notifyTaskCompleted: boolean("notify_task_completed").notNull().default(true),
  notifyTaskCommented: boolean("notify_task_commented").notNull().default(true),
  notifyMentioned: boolean("notify_mentioned").notNull().default(true),
  notifyDueDateApproaching: boolean("notify_due_date_approaching").notNull().default(true),
  notifyProjectUpdates: boolean("notify_project_updates").notNull().default(true),
  notifyApprovals: boolean("notify_approvals").notNull().default(true),
  notifyAnnouncements: boolean("notify_announcements").notNull().default(true),
  theme: text("theme").notNull().default("dark"),
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  defaultView: text("default_view").notNull().default("kanban"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
