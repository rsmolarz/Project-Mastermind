import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, membersTable, tasksTable, timeEntriesTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/workload", async (req, res): Promise<void> => {
  const members = await db.select().from(membersTable);
  const allTasks = await db.select().from(tasksTable);
  const projects = await db.select().from(projectsTable);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const timeEntries = await db.select().from(timeEntriesTable);

  const workload = members.map(member => {
    const assignedTasks = allTasks.filter(t =>
      (t.assigneeIds as number[])?.includes(member.id) &&
      !["done", "cancelled"].includes(t.status)
    );

    const totalPoints = assignedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const overdueTasks = assignedTasks.filter(t => t.due && new Date(t.due) < now);
    const upcomingTasks = assignedTasks.filter(t => t.due && new Date(t.due) >= now && new Date(t.due) <= weekEnd);

    const weekHours = timeEntries
      .filter(te => te.memberId === member.id && new Date(te.date) >= weekStart && new Date(te.date) < weekEnd)
      .reduce((sum, te) => sum + (te.hours || 0), 0);

    const utilization = member.capacity > 0 ? Math.round((weekHours / member.capacity) * 100) : 0;

    const tasksByProject = assignedTasks.reduce((acc, t) => {
      const proj = projects.find(p => p.id === t.projectId);
      const key = proj?.name || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByPriority = assignedTasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let loadLevel = "optimal";
    if (utilization > 100 || overdueTasks.length > 3) loadLevel = "overloaded";
    else if (utilization > 85 || overdueTasks.length > 1) loadLevel = "heavy";
    else if (utilization < 30 && assignedTasks.length < 3) loadLevel = "light";

    return {
      member: { id: member.id, name: member.name, initials: member.initials, color: member.color, role: member.role },
      capacity: member.capacity,
      weekHoursLogged: Math.round(weekHours * 10) / 10,
      utilization,
      loadLevel,
      totalActiveTasks: assignedTasks.length,
      totalPoints,
      overdueTasks: overdueTasks.length,
      upcomingTasks: upcomingTasks.length,
      tasksByProject,
      tasksByPriority,
    };
  });

  const summary = {
    totalMembers: members.length,
    overloaded: workload.filter(w => w.loadLevel === "overloaded").length,
    heavy: workload.filter(w => w.loadLevel === "heavy").length,
    optimal: workload.filter(w => w.loadLevel === "optimal").length,
    light: workload.filter(w => w.loadLevel === "light").length,
    avgUtilization: workload.length > 0 ? Math.round(workload.reduce((s, w) => s + w.utilization, 0) / workload.length) : 0,
  };

  res.json({ workload, summary });
});

export default router;
