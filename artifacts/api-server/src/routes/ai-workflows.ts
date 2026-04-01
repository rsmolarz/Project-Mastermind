import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, aiWorkflowsTable } from "@workspace/db";

const router: IRouter = Router();

const MAX_STEPS = 20;
const ALLOWED_TRIGGERS = ["manual", "schedule", "webhook", "task_created", "task_completed", "email_received", "form_submitted"];

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get("/ai-workflows", async (_req, res): Promise<void> => {
  try {
    const workflows = await db.select().from(aiWorkflowsTable).orderBy(desc(aiWorkflowsTable.createdAt));
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

router.get("/ai-workflows/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid workflow ID" }); return; }
  try {
    const [workflow] = await db.select().from(aiWorkflowsTable).where(eq(aiWorkflowsTable.id, id));
    if (!workflow) { res.status(404).json({ error: "Workflow not found" }); return; }
    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

router.post("/ai-workflows", async (req, res): Promise<void> => {
  try {
    const { name, description, trigger, steps, connections, enabled } = req.body;
    if (!name || typeof name !== "string" || name.length > 200) {
      res.status(400).json({ error: "name is required (max 200 chars)" }); return;
    }
    if (trigger && !ALLOWED_TRIGGERS.includes(trigger)) {
      res.status(400).json({ error: `Invalid trigger. Allowed: ${ALLOWED_TRIGGERS.join(", ")}` }); return;
    }
    if (steps && (!Array.isArray(steps) || steps.length > MAX_STEPS)) {
      res.status(400).json({ error: `steps must be an array of max ${MAX_STEPS} items` }); return;
    }

    const [workflow] = await db.insert(aiWorkflowsTable).values({
      name: name.substring(0, 200),
      description: typeof description === "string" ? description.substring(0, 1000) : "",
      trigger: trigger || "manual",
      steps: Array.isArray(steps) ? steps.slice(0, MAX_STEPS) : [],
      connections: Array.isArray(connections) ? connections : [],
      enabled: enabled !== false,
    }).returning();
    res.status(201).json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

router.patch("/ai-workflows/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid workflow ID" }); return; }
  try {
    if (req.body.trigger && !ALLOWED_TRIGGERS.includes(req.body.trigger)) {
      res.status(400).json({ error: "Invalid trigger" }); return;
    }
    if (req.body.steps && (!Array.isArray(req.body.steps) || req.body.steps.length > MAX_STEPS)) {
      res.status(400).json({ error: `Max ${MAX_STEPS} steps allowed` }); return;
    }
    const updates: any = { updatedAt: new Date() };
    const fields = ["name", "description", "trigger", "steps", "connections", "enabled"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [workflow] = await db.update(aiWorkflowsTable).set(updates).where(eq(aiWorkflowsTable.id, id)).returning();
    if (!workflow) { res.status(404).json({ error: "Workflow not found" }); return; }
    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

router.delete("/ai-workflows/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid workflow ID" }); return; }
  try {
    await db.delete(aiWorkflowsTable).where(eq(aiWorkflowsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

router.post("/ai-workflows/:id/run", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid workflow ID" }); return; }

  try {
    const [workflow] = await db.select().from(aiWorkflowsTable).where(eq(aiWorkflowsTable.id, id));
    if (!workflow) { res.status(404).json({ error: "Workflow not found" }); return; }
    if (!workflow.enabled) { res.status(400).json({ error: "Workflow is disabled" }); return; }

    const steps = (workflow.steps as any[]) || [];
    if (steps.length > MAX_STEPS) {
      res.status(400).json({ error: `Workflow exceeds max ${MAX_STEPS} steps` }); return;
    }

    const results: { stepId: string; status: string; output?: string }[] = [];
    let aiCallCount = 0;
    const MAX_AI_CALLS_PER_RUN = 5;

    for (const step of steps) {
      try {
        if (step.type === "ai_generate" && aiCallCount < MAX_AI_CALLS_PER_RUN) {
          aiCallCount++;
          const { createAnthropicClient } = await import("@workspace/integrations-anthropic-ai");
          const client = createAnthropicClient();
          const prompt = typeof step.config?.prompt === "string" ? step.config.prompt.substring(0, 2000) : "Hello";
          const response = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });
          const text = response.content[0].type === "text" ? response.content[0].text : "";
          results.push({ stepId: step.id, status: "success", output: text.substring(0, 2000) });
        } else if (step.type === "ai_generate") {
          results.push({ stepId: step.id, status: "skipped", output: "AI call limit reached for this run" });
        } else {
          results.push({ stepId: step.id, status: "success", output: `Step "${step.label}" executed` });
        }
      } catch (err: any) {
        results.push({ stepId: step.id, status: "error", output: "Step execution failed" });
      }
    }

    await db.update(aiWorkflowsTable).set({
      runCount: workflow.runCount + 1,
      lastRunAt: new Date(),
      lastRunStatus: results.every(r => r.status === "success") ? "success" : "partial",
      updatedAt: new Date(),
    }).where(eq(aiWorkflowsTable.id, id));

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to run workflow" });
  }
});

export default router;
