import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, automationsTable, tasksTable, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/automations", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const conditions = projectId ? eq(automationsTable.projectId, projectId) : undefined;
  const automations = await db.select().from(automationsTable)
    .where(conditions)
    .orderBy(desc(automationsTable.createdAt));
  res.json(automations);
});

router.post("/automations", async (req, res): Promise<void> => {
  const { name, projectId, trigger, conditions, actions, enabled } = req.body;
  if (!name || !trigger) {
    res.status(400).json({ error: "name and trigger required" });
    return;
  }
  const [automation] = await db.insert(automationsTable).values({
    name,
    projectId: projectId || null,
    trigger,
    conditions: conditions || {},
    actions: actions || [],
    enabled: enabled !== false,
  }).returning();
  res.status(201).json(automation);
});

router.patch("/automations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.trigger !== undefined) updates.trigger = req.body.trigger;
  if (req.body.conditions !== undefined) updates.conditions = req.body.conditions;
  if (req.body.actions !== undefined) updates.actions = req.body.actions;
  if (req.body.enabled !== undefined) updates.enabled = req.body.enabled;
  if (req.body.projectId !== undefined) updates.projectId = req.body.projectId;

  const [updated] = await db.update(automationsTable)
    .set(updates).where(eq(automationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/automations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(automationsTable).where(eq(automationsTable.id, id));
  res.json({ success: true });
});

router.post("/automations/:id/test", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [automation] = await db.select().from(automationsTable).where(eq(automationsTable.id, id));
  if (!automation) { res.status(404).json({ error: "Not found" }); return; }

  let actionsExecuted = 0;
  for (const action of automation.actions as { type: string; params: Record<string, any> }[]) {
    try {
      if (action.type === "notify") {
        await db.insert(notificationsTable).values({
          userId: action.params.userId || 1,
          type: "automation",
          title: action.params.title || `Test: ${automation.name}`,
          message: action.params.message || "Automation test run",
        });
        actionsExecuted++;
      }
      if (action.type === "change_status" && req.body.taskId) {
        await db.update(tasksTable).set({ status: action.params.status }).where(eq(tasksTable.id, req.body.taskId));
        actionsExecuted++;
      }
      if (action.type === "change_priority" && req.body.taskId) {
        await db.update(tasksTable).set({ priority: action.params.priority }).where(eq(tasksTable.id, req.body.taskId));
        actionsExecuted++;
      }
    } catch (e) {
      console.error(`Test action failed:`, e);
    }
  }

  await db.update(automationsTable).set({
    runCount: automation.runCount + 1,
    lastRunAt: new Date(),
  }).where(eq(automationsTable.id, id));

  res.json({ success: true, message: `Automation "${automation.name}" test completed: ${actionsExecuted} action(s) executed` });
});

export async function runAutomations(trigger: string, context: Record<string, any>) {
  const automations = await db.select().from(automationsTable)
    .where(eq(automationsTable.trigger, trigger));

  for (const auto of automations) {
    if (!auto.enabled) continue;
    if (auto.projectId && context.projectId && auto.projectId !== context.projectId) continue;

    let conditionsMet = true;
    if (auto.conditions && typeof auto.conditions === "object") {
      for (const [key, value] of Object.entries(auto.conditions as Record<string, any>)) {
        if (context[key] !== value) { conditionsMet = false; break; }
      }
    }
    if (!conditionsMet) continue;

    for (const action of auto.actions as { type: string; params: Record<string, any> }[]) {
      try {
        if (action.type === "change_status" && context.taskId) {
          await db.update(tasksTable).set({ status: action.params.status })
            .where(eq(tasksTable.id, context.taskId));
        }
        if (action.type === "change_priority" && context.taskId) {
          await db.update(tasksTable).set({ priority: action.params.priority })
            .where(eq(tasksTable.id, context.taskId));
        }
        if (action.type === "assign" && context.taskId) {
          const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, context.taskId));
          if (task) {
            const ids = [...(task.assigneeIds || []), action.params.memberId];
            await db.update(tasksTable).set({ assigneeIds: [...new Set(ids)] })
              .where(eq(tasksTable.id, context.taskId));
          }
        }
        if (action.type === "notify") {
          await db.insert(notificationsTable).values({
            userId: action.params.userId || 1,
            type: "automation",
            title: action.params.title || `Automation: ${auto.name}`,
            message: action.params.message || "An automation was triggered",
          });
        }
      } catch (e) {
        console.error(`Automation ${auto.id} action failed:`, e);
      }
    }

    await db.update(automationsTable).set({
      runCount: auto.runCount + 1,
      lastRunAt: new Date(),
    }).where(eq(automationsTable.id, auto.id));
  }
}

export default router;
