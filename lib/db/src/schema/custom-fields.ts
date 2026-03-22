import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const customFieldsTable = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("text"),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  required: text("required").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customFieldValuesTable = pgTable("custom_field_values", {
  id: serial("id").primaryKey(),
  fieldId: integer("field_id").notNull().references(() => customFieldsTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull().default("task"),
  entityId: integer("entity_id").notNull(),
  value: text("value").notNull().default(""),
});

export const insertCustomFieldSchema = createInsertSchema(customFieldsTable).omit({ id: true, createdAt: true });
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFieldsTable.$inferSelect;
export type CustomFieldValue = typeof customFieldValuesTable.$inferSelect;
