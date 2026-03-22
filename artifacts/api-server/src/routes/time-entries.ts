import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, timeEntriesTable } from "@workspace/db";
import {
  ListTimeEntriesQueryParams,
  ListTimeEntriesResponse,
  CreateTimeEntryBody,
  UpdateTimeEntryParams,
  UpdateTimeEntryBody,
  UpdateTimeEntryResponse,
  DeleteTimeEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/time-entries", async (req, res): Promise<void> => {
  const query = ListTimeEntriesQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.projectId) {
    conditions.push(eq(timeEntriesTable.projectId, query.data.projectId));
  }
  if (query.success && query.data.memberId) {
    conditions.push(eq(timeEntriesTable.memberId, query.data.memberId));
  }
  const entries = await db.select().from(timeEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(timeEntriesTable.date));
  res.json(ListTimeEntriesResponse.parse(entries));
});

router.post("/time-entries", async (req, res): Promise<void> => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const amount = parsed.data.hours * parsed.data.rate;
  const [entry] = await db.insert(timeEntriesTable).values({
    memberId: parsed.data.memberId,
    projectId: parsed.data.projectId,
    description: parsed.data.description,
    hours: parsed.data.hours,
    date: new Date(parsed.data.date),
    billable: parsed.data.billable,
    rate: parsed.data.rate,
    amount,
  }).returning();
  res.status(201).json(UpdateTimeEntryResponse.parse(entry));
});

router.patch("/time-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateTimeEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.update(timeEntriesTable).set(parsed.data).where(eq(timeEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }
  res.json(UpdateTimeEntryResponse.parse(entry));
});

router.delete("/time-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteTimeEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Time entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
