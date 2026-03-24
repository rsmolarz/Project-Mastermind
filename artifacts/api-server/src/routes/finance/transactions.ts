import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/finance/transactions", async (req, res): Promise<void> => {
  const { type, category, status, from, to, limit } = req.query;
  let results = await db.select().from(transactionsTable)
    .orderBy(desc(transactionsTable.transactedAt));

  if (type) results = results.filter(t => t.type === type);
  if (category) results = results.filter(t => t.category === category);
  if (status) results = results.filter(t => t.status === status);
  if (from) results = results.filter(t => new Date(t.transactedAt) >= new Date(from as string));
  if (to) results = results.filter(t => new Date(t.transactedAt) <= new Date(to as string));
  if (limit) results = results.slice(0, Number(limit));

  res.json(results);
});

router.get("/finance/transactions/summary", async (_req, res): Promise<void> => {
  const all = await db.select().from(transactionsTable);
  const income = all.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = all.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const categories: Record<string, number> = {};
  for (const t of all) {
    const cat = t.category || "uncategorized";
    categories[cat] = (categories[cat] || 0) + Number(t.amount);
  }
  res.json({ totalTransactions: all.length, totalIncome: income, totalExpenses: expense, net: income - expense, byCategory: categories });
});

router.get("/finance/transactions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  res.json(tx);
});

router.post("/finance/transactions", async (req, res): Promise<void> => {
  const { type, category, description, amount, currency, fromAccount, toAccount, reference, status, portfolioId, invoiceId, virtualCardId, privacyTransactionToken, metadata, transactedAt } = req.body;
  if (!type || !description || amount === undefined) {
    res.status(400).json({ error: "type, description, amount are required" });
    return;
  }
  const [tx] = await db.insert(transactionsTable).values({
    type,
    category: category || null,
    description,
    amount: String(amount),
    currency: currency || "USD",
    fromAccount: fromAccount || null,
    toAccount: toAccount || null,
    reference: reference || null,
    status: status || "completed",
    portfolioId: portfolioId || null,
    invoiceId: invoiceId || null,
    virtualCardId: virtualCardId || null,
    privacyTransactionToken: privacyTransactionToken || null,
    metadata: metadata || null,
    transactedAt: transactedAt ? new Date(transactedAt) : new Date(),
  }).returning();
  res.status(201).json(tx);
});

router.patch("/finance/transactions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const updates: any = {};
  const fields = ["type", "category", "description", "amount", "currency", "fromAccount", "toAccount", "reference", "status", "metadata", "transactedAt"];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === "transactedAt") updates[f] = new Date(req.body[f]);
      else if (f === "amount") updates[f] = String(req.body[f]);
      else updates[f] = req.body[f];
    }
  }
  const [tx] = await db.update(transactionsTable).set(updates)
    .where(eq(transactionsTable.id, id)).returning();
  res.json(tx);
});

router.delete("/finance/transactions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.json({ success: true });
});

export default router;
