import { pgTable, text, serial, timestamp, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  notificationType: text("notification_type").notNull().default("in_app"),
  target: text("target").notNull().default(""),
  status: text("status").notNull().default("pending"),
  jobId: text("job_id"),
  calendarEventId: text("calendar_event_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  index("reminders_scheduled_idx").on(table.scheduledAt),
  index("reminders_status_idx").on(table.status),
  index("reminders_user_idx").on(table.userId),
]));

export const emailRoutesTable = pgTable("email_routes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  assignedEmail: text("assigned_email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("email_routes_email_idx").on(table.assignedEmail),
]));

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address"),
  subject: text("subject").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  provider: text("provider").notNull().default("internal"),
  direction: text("direction").notNull().default("outbound"),
  gmailMessageId: text("gmail_message_id"),
  rawHeaders: jsonb("raw_headers").$type<Record<string, string>>(),
  attachments: jsonb("attachments").$type<Array<{
    filename: string; contentType: string; size: number;
  }>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  index("email_logs_project_idx").on(table.projectId),
  index("email_logs_gmail_msg_idx").on(table.gmailMessageId),
]));

export const gmailAccountsTable = pgTable("gmail_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  tokenExpiryDate: timestamp("token_expiry_date", { withTimezone: true }),
  scopes: text("scopes"),
  lastSyncHistoryId: text("last_sync_history_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("gmail_accounts_email_idx").on(table.email),
]));

export type Reminder = typeof remindersTable.$inferSelect;
export type InsertReminder = typeof remindersTable.$inferInsert;
export type EmailRoute = typeof emailRoutesTable.$inferSelect;
export type InsertEmailRoute = typeof emailRoutesTable.$inferInsert;
export type EmailLog = typeof emailLogsTable.$inferSelect;
export type InsertEmailLog = typeof emailLogsTable.$inferInsert;
export const domainProjectMappingsTable = pgTable("domain_project_mappings", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  projectId: integer("project_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
  uniqueIndex("domain_mapping_domain_idx").on(table.domain),
  index("domain_mapping_project_idx").on(table.projectId),
]));

export type DomainProjectMapping = typeof domainProjectMappingsTable.$inferSelect;
export type InsertDomainProjectMapping = typeof domainProjectMappingsTable.$inferInsert;

export type GmailAccount = typeof gmailAccountsTable.$inferSelect;
