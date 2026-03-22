import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, taskTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/task-templates", async (_req, res): Promise<void> => {
  const templates = await db.select().from(taskTemplatesTable).orderBy(desc(taskTemplatesTable.createdAt));
  res.json(templates);
});

router.post("/task-templates", async (req, res): Promise<void> => {
  const { name, description, icon, category, defaultStatus, defaultPriority, defaultPoints, defaultTags, subtaskTemplates, notesTemplate } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [template] = await db.insert(taskTemplatesTable).values({
    name, description: description || "", icon: icon || "📋", category: category || "general",
    defaultStatus: defaultStatus || "todo", defaultPriority: defaultPriority || "medium",
    defaultPoints: defaultPoints || 3, defaultTags: defaultTags || [],
    subtaskTemplates: subtaskTemplates || [], notesTemplate: notesTemplate || "",
  }).returning();
  res.status(201).json(template);
});

router.delete("/task-templates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(taskTemplatesTable).where(eq(taskTemplatesTable.id, id));
  res.sendStatus(204);
});

export default router;
