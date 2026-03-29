import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, tasksTable, projectsTable, membersTable, sprintsTable, goalsTable, aiConversations, aiMessages } from "@workspace/db";
import { eq, and, isNull, ne } from "drizzle-orm";

const router: IRouter = Router();

const SYS_PROMPT = "You are ProjectOS AI, a fully autonomous project manager. Always respond with valid JSON only — no markdown, no backticks, no extra text.";

async function callAI(prompt: string, systemPrompt?: string): Promise<any> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: systemPrompt || SYS_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
  try { return JSON.parse(cleaned); } catch { return { raw: cleaned }; }
}

async function getProjectContext(projectId: number) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  const tasks = await db.select().from(tasksTable).where(
    and(eq(tasksTable.projectId, projectId), isNull(tasksTable.deletedAt))
  );
  const members = await db.select().from(membersTable);
  return { project, tasks, members };
}

router.post("/ai/generate-project", async (req, res): Promise<void> => {
  const { goal, projectId } = req.body;
  if (!goal?.trim()) { res.status(400).json({ error: "Goal is required" }); return; }
  const result = await callAI(
    `Generate a complete project plan for: "${goal}". Return JSON: {"projectName":string,"description":string,"tasks":[{"title":string,"priority":"critical"|"high"|"medium"|"low","status":"todo","points":number,"label":string}]} Include 7-10 tasks. Labels: feature|backend|design|docs|devops|research|bug`
  );
  if (result.tasks?.length && projectId) {
    const insertedTasks = [];
    for (const t of result.tasks) {
      const [inserted] = await db.insert(tasksTable).values({
        title: t.title,
        priority: t.priority || "medium",
        status: t.status || "todo",
        points: t.points || 3,
        tags: [t.label || "feature"],
        projectId: projectId,
        notes: "",
      }).returning();
      insertedTasks.push(inserted);
    }
    result.insertedCount = insertedTasks.length;
  }
  res.json({ success: true, result });
});

router.post("/ai/breakdown-task", async (req, res): Promise<void> => {
  const { taskId } = req.body;
  if (!taskId) { res.status(400).json({ error: "taskId required" }); return; }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const result = await callAI(
    `Break this task into 4-6 concrete subtasks: "${task.title}". Context notes: "${task.notes || 'none'}". Return JSON: {"subtasks":[{"title":string,"points":number,"priority":"high"|"medium"|"low"}]}`
  );
  if (result.subtasks?.length) {
    const inserted = [];
    for (const st of result.subtasks) {
      const [t] = await db.insert(tasksTable).values({
        title: st.title,
        priority: st.priority || "medium",
        status: "todo",
        points: st.points || 3,
        projectId: task.projectId,
        parentTaskId: task.id,
        notes: "",
      }).returning();
      inserted.push(t);
    }
    result.insertedCount = inserted.length;
  }
  res.json({ success: true, result });
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, projectId, conversationId } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "message required" }); return; }

  let convId = conversationId;
  if (!convId) {
    const [conv] = await db.insert(aiConversations).values({
      title: message.slice(0, 100),
    }).returning();
    convId = conv.id;
  }

  await db.insert(aiMessages).values({ conversationId: convId, role: "user", content: message });

  let ctx = "";
  if (projectId) {
    const { project, tasks, members } = await getProjectContext(projectId);
    const taskSummary = tasks.slice(0, 15).map(t => `${t.title}(${t.status},${t.priority})`).join("; ");
    ctx = `Project: "${project?.name}". Tasks: ${taskSummary}. Members: ${members.map(m => m.name).join(", ")}.`;
  }

  const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, convId));
  const msgs = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const aiMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: `You are ProjectOS AI for project management. ${ctx} Be concise and actionable. Respond in plain text (not JSON).`,
    messages: msgs,
  });
  const block = aiMsg.content[0];
  const reply = block.type === "text" ? block.text : "Got it — task processed.";

  await db.insert(aiMessages).values({ conversationId: convId, role: "assistant", content: reply });
  res.json({ success: true, reply, conversationId: convId });
});

router.post("/ai/standup", async (req, res): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { project, tasks, members } = await getProjectContext(projectId);
  const taskCtx = tasks.map(t => {
    const assignees = (t.assigneeIds as number[]) || [];
    const names = members.filter(m => assignees.includes(m.id)).map(m => m.name).join(",") || "Unassigned";
    return `${t.title}(${t.status},${names})`;
  }).join(";");
  const result = await callAI(
    `Generate a daily standup. Project: ${project?.name}. Tasks: ${taskCtx}. Team: ${members.map(m => `${m.name}(${m.role})`).join(",")}. Return JSON: {"highlights":string,"members":[{"name":string,"yesterday":string,"today":string,"blockers":string}],"teamNote":string}`
  );
  res.json({ success: true, result });
});

router.post("/ai/health", async (req, res): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { project, tasks } = await getProjectContext(projectId);
  const done = tasks.filter(t => t.status === "done");
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done");
  const inProgress = tasks.filter(t => t.status === "inprogress");
  const stats = { total: tasks.length, done: done.length, inProgress: inProgress.length, critical: critical.length, projectHealth: project?.health };
  const result = await callAI(
    `Analyze health of "${project?.name}". Stats: ${JSON.stringify(stats)}. Return JSON: {"score":number(0-100),"status":"healthy"|"at-risk"|"critical","summary":string,"risks":[string],"recommendations":[string],"forecast":string}`
  );
  res.json({ success: true, result });
});

router.post("/ai/risks", async (req, res): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { project, tasks } = await getProjectContext(projectId);
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done").map(t => t.title);
  const overdue = tasks.filter(t => t.due && new Date(t.due) < new Date() && t.status !== "done").map(t => t.title);
  const result = await callAI(
    `Identify top risks for "${project?.name}". Critical tasks: ${critical.join(",") || "none"}. Overdue: ${overdue.join(",") || "none"}. Total: ${tasks.length} tasks, ${tasks.filter(t => t.status === "done").length} done. Return JSON: {"risks":[{"title":string,"severity":"critical"|"high"|"medium","probability":number,"impact":string,"mitigation":string}]} Include 4-6 risks.`
  );
  res.json({ success: true, result });
});

router.post("/ai/plan-sprint", async (req, res): Promise<void> => {
  const { projectId, capacity } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { project, tasks } = await getProjectContext(projectId);
  const backlog = tasks.filter(t => !t.sprintId && t.status !== "done");
  const backlogStr = backlog.map(t => `${t.id}:"${t.title}"(${t.points}pts,${t.priority})`).join(";");
  const result = await callAI(
    `Plan optimal 2-week sprint for "${project?.name}". Team capacity: ${capacity || 40}pts. Backlog: ${backlogStr || "empty"}. Return JSON: {"sprintGoal":string,"totalPoints":number,"selectedTaskIds":[number],"reasoning":string,"warnings":[string]}`
  );
  res.json({ success: true, result, backlogTaskIds: backlog.map(t => t.id) });
});

router.post("/ai/auto-prioritize", async (req, res): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { tasks } = await getProjectContext(projectId);
  const activeTasks = tasks.filter(t => t.status !== "done");
  const list = activeTasks.map(t => `${t.id}:"${t.title}"(${t.priority},${t.points}pts,${t.status})`).join(";");
  const result = await callAI(
    `Re-prioritize for max business impact: ${list}. Return JSON: {"updates":[{"id":number,"priority":"critical"|"high"|"medium"|"low","reason":string}]}`
  );
  if (result.updates?.length) {
    for (const u of result.updates) {
      await db.update(tasksTable).set({ priority: u.priority }).where(eq(tasksTable.id, u.id));
    }
    result.appliedCount = result.updates.length;
  }
  res.json({ success: true, result });
});

router.post("/ai/meeting-to-tasks", async (req, res): Promise<void> => {
  const { notes, projectId } = req.body;
  if (!notes?.trim()) { res.status(400).json({ error: "notes required" }); return; }
  const result = await callAI(
    `Extract action items from meeting notes: "${notes}". Return JSON: {"summary":string,"tasks":[{"title":string,"assignee":string,"priority":"high"|"medium"|"low","points":number}]}`
  );
  if (result.tasks?.length && projectId) {
    const inserted = [];
    for (const t of result.tasks) {
      const [task] = await db.insert(tasksTable).values({
        title: t.title,
        priority: t.priority || "medium",
        status: "todo",
        points: t.points || 3,
        projectId,
        notes: `From meeting notes: ${t.assignee || ""}`,
      }).returning();
      inserted.push(task);
    }
    result.insertedCount = inserted.length;
  }
  res.json({ success: true, result });
});

router.post("/ai/executive-report", async (req, res): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
  const { project, tasks } = await getProjectContext(projectId);
  const done = tasks.filter(t => t.status === "done");
  const inProgress = tasks.filter(t => t.status === "inprogress");
  const critical = tasks.filter(t => t.priority === "critical" && t.status !== "done");
  const stats = { total: tasks.length, done: done.length, inProgress: inProgress.length, critical: critical.length };
  const result = await callAI(
    `Write executive status report for "${project?.name}". Stats: ${JSON.stringify(stats)}. Return JSON: {"subject":string,"executiveSummary":string,"progressSection":string,"risksSection":string,"nextSteps":string}`
  );
  res.json({ success: true, result });
});

router.get("/ai/conversations", async (_req, res): Promise<void> => {
  const conversations = await db.select().from(aiConversations);
  res.json({ conversations });
});

router.get("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, id));
  res.json({ messages: msgs });
});

export default router;
