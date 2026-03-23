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

    auto_tagger: {
      title: "AI Auto-Tagger",
      suggestions: tasks.filter(t => !t.tags || (t.tags as string[]).length === 0).slice(0, 10).map(t => {
        const words = t.title.toLowerCase();
        const suggestedTags: string[] = [];
        if (words.includes("api") || words.includes("endpoint") || words.includes("backend")) suggestedTags.push("backend");
        if (words.includes("ui") || words.includes("design") || words.includes("frontend") || words.includes("css")) suggestedTags.push("frontend");
        if (words.includes("bug") || words.includes("fix") || words.includes("error")) suggestedTags.push("bugfix");
        if (words.includes("auth") || words.includes("login") || words.includes("security")) suggestedTags.push("security");
        if (words.includes("perf") || words.includes("speed") || words.includes("optimize")) suggestedTags.push("performance");
        if (words.includes("test") || words.includes("qa")) suggestedTags.push("testing");
        if (words.includes("doc") || words.includes("readme") || words.includes("write")) suggestedTags.push("documentation");
        if (suggestedTags.length === 0) suggestedTags.push(t.type || "task");
        return { id: t.id, title: t.title, currentTags: t.tags || [], suggestedTags };
      }),
    },

    task_decomposer: {
      title: "AI Task Decomposer",
      epics: tasks.filter(t => t.type === "epic" || (t.points || 0) >= 8).map(t => {
        const subtaskIdeas = [];
        const title = t.title.toLowerCase();
        if (title.includes("auth") || title.includes("login")) subtaskIdeas.push("Set up auth provider", "Build login form", "Add session management", "Implement logout", "Add password reset", "Write auth tests");
        else if (title.includes("api") || title.includes("endpoint")) subtaskIdeas.push("Design API schema", "Implement route handlers", "Add validation", "Write integration tests", "Add rate limiting", "Document endpoints");
        else if (title.includes("design") || title.includes("ui")) subtaskIdeas.push("Create wireframes", "Design component library", "Build responsive layout", "Add dark mode support", "Implement animations", "Cross-browser testing");
        else subtaskIdeas.push("Research & planning", "Core implementation", "Edge case handling", "Unit tests", "Integration tests", "Documentation");
        return { id: t.id, title: t.title, points: t.points, suggestedSubtasks: subtaskIdeas, estimatedSubtaskPoints: Math.ceil((t.points || 8) / subtaskIdeas.length) };
      }),
    },

    release_notes: {
      title: "AI Release Notes Generator",
      releases: (() => {
        const doneTasks = tasks.filter(t => t.status === "done");
        const features = doneTasks.filter(t => t.type === "feature" || t.type === "story");
        const bugs = doneTasks.filter(t => t.type === "bug");
        const others = doneTasks.filter(t => t.type !== "feature" && t.type !== "story" && t.type !== "bug");
        return {
          version: `v${Math.floor(doneTasks.length / 5) + 1}.${doneTasks.length % 5}.0`,
          date: new Date().toISOString().split("T")[0],
          sections: [
            { title: "New Features", emoji: "✨", items: features.map(t => t.title) },
            { title: "Bug Fixes", emoji: "🐛", items: bugs.map(t => t.title) },
            { title: "Improvements", emoji: "🔧", items: others.map(t => t.title) },
          ].filter(s => s.items.length > 0),
          summary: `This release includes ${features.length} new features, ${bugs.length} bug fixes, and ${others.length} improvements.`,
        };
      })(),
    },

    sprint_velocity_predictor: {
      title: "AI Sprint Velocity Predictor",
      predictions: (() => {
        const sprintData = sprints.map(s => {
          const sprintTasks = tasks.filter(t => t.sprintId === s.id);
          const completed = sprintTasks.filter(t => t.status === "done").reduce((sum, t) => sum + (t.points || 0), 0);
          return { sprint: s.name, completed };
        });
        const velocities = sprintData.map(s => s.completed).filter(v => v > 0);
        const avg = velocities.length > 0 ? velocities.reduce((s, v) => s + v, 0) / velocities.length : 20;
        const trend = velocities.length >= 2 ? velocities[velocities.length - 1] - velocities[velocities.length - 2] : 0;
        return {
          history: sprintData,
          averageVelocity: Math.round(avg),
          trend: trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable",
          nextSprintPrediction: Math.round(avg + trend * 0.5),
          confidence: velocities.length >= 3 ? "high" : velocities.length >= 1 ? "medium" : "low",
          recommendation: trend < 0 ? "Velocity declining — consider reducing scope" : "Velocity stable — maintain current pace",
        };
      })(),
    },

    skill_matcher: {
      title: "AI Team Skill Matcher",
      matches: (() => {
        const unassigned = tasks.filter(t => (!t.assigneeIds || (t.assigneeIds as number[]).length === 0) && t.status !== "done");
        return unassigned.slice(0, 8).map(t => {
          const words = t.title.toLowerCase();
          const bestMatches = members.map(m => {
            let score = 0;
            const role = (m.role || "").toLowerCase();
            if ((words.includes("api") || words.includes("backend")) && (role.includes("backend") || role.includes("senior"))) score += 30;
            if ((words.includes("ui") || words.includes("design") || words.includes("frontend")) && (role.includes("frontend") || role.includes("design"))) score += 30;
            if (words.includes("mobile") && role.includes("mobile")) score += 30;
            const memberLoad = tasks.filter(mt => (mt.assigneeIds as number[])?.includes(m.id) && mt.status !== "done").length;
            score += Math.max(0, 20 - memberLoad * 3);
            return { member: m.name, color: m.color, score, reason: score > 20 ? "Role match + available" : "Available capacity" };
          }).sort((a, b) => b.score - a.score);
          return { id: t.id, title: t.title, topMatch: bestMatches[0], alternatives: bestMatches.slice(1, 3) };
        });
      })(),
    },

    burnout_detector: {
      title: "AI Burnout Detector",
      risks: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id));
        const activeTasks = memberTasks.filter(t => t.status !== "done");
        const overdue = activeTasks.filter(t => t.due && new Date(t.due) < new Date()).length;
        const blocked = activeTasks.filter(t => t.status === "blocked").length;
        const totalPoints = activeTasks.reduce((s, t) => s + (t.points || 0), 0);
        const hoursLogged = timeEntries.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.hours), 0);
        const overtime = hoursLogged > (m.capacity || 40);
        let riskScore = 0;
        riskScore += overdue * 15;
        riskScore += blocked * 10;
        riskScore += Math.max(0, totalPoints - 20) * 2;
        if (overtime) riskScore += 25;
        if (activeTasks.length > 7) riskScore += 15;
        riskScore = Math.min(100, riskScore);
        return {
          member: m.name, color: m.color, riskScore,
          level: riskScore > 70 ? "🔴 High Risk" : riskScore > 40 ? "🟡 Moderate" : "🟢 Healthy",
          factors: [
            overdue > 0 ? `${overdue} overdue tasks` : null,
            blocked > 0 ? `${blocked} blocked tasks` : null,
            overtime ? "Exceeding capacity" : null,
            activeTasks.length > 7 ? `${activeTasks.length} active tasks` : null,
          ].filter(Boolean),
          suggestion: riskScore > 70 ? "Redistribute tasks immediately" : riskScore > 40 ? "Monitor workload closely" : "Workload is sustainable",
        };
      }).sort((a, b) => b.riskScore - a.riskScore),
    },

    task_aging: {
      title: "AI Task Aging Analyzer",
      stale: tasks.filter(t => t.status !== "done").map(t => {
        const ageMs = Date.now() - new Date(t.createdAt).getTime();
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        return { ...t, ageDays };
      }).filter(t => t.ageDays > 7).sort((a, b) => b.ageDays - a.ageDays).slice(0, 10).map(t => ({
        id: t.id, title: t.title, status: t.status, ageDays: t.ageDays,
        severity: t.ageDays > 30 ? "critical" : t.ageDays > 14 ? "warning" : "info",
        recommendation: t.status === "backlog" ? "Move to sprint or close" : t.status === "blocked" ? "Unblock or reassign" : "Check if still relevant",
      })),
    },

    communication_gaps: {
      title: "AI Communication Gap Detector",
      gaps: (() => {
        const projectPairs: { p1: string; p2: string; shared: number }[] = [];
        for (let i = 0; i < projects.length; i++) {
          for (let j = i + 1; j < projects.length; j++) {
            const members1 = new Set(tasks.filter(t => t.projectId === projects[i].id).flatMap(t => (t.assigneeIds as number[]) || []));
            const members2 = new Set(tasks.filter(t => t.projectId === projects[j].id).flatMap(t => (t.assigneeIds as number[]) || []));
            const shared = [...members1].filter(m => members2.has(m)).length;
            projectPairs.push({ p1: projects[i].name, p2: projects[j].name, shared });
          }
        }
        const isolated = members.filter(m => {
          const memberProjects = new Set(tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id)).map(t => t.projectId));
          return memberProjects.size <= 1;
        });
        return { projectOverlap: projectPairs, isolatedMembers: isolated.map(m => ({ name: m.name, color: m.color, suggestion: "Consider cross-project collaboration" })) };
      })(),
    },

    effort_impact_matrix: {
      title: "AI Effort vs Impact Matrix",
      quadrants: (() => {
        const scored = tasks.filter(t => t.status !== "done").map(t => {
          const effort = (t.points || 3);
          const impact = (t.priority === "critical" ? 5 : t.priority === "high" ? 4 : t.priority === "medium" ? 3 : 2);
          const isOverdue = t.due && new Date(t.due) < new Date();
          const adjustedImpact = isOverdue ? Math.min(5, impact + 1) : impact;
          return { id: t.id, title: t.title, effort, impact: adjustedImpact, quadrant: effort <= 3 && adjustedImpact >= 4 ? "quick_wins" : effort > 3 && adjustedImpact >= 4 ? "major_projects" : effort <= 3 && adjustedImpact < 4 ? "fill_ins" : "thankless" };
        });
        return {
          quick_wins: scored.filter(t => t.quadrant === "quick_wins").map(t => ({ id: t.id, title: t.title })),
          major_projects: scored.filter(t => t.quadrant === "major_projects").map(t => ({ id: t.id, title: t.title })),
          fill_ins: scored.filter(t => t.quadrant === "fill_ins").map(t => ({ id: t.id, title: t.title })),
          thankless: scored.filter(t => t.quadrant === "thankless").map(t => ({ id: t.id, title: t.title })),
          recommendation: scored.filter(t => t.quadrant === "quick_wins").length > 0
            ? `Focus on ${scored.filter(t => t.quadrant === "quick_wins").length} quick wins first for maximum impact`
            : "No obvious quick wins — prioritize major projects",
        };
      })(),
    },

    deadline_risk: {
      title: "AI Deadline Risk Analyzer",
      atRisk: tasks.filter(t => t.status !== "done" && t.due).map(t => {
        const dueDate = new Date(t.due!);
        const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        const estimatedDaysNeeded = (t.points || 3) * 1.5;
        const risk = daysUntil < 0 ? 100 : daysUntil < estimatedDaysNeeded ? Math.min(95, Math.round((1 - daysUntil / estimatedDaysNeeded) * 100)) : Math.max(5, Math.round((1 - daysUntil / (estimatedDaysNeeded * 3)) * 50));
        return { id: t.id, title: t.title, due: t.due, daysUntil, estimatedDaysNeeded: Math.round(estimatedDaysNeeded), riskPercent: risk, status: risk > 75 ? "will_miss" : risk > 40 ? "at_risk" : "on_track" };
      }).sort((a, b) => b.riskPercent - a.riskPercent).slice(0, 10),
    },

    resource_conflicts: {
      title: "AI Resource Conflict Detector",
      conflicts: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done" && t.due);
        const overlaps: { task1: string; task2: string }[] = [];
        for (let i = 0; i < memberTasks.length; i++) {
          for (let j = i + 1; j < memberTasks.length; j++) {
            const due1 = new Date(memberTasks[i].due!);
            const due2 = new Date(memberTasks[j].due!);
            if (Math.abs(due1.getTime() - due2.getTime()) < 2 * 24 * 60 * 60 * 1000) {
              overlaps.push({ task1: memberTasks[i].title, task2: memberTasks[j].title });
            }
          }
        }
        return { member: m.name, color: m.color, conflicts: overlaps, hasConflicts: overlaps.length > 0 };
      }).filter(m => m.hasConflicts),
    },

    tech_debt_scorer: {
      title: "AI Technical Debt Scorer",
      projects: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const bugs = projectTasks.filter(t => t.type === "bug").length;
        const techDebt = projectTasks.filter(t => (t.tags as string[])?.includes("tech-debt") || (t.tags as string[])?.includes("refactor")).length;
        const oldOpen = projectTasks.filter(t => t.status !== "done" && Date.now() - new Date(t.createdAt).getTime() > 14 * 24 * 60 * 60 * 1000).length;
        const total = projectTasks.length;
        const score = Math.min(100, bugs * 10 + techDebt * 15 + oldOpen * 5);
        return { project: p.name, color: p.color, debtScore: score, bugs, techDebtTasks: techDebt, staleItems: oldOpen, level: score > 60 ? "🔴 High" : score > 30 ? "🟡 Moderate" : "🟢 Low", recommendation: score > 60 ? "Dedicate a sprint to debt reduction" : score > 30 ? "Address in upcoming sprints" : "Debt is manageable" };
      }),
    },

    milestone_tracker: {
      title: "AI Milestone Tracker",
      milestones: sprints.map(s => {
        const sprintTasks = tasks.filter(t => t.sprintId === s.id);
        const total = sprintTasks.length;
        const done = sprintTasks.filter(t => t.status === "done").length;
        const blocked = sprintTasks.filter(t => t.status === "blocked").length;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;
        const daysLeft = s.endDate ? Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
        const onTrack = daysLeft >= 0 && (progress >= 50 || daysLeft > 7);
        return { sprint: s.name, goal: s.goal, status: s.status, progress, daysLeft: Math.max(0, daysLeft), blocked, prediction: onTrack ? "On track" : blocked > 0 ? "At risk — blocked tasks" : "Behind schedule", confidence: progress > 70 ? "high" : progress > 30 ? "medium" : "low" };
      }),
    },

    velocity_optimizer: {
      title: "AI Team Velocity Optimizer",
      analysis: (() => {
        const memberEfficiency = members.map(m => {
          const completed = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status === "done");
          const totalPoints = completed.reduce((s, t) => s + (t.points || 0), 0);
          const hoursSpent = timeEntries.filter(e => e.memberId === m.id).reduce((s, e) => s + Number(e.hours), 0);
          const pointsPerHour = hoursSpent > 0 ? Math.round((totalPoints / hoursSpent) * 100) / 100 : 0;
          return { member: m.name, color: m.color, completedPoints: totalPoints, hoursSpent: Math.round(hoursSpent), pointsPerHour, efficiency: pointsPerHour > 1 ? "high" : pointsPerHour > 0.5 ? "medium" : "low" };
        }).sort((a, b) => b.pointsPerHour - a.pointsPerHour);
        return { memberEfficiency, teamAvg: memberEfficiency.length > 0 ? Math.round(memberEfficiency.reduce((s, m) => s + m.pointsPerHour, 0) / memberEfficiency.length * 100) / 100 : 0, recommendation: "Pair high-efficiency members with lower for knowledge transfer" };
      })(),
    },

    cross_project_deps: {
      title: "AI Cross-Project Dependency Analyzer",
      dependencies: (() => {
        const crossDeps: any[] = [];
        projects.forEach(p1 => {
          projects.forEach(p2 => {
            if (p1.id >= p2.id) return;
            const shared = members.filter(m => {
              const inP1 = tasks.some(t => t.projectId === p1.id && (t.assigneeIds as number[])?.includes(m.id));
              const inP2 = tasks.some(t => t.projectId === p2.id && (t.assigneeIds as number[])?.includes(m.id));
              return inP1 && inP2;
            });
            if (shared.length > 0) {
              crossDeps.push({ project1: p1.name, project2: p2.name, sharedMembers: shared.map(m => m.name), risk: shared.length > 2 ? "high" : "low", recommendation: shared.length > 2 ? "Resource contention risk — stagger deadlines" : "Manageable overlap" });
            }
          });
        });
        return crossDeps;
      })(),
    },

    meeting_agenda: {
      title: "AI Meeting Agenda Generator",
      agendas: {
        standup: {
          title: "Daily Standup",
          duration: "15 min",
          items: [
            { topic: "Blockers Review", details: `${blockedTasks.length} blocked tasks to discuss`, time: "3 min" },
            { topic: "Overdue Items", details: `${overdueTasks.length} overdue tasks — reassign or rescope`, time: "3 min" },
            { topic: "Today's Priorities", details: `${criticalTasks.length} critical tasks in progress`, time: "5 min" },
            { topic: "Cross-team Dependencies", details: "Any cross-project blockers?", time: "4 min" },
          ],
        },
        sprintReview: {
          title: "Sprint Review",
          duration: "45 min",
          items: [
            { topic: "Sprint Metrics", details: `${tasks.filter(t => t.status === "done").length} completed, ${tasks.filter(t => t.status !== "done").length} remaining`, time: "5 min" },
            { topic: "Demo Completed Work", details: `Show ${tasks.filter(t => t.status === "done").length} completed items`, time: "20 min" },
            { topic: "Blockers & Risks", details: `${blockedTasks.length} blocked, ${overdueTasks.length} overdue`, time: "10 min" },
            { topic: "Next Sprint Planning", details: "Capacity and scope discussion", time: "10 min" },
          ],
        },
        retrospective: {
          title: "Sprint Retrospective",
          duration: "30 min",
          items: [
            { topic: "What went well?", details: `${tasks.filter(t => t.status === "done").length} tasks completed this sprint`, time: "10 min" },
            { topic: "What didn't go well?", details: `${blockedTasks.length} blocked, ${overdueTasks.length} overdue`, time: "10 min" },
            { topic: "Action Items", details: "Improvement commitments for next sprint", time: "10 min" },
          ],
        },
      },
    },

    customer_impact: {
      title: "AI Customer Impact Analyzer",
      analysis: tasks.filter(t => t.status !== "done").map(t => {
        const words = t.title.toLowerCase();
        let impact = "internal";
        let severity = "low";
        if (words.includes("auth") || words.includes("login") || words.includes("payment") || words.includes("checkout")) { impact = "critical_path"; severity = "high"; }
        else if (words.includes("ui") || words.includes("user") || words.includes("onboarding") || words.includes("notification")) { impact = "user_facing"; severity = "medium"; }
        else if (words.includes("performance") || words.includes("speed") || words.includes("slow")) { impact = "experience"; severity = "medium"; }
        return { id: t.id, title: t.title, customerImpact: impact, severity, priority: t.priority };
      }).sort((a, b) => (a.severity === "high" ? 0 : a.severity === "medium" ? 1 : 2) - (b.severity === "high" ? 0 : b.severity === "medium" ? 1 : 2)).slice(0, 10),
    },

    project_health_deep: {
      title: "AI Deep Project Health",
      projects: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const done = projectTasks.filter(t => t.status === "done").length;
        const total = projectTasks.length;
        const blocked = projectTasks.filter(t => t.status === "blocked").length;
        const overdue = projectTasks.filter(t => t.status !== "done" && t.due && new Date(t.due) < new Date()).length;
        const budget = Number(p.budget || 0);
        const spent = timeEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        const budgetHealth = budget > 0 ? Math.max(0, Math.round((1 - spent / budget) * 100)) : 50;
        const taskHealth = total > 0 ? Math.round((done / total) * 100) : 50;
        const riskPenalty = blocked * 10 + overdue * 8;
        const overall = Math.max(0, Math.min(100, Math.round((budgetHealth * 0.3 + taskHealth * 0.4 + (100 - riskPenalty) * 0.3))));
        return { project: p.name, color: p.color, overall, budgetHealth, taskHealth, riskScore: riskPenalty, blocked, overdue, grade: overall > 80 ? "A" : overall > 60 ? "B" : overall > 40 ? "C" : overall > 20 ? "D" : "F" };
      }),
    },

    automation_suggestions: {
      title: "AI Automation Suggestions",
      suggestions: [
        blockedTasks.length > 0 ? { trigger: "Task blocked for >24h", action: "Notify project lead + escalate", impact: "high", category: "notification" } : null,
        overdueTasks.length > 0 ? { trigger: "Task becomes overdue", action: "Auto-set priority to HIGH + notify assignee", impact: "high", category: "priority" } : null,
        tasks.filter(t => t.status === "review").length > 2 ? { trigger: "Task moved to Review", action: "Auto-assign to reviewer pool", impact: "medium", category: "assignment" } : null,
        { trigger: "Task completed", action: "Move next dependent task to To Do", impact: "medium", category: "workflow" },
        { trigger: "Sprint starts", action: "Auto-send sprint kickoff summary", impact: "low", category: "notification" },
        { trigger: "New task created without assignee", action: "Route to Triage Inbox", impact: "medium", category: "routing" },
        { trigger: "All subtasks completed", action: "Auto-move parent to Review", impact: "medium", category: "workflow" },
        { trigger: "Budget >80% consumed", action: "Alert finance team + PM", impact: "high", category: "financial" },
        { trigger: "Member capacity >90%", action: "Warn manager + pause new assignments", impact: "high", category: "capacity" },
        { trigger: "Task stale for 7+ days", action: "Send reminder to assignee", impact: "low", category: "reminder" },
      ].filter(Boolean),
    },

    csv_preview: {
      title: "AI CSV Import/Export Preview",
      exportPreview: {
        tasks: { columns: ["ID", "Title", "Status", "Priority", "Project", "Assignee", "Points", "Due", "Tags"], rows: tasks.slice(0, 5).map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, projectId: t.projectId, points: t.points, due: t.due })), totalRows: tasks.length },
        timeEntries: { totalRows: timeEntries.length },
        members: { totalRows: members.length },
      },
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
