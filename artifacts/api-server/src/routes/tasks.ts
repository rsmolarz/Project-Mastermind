import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
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
  const conditions = [];
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
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
  }).returning();
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

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
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
