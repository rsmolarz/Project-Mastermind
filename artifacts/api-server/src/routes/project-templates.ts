import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/project-templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(projectTemplatesTable).orderBy(desc(projectTemplatesTable.createdAt));
  res.json(templates);
});

router.post("/project-templates", async (req, res): Promise<void> => {
  const { name, description, icon, color, category, defaultPhase, defaultTasks, defaultMilestones, defaultTags } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [template] = await db.insert(projectTemplatesTable).values({
    name, description, icon, color, category, defaultPhase,
    defaultTasks: defaultTasks || [],
    defaultMilestones: defaultMilestones || [],
    defaultTags: defaultTags || [],
  }).returning();
  res.status(201).json(template);
});

router.patch("/project-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [updated] = await db.update(projectTemplatesTable).set(req.body).where(eq(projectTemplatesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/project-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(projectTemplatesTable).where(eq(projectTemplatesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
