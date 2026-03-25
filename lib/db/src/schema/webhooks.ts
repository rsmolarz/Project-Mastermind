import { pgTable, serial, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webhooksTable = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  failCount: integer("fail_count").notNull().default(0),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  lastStatus: integer("last_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooksTable).omit({ id: true, createdAt: true, failCount: true, lastTriggeredAt: true, lastStatus: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooksTable.$inferSelect;
