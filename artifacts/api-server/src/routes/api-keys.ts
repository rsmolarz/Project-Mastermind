import { Router, type IRouter } from "express";
import { db, apiKeysTable, emailConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

function generateApiKey(): { key: string; prefix: string } {
  const prefix = "pos_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  return { key: `${prefix}_${secret}`, prefix };
}

router.get("/api-keys", async (_req, res): Promise<void> => {
  const keys = await db.select().from(apiKeysTable).orderBy(apiKeysTable.createdAt);
  const masked = keys.map(k => ({
    ...k,
    key: k.prefix + "_" + "•".repeat(16),
  }));
  res.json(masked);
});

router.post("/api-keys", async (req, res): Promise<void> => {
  try {
    const { name, scopes, expiresAt } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const validScopes = ["read", "write", "tasks", "projects", "members", "sprints", "time", "admin"];
    const filteredScopes = Array.isArray(scopes) ? scopes.filter((s: string) => validScopes.includes(s)) : ["read"];
    const { key, prefix } = generateApiKey();
    const [created] = await db.insert(apiKeysTable).values({
      name: name.trim().substring(0, 100),
      key,
      prefix,
      scopes: filteredScopes.length > 0 ? filteredScopes : ["read"],
      active: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.json({ ...created, key });
  } catch (err) {
    res.status(500).json({ error: "Failed to create API key" });
  }
});

router.patch("/api-keys/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { active, name, scopes } = req.body;
    const updates: Record<string, any> = {};
    if (typeof active === "boolean") updates.active = active;
    if (name && typeof name === "string") updates.name = name.trim().substring(0, 100);
    if (Array.isArray(scopes)) updates.scopes = scopes;

    const [updated] = await db.update(apiKeysTable).set(updates).where(eq(apiKeysTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "API key not found" });
      return;
    }
    res.json({ ...updated, key: updated.prefix + "_" + "•".repeat(16) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update API key" });
  }
});

router.delete("/api-keys/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(apiKeysTable).where(eq(apiKeysTable.id, id));
  res.json({ success: true });
});

router.post("/api-keys/:id/regenerate", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { key, prefix } = generateApiKey();
  const [updated] = await db.update(apiKeysTable).set({ key, prefix }).where(eq(apiKeysTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "API key not found" });
    return;
  }
  res.json({ ...updated, key });
});

router.get("/email-config", async (_req, res): Promise<void> => {
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0) {
    const [created] = await db.insert(emailConfigTable).values({}).returning();
    res.json(created);
    return;
  }
  const config = configs[0];
  res.json({ ...config, password: config.password ? "••••••••" : "" });
});

router.put("/email-config", async (req, res): Promise<void> => {
  const { provider, host, port, username, password, fromName, fromEmail, encryption, active, webhookUrl, apiKey } = req.body;
  const configs = await db.select().from(emailConfigTable);

  const values: Record<string, any> = { updatedAt: new Date() };
  if (provider !== undefined) values.provider = provider;
  if (host !== undefined) values.host = host;
  if (port !== undefined) values.port = port;
  if (username !== undefined) values.username = username;
  if (password !== undefined && password !== "••••••••") values.password = password;
  if (fromName !== undefined) values.fromName = fromName;
  if (fromEmail !== undefined) values.fromEmail = fromEmail;
  if (encryption !== undefined) values.encryption = encryption;
  if (typeof active === "boolean") values.active = active;
  if (webhookUrl !== undefined) values.webhookUrl = webhookUrl;
  if (apiKey !== undefined) values.apiKey = apiKey;

  let config;
  if (configs.length === 0) {
    [config] = await db.insert(emailConfigTable).values(values).returning();
  } else {
    [config] = await db.update(emailConfigTable).set(values).where(eq(emailConfigTable.id, configs[0].id)).returning();
  }
  res.json({ ...config, password: config.password ? "••••••••" : "" });
});

router.post("/email-config/test", async (req, res): Promise<void> => {
  const { to } = req.body;
  const configs = await db.select().from(emailConfigTable);
  if (configs.length === 0 || !configs[0].active) {
    res.status(400).json({ error: "Email is not configured or not active" });
    return;
  }
  const config = configs[0];
  if (!config.host && config.provider === "smtp") {
    res.status(400).json({ error: "SMTP host is not configured" });
    return;
  }
  res.json({
    success: true,
    message: `Test email would be sent to ${to || "admin@example.com"} via ${config.provider.toUpperCase()} (${config.host || config.provider})`,
    config: { provider: config.provider, host: config.host, from: `${config.fromName} <${config.fromEmail}>` },
  });
});

export default router;
