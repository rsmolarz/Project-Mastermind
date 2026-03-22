import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import {
  ListGoalsResponse,
  CreateGoalBody,
  UpdateGoalParams,
  UpdateGoalBody,
  UpdateGoalResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

let krIdCounter = 100;

router.get("/goals", async (_req, res): Promise<void> => {
  const goals = await db.select().from(goalsTable).orderBy(goalsTable.id);
  res.json(ListGoalsResponse.parse(goals));
});

router.post("/goals", async (req, res): Promise<void> => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const keyResults = (parsed.data.keyResults ?? []).map(kr => ({
    id: ++krIdCounter,
    title: kr.title,
    progress: kr.progress ?? 0,
    target: kr.target,
    current: kr.current,
    unit: kr.unit,
  }));
  const [goal] = await db.insert(goalsTable).values({
    title: parsed.data.title,
    status: parsed.data.status ?? "on_track",
    progress: parsed.data.progress ?? 0,
    due: new Date(parsed.data.due),
    ownerId: parsed.data.ownerId,
    projectId: parsed.data.projectId ?? null,
    keyResults,
  }).returning();
  res.status(201).json(UpdateGoalResponse.parse(goal));
});

router.patch("/goals/:id", async (req, res): Promise<void> => {
  const params = UpdateGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
  if (parsed.data.due !== undefined) updateData.due = new Date(parsed.data.due);
  if (parsed.data.keyResults !== undefined) {
    updateData.keyResults = parsed.data.keyResults.map(kr => ({
      id: kr.id ?? ++krIdCounter,
      title: kr.title,
      progress: kr.progress ?? 0,
      target: kr.target,
      current: kr.current,
      unit: kr.unit,
    }));
  }
  const [goal] = await db.update(goalsTable).set(updateData).where(eq(goalsTable.id, params.data.id)).returning();
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(UpdateGoalResponse.parse(goal));
});

export default router;
