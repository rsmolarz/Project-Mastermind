import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import {
  ListAnnouncementsQueryParams,
  ListAnnouncementsResponse,
  CreateAnnouncementBody,
  UpdateAnnouncementParams,
  UpdateAnnouncementBody,
  UpdateAnnouncementResponse,
  ReactToAnnouncementParams,
  ReactToAnnouncementBody,
  ReactToAnnouncementResponse,
  CommentOnAnnouncementParams,
  CommentOnAnnouncementBody,
  CommentOnAnnouncementResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/announcements", async (req, res): Promise<void> => {
  const query = ListAnnouncementsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.projectId) {
    conditions.push(eq(announcementsTable.projectId, query.data.projectId));
  }
  const announcements = await db.select().from(announcementsTable)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(announcementsTable.createdAt));
  res.json(announcements);
});

router.post("/announcements", async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [announcement] = await db.insert(announcementsTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
    authorId: parsed.data.authorId,
    projectId: parsed.data.projectId ?? null,
    pinned: parsed.data.pinned ?? false,
    reactions: {},
    comments: [],
  }).returning();
  res.status(201).json(announcement);
});

router.patch("/announcements/:id", async (req, res): Promise<void> => {
  const params = UpdateAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [announcement] = await db.update(announcementsTable).set(parsed.data).where(eq(announcementsTable.id, params.data.id)).returning();
  if (!announcement) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  res.json(announcement);
});

router.post("/announcements/:id/react", async (req, res): Promise<void> => {
  const params = ReactToAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReactToAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  const reactions = { ...(existing.reactions as Record<string, number>) };
  reactions[parsed.data.emoji] = (reactions[parsed.data.emoji] || 0) + 1;
  const [announcement] = await db.update(announcementsTable).set({ reactions }).where(eq(announcementsTable.id, params.data.id)).returning();
  res.json(announcement);
});

router.post("/announcements/:id/comments", async (req, res): Promise<void> => {
  const params = CommentOnAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CommentOnAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  const comments = [...(existing.comments as { authorId: number; text: string; timestamp: string }[]), {
    authorId: parsed.data.authorId,
    text: parsed.data.text,
    timestamp: new Date().toISOString(),
  }];
  const [announcement] = await db.update(announcementsTable).set({ comments }).where(eq(announcementsTable.id, params.data.id)).returning();
  res.json(announcement);
});

export default router;
