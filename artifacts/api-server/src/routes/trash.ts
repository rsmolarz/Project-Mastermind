import { Router, type IRouter } from "express";
import { eq, isNotNull, isNull, desc, and, lt } from "drizzle-orm";
import { db, tasksTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/trash", async (req, res): Promise<void> => {
  const [deletedTasks, deletedProjects, archivedTasks, archivedProjects] = await Promise.all([
    db.select().from(tasksTable)
      .where(isNotNull(tasksTable.deletedAt))
      .orderBy(desc(tasksTable.deletedAt))
      .limit(100),
    db.select().from(projectsTable)
      .where(isNotNull(projectsTable.deletedAt))
      .orderBy(desc(projectsTable.deletedAt))
      .limit(50),
    db.select().from(tasksTable)
      .where(and(isNotNull(tasksTable.archivedAt), isNull(tasksTable.deletedAt)))
      .orderBy(desc(tasksTable.archivedAt))
      .limit(100),
    db.select().from(projectsTable)
      .where(and(isNotNull(projectsTable.archivedAt), isNull(projectsTable.deletedAt)))
      .orderBy(desc(projectsTable.archivedAt))
      .limit(50),
  ]);

  res.json({
    trash: {
      tasks: deletedTasks,
      projects: deletedProjects,
    },
    archived: {
      tasks: archivedTasks,
      projects: archivedProjects,
    },
  });
});

router.post("/trash/tasks/:id/restore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [task] = await db.update(tasksTable)
    .set({ deletedAt: null })
    .where(eq(tasksTable.id, id))
    .returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

router.post("/trash/projects/:id/restore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [project] = await db.update(projectsTable)
    .set({ deletedAt: null })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
});

router.post("/tasks/:id/archive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [task] = await db.update(tasksTable)
    .set({ archivedAt: new Date() })
    .where(eq(tasksTable.id, id))
    .returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

router.post("/tasks/:id/unarchive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [task] = await db.update(tasksTable)
    .set({ archivedAt: null })
    .where(eq(tasksTable.id, id))
    .returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(task);
});

router.post("/projects/:id/archive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [project] = await db.update(projectsTable)
    .set({ archivedAt: new Date() })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
});

router.post("/projects/:id/unarchive", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [project] = await db.update(projectsTable)
    .set({ archivedAt: null })
    .where(eq(projectsTable.id, id))
    .returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(project);
});

router.delete("/trash/tasks/:id/permanent", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.json({ success: true });
});

router.delete("/trash/projects/:id/permanent", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.json({ success: true });
});

router.delete("/trash/empty", async (req, res): Promise<void> => {
  await db.delete(tasksTable).where(isNotNull(tasksTable.deletedAt));
  await db.delete(projectsTable).where(isNotNull(projectsTable.deletedAt));
  res.json({ success: true });
});

export default router;
