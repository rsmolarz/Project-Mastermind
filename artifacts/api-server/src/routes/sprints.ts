import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sprintsTable } from "@workspace/db";
import {
  ListSprintsQueryParams,
  ListSprintsResponse,
  CreateSprintBody,
  UpdateSprintParams,
  UpdateSprintBody,
  UpdateSprintResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sprints", async (req, res): Promise<void> => {
  const query = ListSprintsQueryParams.safeParse(req.query);
  const conditions = [];
  if (query.success && query.data.projectId) {
    conditions.push(eq(sprintsTable.projectId, query.data.projectId));
  }
  const sprints = await db.select().from(sprintsTable)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(sprintsTable.startDate);
  res.json(ListSprintsResponse.parse(sprints));
});

router.post("/sprints", async (req, res): Promise<void> => {
  const parsed = CreateSprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [sprint] = await db.insert(sprintsTable).values({
    name: parsed.data.name,
    projectId: parsed.data.projectId,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    goal: parsed.data.goal,
    status: parsed.data.status ?? "planned",
  }).returning();
  res.status(201).json(UpdateSprintResponse.parse(sprint));
});

router.patch("/sprints/:id", async (req, res): Promise<void> => {
  const params = UpdateSprintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.startDate !== undefined) updateData.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate !== undefined) updateData.endDate = new Date(parsed.data.endDate);
  if (parsed.data.goal !== undefined) updateData.goal = parsed.data.goal;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [sprint] = await db.update(sprintsTable).set(updateData).where(eq(sprintsTable.id, params.data.id)).returning();
  if (!sprint) {
    res.status(404).json({ error: "Sprint not found" });
    return;
  }
  res.json(UpdateSprintResponse.parse(sprint));
});

export default router;
