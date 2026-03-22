import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/expenses", async (req, res): Promise<void> => {
  const expenses = await db.select().from(expensesTable).orderBy(desc(expensesTable.date));
  res.json(expenses);
});

router.post("/expenses", async (req, res): Promise<void> => {
  const { projectId, memberId, category, description, amount, date, receipt } = req.body;
  if (!projectId || !memberId || !description || !amount) {
    res.status(400).json({ error: "projectId, memberId, description, and amount are required" });
    return;
  }
  const [expense] = await db.insert(expensesTable).values({
    projectId, memberId, category: category || "general", description,
    amount: amount.toString(), date: date ? new Date(date) : new Date(), receipt: receipt || null,
  }).returning();
  res.status(201).json(expense);
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const updateData: Record<string, unknown> = {};
  if (req.body.approved !== undefined) updateData.approved = req.body.approved;
  if (req.body.category) updateData.category = req.body.category;
  if (req.body.description) updateData.description = req.body.description;
  if (req.body.amount) updateData.amount = req.body.amount.toString();
  const [expense] = await db.update(expensesTable).set(updateData).where(eq(expensesTable.id, id)).returning();
  if (!expense) { res.status(404).json({ error: "Not found" }); return; }
  res.json(expense);
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.sendStatus(204);
});

export default router;
