import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, automationRunsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/automation-runs", async (req, res): Promise<void> => {
  const automationId = req.query.automationId ? parseInt(req.query.automationId as string) : undefined;
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;

  const conditions = automationId ? eq(automationRunsTable.automationId, automationId) : undefined;
  const runs = await db.select().from(automationRunsTable)
    .where(conditions)
    .orderBy(desc(automationRunsTable.createdAt))
    .limit(limit);
  res.json(runs);
});

router.get("/automation-runs/stats", async (req, res): Promise<void> => {
  const allRuns = await db.select().from(automationRunsTable)
    .orderBy(desc(automationRunsTable.createdAt))
    .limit(500);

  const total = allRuns.length;
  const successful = allRuns.filter(r => r.success).length;
  const failed = total - successful;
  const avgDuration = total > 0
    ? Math.round(allRuns.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
    : 0;

  res.json({ total, successful, failed, avgDuration });
});

export default router;
