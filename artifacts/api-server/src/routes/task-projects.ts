import { Router } from "express";
import { db, taskProjectsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/tasks/:taskId/projects", async (req, res) => {
  const taskId = Number(req.params.taskId);
  const links = await db.select({
    id: taskProjectsTable.id,
    taskId: taskProjectsTable.taskId,
    projectId: taskProjectsTable.projectId,
    projectName: projectsTable.name,
    projectColor: projectsTable.color,
    projectIcon: projectsTable.icon,
  }).from(taskProjectsTable)
    .innerJoin(projectsTable, eq(taskProjectsTable.projectId, projectsTable.id))
    .where(eq(taskProjectsTable.taskId, taskId));
  res.json(links);
});

router.post("/task-projects", async (req, res) => {
  const { taskId, projectId } = req.body;
  if (!taskId || !projectId) {
    res.status(400).json({ error: "taskId and projectId required" });
    return;
  }
  const existing = await db.select().from(taskProjectsTable)
    .where(and(eq(taskProjectsTable.taskId, taskId), eq(taskProjectsTable.projectId, projectId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Task already linked to this project" });
    return;
  }
  const [link] = await db.insert(taskProjectsTable).values({ taskId, projectId }).returning();
  res.json(link);
});

router.delete("/task-projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(taskProjectsTable).where(eq(taskProjectsTable.id, id));
  res.json({ success: true });
});

export default router;
