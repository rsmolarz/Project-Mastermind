import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, aiAgentsTable, aiAgentConversationsTable } from "@workspace/db";

const router: IRouter = Router();

const MAX_MESSAGE_LENGTH = 10000;
const MAX_CONVERSATION_MESSAGES = 50;
const ALLOWED_MODELS = ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"];
const ALLOWED_ROLES = ["assistant", "researcher", "analyst", "writer", "support", "coordinator", "developer", "designer", "sales", "ops"];

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get("/ai-agents", async (_req, res): Promise<void> => {
  try {
    const agents = await db.select().from(aiAgentsTable).orderBy(desc(aiAgentsTable.createdAt));
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

router.get("/ai-agents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid agent ID" }); return; }
  try {
    const [agent] = await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.id, id));
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

router.post("/ai-agents", async (req, res): Promise<void> => {
  try {
    const { name, role, description, avatar, systemPrompt, model, temperature, tools, knowledgeBase, enabled, isPublic } = req.body;
    if (!name || typeof name !== "string" || name.length > 200) {
      res.status(400).json({ error: "name is required (max 200 chars)" }); return;
    }
    if (role && !ALLOWED_ROLES.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}` }); return;
    }
    if (model && !ALLOWED_MODELS.includes(model)) {
      res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}` }); return;
    }
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.length > 10000) {
      res.status(400).json({ error: "System prompt too long (max 10000 chars)" }); return;
    }
    if (tools && (!Array.isArray(tools) || tools.length > 22)) {
      res.status(400).json({ error: "tools must be an array of max 22 items" }); return;
    }

    const [agent] = await db.insert(aiAgentsTable).values({
      name: name.substring(0, 200),
      role: role || "assistant",
      description: typeof description === "string" ? description.substring(0, 1000) : "",
      avatar: typeof avatar === "string" ? avatar.substring(0, 500) : null,
      systemPrompt: typeof systemPrompt === "string" ? systemPrompt.substring(0, 10000) : "",
      model: model || "claude-3-5-sonnet-20241022",
      temperature: typeof temperature === "string" ? temperature.substring(0, 5) : "0.7",
      tools: Array.isArray(tools) ? tools.slice(0, 22) : [],
      knowledgeBase: Array.isArray(knowledgeBase) ? knowledgeBase.slice(0, 10) : [],
      enabled: enabled !== false,
      isPublic: isPublic || false,
    }).returning();
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create agent" });
  }
});

router.patch("/ai-agents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid agent ID" }); return; }
  try {
    if (req.body.model && !ALLOWED_MODELS.includes(req.body.model)) {
      res.status(400).json({ error: "Invalid model" }); return;
    }
    if (req.body.role && !ALLOWED_ROLES.includes(req.body.role)) {
      res.status(400).json({ error: "Invalid role" }); return;
    }
    const updates: any = { updatedAt: new Date() };
    const fields = ["name", "role", "description", "avatar", "systemPrompt", "model", "temperature", "tools", "knowledgeBase", "enabled", "isPublic"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [agent] = await db.update(aiAgentsTable).set(updates).where(eq(aiAgentsTable.id, id)).returning();
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update agent" });
  }
});

router.delete("/ai-agents/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid agent ID" }); return; }
  try {
    await db.delete(aiAgentConversationsTable).where(eq(aiAgentConversationsTable.agentId, id));
    await db.delete(aiAgentsTable).where(eq(aiAgentsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

router.get("/ai-agents/:id/conversations", async (req, res): Promise<void> => {
  const agentId = parseId(req.params.id);
  if (!agentId) { res.status(400).json({ error: "Invalid agent ID" }); return; }
  try {
    const conversations = await db.select().from(aiAgentConversationsTable)
      .where(eq(aiAgentConversationsTable.agentId, agentId))
      .orderBy(desc(aiAgentConversationsTable.createdAt));
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/ai-agents/:id/chat", async (req, res): Promise<void> => {
  const agentId = parseId(req.params.id);
  if (!agentId) { res.status(400).json({ error: "Invalid agent ID" }); return; }

  const { message, conversationId } = req.body;
  if (!message || typeof message !== "string") { res.status(400).json({ error: "message is required" }); return; }
  if (message.length > MAX_MESSAGE_LENGTH) { res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }); return; }
  if (conversationId !== undefined && conversationId !== null) {
    const parsedConvId = parseId(String(conversationId));
    if (!parsedConvId) { res.status(400).json({ error: "Invalid conversationId" }); return; }
  }

  try {
    const [agent] = await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.id, agentId));
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

    let conversation: any;
    if (conversationId) {
      [conversation] = await db.select().from(aiAgentConversationsTable)
        .where(and(
          eq(aiAgentConversationsTable.id, conversationId),
          eq(aiAgentConversationsTable.agentId, agentId)
        ));
      if (!conversation) { res.status(404).json({ error: "Conversation not found for this agent" }); return; }
    }

    const now = new Date().toISOString();
    const existingMessages = (conversation?.messages || []).slice(-MAX_CONVERSATION_MESSAGES);
    const userMsg = { role: "user", content: message.substring(0, MAX_MESSAGE_LENGTH), timestamp: now };

    const { createAnthropicClient } = await import("@workspace/integrations-anthropic-ai");
    const client = createAnthropicClient();

    const systemContent = agent.systemPrompt
      ? `You are ${agent.name}, a ${agent.role}. ${agent.description}\n\nInstructions: ${agent.systemPrompt}`
      : `You are ${agent.name}, a ${agent.role}. ${agent.description}`;

    const apiMessages = [
      ...existingMessages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: agent.model && ALLOWED_MODELS.includes(agent.model) ? agent.model : "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: systemContent,
      messages: apiMessages,
    });

    const assistantContent = response.content[0].type === "text" ? response.content[0].text : "";
    const assistantMsg = { role: "assistant", content: assistantContent, timestamp: new Date().toISOString() };

    const allMessages = [...existingMessages, userMsg, assistantMsg];

    if (conversation) {
      await db.update(aiAgentConversationsTable)
        .set({ messages: allMessages })
        .where(eq(aiAgentConversationsTable.id, conversation.id));
    } else {
      [conversation] = await db.insert(aiAgentConversationsTable).values({
        agentId,
        title: message.substring(0, 100),
        messages: allMessages,
      }).returning();
    }

    await db.update(aiAgentsTable)
      .set({ totalRuns: agent.totalRuns + 1, lastRunAt: new Date() })
      .where(eq(aiAgentsTable.id, agentId));

    res.json({
      reply: assistantContent,
      conversationId: conversation.id,
    });
  } catch (err: any) {
    console.error("AI Agent chat error:", err);
    res.status(500).json({ error: "AI processing error. Please try again." });
  }
});

export default router;
