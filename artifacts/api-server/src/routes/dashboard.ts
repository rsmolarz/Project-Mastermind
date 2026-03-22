import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, tasksTable, goalsTable, timeEntriesTable, projectsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable);
  const goals = await db.select().from(goalsTable);
  const projects = await db.select().from(projectsTable);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allEntries = await db.select().from(timeEntriesTable);

  const todayEntries = allEntries.filter(e => new Date(e.date) >= todayStart);
  const weekEntries = allEntries.filter(e => new Date(e.date) >= weekAgo);

  const todayHours = todayEntries.reduce((sum, e) => sum + e.hours, 0);
  const weekRevenue = weekEntries.reduce((sum, e) => sum + e.amount, 0);

  const projectBudgets = projects.map(p => {
    const spent = allEntries.filter(e => e.projectId === p.id).reduce((sum, e) => sum + e.amount, 0);
    return {
      projectId: p.id,
      projectName: p.name,
      projectIcon: p.icon,
      projectColor: p.color,
      budget: p.budget,
      spent,
      percentUsed: p.budget > 0 ? Math.min(100, Math.round((spent / p.budget) * 100)) : 0,
    };
  });

  const stats = {
    totalTasks: tasks.length,
    inProgressTasks: tasks.filter(t => t.status === "inprogress").length,
    doneTasks: tasks.filter(t => t.status === "done").length,
    overdueTasks: tasks.filter(t => t.due && new Date(t.due) < now && t.status !== "done").length,
    criticalTasks: tasks.filter(t => t.priority === "critical" && t.status !== "done").length,
    todayHours,
    weekRevenue,
    goalsOnTrack: goals.filter(g => g.status === "on_track").length,
    totalGoals: goals.length,
    projectBudgets,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
