import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, retrospectivesTable, retroItemsTable } from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getMemberId(req: any): number {
  return (req as any).memberId || 1;
}

const validFormats = ["start_stop_continue", "4ls", "mad_sad_glad", "went_well_improve_action", "sailboat", "starfish"];
const validStatuses = ["open", "in_progress", "completed"];

const formatCategories: Record<string, string[]> = {
  start_stop_continue: ["start", "stop", "continue"],
  "4ls": ["liked", "learned", "lacked", "longed_for"],
  mad_sad_glad: ["mad", "sad", "glad"],
  went_well_improve_action: ["went_well", "improve", "action"],
  sailboat: ["wind", "anchor", "rocks", "island"],
  starfish: ["keep_doing", "more_of", "less_of", "stop_doing", "start_doing"],
};

router.get("/retrospectives", async (_req, res): Promise<void> => {
  try {
    const retros = await db.select().from(retrospectivesTable).orderBy(desc(retrospectivesTable.createdAt));
    res.json(retros);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch retrospectives" });
  }
});

router.get("/retrospectives/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [retro] = await db.select().from(retrospectivesTable).where(eq(retrospectivesTable.id, id));
    if (!retro) { res.status(404).json({ error: "Not found" }); return; }
    const items = await db.select().from(retroItemsTable).where(eq(retroItemsTable.retroId, id)).orderBy(desc(retroItemsTable.votes));
    res.json({ ...retro, items });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch retrospective" });
  }
});

router.post("/retrospectives", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  try {
    const { title, sprintId, projectId, format } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "title is required" }); return;
    }
    if (format && !validFormats.includes(format)) {
      res.status(400).json({ error: `format must be one of: ${validFormats.join(", ")}` }); return;
    }
    const [retro] = await db.insert(retrospectivesTable).values({
      title: title.trim().substring(0, 200),
      sprintId: typeof sprintId === "number" ? sprintId : undefined,
      projectId: typeof projectId === "number" ? projectId : undefined,
      format: format || "start_stop_continue",
      facilitatorId: memberId,
    }).returning();
    res.status(201).json(retro);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create retrospective" });
  }
});

router.patch("/retrospectives/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  const memberId = getMemberId(req);
  try {
    const [existing] = await db.select().from(retrospectivesTable).where(eq(retrospectivesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.facilitatorId !== memberId) { res.status(403).json({ error: "Only the facilitator can edit this retrospective" }); return; }
    const updates: any = {};
    const { title, status, summary, actionItems } = req.body;
    if (title !== undefined) updates.title = typeof title === "string" ? title.trim().substring(0, 200) : undefined;
    if (status !== undefined) {
      if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
      updates.status = status;
      if (status === "completed") updates.completedAt = new Date();
    }
    if (summary !== undefined) updates.summary = typeof summary === "string" ? summary.substring(0, 5000) : undefined;
    if (actionItems !== undefined) {
      if (!Array.isArray(actionItems) || actionItems.length > 100) { res.status(400).json({ error: "actionItems must be an array (max 100)" }); return; }
      updates.actionItems = actionItems;
    }
    const [retro] = await db.update(retrospectivesTable).set(updates).where(eq(retrospectivesTable.id, id)).returning();
    res.json(retro);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update retrospective" });
  }
});

router.delete("/retrospectives/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
  const memberId = getMemberId(req);
  try {
    const [existing] = await db.select().from(retrospectivesTable).where(eq(retrospectivesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.facilitatorId !== memberId) { res.status(403).json({ error: "Only the facilitator can delete this retrospective" }); return; }
    await db.delete(retroItemsTable).where(eq(retroItemsTable.retroId, id));
    await db.delete(retrospectivesTable).where(eq(retrospectivesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.post("/retrospectives/:id/items", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  const retroId = parseId(req.params.id);
  if (!retroId) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [retro] = await db.select().from(retrospectivesTable).where(eq(retrospectivesTable.id, retroId));
    if (!retro) { res.status(404).json({ error: "Retrospective not found" }); return; }

    const { category, content } = req.body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "content is required" }); return;
    }
    const validCats = formatCategories[retro.format] || formatCategories.start_stop_continue;
    if (!category || !validCats.includes(category)) {
      res.status(400).json({ error: `category must be one of: ${validCats.join(", ")}` }); return;
    }
    const [item] = await db.insert(retroItemsTable).values({
      retroId,
      memberId,
      category,
      content: content.trim().substring(0, 1000),
    }).returning();
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

router.post("/retrospectives/:id/items/:itemId/vote", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  const retroId = parseId(req.params.id);
  const itemId = parseId(req.params.itemId);
  if (!retroId || !itemId) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    const [item] = await db.select().from(retroItemsTable).where(and(eq(retroItemsTable.id, itemId), eq(retroItemsTable.retroId, retroId)));
    if (!item) { res.status(404).json({ error: "Not found" }); return; }

    const votedBy = (item.votedBy as number[]) || [];
    if (votedBy.includes(memberId)) {
      res.status(400).json({ error: "Already voted" }); return;
    }
    const [updated] = await db.update(retroItemsTable).set({
      votes: item.votes + 1,
      votedBy: [...votedBy, memberId],
    }).where(eq(retroItemsTable.id, itemId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to vote" });
  }
});

router.delete("/retrospectives/:retroId/items/:itemId", async (req, res): Promise<void> => {
  const memberId = getMemberId(req);
  const retroId = parseId(req.params.retroId);
  const itemId = parseId(req.params.itemId);
  if (!retroId || !itemId) { res.status(400).json({ error: "Invalid ID" }); return; }
  try {
    await db.delete(retroItemsTable).where(and(
      eq(retroItemsTable.id, itemId),
      eq(retroItemsTable.retroId, retroId),
      eq(retroItemsTable.memberId, memberId)
    ));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
