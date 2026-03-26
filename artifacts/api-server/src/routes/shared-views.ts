import { Router } from "express";
import { db, sharedViewsTable, projectsTable, tasksTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

router.post("/shared-views", async (req, res) => {
  const { projectId, viewType, filters } = req.body;
  const token = crypto.randomBytes(24).toString("hex");
  const [view] = await db.insert(sharedViewsTable).values({
    token,
    projectId: projectId || null,
    viewType: viewType || "board",
    filters: JSON.stringify(filters || {}),
    createdBy: 1,
    isActive: true,
  }).returning();
  res.json(view);
});

router.get("/shared-views", async (req, res) => {
  const views = await db.select().from(sharedViewsTable).where(eq(sharedViewsTable.isActive, true));
  res.json(views);
});

router.delete("/shared-views/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(sharedViewsTable).set({ isActive: false }).where(eq(sharedViewsTable.id, id));
  res.json({ success: true });
});

router.get("/public/shared-view/:token", async (req, res) => {
  const { token } = req.params;
  const [view] = await db.select().from(sharedViewsTable)
    .where(and(eq(sharedViewsTable.token, token), eq(sharedViewsTable.isActive, true)));
  if (!view) {
    res.status(404).json({ error: "Shared view not found or expired" });
    return;
  }
  if (view.expiresAt && new Date(view.expiresAt) < new Date()) {
    res.status(410).json({ error: "Shared view has expired" });
    return;
  }

  let tasks;
  if (view.projectId) {
    tasks = await db.select().from(tasksTable)
      .where(and(eq(tasksTable.projectId, view.projectId), isNull(tasksTable.deletedAt)));
  } else {
    tasks = await db.select().from(tasksTable).where(isNull(tasksTable.deletedAt));
  }

  let project = null;
  if (view.projectId) {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, view.projectId));
    project = p;
  }

  res.json({ view, tasks, project });
});

export default router;
