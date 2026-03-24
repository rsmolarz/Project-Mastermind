import { Router, type IRouter } from "express";
import { db, virtualCardsTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import * as privacy from "../../services/privacy.service";

const router: IRouter = Router();

router.get("/finance/virtual-cards", async (_req, res): Promise<void> => {
  const cards = await db.select().from(virtualCardsTable).orderBy(desc(virtualCardsTable.createdAt));
  res.json(cards);
});

router.get("/finance/virtual-cards/privacy", async (req, res): Promise<void> => {
  if (!privacy.isPrivacyConfigured()) {
    res.status(503).json({ error: "Privacy.com not configured" });
    return;
  }
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await privacy.listCards({ page, page_size: 50 });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/virtual-cards", async (req, res): Promise<void> => {
  if (!privacy.isPrivacyConfigured()) {
    res.status(503).json({ error: "Privacy.com not configured" });
    return;
  }
  try {
    const { memo, spendLimit, spendLimitDuration, type } = req.body;
    const card = await privacy.createCard({
      memo: memo || undefined,
      spend_limit: spendLimit ? Number(spendLimit) * 100 : undefined,
      spend_limit_duration: spendLimitDuration || undefined,
      type: type || "SINGLE_USE",
    });

    const [dbCard] = await db.insert(virtualCardsTable).values({
      privacyCardToken: card.token,
      lastFour: card.last_four,
      cardName: memo || null,
      memo: card.memo || null,
      type: card.type,
      state: card.state,
      spendLimit: spendLimit ? String(spendLimit) : null,
      spendLimitDuration: card.spend_limit_duration || null,
      hostname: card.hostname || null,
    }).returning();

    res.status(201).json({
      ...dbCard,
      pan: card.pan,
      cvv: card.cvv,
      expMonth: card.exp_month,
      expYear: card.exp_year,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/finance/virtual-cards/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [card] = await db.select().from(virtualCardsTable).where(eq(virtualCardsTable.id, id));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }
  res.json(card);
});

router.patch("/finance/virtual-cards/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [card] = await db.select().from(virtualCardsTable).where(eq(virtualCardsTable.id, id));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }

  try {
    const updates: any = {};
    if (req.body.state) updates.state = req.body.state;
    if (req.body.memo) updates.memo = req.body.memo;
    if (req.body.spendLimit) updates.spend_limit = Number(req.body.spendLimit) * 100;

    if (privacy.isPrivacyConfigured()) {
      await privacy.updateCard(card.privacyCardToken, updates);
    }

    const dbUpdates: any = { updatedAt: new Date() };
    if (req.body.state) dbUpdates.state = req.body.state;
    if (req.body.memo) dbUpdates.memo = req.body.memo;
    if (req.body.cardName) dbUpdates.cardName = req.body.cardName;
    if (req.body.spendLimit) dbUpdates.spendLimit = String(req.body.spendLimit);

    const [updated] = await db.update(virtualCardsTable).set(dbUpdates)
      .where(eq(virtualCardsTable.id, id)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/virtual-cards/:id/sync-transactions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [card] = await db.select().from(virtualCardsTable).where(eq(virtualCardsTable.id, id));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }

  if (!privacy.isPrivacyConfigured()) {
    res.status(503).json({ error: "Privacy.com not configured" });
    return;
  }

  try {
    const result = await privacy.listTransactions({ card_token: card.privacyCardToken, page_size: 100 });
    let synced = 0;
    let totalSpent = 0;

    for (const ptx of result.data || []) {
      const existing = await db.select().from(transactionsTable)
        .where(eq(transactionsTable.privacyTransactionToken, ptx.token));

      const amount = ptx.settled_amount ?? ptx.amount;
      totalSpent += amount / 100;

      if (existing.length === 0) {
        await db.insert(transactionsTable).values({
          type: "expense",
          category: "virtual_card",
          description: ptx.merchant?.descriptor || "Privacy.com transaction",
          amount: (amount / 100).toFixed(2),
          currency: "USD",
          status: ptx.status.toLowerCase(),
          virtualCardId: card.privacyCardToken,
          privacyTransactionToken: ptx.token,
          metadata: {
            merchant: ptx.merchant,
            card_last_four: ptx.card?.last_four,
            result: ptx.result,
          },
          transactedAt: new Date(ptx.created),
        });
        synced++;
      }
    }

    await db.update(virtualCardsTable).set({
      totalSpent: totalSpent.toFixed(2),
      updatedAt: new Date(),
    }).where(eq(virtualCardsTable.id, id));

    res.json({ synced, totalTransactions: result.data?.length || 0, totalSpent: totalSpent.toFixed(2) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/finance/virtual-cards/:id/transactions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [card] = await db.select().from(virtualCardsTable).where(eq(virtualCardsTable.id, id));
  if (!card) { res.status(404).json({ error: "Card not found" }); return; }

  const transactions = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.virtualCardId, card.privacyCardToken))
    .orderBy(desc(transactionsTable.transactedAt));
  res.json(transactions);
});

export default router;
