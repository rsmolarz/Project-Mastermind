import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, activityLogTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/activity", async (req, res): Promise<void> => {
  const entityType = req.query.entityType as string;
  const entityId = parseInt(req.query.entityId as string, 10);

  const conditions = [];
  if (entityType) conditions.push(eq(activityLogTable.entityType, entityType));
  if (!isNaN(entityId)) conditions.push(eq(activityLogTable.entityId, entityId));

  const logs = await db.select().from(activityLogTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(50);
  res.json(logs);
});

router.post("/activity", async (req, res): Promise<void> => {
  const { entityType, entityId, action, details, actorId } = req.body;
  if (!entityType || !entityId || !action || !actorId) {
    res.status(400).json({ error: "entityType, entityId, action, and actorId are required" });
    return;
  }
  const [log] = await db.insert(activityLogTable).values({
    entityType,
    entityId,
    action,
    details: details || {},
    actorId,
  }).returning();
  res.status(201).json(log);
});

export default router;
