import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const dashboardWidgetsTable = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  widgetType: text("widget_type").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  width: integer("width").notNull().default(1),
  height: integer("height").notNull().default(1),
  config: jsonb("config").$type<Record<string, any>>().notNull().default({}),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DashboardWidget = typeof dashboardWidgetsTable.$inferSelect;
