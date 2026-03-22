import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, customFieldsTable, customFieldValuesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/custom-fields", async (req, res): Promise<void> => {
  const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
  const conditions = projectId ? eq(customFieldsTable.projectId, projectId) : undefined;
  const fields = await db.select().from(customFieldsTable).where(conditions).orderBy(desc(customFieldsTable.createdAt));
  res.json(fields);
});

router.post("/custom-fields", async (req, res): Promise<void> => {
  const { projectId, name, type, options, required } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [field] = await db.insert(customFieldsTable).values({
    projectId: projectId || null, name, type: type || "text",
    options: options || [], required: required || "false",
  }).returning();
  res.status(201).json(field);
});

router.delete("/custom-fields/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(customFieldsTable).where(eq(customFieldsTable.id, id));
  res.sendStatus(204);
});

router.get("/custom-field-values", async (req, res): Promise<void> => {
  const entityType = req.query.entityType as string;
  const entityId = parseInt(req.query.entityId as string, 10);
  if (!entityType || isNaN(entityId)) { res.json([]); return; }
  const values = await db.select().from(customFieldValuesTable)
    .where(and(eq(customFieldValuesTable.entityId, entityId), eq(customFieldValuesTable.entityType, entityType)));
  res.json(values);
});

router.post("/custom-field-values", async (req, res): Promise<void> => {
  const { fieldId, entityType, entityId, value } = req.body;
  if (!fieldId || !entityId) { res.status(400).json({ error: "fieldId and entityId required" }); return; }
  const existing = await db.select().from(customFieldValuesTable)
    .where(eq(customFieldValuesTable.fieldId, fieldId));
  const match = existing.find(e => e.entityId === entityId && e.entityType === (entityType || "task"));
  if (match) {
    const [updated] = await db.update(customFieldValuesTable).set({ value }).where(eq(customFieldValuesTable.id, match.id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(customFieldValuesTable).values({
      fieldId, entityType: entityType || "task", entityId, value: value || "",
    }).returning();
    res.status(201).json(created);
  }
});

export default router;
