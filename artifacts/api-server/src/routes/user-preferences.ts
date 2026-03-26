import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/user-preferences", async (_req, res): Promise<void> => {
  let [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, "default")).limit(1);
  if (!prefs) {
    [prefs] = await db.insert(userPreferencesTable).values({ userId: "default" }).returning();
  }
  res.json(prefs);
});

router.put("/user-preferences", async (req, res): Promise<void> => {
  const existing = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, "default")).limit(1);
  if (existing.length === 0) {
    const [created] = await db.insert(userPreferencesTable).values({ userId: "default", ...req.body }).returning();
    res.json(created);
    return;
  }
  const [updated] = await db.update(userPreferencesTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(userPreferencesTable.userId, "default"))
    .returning();
  res.json(updated);
});

export default router;
