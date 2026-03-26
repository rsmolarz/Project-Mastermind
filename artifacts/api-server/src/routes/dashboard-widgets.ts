import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, dashboardWidgetsTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_WIDGETS = [
  { widgetType: "stats", title: "Key Statistics", position: 0, width: 2, height: 1 },
  { widgetType: "ai_briefing", title: "AI Briefing", position: 1, width: 1, height: 1 },
  { widgetType: "attention", title: "Needs Attention", position: 2, width: 1, height: 1 },
  { widgetType: "budgets", title: "Project Budgets", position: 3, width: 1, height: 1 },
  { widgetType: "recent_docs", title: "Recent Documents", position: 4, width: 1, height: 1 },
  { widgetType: "sprints", title: "Active Sprints", position: 5, width: 1, height: 1 },
  { widgetType: "goals", title: "Goals Progress", position: 6, width: 1, height: 1 },
  { widgetType: "countdown", title: "Upcoming Deadlines", position: 7, width: 1, height: 1 },
  { widgetType: "progress_battery", title: "Project Progress", position: 8, width: 1, height: 1 },
  { widgetType: "activity", title: "Recent Activity", position: 9, width: 1, height: 1 },
];

router.get("/dashboard-widgets", async (_req, res): Promise<void> => {
  let widgets = await db.select().from(dashboardWidgetsTable)
    .where(eq(dashboardWidgetsTable.userId, "default"))
    .orderBy(asc(dashboardWidgetsTable.position));
  if (widgets.length === 0) {
    widgets = await db.insert(dashboardWidgetsTable)
      .values(DEFAULT_WIDGETS.map(w => ({ ...w, userId: "default" })))
      .returning();
  }
  res.json(widgets);
});

router.put("/dashboard-widgets", async (req, res): Promise<void> => {
  const { widgets } = req.body;
  if (!Array.isArray(widgets)) {
    res.status(400).json({ error: "widgets array required" });
    return;
  }
  for (const w of widgets) {
    if (w.id) {
      await db.update(dashboardWidgetsTable).set({
        position: w.position, width: w.width, height: w.height,
        visible: w.visible, title: w.title, config: w.config || {},
      }).where(eq(dashboardWidgetsTable.id, w.id));
    }
  }
  const updated = await db.select().from(dashboardWidgetsTable)
    .where(eq(dashboardWidgetsTable.userId, "default"))
    .orderBy(asc(dashboardWidgetsTable.position));
  res.json(updated);
});

router.post("/dashboard-widgets", async (req, res): Promise<void> => {
  const { widgetType, title, position, width, height, config } = req.body;
  const [widget] = await db.insert(dashboardWidgetsTable).values({
    userId: "default", widgetType, title: title || widgetType,
    position: position || 99, width: width || 1, height: height || 1,
    config: config || {},
  }).returning();
  res.status(201).json(widget);
});

router.delete("/dashboard-widgets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(dashboardWidgetsTable).where(eq(dashboardWidgetsTable.id, id));
  res.json({ success: true });
});

export default router;
