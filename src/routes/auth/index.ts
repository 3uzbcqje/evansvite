import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signToken } from "../../lib/jwt.js";
import { authMiddleware, AuthContext } from "../../middleware/auth.js";

type Variables = { user: AuthContext };
const auth = new Hono<{ Variables: Variables }>();

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
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const { email, password, displayName } = parsed.data;

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: "Email already in use" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName: displayName || email.split("@")[0],
    actorId: `${process.env.INSTANCE_URL || "http://localhost:3000"}/users/${email.split("@")[0]}`,
  }).returning();

  const token = signToken({ userId: user.id, email: user.email });
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
    return c.json({ error: "Validation failed" }, 400);
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = signToken({ userId: user.id, email: user.email });
  if (c.req.header("HX-Request")) {
    return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token }, 200, {
      "HX-Redirect": "/",
    });
  }
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token });
});

auth.post("/logout", (c) => {
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
    return c.json({ error: "Password is required" }, 400);
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 404);

  if (!(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid password" }, 401);
  }

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
