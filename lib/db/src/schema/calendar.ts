import { pgTable, text, serial, timestamp, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  googleEventId: text("google_event_id"),
  calendarId: text("calendar_id").notNull().default("primary"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  allDay: boolean("all_day").notNull().default(false),
  status: text("status").notNull().default("confirmed"),
  colorId: text("color_id"),
  organizer: text("organizer"),
  attendees: jsonb("attendees").$type<Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>>(),
  recurrence: jsonb("recurrence").$type<string[]>(),
  reminders: jsonb("reminders").$type<{
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  }>(),
  conferenceLink: text("conference_link"),
  htmlLink: text("html_link"),
  projectId: integer("project_id"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("calendar_events_google_id_idx").on(table.googleEventId),
  index("calendar_events_start_idx").on(table.startTime),
  index("calendar_events_end_idx").on(table.endTime),
  index("calendar_events_project_idx").on(table.projectId),
  index("calendar_events_calendar_idx").on(table.calendarId),
]));

export const calendarSyncLogTable = pgTable("calendar_sync_log", {
  id: serial("id").primaryKey(),
  calendarId: text("calendar_id").notNull(),
  syncToken: text("sync_token"),
  eventsAdded: integer("events_added").notNull().default(0),
  eventsUpdated: integer("events_updated").notNull().default(0),
  eventsRemoved: integer("events_removed").notNull().default(0),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type InsertCalendarEvent = typeof calendarEventsTable.$inferInsert;
export type CalendarSyncLog = typeof calendarSyncLogTable.$inferSelect;
