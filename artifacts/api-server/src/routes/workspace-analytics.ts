import { Router, type IRouter } from "express";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import { db, tasksTable, membersTable, timeEntriesTable, sprintsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/workspace-analytics", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allTasks = await db.select().from(tasksTable);
    const members = await db.select().from(membersTable);
    const recentTimeEntries = await db.select().from(timeEntriesTable).where(gte(timeEntriesTable.startTime, thirtyDaysAgo));

    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter(t => t.status === "done");
    const todoTasks = allTasks.filter(t => t.status === "todo");
    const inProgressTasks = allTasks.filter(t => t.status === "in_progress");
    const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done");

    const completedThisWeek = doneTasks.filter(t => t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo).length;
    const completedThisMonth = doneTasks.filter(t => t.updatedAt && new Date(t.updatedAt) >= thirtyDaysAgo).length;
    const createdThisWeek = allTasks.filter(t => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo).length;

    const totalTrackedMs = recentTimeEntries.reduce((sum, e) => {
      if (e.startTime && e.endTime) {
        return sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime());
      }
      return sum;
    }, 0);
    const totalTrackedHours = Math.round(totalTrackedMs / 3600000 * 10) / 10;

    const memberWorkload = members.map(m => {
      const assigned = allTasks.filter(t => t.assigneeId === m.id && t.status !== "done");
      const completed = doneTasks.filter(t => t.assigneeId === m.id && t.updatedAt && new Date(t.updatedAt) >= thirtyDaysAgo);
      const memberTime = recentTimeEntries.filter(e => e.memberId === m.id);
      const trackedMs = memberTime.reduce((sum, e) => {
        if (e.startTime && e.endTime) return sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime());
        return sum;
      }, 0);
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        openTasks: assigned.length,
        completedThisMonth: completed.length,
        trackedHours: Math.round(trackedMs / 3600000 * 10) / 10,
        overdueTasks: assigned.filter(t => t.dueDate && new Date(t.dueDate) < now).length,
      };
    }).filter(m => m.openTasks > 0 || m.completedThisMonth > 0 || m.trackedHours > 0);

    const priorityBreakdown = {
      critical: allTasks.filter(t => t.priority === "critical" && t.status !== "done").length,
      high: allTasks.filter(t => t.priority === "high" && t.status !== "done").length,
      medium: allTasks.filter(t => t.priority === "medium" && t.status !== "done").length,
      low: allTasks.filter(t => t.priority === "low" && t.status !== "done").length,
      none: allTasks.filter(t => !t.priority && t.status !== "done").length,
    };

    const weeklyVelocity: Array<{ week: string; completed: number; created: number }> = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeklyVelocity.push({
        week: label,
        completed: doneTasks.filter(t => t.updatedAt && new Date(t.updatedAt) >= weekStart && new Date(t.updatedAt) < weekEnd).length,
        created: allTasks.filter(t => t.createdAt && new Date(t.createdAt) >= weekStart && new Date(t.createdAt) < weekEnd).length,
      });
    }

    const avgCompletionTimeMs = doneTasks.length > 0
      ? doneTasks.reduce((sum, t) => {
          if (t.createdAt && t.updatedAt) {
            return sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime());
          }
          return sum;
        }, 0) / doneTasks.length
      : 0;
    const avgCompletionDays = Math.round(avgCompletionTimeMs / (24 * 60 * 60 * 1000) * 10) / 10;

    const statusBreakdown = {
      todo: todoTasks.length,
      in_progress: inProgressTasks.length,
      done: doneTasks.length,
      overdue: overdueTasks.length,
    };

    const bottlenecks = memberWorkload
      .filter(m => m.openTasks > 10 || m.overdueTasks > 3)
      .map(m => ({
        memberId: m.id,
        name: m.name,
        issue: m.overdueTasks > 3 ? `${m.overdueTasks} overdue tasks` : `${m.openTasks} open tasks (overloaded)`,
        severity: m.overdueTasks > 5 ? "high" : m.openTasks > 15 ? "high" : "medium",
      }));

    if (overdueTasks.length > totalTasks * 0.1 && totalTasks > 10) {
      bottlenecks.push({
        memberId: 0,
        name: "Team",
        issue: `${overdueTasks.length} overdue tasks (${Math.round(overdueTasks.length / totalTasks * 100)}% of total)`,
        severity: "high",
      });
    }

    res.json({
      overview: {
        totalTasks,
        statusBreakdown,
        priorityBreakdown,
        completedThisWeek,
        completedThisMonth,
        createdThisWeek,
        totalTrackedHours,
        avgCompletionDays,
        completionRate: totalTasks > 0 ? Math.round(doneTasks.length / totalTasks * 100) : 0,
      },
      memberWorkload,
      weeklyVelocity,
      bottlenecks,
      teamSize: members.length,
    });
  } catch (err: any) {
    console.error("Workspace analytics error:", err);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});

router.get("/resource-planning", async (_req, res): Promise<void> => {
  try {
    const members = await db.select().from(membersTable);
    const allTasks = await db.select().from(tasksTable);
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const resources = members.map(m => {
      const openTasks = allTasks.filter(t => t.assigneeId === m.id && t.status !== "done");
      const upcomingDeadlines = openTasks.filter(t => t.dueDate && new Date(t.dueDate) <= twoWeeksOut && new Date(t.dueDate) >= now);
      const overdue = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);

      const totalEstimateHours = openTasks.reduce((sum, t) => sum + ((t as any).estimateHours || 0), 0);
      const capacityHoursPerWeek = 40;
      const utilizationPercent = capacityHoursPerWeek > 0 ? Math.round(totalEstimateHours / capacityHoursPerWeek * 100) : 0;

      const priorityBreakdown = {
        critical: openTasks.filter(t => t.priority === "critical").length,
        high: openTasks.filter(t => t.priority === "high").length,
        medium: openTasks.filter(t => t.priority === "medium").length,
        low: openTasks.filter(t => t.priority === "low").length,
      };

      let status: "available" | "balanced" | "busy" | "overloaded" = "available";
      if (openTasks.length > 15 || utilizationPercent > 120) status = "overloaded";
      else if (openTasks.length > 8 || utilizationPercent > 80) status = "busy";
      else if (openTasks.length > 3) status = "balanced";

      return {
        id: m.id,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        department: (m as any).department || null,
        openTasks: openTasks.length,
        upcomingDeadlines: upcomingDeadlines.length,
        overdueTasks: overdue.length,
        totalEstimateHours,
        capacityHoursPerWeek,
        utilizationPercent,
        status,
        priorityBreakdown,
        nextDeadline: upcomingDeadlines.length > 0
          ? upcomingDeadlines.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0].dueDate
          : null,
      };
    });

    const teamSummary = {
      totalMembers: members.length,
      available: resources.filter(r => r.status === "available").length,
      balanced: resources.filter(r => r.status === "balanced").length,
      busy: resources.filter(r => r.status === "busy").length,
      overloaded: resources.filter(r => r.status === "overloaded").length,
      totalOpenTasks: resources.reduce((s, r) => s + r.openTasks, 0),
      totalOverdue: resources.reduce((s, r) => s + r.overdueTasks, 0),
      avgUtilization: resources.length > 0 ? Math.round(resources.reduce((s, r) => s + r.utilizationPercent, 0) / resources.length) : 0,
    };

    res.json({ resources, teamSummary });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to compute resource planning" });
  }
});

export default router;
