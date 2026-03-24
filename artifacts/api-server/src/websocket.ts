import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { validateSessionToken, parseSessionFromCookie } from "./lib/session";

const clients = new Map<number, Set<WebSocket>>();

export function initWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/notifications",
  });

  wss.on("connection", async (ws, req) => {
    const sessionToken = parseSessionFromCookie(req.headers.cookie);
    if (!sessionToken) {
      ws.close(1008, "Authentication required");
      return;
    }

    const valid = await validateSessionToken(sessionToken);
    if (!valid) {
      ws.close(1008, "Invalid or expired session");
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get("userId") || "0");

    if (!userId) {
      ws.close(1008, "Missing userId");
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);

    ws.on("close", () => {
      const userSockets = clients.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(userId);
        }
      }
    });

    ws.on("error", () => {
      const userSockets = clients.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(userId);
        }
      }
    });

    ws.send(JSON.stringify({ type: "connected", userId }));
  });

  return wss;
}

export function broadcastToUser(userId: number, data: unknown) {
  const userSockets = clients.get(userId);
  if (!userSockets) return;

  const message = JSON.stringify(data);
  for (const ws of userSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function getConnectedUserCount(): number {
  return clients.size;
}
