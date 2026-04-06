import { Router, type IRouter } from "express";
import { db, emailRoutesTable, emailLogsTable, projectsTable } from "@workspace/db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/email-routing/routes", async (_req, res): Promise<void> => {
  const routes = await db.select({
    id: emailRoutesTable.id,
    projectId: emailRoutesTable.projectId,
    assignedEmail: emailRoutesTable.assignedEmail,
    isActive: emailRoutesTable.isActive,
    createdAt: emailRoutesTable.createdAt,
    projectName: projectsTable.name,
    projectColor: projectsTable.color,
    projectTag: projectsTable.tag,
  })
    .from(emailRoutesTable)
    .leftJoin(projectsTable, eq(emailRoutesTable.projectId, projectsTable.id))
    .orderBy(desc(emailRoutesTable.createdAt));
  res.json(routes);
});

router.post("/email-routing/routes", async (req, res): Promise<void> => {
  const { projectId, assignedEmail } = req.body;
  if (!projectId || !assignedEmail) {
    res.status(400).json({ error: "projectId and assignedEmail are required" });
    return;
  }
  const normalizedEmail = assignedEmail.trim().toLowerCase();
  const existing = await db.select().from(emailRoutesTable)
    .where(eq(emailRoutesTable.assignedEmail, normalizedEmail));
  if (existing.length > 0) {
    res.status(409).json({ error: "This email address is already routed to a project" });
    return;
  }
  const [route] = await db.insert(emailRoutesTable).values({
    projectId,
    assignedEmail: normalizedEmail,
  }).returning();
  res.status(201).json(route);
});

router.patch("/email-routing/routes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const updates: any = {};
  if (req.body.assignedEmail !== undefined) updates.assignedEmail = req.body.assignedEmail;
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  if (req.body.projectId !== undefined) updates.projectId = req.body.projectId;
  const [route] = await db.update(emailRoutesTable).set(updates)
    .where(eq(emailRoutesTable.id, id)).returning();
  res.json(route);
});

router.delete("/email-routing/routes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(emailRoutesTable).where(eq(emailRoutesTable.id, id));
  res.json({ success: true });
});

function extractProjectTag(subject: string): string | null {
  const match = subject.match(/\[([A-Z0-9_-]+)\]/);
  return match ? match[1] : null;
}

async function matchProjectByEmail(toAddress: string): Promise<number | null> {
  const [route] = await db.select().from(emailRoutesTable)
    .where(and(
      eq(emailRoutesTable.assignedEmail, toAddress.toLowerCase()),
      eq(emailRoutesTable.isActive, true)
    ));
  return route?.projectId || null;
}

async function matchProjectByTag(tag: string): Promise<number | null> {
  const [project] = await db.select().from(projectsTable)
    .where(ilike(projectsTable.tag, tag));
  return project?.id || null;
}

router.get("/email-routing/logs", async (req, res): Promise<void> => {
  const projectId = req.query.projectId as string | undefined;
  const direction = req.query.direction as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  const conditions = [];
  if (projectId) conditions.push(eq(emailLogsTable.projectId, parseInt(projectId)));
  if (direction) conditions.push(eq(emailLogsTable.direction, direction));
  if (search) {
    conditions.push(or(
      ilike(emailLogsTable.subject, `%${search}%`),
      ilike(emailLogsTable.fromAddress, `%${search}%`),
      ilike(emailLogsTable.toAddress, `%${search}%`)
    )!);
  }

  const logs = conditions.length > 0
    ? await db.select().from(emailLogsTable).where(and(...conditions)).orderBy(desc(emailLogsTable.createdAt)).limit(limit)
    : await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.createdAt)).limit(limit);

  res.json(logs);
});

router.get("/email-routing/logs/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [log] = await db.select().from(emailLogsTable).where(eq(emailLogsTable.id, id));
  if (!log) { res.status(404).json({ error: "Email log not found" }); return; }
  res.json(log);
});

router.post("/email-routing/send-to-project", async (req, res): Promise<void> => {
  const { projectId, fromAddress, toAddress, subject, bodyText, bodyHtml } = req.body;
  if (!projectId || !subject) {
    res.status(400).json({ error: "projectId and subject are required" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, parseInt(projectId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [log] = await db.insert(emailLogsTable).values({
    projectId: parseInt(projectId),
    fromAddress: fromAddress || "system@projectos.local",
    toAddress: toAddress || "",
    subject,
    bodyText: bodyText || "",
    bodyHtml: bodyHtml || "",
    provider: "internal",
    direction: "outbound",
  }).returning();

  res.status(201).json(log);
});

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

router.post("/email-routing/inbound", async (req, res): Promise<void> => {
  const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = req.headers["x-webhook-secret"] as string;
    if (provided !== webhookSecret) {
      res.status(403).json({ error: "Invalid webhook secret" });
      return;
    }
  }

  const { from, to, subject, text: bodyText, html: bodyHtml, headers, attachments } = req.body;

  if (!from || !subject) {
    res.status(400).json({ error: "from and subject are required" });
    return;
  }

  let projectId: number | null = null;

  const tag = extractProjectTag(subject);
  if (tag) {
    projectId = await matchProjectByTag(tag);
  }

  if (!projectId && to) {
    projectId = await matchProjectByEmail(extractEmailAddress(to));
  }

  const [log] = await db.insert(emailLogsTable).values({
    projectId,
    fromAddress: extractEmailAddress(from),
    toAddress: to ? extractEmailAddress(to) : "",
    subject,
    bodyText: bodyText || "",
    bodyHtml: bodyHtml || "",
    provider: "postal",
    direction: "inbound",
    rawHeaders: headers || null,
    attachments: attachments || null,
  }).returning();

  res.json({ success: true, log, projectMatched: !!projectId });
});

router.get("/email-routing/stats", async (_req, res): Promise<void> => {
  const totalRoutes = await db.select({ count: sql<number>`count(*)` }).from(emailRoutesTable);
  const activeRoutes = await db.select({ count: sql<number>`count(*)` }).from(emailRoutesTable)
    .where(eq(emailRoutesTable.isActive, true));
  const totalLogs = await db.select({ count: sql<number>`count(*)` }).from(emailLogsTable);
  const inboundLogs = await db.select({ count: sql<number>`count(*)` }).from(emailLogsTable)
    .where(eq(emailLogsTable.direction, "inbound"));
  const outboundLogs = await db.select({ count: sql<number>`count(*)` }).from(emailLogsTable)
    .where(eq(emailLogsTable.direction, "outbound"));

  res.json({
    totalRoutes: Number(totalRoutes[0]?.count || 0),
    activeRoutes: Number(activeRoutes[0]?.count || 0),
    totalEmails: Number(totalLogs[0]?.count || 0),
    inbound: Number(inboundLogs[0]?.count || 0),
    outbound: Number(outboundLogs[0]?.count || 0),
  });
});

export default router;
