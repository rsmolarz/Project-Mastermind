import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, taskCommentsTable, activityLogTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/task-comments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.query.taskId as string, 10);
  if (isNaN(taskId)) {
    res.status(400).json({ error: "taskId is required" });
    return;
  }
  const comments = await db.select().from(taskCommentsTable)
    .where(eq(taskCommentsTable.taskId, taskId))
    .orderBy(asc(taskCommentsTable.createdAt));
  res.json(comments);
});

router.post("/task-comments", async (req, res): Promise<void> => {
  const { taskId, authorId, content, parentId } = req.body;
  if (!taskId || !authorId || !content) {
    res.status(400).json({ error: "taskId, authorId, and content are required" });
    return;
  }
  const [comment] = await db.insert(taskCommentsTable).values({
    taskId,
    authorId,
    content,
    parentId: parentId || null,
  }).returning();

  await db.insert(activityLogTable).values({
    entityType: "task",
    entityId: taskId,
    action: "comment_added",
    details: { commentId: comment.id, content: content.substring(0, 100) },
    actorId: authorId,
  });

  res.status(201).json(comment);
});

router.delete("/task-comments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(taskCommentsTable).where(eq(taskCommentsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
