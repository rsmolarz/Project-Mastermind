import { pgTable, serial, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiAgentsTable = pgTable("ai_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("assistant"),
  description: text("description").notNull().default(""),
  avatar: text("avatar"),
  systemPrompt: text("system_prompt").notNull().default(""),
  model: text("model").notNull().default("claude-3-5-sonnet-20241022"),
  temperature: text("temperature").notNull().default("0.7"),
  tools: jsonb("tools").$type<string[]>().notNull().default([]),
  knowledgeBase: jsonb("knowledge_base").$type<{ name: string; content: string }[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  totalRuns: integer("total_runs").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiAgentSchema = createInsertSchema(aiAgentsTable).omit({ id: true, createdAt: true, updatedAt: true, totalRuns: true, lastRunAt: true });
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type AiAgent = typeof aiAgentsTable.$inferSelect;

export const aiAgentConversationsTable = pgTable("ai_agent_conversations", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  title: text("title").notNull().default("New Chat"),
  messages: jsonb("messages").$type<{ role: string; content: string; timestamp: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiAgentConversation = typeof aiAgentConversationsTable.$inferSelect;
