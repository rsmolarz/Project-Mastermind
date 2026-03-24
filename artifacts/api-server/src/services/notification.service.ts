import { db, notificationsTable } from "@workspace/db";
import { broadcastToUser } from "../websocket";

export async function createInAppNotification(
  userId: number,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const [notification] = await db
    .insert(notificationsTable)
    .values({
      userId,
      type: "reminder",
      title,
      message,
      metadata: metadata || null,
    })
    .returning();

  broadcastToUser(userId, { type: "notification", notification });

  return notification;
}
