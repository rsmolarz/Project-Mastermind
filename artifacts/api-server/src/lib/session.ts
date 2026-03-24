import { db, securitySessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export async function validateSessionToken(token: string): Promise<boolean> {
  if (!token) return false;
  const sessions = await db.select().from(securitySessionsTable)
    .where(and(eq(securitySessionsTable.token, token), gt(securitySessionsTable.expiresAt, new Date())));
  return sessions.length > 0;
}

export function parseSessionFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === "pos_session") return decodeURIComponent(rest.join("="));
  }
  return null;
}
