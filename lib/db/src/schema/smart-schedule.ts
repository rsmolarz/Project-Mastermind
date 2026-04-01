import { pgTable, serial, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const focusBlocksTable = pgTable("focus_blocks", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  title: text("title").notNull().default("Focus Time"),
  weeklyGoalHours: integer("weekly_goal_hours").notNull().default(16),
  minBlockMinutes: integer("min_block_minutes").notNull().default(60),
  maxBlockMinutes: integer("max_block_minutes").notNull().default(180),
  preferredStartTime: text("preferred_start_time").notNull().default("09:00"),
  preferredEndTime: text("preferred_end_time").notNull().default("12:00"),
  mode: text("mode").notNull().default("proactive"),
  color: text("color").notNull().default("#6366f1"),
  enabled: boolean("enabled").notNull().default(true),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFocusBlockSchema = createInsertSchema(focusBlocksTable).omit({ id: true, createdAt: true });
export type InsertFocusBlock = z.infer<typeof insertFocusBlockSchema>;
export type FocusBlock = typeof focusBlocksTable.$inferSelect;

export const habitsTable = pgTable("habits", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  frequency: text("frequency").notNull().default("daily"),
  timesPerWeek: integer("times_per_week").notNull().default(5),
  preferredTime: text("preferred_time").notNull().default("08:00"),
  idealDays: jsonb("ideal_days").$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
  color: text("color").notNull().default("#10b981"),
  enabled: boolean("enabled").notNull().default(true),
  category: text("category").notNull().default("wellness"),
  streak: integer("streak").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true, streak: true, totalCompletions: true, lastCompletedAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;

export const schedulePreferencesTable = pgTable("schedule_preferences", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  workStartTime: text("work_start_time").notNull().default("09:00"),
  workEndTime: text("work_end_time").notNull().default("17:00"),
  workDays: jsonb("work_days").$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
  bufferMinutes: integer("buffer_minutes").notNull().default(15),
  lunchStartTime: text("lunch_start_time").notNull().default("12:00"),
  lunchDurationMinutes: integer("lunch_duration_minutes").notNull().default(60),
  maxMeetingsPerDay: integer("max_meetings_per_day").notNull().default(6),
  autoScheduleTasks: boolean("auto_schedule_tasks").notNull().default(true),
  defendFocusTime: boolean("defend_focus_time").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SchedulePreferences = typeof schedulePreferencesTable.$inferSelect;

export const scheduledBlocksTable = pgTable("scheduled_blocks", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  taskId: integer("task_id"),
  habitId: integer("habit_id"),
  focusBlockId: integer("focus_block_id"),
  status: text("status").notNull().default("scheduled"),
  color: text("color").notNull().default("#6366f1"),
  isAutoScheduled: boolean("is_auto_scheduled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScheduledBlockSchema = createInsertSchema(scheduledBlocksTable).omit({ id: true, createdAt: true });
export type InsertScheduledBlock = z.infer<typeof insertScheduledBlockSchema>;
export type ScheduledBlock = typeof scheduledBlocksTable.$inferSelect;
