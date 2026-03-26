import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";
import { db, tasksTable, activityLogTable } from "@workspace/db";
import { runAutomations } from "./automations";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
  ReorderTasksBody,
  ReorderTasksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  const conditions = [isNull(tasksTable.deletedAt)];
  const includeArchived = req.query.includeArchived === "true";
  if (!includeArchived) {
    conditions.push(isNull(tasksTable.archivedAt));
  }
  if (query.success && query.data.projectId) {
    conditions.push(eq(tasksTable.projectId, query.data.projectId));
  }
  if (query.success && query.data.status) {
    conditions.push(eq(tasksTable.status, query.data.status));
  }
  if (query.success && query.data.priority) {
    conditions.push(eq(tasksTable.priority, query.data.priority));
  }
  if (query.success && query.data.assigneeId) {
    conditions.push(sql`${tasksTable.assigneeIds}::jsonb @> ${JSON.stringify([query.data.assigneeId])}::jsonb`);
  }

  const tasks = await db.select().from(tasksTable)
    .where(and(...conditions))
    .orderBy(tasksTable.sortOrder, tasksTable.createdAt);
  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const maxOrder = await db.select({ maxOrder: tasksTable.sortOrder }).from(tasksTable).orderBy(desc(tasksTable.sortOrder)).limit(1);
  const nextOrder = (maxOrder[0]?.maxOrder ?? 0) + 1;

  const [task] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    type: parsed.data.type,
    status: parsed.data.status,
    priority: parsed.data.priority,
    projectId: parsed.data.projectId,
    sprintId: parsed.data.sprintId ?? null,
    assigneeIds: parsed.data.assigneeIds ?? [],
    points: parsed.data.points ?? 3,
    due: parsed.data.due ? new Date(parsed.data.due) : null,
    tags: parsed.data.tags ?? [],
    subtasks: parsed.data.subtasks ?? [],
    notes: parsed.data.notes ?? "",
    sortOrder: nextOrder,
    recurrence: (req.body as any).recurrence || null,
  }).returning();

  await db.insert(activityLogTable).values({
    entityType: "task", entityId: task.id, action: "task_created",
    details: { title: task.title, status: task.status, priority: task.priority },
    actorId: (parsed.data.assigneeIds as number[])?.[0] || 1,
  });

  runAutomations("task_created", { taskId: task.id, projectId: task.projectId, status: task.status, priority: task.priority }).catch(console.error);
  if ((task.assigneeIds as number[])?.length > 0) {
    runAutomations("task_assigned", { taskId: task.id, projectId: task.projectId, assigneeIds: task.assigneeIds }).catch(console.error);
  }

  res.status(201).json(GetTaskResponse.parse(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.projectId !== undefined) updateData.projectId = parsed.data.projectId;
  if (parsed.data.sprintId !== undefined) updateData.sprintId = parsed.data.sprintId;
  if (parsed.data.assigneeIds !== undefined) updateData.assigneeIds = parsed.data.assigneeIds;
  if (parsed.data.points !== undefined) updateData.points = parsed.data.points;
  if (parsed.data.due !== undefined) updateData.due = parsed.data.due ? new Date(parsed.data.due) : null;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
  if (parsed.data.subtasks !== undefined) updateData.subtasks = parsed.data.subtasks;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;
  if ((req.body as any).recurrence !== undefined) updateData.recurrence = (req.body as any).recurrence;

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    entityType: "task", entityId: task.id, action: "task_updated",
    details: { fields: Object.keys(updateData) },
    actorId: 1,
  });

  if (updateData.status !== undefined) {
    runAutomations("task_status_changed", { taskId: task.id, projectId: task.projectId, status: task.status, previousStatus: parsed.data.status }).catch(console.error);
    if (task.status === "done") {
      runAutomations("task_completed", { taskId: task.id, projectId: task.projectId }).catch(console.error);
    }
  }
  if (updateData.assigneeIds !== undefined) {
    runAutomations("task_assigned", { taskId: task.id, projectId: task.projectId, assigneeIds: task.assigneeIds }).catch(console.error);
  }

  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const permanent = req.query.permanent === "true";
  if (permanent) {
    const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.sendStatus(204);
    return;
  }
  const [task] = await db.update(tasksTable)
    .set({ deletedAt: new Date() })
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    entityType: "task", entityId: task.id, action: "task_deleted",
    details: { title: task.title },
    actorId: 1,
  });

  res.sendStatus(204);
});

router.post("/tasks/:id/duplicate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [original] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!original) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const maxOrder = await db.select({ maxOrder: tasksTable.sortOrder }).from(tasksTable).orderBy(desc(tasksTable.sortOrder)).limit(1);
  const nextOrder = (maxOrder[0]?.maxOrder ?? 0) + 1;
  const [copy] = await db.insert(tasksTable).values({
    title: `${original.title} (copy)`,
    type: original.type,
    status: "todo",
    priority: original.priority,
    projectId: original.projectId,
    sprintId: original.sprintId,
    assigneeIds: original.assigneeIds,
    points: original.points,
    due: original.due,
    tags: original.tags,
    subtasks: (original.subtasks as any[])?.map((s: any) => ({ ...s, done: false })) || [],
    notes: original.notes,
    sortOrder: nextOrder,
    recurrence: original.recurrence,
  }).returning();

  await db.insert(activityLogTable).values({
    entityType: "task", entityId: copy.id, action: "task_duplicated",
    details: { title: copy.title, originalId: original.id },
    actorId: 1,
  });

  res.status(201).json(copy);
});

router.post("/tasks/bulk", async (req, res): Promise<void> => {
  const { taskIds, action, data } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || !action) {
    res.status(400).json({ error: "taskIds (array) and action are required" });
    return;
  }

  if (action === "delete") {
    await db.delete(tasksTable).where(inArray(tasksTable.id, taskIds));
    res.json({ success: true, affected: taskIds.length });
    return;
  }

  if (action === "update" && data) {
    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.assigneeIds) updateData.assigneeIds = data.assigneeIds;
    if (data.projectId) updateData.projectId = data.projectId;

    await db.update(tasksTable).set(updateData).where(inArray(tasksTable.id, taskIds));
    res.json({ success: true, affected: taskIds.length });
    return;
  }

  res.status(400).json({ error: "Invalid action. Use 'delete' or 'update'" });
});

router.post("/tasks/reorder", async (req, res): Promise<void> => {
  const parsed = ReorderTasksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (let i = 0; i < parsed.data.taskIds.length; i++) {
    await db.update(tasksTable).set({ sortOrder: i, status: parsed.data.status }).where(eq(tasksTable.id, parsed.data.taskIds[i]));
  }
  res.json(ReorderTasksResponse.parse({ success: true }));
});

export default router;
