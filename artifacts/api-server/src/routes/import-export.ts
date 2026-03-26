import { Router, type IRouter } from "express";
import { db, tasksTable, projectsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.post("/import/tasks", async (req, res): Promise<void> => {
  const { tasks, projectId } = req.body;
  if (!Array.isArray(tasks) || !projectId) {
    res.status(400).json({ error: "tasks array and projectId required" });
    return;
  }
  if (tasks.length > 500) {
    res.status(400).json({ error: "Maximum 500 tasks per import" });
    return;
  }
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  if (project.length === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const created = [];
  for (const t of tasks) {
    const [task] = await db.insert(tasksTable).values({
      title: t.title || "Untitled",
      type: t.type || "task",
      status: t.status || "todo",
      priority: t.priority || "medium",
      projectId,
      points: parseInt(t.points) || 3,
      due: t.due ? new Date(t.due) : undefined,
      startDate: t.startDate ? new Date(t.startDate) : undefined,
      tags: Array.isArray(t.tags) ? t.tags : t.tags ? [t.tags] : [],
      notes: t.notes || "",
      assigneeIds: Array.isArray(t.assigneeIds) ? t.assigneeIds : [],
      groupName: t.groupName || "Default",
    }).returning();
    created.push(task);
  }
  res.status(201).json({ imported: created.length, tasks: created });
});

router.get("/export/tasks", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
  let query = db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  const tasks = projectId
    ? await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId)).orderBy(desc(tasksTable.createdAt))
    : await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
  
  const filtered = tasks.filter(t => !t.deletedAt);

  const headers = ["ID","Title","Type","Status","Priority","Project ID","Points","Start Date","Due Date","Tags","Assignee IDs","Notes","Group","Created"];
  const rows = filtered.map(t => [
    t.id, t.title, t.type, t.status, t.priority, t.projectId, t.points,
    t.startDate ? new Date(t.startDate).toISOString() : "",
    t.due ? new Date(t.due).toISOString() : "",
    (t.tags as string[]).join(";"),
    (t.assigneeIds as number[]).join(";"),
    (t.notes || "").replace(/"/g, '""'),
    t.groupName || "Default",
    new Date(t.createdAt).toISOString(),
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=tasks-export.csv");
  res.send(csv);
});

export default router;
