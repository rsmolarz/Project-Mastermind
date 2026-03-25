import { Router, type IRouter } from "express";
import { eq, and, sql, gte, lte, count, desc } from "drizzle-orm";
import { db, tasksTable, projectsTable, timeEntriesTable, membersTable, activityLogTable, sprintsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/reports/overview", async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable);
  const allProjects = await db.select().from(projectsTable);
  const allMembers = await db.select().from(membersTable);
  const allTime = await db.select().from(timeEntriesTable);

  const total = allTasks.length;
  const done = allTasks.filter(t => t.status === "done").length;
  const inProgress = allTasks.filter(t => t.status === "in_progress").length;
  const overdue = allTasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date()).length;
  const byPriority = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  allTasks.forEach(t => { if (t.priority && byPriority[t.priority] !== undefined) byPriority[t.priority]++; });
  const byStatus = {} as Record<string, number>;
  allTasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
  const byType = {} as Record<string, number>;
  allTasks.forEach(t => { byType[t.type || "task"] = (byType[t.type || "task"] || 0) + 1; });
  const totalHours = allTime.reduce((s, e) => s + (e.hours ? parseFloat(String(e.hours)) : 0), 0);
  const billableHours = allTime.filter(e => e.billable).reduce((s, e) => s + (e.hours ? parseFloat(String(e.hours)) : 0), 0);

  const projectStats = allProjects.map(p => {
    const pTasks = allTasks.filter(t => t.projectId === p.id);
    const pDone = pTasks.filter(t => t.status === "done").length;
    return {
      id: p.id, name: p.name, color: p.color,
      totalTasks: pTasks.length,
      completedTasks: pDone,
      completionRate: pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0,
      overdueTasks: pTasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date()).length,
    };
  });

  const memberStats = allMembers.map(m => {
    const mTasks = allTasks.filter(t => (t.assigneeIds as number[])?.includes(m.id));
    const mDone = mTasks.filter(t => t.status === "done").length;
    const mHours = allTime.filter(e => e.memberId === m.id).reduce((s, e) => s + (e.hours ? parseFloat(String(e.hours)) : 0), 0);
    return {
      id: m.id, name: m.name, avatar: m.avatar, color: m.color,
      totalTasks: mTasks.length, completedTasks: mDone,
      hoursLogged: Math.round(mHours * 10) / 10,
    };
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const completionTrend: { date: string; completed: number; created: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    completionTrend.push({
      date: dateStr,
      completed: allTasks.filter(t => t.status === "done" && t.updatedAt && new Date(t.updatedAt).toISOString().split("T")[0] === dateStr).length,
      created: allTasks.filter(t => new Date(t.createdAt).toISOString().split("T")[0] === dateStr).length,
    });
  }

  res.json({
    summary: { total, done, inProgress, overdue, completionRate: total > 0 ? Math.round((done / total) * 100) : 0, totalHours: Math.round(totalHours * 10) / 10, billableHours: Math.round(billableHours * 10) / 10 },
    byPriority, byStatus, byType, projectStats, memberStats, completionTrend,
  });
});

router.get("/reports/export", async (req, res): Promise<void> => {
  const format = (req.query.format as string) || "csv";
  const allTasks = await db.select().from(tasksTable);
  const allProjects = await db.select().from(projectsTable);

  if (format === "csv") {
    const header = "ID,Title,Status,Priority,Type,Project,Points,Due,Created";
    const rows = allTasks.map(t => {
      const proj = allProjects.find(p => p.id === t.projectId);
      return `${t.id},"${(t.title || "").replace(/"/g, '""')}",${t.status},${t.priority},${t.type || "task"},"${proj?.name || ""}",${t.points || 0},${t.due || ""},${new Date(t.createdAt).toISOString().split("T")[0]}`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=tasks-export.csv");
    res.send([header, ...rows].join("\n"));
  } else {
    res.json(allTasks);
  }
});

router.post("/reports/import", async (req, res): Promise<void> => {
  const { tasks: importTasks } = req.body;
  if (!Array.isArray(importTasks) || importTasks.length === 0) {
    res.status(400).json({ error: "tasks array is required" });
    return;
  }
  const created = [];
  for (const t of importTasks) {
    if (!t.title || !t.projectId) continue;
    const [task] = await db.insert(tasksTable).values({
      title: t.title,
      projectId: t.projectId,
      status: t.status || "todo",
      priority: t.priority || "medium",
      type: t.type || "task",
      points: t.points || null,
      due: t.due || null,
      assigneeIds: t.assigneeIds || [],
    }).returning();
    created.push(task);
  }
  res.status(201).json({ imported: created.length, tasks: created });
});

export default router;
