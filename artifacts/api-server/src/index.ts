import http from "http";
import cron from "node-cron";
import app from "./app";
import { logger } from "./lib/logger";
import { initWebSocket } from "./websocket";
import { syncProjectEmails } from "./routes/fastmail";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

initWebSocket(server);
logger.info("WebSocket server initialized at /ws/notifications");

cron.schedule("*/5 * * * *", async () => {
  try {
    const result = await syncProjectEmails();
    if (result.synced > 0) {
      logger.info({ synced: result.synced, details: result.details }, "Auto-sync: routed emails to projects");
    }
  } catch (e: any) {
    logger.error({ error: e.message }, "Auto-sync failed");
  }
});
logger.info("Email auto-sync scheduled: every 5 minutes");

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
