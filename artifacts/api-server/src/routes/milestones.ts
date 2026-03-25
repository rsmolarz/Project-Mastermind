import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, milestonesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/milestones", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const conditions = projectId ? eq(milestonesTable.projectId, projectId) : undefined;
  const milestones = await db.select().from(milestonesTable).where(conditions).orderBy(milestonesTable.dueDate);
  res.json(milestones);
});

router.post("/milestones", async (req, res): Promise<void> => {
  const { title, description, projectId, dueDate, status, color } = req.body;
  if (!title || !projectId) {
    res.status(400).json({ error: "title and projectId required" });
    return;
  }
  const [milestone] = await db.insert(milestonesTable).values({
    title,
    description: description || "",
    projectId,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: status || "upcoming",
    color: color || "#6366f1",
  }).returning();
  res.status(201).json(milestone);
});

router.patch("/milestones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const key of ["title", "description", "dueDate", "status", "color"]) {
    if (req.body[key] !== undefined) {
      updates[key] = key === "dueDate" && req.body[key] ? new Date(req.body[key]) : req.body[key];
    }
  }
  if (req.body.status === "completed" && !updates.completedAt) {
    updates.completedAt = new Date();
  }
  const [updated] = await db.update(milestonesTable).set(updates).where(eq(milestonesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/milestones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(milestonesTable).where(eq(milestonesTable.id, id));
  res.json({ success: true });
});

export default router;
