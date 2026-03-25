import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, favoritesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/favorites", async (req, res): Promise<void> => {
  const entityType = req.query.entityType as string | undefined;
  const conditions = entityType ? eq(favoritesTable.entityType, entityType) : undefined;
  const favorites = await db.select().from(favoritesTable).where(conditions);
  res.json(favorites);
});

router.post("/favorites", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.body;
  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType and entityId required" });
    return;
  }

  const existing = await db.select().from(favoritesTable)
    .where(and(
      eq(favoritesTable.entityType, entityType),
      eq(favoritesTable.entityId, entityId),
    ));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already favorited" });
    return;
  }

  const [fav] = await db.insert(favoritesTable).values({ entityType, entityId }).returning();
  res.status(201).json(fav);
});

router.delete("/favorites/:entityType/:entityId", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.params;
  await db.delete(favoritesTable).where(
    and(
      eq(favoritesTable.entityType, entityType),
      eq(favoritesTable.entityId, parseInt(entityId)),
    )
  );
  res.json({ success: true });
});

router.get("/favorites/check/:entityType/:entityId", async (req, res): Promise<void> => {
  const { entityType, entityId } = req.params;
  const existing = await db.select().from(favoritesTable)
    .where(and(
      eq(favoritesTable.entityType, entityType),
      eq(favoritesTable.entityId, parseInt(entityId)),
    ));
  res.json({ isFavorited: existing.length > 0 });
});

export default router;
