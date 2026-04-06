import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, changelogEntriesTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getMemberId(req: any): number {
  return (req as any).memberId || 1;
}

const validTypes = ["feature", "improvement", "bugfix", "breaking", "security", "performance", "deprecation"];
const validStatuses = ["draft", "published", "archived"];

router.get("/changelog", async (_req, res): Promise<void> => {
  try {
    const entries = await db.select().from(changelogEntriesTable).orderBy(desc(changelogEntriesTable.createdAt));
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch changelog" });
  }
});

router.get("/changelog/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [entry] = await db.select().from(changelogEntriesTable).where(eq(changelogEntriesTable.id, id));
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

router.post("/changelog", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  try {
    const { title, description, version, type, projectId, tags, relatedTaskIds, status } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "title is required" }); return;
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      res.status(400).json({ error: "description is required" }); return;
    }
    if (type && !validTypes.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` }); return;
    }
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` }); return;
    }
    const isPublished = status === "published";
    const [entry] = await db.insert(changelogEntriesTable).values({
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 10000),
      version: typeof version === "string" ? version.substring(0, 50) : undefined,
      type: type || "improvement",
      status: status || "draft",
      projectId: typeof projectId === "number" ? projectId : undefined,
      authorId: memberId,
      tags: Array.isArray(tags) ? tags.slice(0, 20).map((t: any) => String(t).substring(0, 50)) : [],
      relatedTaskIds: Array.isArray(relatedTaskIds) ? relatedTaskIds.filter((id: any) => typeof id === "number") : [],
      publishedAt: isPublished ? new Date() : undefined,
    }).returning();
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create entry" });
  }
});

router.patch("/changelog/:id", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [existing] = await db.select().from(changelogEntriesTable).where(eq(changelogEntriesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.authorId !== memberId) { res.status(403).json({ error: "Only the author can edit this entry" }); return; }
    const updates: any = {};
    const { title, description, version, type, status, tags, relatedTaskIds, projectId } = req.body;
    if (title !== undefined) updates.title = typeof title === "string" ? title.trim().substring(0, 200) : undefined;
    if (description !== undefined) updates.description = typeof description === "string" ? description.trim().substring(0, 10000) : undefined;
    if (version !== undefined) updates.version = typeof version === "string" ? version.substring(0, 50) : null;
    if (type !== undefined) {
      if (!validTypes.includes(type)) { res.status(400).json({ error: "Invalid type" }); return; }
      updates.type = type;
    }
    if (status !== undefined) {
      if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
      updates.status = status;
      if (status === "published") updates.publishedAt = new Date();
    }
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.slice(0, 20).map((t: any) => String(t).substring(0, 50)) : [];
    if (relatedTaskIds !== undefined) updates.relatedTaskIds = Array.isArray(relatedTaskIds) ? relatedTaskIds.filter((id: any) => typeof id === "number" && Number.isFinite(id)).slice(0, 50) : [];
    if (projectId !== undefined) updates.projectId = typeof projectId === "number" ? projectId : null;

    const [entry] = await db.update(changelogEntriesTable).set(updates).where(eq(changelogEntriesTable.id, id)).returning();
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

router.delete("/changelog/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  const memberId = getMemberId(req);
  try {
    const [existing] = await db.select().from(changelogEntriesTable).where(eq(changelogEntriesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.authorId !== memberId) { res.status(403).json({ error: "Only the author can delete this entry" }); return; }
    await db.delete(changelogEntriesTable).where(eq(changelogEntriesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
