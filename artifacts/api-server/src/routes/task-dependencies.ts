import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, taskDependenciesTable, tasksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tasks/:taskId/dependencies", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId);
  const deps = await db.select().from(taskDependenciesTable)
    .where(or(
      eq(taskDependenciesTable.taskId, taskId),
      eq(taskDependenciesTable.dependsOnId, taskId)
    ));

  const blocking = deps.filter(d => d.taskId === taskId);
  const blockedBy = deps.filter(d => d.dependsOnId === taskId);

  const blockingTaskIds = blocking.map(d => d.dependsOnId);
  const blockedByTaskIds = blockedBy.map(d => d.taskId);
  const allIds = [...new Set([...blockingTaskIds, ...blockedByTaskIds])];

  let relatedTasks: any[] = [];
  if (allIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    relatedTasks = await db.select().from(tasksTable).where(inArray(tasksTable.id, allIds));
  }

  res.json({
    blocking: blocking.map(d => ({
      ...d,
      task: relatedTasks.find(t => t.id === d.dependsOnId),
    })),
    blockedBy: blockedBy.map(d => ({
      ...d,
      task: relatedTasks.find(t => t.id === d.taskId),
    })),
  });
});

router.post("/task-dependencies", async (req, res): Promise<void> => {
  const { taskId, dependsOnId, type } = req.body;
  if (!taskId || !dependsOnId) {
    res.status(400).json({ error: "taskId and dependsOnId required" });
    return;
  }
  if (taskId === dependsOnId) {
    res.status(400).json({ error: "A task cannot depend on itself" });
    return;
  }

  const existing = await db.select().from(taskDependenciesTable)
    .where(eq(taskDependenciesTable.taskId, taskId));
  if (existing.some(d => d.dependsOnId === dependsOnId)) {
    res.status(409).json({ error: "Dependency already exists" });
    return;
  }

  const [dep] = await db.insert(taskDependenciesTable).values({
    taskId,
    dependsOnId,
    type: type || "finish_to_start",
  }).returning();
  res.status(201).json(dep);
});

router.delete("/task-dependencies/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(taskDependenciesTable).where(eq(taskDependenciesTable.id, id));
  res.json({ success: true });
});

export default router;
