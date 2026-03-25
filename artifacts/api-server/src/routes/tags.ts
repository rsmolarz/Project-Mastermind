import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tagsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/tags", async (_req, res): Promise<void> => {
  const tags = await db.select().from(tagsTable).orderBy(desc(tagsTable.createdAt));
  res.json(tags);
});

router.post("/tags", async (req, res): Promise<void> => {
  const { name, color, category } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [tag] = await db.insert(tagsTable).values({ name, color, category }).returning();
  res.status(201).json(tag);
});

router.patch("/tags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [updated] = await db.update(tagsTable).set(req.body).where(eq(tagsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/tags/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(tagsTable).where(eq(tagsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
