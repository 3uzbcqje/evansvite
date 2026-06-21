import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signToken, verifyToken } from "../../lib/jwt.js";
import { authMiddleware, AuthContext, setAuthCookie, clearAuthCookie } from "../../middleware/auth.js";
import { createSession, deleteSession, deleteUserSessions } from "../../services/sessions.js";
import { getCookie } from "hono/cookie";

type Variables = { user: AuthContext };
const auth = new Hono<{ Variables: Variables }>();

function errorResponse(c: Context, message: string, status: ContentfulStatusCode) {
  if (c.req.header("HX-Request")) {
    return c.html(`<p style="color:#e63946;margin:0">${message}</p>`, status);
  }
  return c.json({ error: message }, status);
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

auth.post("/register", async (c) => {
  const body = await c.req.parseBody();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.req.header("HX-Request")
      ? c.html('<p style="color:#e63946;margin:0">Validation failed. Check your inputs.</p>', 400)
      : c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const { email, password, displayName } = parsed.data;

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return errorResponse(c, "Email already in use", 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName: displayName || email.split("@")[0],
    actorId: `${process.env.INSTANCE_URL || "http://localhost:3000"}/users/${email.split("@")[0]}`,
  }).returning();

  const sessionId = await createSession(user.id);
  const token = signToken({ userId: user.id, email: user.email, sessionId });
  setAuthCookie(c, token);
  if (c.req.header("HX-Request")) {
    return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token }, 201, {
      "HX-Redirect": "/login",
    });
  }
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, "Validation failed", 400);
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return errorResponse(c, "Invalid email or password", 401);
  }

  const sessionId = await createSession(user.id);
  const token = signToken({ userId: user.id, email: user.email, sessionId });
  setAuthCookie(c, token);
  if (c.req.header("HX-Request")) {
    return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token }, 200, {
      "HX-Redirect": "/",
    });
  }
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token });
});

// Accept both GET (the plain nav link) and POST. Clears the auth cookie and
// sends browsers home; returns JSON / HX-Redirect for API and htmx callers.
auth.on(["GET", "POST"], "/logout", async (c) => {
  // Revoke the server-side session so the token can't be reused after logout.
  const token = getCookie(c, "token");
  if (token) {
    try {
      await deleteSession(verifyToken(token).sessionId);
    } catch {
      // invalid/expired token — nothing to revoke
    }
  }
  clearAuthCookie(c);
  if (c.req.header("HX-Request")) {
    return c.json({ message: "Logged out" }, 200, { "HX-Redirect": "/" });
  }
  if (c.req.header("Accept")?.includes("text/html")) {
    return c.redirect("/");
  }
  return c.json({ message: "Logged out" });
});

auth.get("/me", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

auth.delete("/account", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const body = await c.req.parseBody();
  const password = body.password as string;
  if (!password) {
    return errorResponse(c, "Password is required", 400);
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return errorResponse(c, "User not found", 404);

  if (!(await verifyPassword(password, user.passwordHash))) {
    return errorResponse(c, "Invalid password", 401);
  }

  await deleteUserSessions(userId);
  await db.delete(schema.rsvps).where(eq(schema.rsvps.userId, userId));
  await db.delete(schema.events).where(eq(schema.events.organizerId, userId));
  await db.update(schema.inviteCodes).set({ usedBy: null }).where(eq(schema.inviteCodes.usedBy, userId));
  await db.delete(schema.inviteCodes).where(eq(schema.inviteCodes.createdBy, userId));
  await db.delete(schema.users).where(eq(schema.users.id, userId));

  if (c.req.header("HX-Request")) {
    return c.json({ message: "Account deleted" }, 200, {
      "HX-Redirect": "/",
    });
  }
  return c.json({ message: "Account deleted" }, 200);
});

export default auth;
