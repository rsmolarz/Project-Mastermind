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

    context_switcher: {
      title: "AI Context Switcher",
      predictions: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done");
        const inProgress = memberTasks.filter(t => t.status === "inprogress");
        const highPriority = memberTasks.filter(t => t.priority === "critical" || t.priority === "high").sort((a, b) => (a.priority === "critical" ? 0 : 1) - (b.priority === "critical" ? 0 : 1));
        const overdue = memberTasks.filter(t => t.due && new Date(t.due) < new Date());
        const nextTask = overdue[0] || inProgress[0] || highPriority[0] || memberTasks[0];
        return { member: m.name, color: m.color, currentFocus: inProgress[0]?.title || "No active task", predictedNext: nextTask?.title || "None", reason: overdue.length > 0 ? "Overdue — needs immediate attention" : inProgress.length > 0 ? "Continue current work" : highPriority.length > 0 ? "High priority waiting" : "Next in queue", confidence: overdue.length > 0 ? "high" : inProgress.length > 0 ? "high" : "medium" };
      }),
    },

    email_drafter: {
      title: "AI Stakeholder Email Drafter",
      drafts: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const done = projectTasks.filter(t => t.status === "done").length;
        const total = projectTasks.length;
        const blocked = projectTasks.filter(t => t.status === "blocked").length;
        const spent = timeEntries.filter(e => e.projectId === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        return {
          project: p.name, client: p.client || "Internal",
          subject: `${p.name} — Weekly Status Update`,
          body: [
            `Hi team,`,
            ``,
            `Here's the weekly update for ${p.name}:`,
            `• Progress: ${done}/${total} tasks completed (${total > 0 ? Math.round((done / total) * 100) : 0}%)`,
            `• Budget: $${Math.round(spent).toLocaleString()} of $${Number(p.budget || 0).toLocaleString()} used`,
            blocked > 0 ? `• ⚠️ ${blocked} blocked task(s) requiring attention` : `• No blockers — work is flowing smoothly`,
            ``,
            `Key highlights this week:`,
            ...projectTasks.filter(t => t.status === "done").slice(0, 3).map(t => `  ✅ ${t.title}`),
            ``,
            `Next steps:`,
            ...projectTasks.filter(t => t.status === "inprogress").slice(0, 3).map(t => `  🔄 ${t.title}`),
            ``,
            `Best regards`
          ].join("\n"),
        };
      }),
    },

    retro_facilitator: {
      title: "AI Retro Facilitator",
      exercises: (() => {
        const completionRate = tasks.length > 0 ? tasks.filter(t => t.status === "done").length / tasks.length : 0;
        const blockedRate = tasks.length > 0 ? tasks.filter(t => t.status === "blocked").length / tasks.length : 0;
        const exercises = [
          { name: "Start-Stop-Continue", duration: "20 min", focus: "General improvement", prompt: `Based on ${Math.round(completionRate * 100)}% completion rate, what should the team start, stop, and continue doing?` },
          { name: "Mad-Sad-Glad", duration: "15 min", focus: "Team sentiment", prompt: blockedRate > 0.1 ? `${Math.round(blockedRate * 100)}% of tasks are blocked — explore frustrations and wins` : "Celebrate wins and identify what made the team glad" },
          { name: "4Ls: Liked-Learned-Lacked-Longed For", duration: "25 min", focus: "Deep reflection", prompt: "What did we like about our process? What did we learn? What was missing?" },
          { name: "Sailboat", duration: "20 min", focus: "Strategic direction", prompt: "Wind (what pushes us forward), Anchors (what holds us back), Rocks (risks ahead)" },
          { name: "Speed Car", duration: "15 min", focus: "Velocity improvement", prompt: `Current velocity trend — what's our engine? What's our parachute?` },
        ];
        return { recommended: exercises[blockedRate > 0.15 ? 1 : completionRate < 0.3 ? 0 : 2], all: exercises };
      })(),
    },

    onboarding_planner: {
      title: "AI Onboarding Planner",
      plans: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const technologies = new Set<string>();
        projectTasks.forEach(t => { (t.tags as string[] || []).forEach(tag => technologies.add(tag)); });
        return {
          project: p.name,
          week1: ["Set up development environment", "Review project documentation", "Shadow team lead on current sprint", "Complete first small task (good-first-issue)"],
          week2: ["Take ownership of 2-3 tasks", "Attend sprint ceremonies", `Learn ${[...technologies].slice(0, 3).join(", ") || "project stack"}`, "First code review participation"],
          week3: ["Independent task execution", "Cross-project collaboration", "Contribute to retrospective", "Identify personal growth areas"],
          keyContacts: members.filter(m => {
            const memberTasks = tasks.filter(t => t.projectId === p.id && (t.assigneeIds as number[])?.includes(m.id));
            return memberTasks.length > 0;
          }).slice(0, 3).map(m => ({ name: m.name, role: m.role, color: m.color })),
        };
      }),
    },

    pair_programming: {
      title: "AI Pair Programming Optimizer",
      pairings: (() => {
        const pairs: any[] = [];
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const m1 = members[i]; const m2 = members[j];
            const sharedProjects = projects.filter(p => {
              const m1Tasks = tasks.filter(t => t.projectId === p.id && (t.assigneeIds as number[])?.includes(m1.id));
              const m2Tasks = tasks.filter(t => t.projectId === p.id && (t.assigneeIds as number[])?.includes(m2.id));
              return m1Tasks.length > 0 && m2Tasks.length > 0;
            });
            const r1 = (m1.role || "").toLowerCase(); const r2 = (m2.role || "").toLowerCase();
            const crossFunctional = (r1.includes("front") && r2.includes("back")) || (r1.includes("back") && r2.includes("front")) || (r1.includes("design") && r2.includes("dev"));
            const score = sharedProjects.length * 20 + (crossFunctional ? 30 : 0);
            if (score > 0) pairs.push({ member1: { name: m1.name, color: m1.color, role: m1.role }, member2: { name: m2.name, color: m2.color, role: m2.role }, score, reason: crossFunctional ? "Cross-functional synergy" : "Shared project context", sharedProjects: sharedProjects.map(p => p.name) });
          }
        }
        return pairs.sort((a, b) => b.score - a.score);
      })(),
    },

    knowledge_decay: {
      title: "AI Knowledge Decay Detector",
      outdated: (() => {
        const docs = tasks.filter(t => t.type === "docs" || (t.tags as string[])?.includes("documentation"));
        const staleThreshold = 30 * 24 * 60 * 60 * 1000;
        const allItems = [
          ...tasks.filter(t => t.status === "done" && Date.now() - new Date(t.createdAt).getTime() > staleThreshold).slice(0, 5).map(t => ({
            type: "completed_task" as const, title: t.title, age: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
            risk: "Process may have changed since task was completed",
          })),
          ...projects.map(p => {
            const lastActivity = tasks.filter(t => t.projectId === p.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (24 * 60 * 60 * 1000)) : 999;
            return daysSince > 14 ? { type: "stale_project" as const, title: `${p.name} documentation`, age: daysSince, risk: "Project docs may be outdated" } : null;
          }).filter(Boolean),
        ];
        return allItems;
      })(),
    },

    decision_logger: {
      title: "AI Decision Logger",
      decisions: tasks.filter(t => t.status === "done" || t.status === "blocked").slice(0, 10).map(t => {
        const decisions: string[] = [];
        if (t.status === "done") decisions.push(`Completed: "${t.title}" — shipped as planned`);
        if (t.status === "blocked") decisions.push(`Blocked: "${t.title}" — requires dependency resolution`);
        if (t.priority === "critical") decisions.push(`Escalated to critical priority`);
        if ((t.points || 0) > 5) decisions.push(`Scoped at ${t.points} points — significant effort`);
        return { taskId: t.id, title: t.title, status: t.status, decisions, timestamp: t.createdAt };
      }),
    },

    competitive_velocity: {
      title: "AI Competitive Velocity Benchmark",
      benchmarks: (() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === "done").length;
        const avgPointsPerTask = tasks.reduce((s, t) => s + (t.points || 0), 0) / Math.max(totalTasks, 1);
        const teamSize = members.length;
        const tasksPerMember = Math.round(totalTasks / Math.max(teamSize, 1));
        const completionRate = Math.round((completedTasks / Math.max(totalTasks, 1)) * 100);
        return {
          yourMetrics: { totalTasks, completedTasks, completionRate, avgPointsPerTask: Math.round(avgPointsPerTask * 10) / 10, teamSize, tasksPerMember },
          industryAvg: { completionRate: 68, avgPointsPerTask: 3.2, tasksPerMember: 12 },
          comparison: [
            { metric: "Completion Rate", yours: `${completionRate}%`, industry: "68%", status: completionRate >= 68 ? "above" : "below" },
            { metric: "Avg Points/Task", yours: `${Math.round(avgPointsPerTask * 10) / 10}`, industry: "3.2", status: avgPointsPerTask >= 3.2 ? "above" : "below" },
            { metric: "Tasks/Member", yours: `${tasksPerMember}`, industry: "12", status: tasksPerMember <= 12 ? "healthy" : "overloaded" },
          ],
          overall: completionRate >= 68 ? "Performing above industry average" : "Room for improvement vs industry benchmarks",
        };
      })(),
    },

    cost_per_feature: {
      title: "AI Cost-Per-Feature Calculator",
      features: (() => {
        const featureTasks = tasks.filter(t => t.type === "feature" || t.type === "story");
        return featureTasks.map(t => {
          const assignees = (t.assigneeIds as number[]) || [];
          const memberRates = assignees.map(id => members.find(m => m.id === id)).filter(Boolean);
          const estimatedHours = (t.points || 3) * 1.5;
          const avgRate = memberRates.length > 0 ? memberRates.reduce((s, m) => s + Number(m!.rate || 100), 0) / memberRates.length : 120;
          const estimatedCost = Math.round(estimatedHours * avgRate);
          const actualHours = timeEntries.filter(e => assignees.includes(e.memberId!)).reduce((s, e) => s + Number(e.hours), 0);
          return { id: t.id, title: t.title, estimatedCost, estimatedHours: Math.round(estimatedHours * 10) / 10, status: t.status, priority: t.priority, costEfficiency: estimatedCost < 500 ? "low_cost" : estimatedCost < 2000 ? "moderate" : "expensive" };
        }).sort((a, b) => b.estimatedCost - a.estimatedCost);
      })(),
    },

    sprint_themes: {
      title: "AI Sprint Theme Detector",
      themes: sprints.map(s => {
        const sprintTasks = tasks.filter(t => t.sprintId === s.id);
        const tagCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        sprintTasks.forEach(t => {
          if (t.type) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
          (t.tags as string[] || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
        });
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
        const bugRatio = (typeCounts["bug"] || 0) / Math.max(sprintTasks.length, 1);
        const theme = bugRatio > 0.4 ? "Bug Fixing Sprint" : topTypes[0]?.[0] === "feature" ? "Feature Sprint" : topTags[0] ? `${topTags[0][0]} Focus` : "Mixed Sprint";
        return { sprint: s.name, theme, taskCount: sprintTasks.length, topTags: topTags.map(([tag, count]) => ({ tag, count })), topTypes: topTypes.map(([type, count]) => ({ type, count })), bugRatio: Math.round(bugRatio * 100) };
      }),
    },

    blocker_predictor: {
      title: "AI Blocker Predictor",
      predictions: tasks.filter(t => t.status !== "done" && t.status !== "blocked").map(t => {
        let blockerRisk = 0;
        const reasons: string[] = [];
        if (t.priority === "critical") { blockerRisk += 20; reasons.push("Critical priority — high visibility"); }
        if ((t.points || 0) >= 8) { blockerRisk += 15; reasons.push("Large scope (8+ points)"); }
        const assignees = (t.assigneeIds as number[]) || [];
        if (assignees.length === 0) { blockerRisk += 25; reasons.push("No assignee — ownership risk"); }
        if (assignees.length > 2) { blockerRisk += 10; reasons.push("Multiple assignees — coordination risk"); }
        const assigneeTasks = assignees.flatMap(id => tasks.filter(at => (at.assigneeIds as number[])?.includes(id) && at.status === "blocked"));
        if (assigneeTasks.length > 0) { blockerRisk += 30; reasons.push("Assignee has other blocked tasks"); }
        if (t.due) { const daysUntil = (new Date(t.due).getTime() - Date.now()) / (24 * 60 * 60 * 1000); if (daysUntil < 3 && daysUntil > 0) { blockerRisk += 15; reasons.push("Due date approaching"); } }
        return { id: t.id, title: t.title, blockerRisk: Math.min(100, blockerRisk), reasons, prediction: blockerRisk > 50 ? "likely" : blockerRisk > 25 ? "possible" : "unlikely" };
      }).filter(t => t.blockerRisk > 15).sort((a, b) => b.blockerRisk - a.blockerRisk).slice(0, 10),
    },

    meeting_roi: {
      title: "AI Meeting ROI Calculator",
      analysis: (() => {
        const avgRate = members.reduce((s, m) => s + Number(m.rate || 100), 0) / Math.max(members.length, 1);
        const meetings = [
          { name: "Daily Standup", duration: 0.25, frequency: "daily", attendees: members.length, costPerOccurrence: Math.round(0.25 * avgRate * members.length) },
          { name: "Sprint Review", duration: 0.75, frequency: "biweekly", attendees: members.length, costPerOccurrence: Math.round(0.75 * avgRate * members.length) },
          { name: "Sprint Retrospective", duration: 0.5, frequency: "biweekly", attendees: members.length, costPerOccurrence: Math.round(0.5 * avgRate * members.length) },
          { name: "Sprint Planning", duration: 1, frequency: "biweekly", attendees: members.length, costPerOccurrence: Math.round(1 * avgRate * members.length) },
          { name: "1:1 Check-ins", duration: 0.5, frequency: "weekly", attendees: 2, costPerOccurrence: Math.round(0.5 * avgRate * 2) },
        ];
        const monthlyTotal = meetings.reduce((s, m) => {
          const freq = m.frequency === "daily" ? 20 : m.frequency === "weekly" ? 4 : 2;
          return s + m.costPerOccurrence * freq;
        }, 0);
        return { meetings, monthlyTotal, recommendation: monthlyTotal > 10000 ? "Meeting costs are significant — consider async alternatives for some ceremonies" : "Meeting costs are reasonable for team size" };
      })(),
    },

    priority_decay: {
      title: "AI Priority Decay Analyzer",
      decayed: tasks.filter(t => t.status !== "done").map(t => {
        const ageMs = Date.now() - new Date(t.createdAt).getTime();
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        const isPriority = t.priority === "critical" || t.priority === "high";
        const isStale = ageDays > 14;
        return isPriority && isStale ? { id: t.id, title: t.title, priority: t.priority, ageDays, status: t.status, suggestion: ageDays > 30 ? "Deprioritize or close — stale for 30+ days" : "Review urgency — high priority but inactive" } : null;
      }).filter(Boolean),
    },

    team_growth: {
      title: "AI Team Growth Tracker",
      growth: members.map(m => {
        const allTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id));
        const completed = allTasks.filter(t => t.status === "done");
        const complexTasks = completed.filter(t => (t.points || 0) >= 5);
        const tagSkills = new Set<string>();
        allTasks.forEach(t => (t.tags as string[] || []).forEach(tag => tagSkills.add(tag)));
        const projectsBreadth = new Set(allTasks.map(t => t.projectId)).size;
        return { member: m.name, color: m.color, role: m.role, metrics: { totalCompleted: completed.length, complexTasks: complexTasks.length, skillTags: [...tagSkills].slice(0, 5), projectBreadth: projectsBreadth, growthScore: Math.min(100, completed.length * 5 + complexTasks.length * 10 + projectsBreadth * 15) }, level: completed.length > 10 ? "Senior" : completed.length > 5 ? "Mid" : "Junior", trend: complexTasks.length > 2 ? "rapid_growth" : completed.length > 3 ? "steady" : "early_stage" };
      }),
    },

    handoff_analyzer: {
      title: "AI Handoff Risk Analyzer",
      handoffs: (() => {
        const riskHandoffs: any[] = [];
        tasks.filter(t => t.status !== "done" && (t.assigneeIds as number[])?.length > 1).forEach(t => {
          const assignees = (t.assigneeIds as number[]) || [];
          for (let i = 0; i < assignees.length; i++) {
            for (let j = i + 1; j < assignees.length; j++) {
              const m1 = members.find(m => m.id === assignees[i]);
              const m2 = members.find(m => m.id === assignees[j]);
              if (m1 && m2) {
                const r1 = (m1.role || "").toLowerCase(); const r2 = (m2.role || "").toLowerCase();
                const sameRole = r1 === r2;
                riskHandoffs.push({ task: t.title, from: { name: m1.name, color: m1.color }, to: { name: m2.name, color: m2.color }, riskLevel: sameRole ? "low" : "medium", reason: sameRole ? "Same role — smooth handoff expected" : "Different roles — ensure clear documentation" });
              }
            }
          }
        });
        return riskHandoffs.slice(0, 10);
      })(),
    },

    focus_time: {
      title: "AI Focus Time Optimizer",
      recommendations: members.map(m => {
        const memberTasks = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done");
        const deepWork = memberTasks.filter(t => (t.points || 0) >= 5);
        const quickTasks = memberTasks.filter(t => (t.points || 0) <= 2);
        const totalEstimatedHours = memberTasks.reduce((s, t) => s + (t.points || 3) * 1.5, 0);
        return { member: m.name, color: m.color, deepWorkBlocks: Math.ceil(deepWork.length * 2), quickTaskSlots: quickTasks.length, suggestedSchedule: { morningFocus: deepWork.length > 0 ? `${deepWork[0].title} (deep work)` : "No deep work tasks", afternoonTasks: quickTasks.slice(0, 3).map(t => t.title).join(", ") || "No quick tasks", estimatedHoursNeeded: Math.round(totalEstimatedHours) }, recommendation: deepWork.length > 3 ? "Block 4-hour morning sessions for deep work" : "Schedule 2-hour focus blocks, batch small tasks in afternoon" };
      }),
    },

    dependency_chain_risk: {
      title: "AI Dependency Chain Risk",
      chains: (() => {
        const statusOrder = ["backlog", "todo", "inprogress", "review", "done"];
        const projectChains = projects.map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id && t.status !== "done");
          const blocked = projectTasks.filter(t => t.status === "blocked");
          const inProgress = projectTasks.filter(t => t.status === "inprogress");
          const reviewQueue = projectTasks.filter(t => t.status === "review");
          const bottleneckStage = reviewQueue.length > inProgress.length ? "review" : blocked.length > 0 ? "blocked" : inProgress.length > 3 ? "inprogress" : "none";
          return { project: p.name, color: p.color, chainLength: projectTasks.length, blocked: blocked.length, inProgress: inProgress.length, reviewQueue: reviewQueue.length, bottleneck: bottleneckStage, risk: blocked.length > 2 ? "high" : reviewQueue.length > 3 ? "medium" : "low", suggestion: bottleneckStage === "review" ? "Add reviewers — review queue is building up" : bottleneckStage === "blocked" ? "Unblock critical tasks first" : "Chain is healthy" };
        });
        return projectChains;
      })(),
    },

    workflow_patterns: {
      title: "AI Workflow Pattern Mining",
      patterns: (() => {
        const statusTransitions: Record<string, number> = {};
        tasks.forEach(t => {
          const key = `${t.status}`;
          statusTransitions[key] = (statusTransitions[key] || 0) + 1;
        });
        const avgTimeInStatus = Object.entries(statusTransitions).map(([status, count]) => ({ status, count, percentage: Math.round((count / Math.max(tasks.length, 1)) * 100) }));
        const patterns = [
          tasks.filter(t => t.status === "blocked").length > 2 ? { pattern: "Frequent Blocking", severity: "high", insight: `${tasks.filter(t => t.status === "blocked").length} tasks blocked — consider dependency mapping before sprint start` } : null,
          tasks.filter(t => t.status === "review").length > tasks.filter(t => t.status === "inprogress").length ? { pattern: "Review Bottleneck", severity: "medium", insight: "More tasks in review than in progress — add reviewers or reduce batch size" } : null,
          tasks.filter(t => t.status === "backlog").length > tasks.length * 0.4 ? { pattern: "Backlog Buildup", severity: "medium", insight: `${Math.round(tasks.filter(t => t.status === "backlog").length / tasks.length * 100)}% of tasks in backlog — groom and prioritize` } : null,
          tasks.filter(t => !t.assigneeIds || (t.assigneeIds as number[]).length === 0).length > 3 ? { pattern: "Ownership Gaps", severity: "high", insight: `${tasks.filter(t => !t.assigneeIds || (t.assigneeIds as number[]).length === 0).length} unassigned tasks — assign owners to maintain accountability` } : null,
          { pattern: "Task Distribution", severity: "info", insight: avgTimeInStatus.map(s => `${s.status}: ${s.count} (${s.percentage}%)`).join(", ") },
        ].filter(Boolean);
        return { patterns, statusDistribution: avgTimeInStatus };
      })(),
    },

    project_similarity: {
      title: "AI Project Similarity Finder",
      similarities: (() => {
        const projectProfiles = projects.map(p => {
          const projectTasks = tasks.filter(t => t.projectId === p.id);
          const tags = new Set<string>();
          projectTasks.forEach(t => (t.tags as string[] || []).forEach(tag => tags.add(tag)));
          return { id: p.id, name: p.name, color: p.color, taskCount: projectTasks.length, tags: [...tags], avgPoints: projectTasks.length > 0 ? Math.round(projectTasks.reduce((s, t) => s + (t.points || 0), 0) / projectTasks.length * 10) / 10 : 0, budget: Number(p.budget || 0) };
        });
        const pairs: any[] = [];
        for (let i = 0; i < projectProfiles.length; i++) {
          for (let j = i + 1; j < projectProfiles.length; j++) {
            const p1 = projectProfiles[i]; const p2 = projectProfiles[j];
            const sharedTags = p1.tags.filter(t => p2.tags.includes(t));
            const sizeSimilarity = 1 - Math.abs(p1.taskCount - p2.taskCount) / Math.max(p1.taskCount, p2.taskCount, 1);
            const similarity = Math.round((sharedTags.length * 20 + sizeSimilarity * 30) * 100) / 100;
            pairs.push({ project1: p1.name, project2: p2.name, color1: p1.color, color2: p2.color, similarity, sharedTags, useCase: similarity > 30 ? "Use timelines from similar project for estimation" : "Projects are distinct — estimate independently" });
          }
        }
        return pairs.sort((a, b) => b.similarity - a.similarity);
      })(),
    },
    sprint_themes_2: {
      title: "AI Predictive Analytics Engine",
      predictions: (() => {
        const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0;
        const blockedRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "blocked").length / tasks.length) * 100) : 0;
        const overdueRate = tasks.length > 0 ? Math.round((overdueTasks.length / tasks.length) * 100) : 0;
        const avgVelocityPerSprint = sprints.length > 0 ? Math.round(tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.points || 0), 0) / sprints.length) : 0;
        const burnoutMembers = members.filter(m => {
          const load = tasks.filter(t => (t.assigneeIds as number[])?.includes(m.id) && t.status !== "done").length;
          return load > 5;
        });
        return {
          projectCompletion: { predicted: `${Math.min(100, completionRate + Math.round(avgVelocityPerSprint * 0.8))}%`, current: `${completionRate}%`, trend: completionRate > 50 ? "on_track" : "behind" },
          sprintSuccess: { probability: blockedRate < 10 && overdueRate < 15 ? "85%" : blockedRate < 20 ? "65%" : "40%", factors: [`${blockedRate}% blocked rate`, `${overdueRate}% overdue rate`, `${avgVelocityPerSprint} pts/sprint avg`] },
          burnoutRisk: { membersAtRisk: burnoutMembers.map(m => m.name), riskLevel: burnoutMembers.length > 2 ? "high" : burnoutMembers.length > 0 ? "moderate" : "low" },
          deadlineForecast: { tasksLikelyToMiss: overdueTasks.length + tasks.filter(t => t.status !== "done" && t.due && (new Date(t.due).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000).length, recommendation: overdueTasks.length > 3 ? "Redistribute overdue tasks immediately" : "On track — monitor daily" },
          nextSprintRecommendation: `Plan for ${Math.round(avgVelocityPerSprint * 0.9)} points based on ${sprints.length} sprint history`,
        };
      })(),
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
