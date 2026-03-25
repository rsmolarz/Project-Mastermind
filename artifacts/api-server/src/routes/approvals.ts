import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, approvalsTable, tasksTable, membersTable, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/approvals", async (req, res): Promise<void> => {
  const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
  const status = req.query.status as string | undefined;
  const conditions = [];
  if (taskId) conditions.push(eq(approvalsTable.taskId, taskId));
  if (status) conditions.push(eq(approvalsTable.status, status));

  const { and } = await import("drizzle-orm");
  const approvals = await db.select().from(approvalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(approvalsTable.createdAt));

  const memberIds = [...new Set(approvals.flatMap(a => [a.requesterId, a.approverId]))];
  let members: any[] = [];
  if (memberIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    members = await db.select().from(membersTable).where(inArray(membersTable.id, memberIds));
  }

  const taskIds = [...new Set(approvals.map(a => a.taskId))];
  let tasks: any[] = [];
  if (taskIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    tasks = await db.select().from(tasksTable).where(inArray(tasksTable.id, taskIds));
  }

  res.json(approvals.map(a => ({
    ...a,
    requester: members.find(m => m.id === a.requesterId),
    approver: members.find(m => m.id === a.approverId),
    task: tasks.find(t => t.id === a.taskId),
  })));
});

router.post("/approvals", async (req, res): Promise<void> => {
  const { taskId, requesterId, approverId, comment } = req.body;
  if (!taskId || !requesterId || !approverId) {
    res.status(400).json({ error: "taskId, requesterId and approverId required" });
    return;
  }

  const [approval] = await db.insert(approvalsTable).values({
    taskId,
    requesterId,
    approverId,
    comment: comment || "",
  }).returning();

  await db.insert(notificationsTable).values({
    userId: approverId,
    type: "approval_request",
    title: "Approval Requested",
    message: `You have a new approval request for task #${taskId}`,
    metadata: { approvalId: approval.id, taskId },
  });

  res.status(201).json(approval);
});

router.patch("/approvals/:id/respond", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status, responseComment } = req.body;
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    return;
  }

  const [updated] = await db.update(approvalsTable).set({
    status,
    responseComment: responseComment || "",
    respondedAt: new Date(),
  }).where(eq(approvalsTable.id, id)).returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  await db.insert(notificationsTable).values({
    userId: updated.requesterId,
    type: "approval_response",
    title: `Approval ${status === "approved" ? "Approved" : "Rejected"}`,
    message: `Your approval request for task #${updated.taskId} was ${status}`,
    metadata: { approvalId: id, taskId: updated.taskId },
  });

  res.json(updated);
});

router.delete("/approvals/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(approvalsTable).where(eq(approvalsTable.id, id));
  res.json({ success: true });
});

export default router;
