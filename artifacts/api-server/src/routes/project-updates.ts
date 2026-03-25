import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectUpdatesTable, membersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/project-updates", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
  const conditions = projectId ? eq(projectUpdatesTable.projectId, projectId) : undefined;
  const updates = await db.select().from(projectUpdatesTable).where(conditions).orderBy(desc(projectUpdatesTable.createdAt));

  const authorIds = [...new Set(updates.map(u => u.authorId))];
  let authors: any[] = [];
  if (authorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    authors = await db.select().from(membersTable).where(inArray(membersTable.id, authorIds));
  }

  res.json(updates.map(u => ({
    ...u,
    author: authors.find(a => a.id === u.authorId),
  })));
});

router.post("/project-updates", async (req, res): Promise<void> => {
  const { projectId, authorId, status, title, content, highlights, blockers, nextSteps } = req.body;
  if (!projectId || !authorId || !title) {
    res.status(400).json({ error: "projectId, authorId and title required" });
    return;
  }
  const [update] = await db.insert(projectUpdatesTable).values({
    projectId,
    authorId,
    status: status || "on_track",
    title,
    content: content || "",
    highlights: highlights || [],
    blockers: blockers || [],
    nextSteps: nextSteps || [],
  }).returning();
  res.status(201).json(update);
});

router.patch("/project-updates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const updates: any = {};
  for (const key of ["status", "title", "content", "highlights", "blockers", "nextSteps", "reactions"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(projectUpdatesTable).set(updates).where(eq(projectUpdatesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/project-updates/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(projectUpdatesTable).where(eq(projectUpdatesTable.id, id));
  res.json({ success: true });
});

export default router;
