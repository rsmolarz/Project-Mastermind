import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const apiKeysTable = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  prefix: text("prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailConfigTable = pgTable("email_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("smtp"),
  host: text("host").notNull().default(""),
  port: text("port").notNull().default("587"),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  fromName: text("from_name").notNull().default(""),
  fromEmail: text("from_email").notNull().default(""),
  encryption: text("encryption").notNull().default("tls"),
  active: boolean("active").notNull().default(false),
  webhookUrl: text("webhook_url").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({ id: true, createdAt: true, lastUsedAt: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeysTable.$inferSelect;

export const insertEmailConfigSchema = createInsertSchema(emailConfigTable).omit({ id: true, updatedAt: true });
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfigTable.$inferSelect;
