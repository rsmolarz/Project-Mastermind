import { pgTable, serial, integer, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const formsTable = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  fields: jsonb("fields").$type<{ id: string; label: string; type: string; required: boolean; options?: string[] }[]>().notNull().default([]),
  slug: text("slug").notNull(),
  active: boolean("active").notNull().default(true),
  submitLabel: text("submit_label").notNull().default("Submit"),
  successMessage: text("success_message").notNull().default("Thank you for your submission!"),
  autoCreateTask: boolean("auto_create_task").notNull().default(true),
  submissionCount: integer("submission_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formSubmissionsTable = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull().references(() => formsTable.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Record<string, any>>().notNull().default({}),
  taskId: integer("task_id"),
  submitterEmail: text("submitter_email"),
  submitterName: text("submitter_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFormSchema = createInsertSchema(formsTable).omit({ id: true, createdAt: true, submissionCount: true });
export const insertFormSubmissionSchema = createInsertSchema(formSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof formsTable.$inferSelect;
export type FormSubmission = typeof formSubmissionsTable.$inferSelect;
