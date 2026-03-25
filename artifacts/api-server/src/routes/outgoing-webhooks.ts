import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, webhooksTable } from "@workspace/db";

const router: IRouter = Router();

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "metadata.google", "169.254.169.254"];
    for (const b of blocked) { if (hostname === b || hostname.startsWith(b)) return false; }
    return true;
  } catch { return false; }
}

function maskSecret(secret: string | null): string | null {
  if (!secret) return null;
  if (secret.length <= 4) return "****";
  return secret.slice(0, 4) + "****" + secret.slice(-2);
}

router.get("/webhooks", async (_req, res): Promise<void> => {
  const hooks = await db.select().from(webhooksTable).orderBy(desc(webhooksTable.createdAt));
  res.json(hooks.map(h => ({ ...h, secret: maskSecret(h.secret) })));
});

router.post("/webhooks", async (req, res): Promise<void> => {
  const { name, url, secret, events, active } = req.body;
  if (!name || !url) { res.status(400).json({ error: "name and url are required" }); return; }
  if (!isValidWebhookUrl(url)) { res.status(400).json({ error: "URL must be HTTPS and cannot target internal/private networks" }); return; }
  const [hook] = await db.insert(webhooksTable).values({
    name, url, secret, events: events || [], active: active !== false,
  }).returning();
  res.status(201).json({ ...hook, secret: maskSecret(hook.secret) });
});

router.patch("/webhooks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (req.body.url && !isValidWebhookUrl(req.body.url)) { res.status(400).json({ error: "URL must be HTTPS and cannot target internal/private networks" }); return; }
  const [updated] = await db.update(webhooksTable).set(req.body).where(eq(webhooksTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, secret: maskSecret(updated.secret) });
});

router.delete("/webhooks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(webhooksTable).where(eq(webhooksTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

router.post("/webhooks/:id/test", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [hook] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id));
  if (!hook) { res.status(404).json({ error: "Not found" }); return; }
  if (!isValidWebhookUrl(hook.url)) { res.status(400).json({ error: "Webhook URL is invalid or targets a blocked network" }); return; }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(hook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(hook.secret ? { "X-Webhook-Secret": hook.secret } : {}) },
      body: JSON.stringify({ event: "test", timestamp: new Date().toISOString(), data: { message: "Test webhook from ProjectOS" } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    await db.update(webhooksTable).set({ lastTriggeredAt: new Date(), lastStatus: response.status }).where(eq(webhooksTable.id, id));
    res.json({ status: response.status, success: response.ok });
  } catch (err: any) {
    await db.update(webhooksTable).set({ failCount: hook.failCount + 1, lastTriggeredAt: new Date(), lastStatus: 0 }).where(eq(webhooksTable.id, id));
    res.json({ status: 0, success: false, error: err.message });
  }
});

export default router;
