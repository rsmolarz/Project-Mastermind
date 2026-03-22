import { Router, type IRouter } from "express";
import { AiChatBody, AiChatResponse } from "@workspace/api-zod";
import { db, tasksTable, goalsTable, timeEntriesTable, projectsTable, membersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tasks = await db.select().from(tasksTable);
  const goals = await db.select().from(goalsTable);
  const members = await db.select().from(membersTable);
  const projects = await db.select().from(projectsTable);
  const entries = await db.select().from(timeEntriesTable);

  const now = new Date();
  const overdue = tasks.filter(t => t.due && new Date(t.due) < now && t.status !== "done");
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done");
  const inProgress = tasks.filter(t => t.status === "inprogress");
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
  const weekHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);

  const msg = parsed.data.message.toLowerCase();
  let reply = "";

  if (msg.includes("overdue")) {
    if (overdue.length === 0) {
      reply = "Great news — there are no overdue tasks right now. Everything is on schedule!";
    } else {
      reply = `There are ${overdue.length} overdue task(s):\n\n${overdue.map(t => `• **${t.title}** — due ${new Date(t.due!).toLocaleDateString()}, priority: ${t.priority}`).join("\n")}`;
    }
  } else if (msg.includes("critical")) {
    if (critical.length === 0) {
      reply = "No critical tasks pending. The team is in good shape!";
    } else {
      reply = `There are ${critical.length} critical task(s):\n\n${critical.map(t => `• **${t.title}** — status: ${t.status}`).join("\n")}`;
    }
  } else if (msg.includes("week") || msg.includes("summary") || msg.includes("summarize")) {
    reply = `**This Week's Summary:**\n\n• **${weekHours.toFixed(1)}h** logged across ${weekEntries.length} entries\n• **$${weekEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()}** in revenue\n• **${tasks.filter(t => t.status === "done").length}** tasks completed\n• **${inProgress.length}** tasks in progress\n• **${overdue.length}** overdue tasks\n• **${critical.length}** critical items pending`;
  } else if (msg.includes("goal") || msg.includes("okr")) {
    const atRisk = goals.filter(g => g.status === "at_risk" || g.status === "off_track");
    reply = `**Goals Overview:**\n\n${goals.map(g => `• **${g.title}** — ${g.progress}% complete, status: ${g.status.replace("_", " ")}`).join("\n")}${atRisk.length > 0 ? `\n\n⚠️ ${atRisk.length} goal(s) at risk or off track.` : "\n\n✅ All goals are on track!"}`;
  } else if (msg.includes("standup") || msg.includes("stand-up")) {
    const member = members[0];
    const memberTasks = tasks.filter(t => (t.assigneeIds as number[]).includes(member?.id || 0) && t.status !== "done").slice(0, 3);
    reply = member ? `**Standup for ${member.name}:**\n\n**Yesterday:** Worked on ${memberTasks[0]?.title || "team tasks"}\n**Today:** Focusing on ${memberTasks.slice(0, 2).map(t => t.title).join(", ") || "upcoming work"}\n**Blockers:** ${tasks.filter(t => t.status === "blocked").length > 0 ? "Some tasks are blocked" : "No blockers"}` : "No team members found.";
  } else if (msg.includes("project") || msg.includes("portfolio")) {
    reply = `**Portfolio Overview:**\n\n${projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      const done = pTasks.filter(t => t.status === "done");
      return `• **${p.icon} ${p.name}** — ${done.length}/${pTasks.length} tasks done, health: ${p.health}%, phase: ${p.phase}`;
    }).join("\n")}`;
  } else if (msg.includes("team") || msg.includes("workload")) {
    reply = `**Team Workload:**\n\n${members.map(m => {
      const mTasks = tasks.filter(t => (t.assigneeIds as number[]).includes(m.id) && t.status !== "done");
      return `• **${m.name}** (${m.role}) — ${mTasks.length} open tasks`;
    }).join("\n")}`;
  } else {
    reply = `Here's a quick overview:\n\n• **${tasks.length}** total tasks, **${inProgress.length}** in progress, **${overdue.length}** overdue\n• **${goals.length}** goals tracked, **${goals.filter(g => g.status === "on_track").length}** on track\n• **${weekHours.toFixed(1)}h** logged this week\n• **${members.length}** team members\n\nTry asking about overdue tasks, goals, team workload, or a weekly summary!`;
  }

  res.json(AiChatResponse.parse({ reply }));
});

export default router;
