import { Router, type IRouter } from "express";
import { db, tasksTable, projectsTable, membersTable, sprintsTable, timeEntriesTable, goalsTable, expensesTable } from "@workspace/db";
import { sql, eq, and, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [taskCount] = await db.select({ count: count() }).from(tasksTable);
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);
  const [memberCount] = await db.select({ count: count() }).from(membersTable);
  const [sprintCount] = await db.select({ count: count() }).from(sprintsTable);

  const tasks = await db.select().from(tasksTable);
  const timeEntries = await db.select().from(timeEntriesTable);
  const goals = await db.select().from(goalsTable);
  const projects = await db.select().from(projectsTable);
  const members = await db.select().from(membersTable);

  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours), 0);
  const totalRevenue = timeEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const budgetUsed = totalRevenue;
  const avgVelocity = tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.points || 0), 0);

  const statusBreakdown = {
    backlog: tasks.filter(t => t.status === "backlog").length,
    todo: tasks.filter(t => t.status === "todo").length,
    inprogress: tasks.filter(t => t.status === "inprogress").length,
    review: tasks.filter(t => t.status === "review").length,
    done: tasks.filter(t => t.status === "done").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
  };

  const priorityBreakdown = {
    critical: tasks.filter(t => t.priority === "critical").length,
    high: tasks.filter(t => t.priority === "high").length,
    medium: tasks.filter(t => t.priority === "medium").length,
    low: tasks.filter(t => t.priority === "low").length,
  };

  const memberWorkload = members.map(m => ({
    id: m.id, name: m.name, initials: m.initials, color: m.color,
    tasks: tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").length,
    hours: timeEntries.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.hours), 0),
    capacity: m.capacity || 40,
  }));

  res.json({
    counts: { tasks: taskCount.count, projects: projectCount.count, members: memberCount.count, sprints: sprintCount.count },
    finance: { totalHours, totalRevenue, totalBudget, budgetUsed, profitMargin: totalBudget > 0 ? Math.round(((totalBudget - budgetUsed) / totalBudget) * 100) : 0 },
    statusBreakdown, priorityBreakdown, memberWorkload,
    completionRate: tasks.length > 0 ? Math.round((statusBreakdown.done / tasks.length) * 100) : 0,
    avgVelocity,
  });
});

router.post("/admin/ai/analyze", async (req, res): Promise<void> => {
  const { feature } = req.body;

  const tasks = await db.select().from(tasksTable);
  const projects = await db.select().from(projectsTable);
  const members = await db.select().from(membersTable);
  const timeEntries = await db.select().from(timeEntriesTable);
  const goals = await db.select().from(goalsTable);
  const sprints = await db.select().from(sprintsTable);

  const overdueTasks = tasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date());
  const blockedTasks = tasks.filter(t => t.status === "blocked");
  const criticalTasks = tasks.filter(t => t.priority === "critical" && t.status !== "done");

  const analyses: Record<string, any> = {
    risk_prediction: {
      title: "AI Risk Prediction",
      risks: [
        ...overdueTasks.map(t => ({ type: "overdue", severity: "high", message: `"${t.title}" is past due`, taskId: t.id })),
        ...blockedTasks.map(t => ({ type: "blocked", severity: "critical", message: `"${t.title}" is blocked — needs immediate attention`, taskId: t.id })),
        ...criticalTasks.map(t => ({ type: "critical", severity: "high", message: `"${t.title}" is critical priority and still open`, taskId: t.id })),
        ...(projects.filter(p => p.health < 50).map(p => ({ type: "project_risk", severity: "high", message: `Project "${p.name}" health is ${p.health}%` }))),
      ],
      summary: `Found ${overdueTasks.length} overdue, ${blockedTasks.length} blocked, ${criticalTasks.length} critical open tasks.`,
    },

    sprint_planning: {
      title: "AI Sprint Planning",
      suggestions: members.map(m => {
        const currentLoad = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").reduce((s, t) => s + (t.points || 0), 0);
        const capacity = (m.capacity || 40) / 5;
        return { member: m.name, currentPoints: currentLoad, suggestedCapacity: Math.round(capacity * 2), available: Math.max(0, Math.round(capacity * 2) - currentLoad) };
      }),
      unassigned: tasks.filter(t => !t.assigneeIds || (t.assigneeIds as number[]).length === 0).map(t => ({ id: t.id, title: t.title, points: t.points })),
    },

    budget_forecast: {
      title: "AI Budget Forecast",
      projects: projects.map(p => {
        const spent = timeEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        const budget = Number(p.budget || 0);
        const burnRate = spent / Math.max(1, 30);
        const daysRemaining = burnRate > 0 ? Math.round((budget - spent) / burnRate) : 999;
        return { project: p.name, budget, spent, remaining: budget - spent, burnRate: Math.round(burnRate * 100) / 100, daysRemaining, atRisk: daysRemaining < 30 };
      }),
    },

    priority_suggestion: {
      title: "AI Priority Suggestions",
      suggestions: tasks.filter(t => t.status !== "done").slice(0, 10).map(t => {
        const hasDeadline = !!t.due;
        const isOverdue = hasDeadline && new Date(t.due!) < new Date();
        const suggestedPriority = isOverdue ? "critical" : (hasDeadline && new Date(t.due!).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000) ? "high" : t.priority;
        return { id: t.id, title: t.title, current: t.priority, suggested: suggestedPriority, reason: isOverdue ? "Past due date" : hasDeadline ? "Approaching deadline" : "No change needed" };
      }).filter(s => s.current !== s.suggested),
    },

    duplicate_detection: {
      title: "AI Duplicate Detection",
      potentialDuplicates: (() => {
        const dupes: any[] = [];
        for (let i = 0; i < tasks.length; i++) {
          for (let j = i + 1; j < tasks.length; j++) {
            const words1 = tasks[i].title.toLowerCase().split(/\s+/);
            const words2 = tasks[j].title.toLowerCase().split(/\s+/);
            const common = words1.filter(w => words2.includes(w) && w.length > 3);
            if (common.length >= 2) {
              dupes.push({ task1: { id: tasks[i].id, title: tasks[i].title }, task2: { id: tasks[j].id, title: tasks[j].title }, similarity: Math.round((common.length / Math.max(words1.length, words2.length)) * 100), commonWords: common });
            }
          }
        }
        return dupes.slice(0, 5);
      })(),
    },

    sentiment_analysis: {
      title: "AI Team Sentiment",
      teamHealth: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id));
        const overdue = memberTasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date()).length;
        const blocked = memberTasks.filter(t => t.status === "blocked").length;
        const done = memberTasks.filter(t => t.status === "done").length;
        const total = memberTasks.length;
        const score = Math.max(0, 100 - (overdue * 15) - (blocked * 20) + (done * 5));
        return { member: m.name, color: m.color, score: Math.min(100, score), overdue, blocked, completed: done, total, mood: score > 75 ? "😊 Thriving" : score > 50 ? "😐 Neutral" : "😟 Needs support" };
      }),
    },

    scope_creep: {
      title: "AI Scope Creep Detection",
      projects: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const recentTasks = projectTasks.filter(t => {
          const created = new Date(t.createdAt);
          return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
        });
        return { project: p.name, totalTasks: projectTasks.length, addedThisWeek: recentTasks.length, pointsAdded: recentTasks.reduce((s, t) => s + (t.points || 0), 0), alert: recentTasks.length > 3 };
      }),
    },

    bottleneck_detection: {
      title: "AI Bottleneck Detection",
      bottlenecks: [
        ...(() => {
          const reviewTasks = tasks.filter(t => t.status === "review");
          return reviewTasks.length > 3 ? [{ type: "review_queue", severity: "high", message: `${reviewTasks.length} tasks stuck in Review — review capacity bottleneck`, count: reviewTasks.length }] : [];
        })(),
        ...(() => {
          const blockedCount = tasks.filter(t => t.status === "blocked").length;
          return blockedCount > 0 ? [{ type: "blocked_tasks", severity: "critical", message: `${blockedCount} blocked tasks need unblocking`, count: blockedCount }] : [];
        })(),
        ...members.filter(m => {
          const load = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").length;
          return load > 5;
        }).map(m => ({ type: "overloaded_member", severity: "medium", message: `${m.name} has too many open tasks`, count: tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").length })),
      ],
    },

    time_estimation: {
      title: "AI Time Estimation",
      estimates: tasks.filter(t => t.status !== "done").slice(0, 8).map(t => {
        const historicalAvg = 2 + (t.points || 3) * 1.5;
        return { id: t.id, title: t.title, points: t.points, estimatedHours: Math.round(historicalAvg * 10) / 10, confidence: t.points && t.points <= 5 ? "high" : "medium" };
      }),
    },

    quality_score: {
      title: "AI Quality Score",
      projects: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const done = projectTasks.filter(t => t.status === "done").length;
        const total = projectTasks.length;
        const hasNotes = projectTasks.filter(t => t.notes && t.notes.length > 10).length;
        const hasSubtasks = projectTasks.filter(t => t.subtasks && (t.subtasks as any[]).length > 0).length;
        const score = total > 0 ? Math.round(((done / total) * 40 + (hasNotes / Math.max(total, 1)) * 30 + (hasSubtasks / Math.max(total, 1)) * 30)) : 0;
        return { project: p.name, score, completionRate: total > 0 ? Math.round((done / total) * 100) : 0, documentedRate: total > 0 ? Math.round((hasNotes / total) * 100) : 0, subtaskRate: total > 0 ? Math.round((hasSubtasks / total) * 100) : 0 };
      }),
    },

    workload_balancer: {
      title: "AI Workload Balancer",
      current: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done");
        const points = memberTasks.reduce((s, t) => s + (t.points || 0), 0);
        return { member: m.name, color: m.color, taskCount: memberTasks.length, totalPoints: points, status: points > 20 ? "overloaded" : points > 10 ? "balanced" : "underutilized" };
      }),
      recommendations: (() => {
        const overloaded = members.filter(m => {
          const pts = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").reduce((s, t) => s + (t.points || 0), 0);
          return pts > 20;
        });
        const underutilized = members.filter(m => {
          const pts = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").reduce((s, t) => s + (t.points || 0), 0);
          return pts < 10;
        });
        return overloaded.length > 0 && underutilized.length > 0
          ? [`Move tasks from ${overloaded.map(m => m.name).join(", ")} to ${underutilized.map(m => m.name).join(", ")}`]
          : ["Workload is relatively balanced"];
      })(),
    },

    dependency_mapping: {
      title: "AI Dependency Mapping",
      chains: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id && t.status !== "done");
        return { project: p.name, openTasks: projectTasks.length, criticalPath: projectTasks.filter(t => t.priority === "critical" || t.priority === "high").map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status })) };
      }),
    },

    retrospective: {
      title: "AI Retrospective Insights",
      insights: {
        completedThisWeek: tasks.filter(t => t.status === "done").length,
        avgPointsPerTask: tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + (t.points || 0), 0) / tasks.length * 10) / 10 : 0,
        topPerformers: members.map(m => ({ name: m.name, completed: tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status === "done").length })).sort((a, b) => b.completed - a.completed).slice(0, 3),
        improvements: [
          blockedTasks.length > 0 ? "Reduce blocked tasks — consider daily standup blockers review" : null,
          overdueTasks.length > 0 ? "Address overdue items — consider sprint scope reduction" : null,
          tasks.filter(t => !t.assigneeIds || (t.assigneeIds as number[]).length === 0).length > 2 ? "Assign unowned tasks to improve accountability" : null,
        ].filter(Boolean),
      },
    },

    progress_report: {
      title: "AI Progress Report",
      report: {
        period: "Current Sprint",
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === "done").length,
        inProgress: tasks.filter(t => t.status === "inprogress").length,
        blocked: blockedTasks.length,
        overdue: overdueTasks.length,
        totalPoints: tasks.reduce((s, t) => s + (t.points || 0), 0),
        completedPoints: tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.points || 0), 0),
        projectStatus: projects.map(p => ({ name: p.name, health: p.health, phase: p.phase })),
        goalProgress: goals.map(g => ({ title: g.title, progress: g.progress, status: g.status })),
      },
    },

    smart_scheduling: {
      title: "AI Smart Scheduling",
      suggestions: tasks.filter(t => t.status !== "done" && !t.due).slice(0, 5).map(t => {
        const baseDays = (t.points || 3) * 2;
        const suggestedDue = new Date(Date.now() + baseDays * 24 * 60 * 60 * 1000);
        return { id: t.id, title: t.title, points: t.points, suggestedDue: suggestedDue.toISOString().split("T")[0], reason: `Based on ${t.points} story points × 2 days/point` };
      }),
    },

    resource_optimization: {
      title: "AI Resource Optimization",
      utilization: members.map(m => {
        const hours = timeEntries.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.hours), 0);
        const capacity = (m.capacity || 40);
        const utilization = Math.round((hours / Math.max(capacity, 1)) * 100);
        return { member: m.name, color: m.color, hoursLogged: Math.round(hours * 10) / 10, capacity, utilization, rate: m.rate, revenue: Math.round(hours * Number(m.rate || 0)) };
      }),
    },

    knowledge_graph: {
      title: "AI Knowledge Graph",
      connections: projects.map(p => ({
        project: p.name,
        tasks: tasks.filter(t => t.projectId === p.id).length,
        sprints: sprints.filter(s => s.projectId === p.id).length,
        goals: goals.filter(g => g.projectId === p.id).length,
        teamMembers: [...new Set(tasks.filter(t => t.projectId === p.id).flatMap(t => (t.assigneeIds as number[]) || []))].length,
        hoursSpent: Math.round(timeEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.hours), 0) * 10) / 10,
      })),
    },

    client_report: {
      title: "AI Client Report Generator",
      reports: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const done = projectTasks.filter(t => t.status === "done").length;
        const total = projectTasks.length;
        const spent = timeEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        return {
          client: p.client || "Internal", project: p.name, phase: p.phase, health: p.health,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
          budget: { total: Number(p.budget || 0), spent, remaining: Number(p.budget || 0) - spent },
          highlights: [
            `${done} of ${total} tasks completed (${total > 0 ? Math.round((done / total) * 100) : 0}%)`,
            `$${Math.round(spent).toLocaleString()} of $${Number(p.budget || 0).toLocaleString()} budget used`,
          ],
        };
      }),
    },

    standup_questions: {
      title: "AI Smart Standup Questions",
      members: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done");
        const blocked = memberTasks.filter(t => t.status === "blocked");
        const overdue = memberTasks.filter(t => t.due && new Date(t.due) < new Date());
        const questions = [
          memberTasks.length > 0 ? `What progress did you make on "${memberTasks[0].title}"?` : "What did you work on yesterday?",
          blocked.length > 0 ? `"${blocked[0].title}" is blocked — what do you need to unblock it?` : "Any blockers or dependencies?",
          overdue.length > 0 ? `"${overdue[0].title}" is past due — what's the updated timeline?` : "What's your focus for today?",
        ];
        return { member: m.name, color: m.color, openTasks: memberTasks.length, questions };
      }),
    },

    capacity_planning: {
      title: "AI Capacity Planning",
      forecast: members.map(m => {
        const hours = timeEntries.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.hours), 0);
        const activeTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done");
        const estimatedHours = activeTasks.reduce((s, t) => s + (t.points || 3) * 1.5, 0);
        const capacity = (m.capacity || 40);
        return { member: m.name, color: m.color, hoursLogged: Math.round(hours * 10) / 10, estimatedRemaining: Math.round(estimatedHours), weeklyCapacity: capacity, weeksNeeded: Math.round((estimatedHours / Math.max(capacity, 1)) * 10) / 10 };
      }),
      projectPipeline: projects.map(p => {
        const openTasks = tasks.filter(t => t.projectId === p.id && t.status !== "done");
        const totalPoints = openTasks.reduce((s, t) => s + (t.points || 0), 0);
        return { project: p.name, openTasks: openTasks.length, totalPoints, estimatedWeeks: Math.round((totalPoints * 1.5) / 40 * 10) / 10 };
      }),
    },
  };

  const result = analyses[feature];
  if (!result) {
    res.status(400).json({ error: `Unknown feature: ${feature}. Available: ${Object.keys(analyses).join(", ")}` });
    return;
  }
  res.json(result);
});

export default router;
