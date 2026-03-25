import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, savedViewsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/saved-views", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const conditions = projectId ? eq(savedViewsTable.projectId, projectId) : undefined;
  const views = await db.select().from(savedViewsTable).where(conditions).orderBy(desc(savedViewsTable.createdAt));
  res.json(views);
});

router.post("/saved-views", async (req, res): Promise<void> => {
  const { name, icon, projectId, viewType, filters, sortBy, sortDirection, columns, isDefault, isShared } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [view] = await db.insert(savedViewsTable).values({
    name,
    icon: icon || "📋",
    projectId: projectId || null,
    viewType: viewType || "list",
    filters: filters || {},
    sortBy: sortBy || null,
    sortDirection: sortDirection || "asc",
    columns: columns || null,
    isDefault: isDefault || false,
    isShared: isShared || false,
  }).returning();
  res.status(201).json(view);
});

router.patch("/saved-views/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const key of ["name", "icon", "viewType", "filters", "sortBy", "sortDirection", "columns", "isDefault", "isShared"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(savedViewsTable).set(updates).where(eq(savedViewsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/saved-views/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(savedViewsTable).where(eq(savedViewsTable.id, id));
  res.json({ success: true });
});

export default router;
