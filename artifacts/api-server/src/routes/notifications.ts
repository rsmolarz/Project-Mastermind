import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = parseInt(req.query.userId as string, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(notifications);
});

router.post("/notifications", async (req, res): Promise<void> => {
  const { userId, type, title, message, link } = req.body;
  if (!userId || !title) {
    res.status(400).json({ error: "userId and title are required" });
    return;
  }
  const [notification] = await db.insert(notificationsTable).values({
    userId,
    type: type || "info",
    title,
    message: message || "",
    link: link || null,
  }).returning();
  res.status(201).json(notification);
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [notification] = await db.update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, id))
    .returning();
  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json(notification);
});

router.post("/notifications/mark-all-read", async (req, res): Promise<void> => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  await db.update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
  res.json({ success: true });
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(notificationsTable).where(eq(notificationsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
