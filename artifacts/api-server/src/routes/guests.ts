import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, guestsTable } from "@workspace/db";
import * as crypto from "crypto";

const router: IRouter = Router();

router.get("/guests", async (_req, res): Promise<void> => {
  const guests = await db.select().from(guestsTable).orderBy(desc(guestsTable.createdAt));
  res.json(guests);
});

router.post("/guests", async (req, res): Promise<void> => {
  const { name, email, company, role, accessLevel, projectIds } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: "name and email required" });
    return;
  }
  const inviteToken = crypto.randomUUID();
  const [guest] = await db.insert(guestsTable).values({
    name, email, company: company || "", role: role || "viewer",
    accessLevel: accessLevel || "view_only",
    projectIds: projectIds || [],
    inviteToken,
  }).returning();
  res.status(201).json(guest);
});

router.put("/guests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [updated] = await db.update(guestsTable).set(req.body).where(eq(guestsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Guest not found" }); return; }
  res.json(updated);
});

router.delete("/guests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(guestsTable).where(eq(guestsTable.id, id));
  res.json({ success: true });
});

export default router;
