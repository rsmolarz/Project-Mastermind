import { Router, type IRouter } from "express";
import { db, portfoliosTable, portfolioHoldingsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/finance/portfolios", async (_req, res): Promise<void> => {
  const portfolios = await db.select().from(portfoliosTable).orderBy(desc(portfoliosTable.createdAt));
  res.json(portfolios);
});

router.get("/finance/portfolios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, id));
  if (!portfolio) { res.status(404).json({ error: "Portfolio not found" }); return; }
  const holdings = await db.select().from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.portfolioId, id));
  res.json({ ...portfolio, holdings });
});

router.post("/finance/portfolios", async (req, res): Promise<void> => {
  const { name, description, currency } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [portfolio] = await db.insert(portfoliosTable).values({
    name,
    description: description || null,
    currency: currency || "USD",
  }).returning();
  res.status(201).json(portfolio);
});

router.patch("/finance/portfolios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const updates: any = { updatedAt: new Date() };
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.currency !== undefined) updates.currency = req.body.currency;
  const [portfolio] = await db.update(portfoliosTable).set(updates)
    .where(eq(portfoliosTable.id, id)).returning();
  res.json(portfolio);
});

router.delete("/finance/portfolios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(portfoliosTable).where(eq(portfoliosTable.id, id));
  res.json({ success: true });
});

router.get("/finance/portfolios/:id/holdings", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const holdings = await db.select().from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.portfolioId, id));
  res.json(holdings);
});

router.post("/finance/portfolios/:id/holdings", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const { symbol, name, assetType, quantity, avgCost, currentPrice } = req.body;
  if (!symbol || !name || !quantity || !avgCost) {
    res.status(400).json({ error: "symbol, name, quantity, avgCost are required" });
    return;
  }
  const qty = Number(quantity);
  const cost = Number(avgCost);
  const price = Number(currentPrice || avgCost);
  const totalCost = qty * cost;
  const currentValue = qty * price;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

  const [holding] = await db.insert(portfolioHoldingsTable).values({
    portfolioId: id,
    symbol: symbol.toUpperCase(),
    name,
    assetType: assetType || "stock",
    quantity: qty.toFixed(6),
    avgCost: cost.toFixed(2),
    currentPrice: price.toFixed(2),
    totalCost: totalCost.toFixed(2),
    currentValue: currentValue.toFixed(2),
    gainLoss: gainLoss.toFixed(2),
    gainLossPercent: gainLossPercent.toFixed(2),
  }).returning();

  await recalcPortfolio(id);
  res.status(201).json(holding);
});

router.patch("/finance/portfolios/:portfolioId/holdings/:holdingId", async (req, res): Promise<void> => {
  const portfolioId = parseInt(req.params.portfolioId);
  const holdingId = parseInt(req.params.holdingId);
  if (isNaN(portfolioId) || isNaN(holdingId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(portfolioHoldingsTable)
    .where(and(eq(portfolioHoldingsTable.id, holdingId), eq(portfolioHoldingsTable.portfolioId, portfolioId)));
  if (!existing) { res.status(404).json({ error: "Holding not found in this portfolio" }); return; }

  const updates: any = { updatedAt: new Date() };
  const fields = ["symbol", "name", "assetType", "quantity", "avgCost", "currentPrice"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  if (updates.quantity || updates.avgCost || updates.currentPrice) {
    const qty = Number(updates.quantity || existing?.quantity);
    const cost = Number(updates.avgCost || existing?.avgCost);
    const price = Number(updates.currentPrice || existing?.currentPrice || cost);
    updates.quantity = qty.toFixed(6);
    updates.avgCost = cost.toFixed(2);
    updates.currentPrice = price.toFixed(2);
    updates.totalCost = (qty * cost).toFixed(2);
    updates.currentValue = (qty * price).toFixed(2);
    updates.gainLoss = (qty * price - qty * cost).toFixed(2);
    updates.gainLossPercent = (qty * cost > 0 ? ((qty * price - qty * cost) / (qty * cost)) * 100 : 0).toFixed(2);
  }

  const [holding] = await db.update(portfolioHoldingsTable).set(updates)
    .where(eq(portfolioHoldingsTable.id, holdingId)).returning();
  await recalcPortfolio(portfolioId);
  res.json(holding);
});

router.delete("/finance/portfolios/:portfolioId/holdings/:holdingId", async (req, res): Promise<void> => {
  const portfolioId = parseInt(req.params.portfolioId);
  const holdingId = parseInt(req.params.holdingId);
  if (isNaN(portfolioId) || isNaN(holdingId)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [holding] = await db.select().from(portfolioHoldingsTable)
    .where(and(eq(portfolioHoldingsTable.id, holdingId), eq(portfolioHoldingsTable.portfolioId, portfolioId)));
  if (!holding) { res.status(404).json({ error: "Holding not found in this portfolio" }); return; }
  await db.delete(portfolioHoldingsTable).where(eq(portfolioHoldingsTable.id, holdingId));
  await recalcPortfolio(portfolioId);
  res.json({ success: true });
});

async function recalcPortfolio(portfolioId: number) {
  const holdings = await db.select().from(portfolioHoldingsTable)
    .where(eq(portfolioHoldingsTable.portfolioId, portfolioId));
  const totalValue = holdings.reduce((s, h) => s + Number(h.currentValue || 0), 0);
  const totalCost = holdings.reduce((s, h) => s + Number(h.totalCost || 0), 0);
  const gainLoss = totalValue - totalCost;
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
  await db.update(portfoliosTable).set({
    totalValue: totalValue.toFixed(2),
    totalCost: totalCost.toFixed(2),
    gainLoss: gainLoss.toFixed(2),
    gainLossPercent: gainLossPercent.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(portfoliosTable.id, portfolioId));
}

export default router;
