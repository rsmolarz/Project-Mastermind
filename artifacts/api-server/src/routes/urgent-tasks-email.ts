import { Router, type IRouter } from "express";
import { eq, and, lt, or, isNull, desc, sql } from "drizzle-orm";
import { db, tasksTable, membersTable, projectsTable, emailLogsTable } from "@workspace/db";
import { sendEmail, isEmailConfigured } from "../services/email.service";

const router: IRouter = Router();

const URGENT_EMAIL_ADDRESS = "urgent-tasks@projectos.dev";

router.get("/urgent-tasks-email/address", async (_req, res): Promise<void> => {
  res.json({ address: URGENT_EMAIL_ADDRESS });
});

router.get("/urgent-tasks-email/tasks", async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const tasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        due: tasksTable.due,
        projectId: tasksTable.projectId,
        assigneeIds: tasksTable.assigneeIds,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .where(
        and(
          or(
            eq(tasksTable.priority, "urgent"),
            eq(tasksTable.priority, "high"),
            lt(tasksTable.due, now)
          ),
          or(
            eq(tasksTable.status, "todo"),
            eq(tasksTable.status, "in_progress"),
            eq(tasksTable.status, "backlog")
          ),
          isNull(tasksTable.archivedAt),
          isNull(tasksTable.deletedAt)
        )
      )
      .orderBy(desc(tasksTable.priority), tasksTable.due)
      .limit(200);

    const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))];
    const memberIds = [...new Set(tasks.flatMap((t) => t.assigneeIds || []))];

    const projects =
      projectIds.length > 0
        ? await db
            .select({ id: projectsTable.id, name: projectsTable.name, color: projectsTable.color })
            .from(projectsTable)
            .where(sql`${projectsTable.id} IN ${projectIds}`)
        : [];

    const members =
      memberIds.length > 0
        ? await db
            .select({ id: membersTable.id, name: membersTable.name, avatar: membersTable.avatar })
            .from(membersTable)
            .where(sql`${membersTable.id} IN ${memberIds}`)
        : [];

    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

    const enriched = tasks.map((t) => ({
      ...t,
      project: t.projectId ? projectMap[t.projectId] || null : null,
      assignees: (t.assigneeIds || []).map((id: number) => memberMap[id]).filter(Boolean),
      isOverdue: t.due ? new Date(t.due) < now : false,
    }));

    const overdue = enriched.filter((t) => t.isOverdue);
    const urgentPriority = enriched.filter((t) => t.priority === "urgent" && !t.isOverdue);
    const highPriority = enriched.filter((t) => t.priority === "high" && !t.isOverdue);

    res.json({
      total: enriched.length,
      overdue: overdue.length,
      urgentCount: urgentPriority.length,
      highCount: highPriority.length,
      tasks: enriched,
      overdueList: overdue,
      urgentList: urgentPriority,
      highList: highPriority,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch urgent tasks" });
  }
});

router.get("/urgent-tasks-email/history", async (_req, res): Promise<void> => {
  try {
    const logs = await db
      .select()
      .from(emailLogsTable)
      .where(
        and(
          eq(emailLogsTable.fromAddress, URGENT_EMAIL_ADDRESS),
          eq(emailLogsTable.direction, "outbound")
        )
      )
      .orderBy(desc(emailLogsTable.createdAt))
      .limit(50);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch email history" });
  }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/urgent-tasks-email/send-digest", async (req, res): Promise<void> => {
  const { recipientEmail } = req.body;
  if (!recipientEmail || typeof recipientEmail !== "string") {
    res.status(400).json({ error: "recipientEmail is required" });
    return;
  }
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  if (normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email address format" });
    return;
  }

  if (!isEmailConfigured()) {
    res.status(400).json({ error: "Email is not configured. Set RESEND_API_KEY in environment." });
    return;
  }

  try {
    const now = new Date();
    const tasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        due: tasksTable.due,
        projectId: tasksTable.projectId,
      })
      .from(tasksTable)
      .where(
        and(
          or(
            eq(tasksTable.priority, "urgent"),
            eq(tasksTable.priority, "high"),
            lt(tasksTable.due, now)
          ),
          or(
            eq(tasksTable.status, "todo"),
            eq(tasksTable.status, "in_progress"),
            eq(tasksTable.status, "backlog")
          ),
          isNull(tasksTable.archivedAt),
          isNull(tasksTable.deletedAt)
        )
      )
      .orderBy(desc(tasksTable.priority), tasksTable.due)
      .limit(100);

    if (tasks.length === 0) {
      res.json({ success: true, message: "No urgent tasks to send", tasksSent: 0, overdue: 0 });
      return;
    }

    const overdue = tasks.filter((t) => t.due && new Date(t.due) < now);
    const urgent = tasks.filter((t) => t.priority === "urgent" && !(t.due && new Date(t.due) < now));
    const high = tasks.filter((t) => t.priority === "high" && !(t.due && new Date(t.due) < now));

    const formatTaskLine = (t: any) => {
      const dueStr = t.due ? ` (due ${new Date(t.due).toLocaleDateString()})` : "";
      return `• [${t.priority.toUpperCase()}] ${t.title}${dueStr}`;
    };

    let body = `Urgent Pending Tasks Digest — ${now.toLocaleDateString()}\n\n`;
    if (overdue.length > 0) {
      body += `🚨 OVERDUE (${overdue.length}):\n${overdue.map(formatTaskLine).join("\n")}\n\n`;
    }
    if (urgent.length > 0) {
      body += `⚡ URGENT PRIORITY (${urgent.length}):\n${urgent.map(formatTaskLine).join("\n")}\n\n`;
    }
    if (high.length > 0) {
      body += `🔴 HIGH PRIORITY (${high.length}):\n${high.map(formatTaskLine).join("\n")}\n\n`;
    }
    body += `Total: ${tasks.length} tasks requiring attention.`;

    await sendEmail(normalizedEmail, `[ProjectOS] Urgent Tasks Digest — ${overdue.length} overdue, ${urgent.length + high.length} high priority`, body);

    await db.insert(emailLogsTable).values({
      projectId: null,
      fromAddress: URGENT_EMAIL_ADDRESS,
      toAddress: normalizedEmail,
      subject: `Urgent Tasks Digest — ${now.toLocaleDateString()}`,
      bodyText: body,
      bodyHtml: "",
      provider: "resend",
      direction: "outbound",
    });

    res.json({ success: true, tasksSent: tasks.length, overdue: overdue.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send digest" });
  }
});

export default router;
