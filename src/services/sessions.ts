import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";

// 7 days, matching the JWT expiry in lib/jwt.ts.
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: number): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.sessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return id;
}

// True if the session exists and has not expired. Expired rows are cleaned up
// opportunistically.
export async function isSessionValid(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId) return false;
  const [session] = await db.select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  if (!session) return false;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId)).catch(() => {});
    return false;
  }
  return true;
}

export async function deleteSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

// Revoke every session for a user (e.g. on password change / "log out everywhere").
export async function deleteUserSessions(userId: number): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
