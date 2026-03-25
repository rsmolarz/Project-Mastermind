import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { membersTable } from "./members";

export const approvalsTable = pgTable("approvals", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  requesterId: integer("requester_id").notNull().references(() => membersTable.id),
  approverId: integer("approver_id").notNull().references(() => membersTable.id),
  status: text("status").notNull().default("pending"),
  comment: text("comment").notNull().default(""),
  responseComment: text("response_comment").notNull().default(""),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertApprovalSchema = createInsertSchema(approvalsTable).omit({ id: true, createdAt: true, respondedAt: true });
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvalsTable.$inferSelect;
