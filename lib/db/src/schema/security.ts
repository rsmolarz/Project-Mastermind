import { pgTable, text, serial, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const securityCredentialsTable = pgTable("security_credentials", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  passwordHash: text("password_hash"),
  credentialId: text("credential_id"),
  credentialPublicKey: text("credential_public_key"),
  counter: text("counter").notNull().default("0"),
  deviceName: text("device_name"),
  transports: jsonb("transports").$type<string[]>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const securitySessionsTable = pgTable("security_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  method: text("method").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SecurityCredential = typeof securityCredentialsTable.$inferSelect;
export type SecuritySession = typeof securitySessionsTable.$inferSelect;
