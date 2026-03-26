import { Router, type IRouter } from "express";
import { eq, or, desc } from "drizzle-orm";
import { db, taskLinksTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tasks/:taskId/links", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId);
  const links = await db.select().from(taskLinksTable)
    .where(or(
      eq(taskLinksTable.sourceTaskId, taskId),
      eq(taskLinksTable.targetTaskId, taskId)
    ))
    .orderBy(desc(taskLinksTable.createdAt));

  const enriched = await Promise.all(links.map(async (link) => {
    const linkedTaskId = link.sourceTaskId === taskId ? link.targetTaskId : link.sourceTaskId;
    const [linkedTask] = await db.select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
    }).from(tasksTable).where(eq(tasksTable.id, linkedTaskId));
    return { ...link, linkedTask: linkedTask || null };
  }));

  res.json(enriched);
});

router.post("/task-links", async (req, res): Promise<void> => {
  const { sourceTaskId, targetTaskId, linkType } = req.body;
  if (!sourceTaskId || !targetTaskId) {
    res.status(400).json({ error: "sourceTaskId and targetTaskId required" });
    return;
  }
  if (sourceTaskId === targetTaskId) {
    res.status(400).json({ error: "Cannot link a task to itself" });
    return;
  }

  const existing = await db.select().from(taskLinksTable)
    .where(or(
      eq(taskLinksTable.sourceTaskId, sourceTaskId),
      eq(taskLinksTable.sourceTaskId, targetTaskId),
    ));
  const alreadyLinked = existing.some(l =>
    (l.sourceTaskId === sourceTaskId && l.targetTaskId === targetTaskId) ||
    (l.sourceTaskId === targetTaskId && l.targetTaskId === sourceTaskId)
  );
  if (alreadyLinked) {
    res.status(409).json({ error: "These tasks are already linked" });
    return;
  }

  const [link] = await db.insert(taskLinksTable).values({
    sourceTaskId,
    targetTaskId,
    linkType: linkType || "related",
  }).returning();
  res.status(201).json(link);
});

router.delete("/task-links/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(taskLinksTable).where(eq(taskLinksTable.id, id));
  res.json({ success: true });
});

export default router;
