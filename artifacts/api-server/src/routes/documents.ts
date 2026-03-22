import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import {
  ListDocumentsQueryParams,
  ListDocumentsResponse,
  CreateDocumentBody,
  GetDocumentParams,
  GetDocumentResponse,
  UpdateDocumentParams,
  UpdateDocumentBody,
  UpdateDocumentResponse,
  DeleteDocumentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents", async (req, res): Promise<void> => {
  const query = ListDocumentsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.projectId) {
    conditions.push(eq(documentsTable.projectId, query.data.projectId));
  }
  const documents = await db.select().from(documentsTable)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(documentsTable.updatedAt));
  res.json(documents);
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [doc] = await db.insert(documentsTable).values({
    title: parsed.data.title,
    icon: parsed.data.icon ?? "📄",
    projectId: parsed.data.projectId ?? null,
    authorId: parsed.data.authorId,
    content: parsed.data.content,
    tags: parsed.data.tags ?? [],
    pinned: parsed.data.pinned ?? false,
    versions: [{ timestamp: new Date().toISOString(), authorId: parsed.data.authorId, label: "Created" }],
  }).returning();
  res.status(201).json(doc);
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, params.data.id));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(doc);
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.content !== undefined) {
    const versions = [...(existing.versions as { timestamp: string; authorId: number; label: string }[]), {
      timestamp: new Date().toISOString(),
      authorId: existing.authorId,
      label: "Updated",
    }];
    updateData.versions = versions;
  }
  const [doc] = await db.update(documentsTable).set(updateData).where(eq(documentsTable.id, params.data.id)).returning();
  res.json(doc);
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id)).returning();
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
