import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signToken } from "../../lib/jwt";
import { authMiddleware, AuthContext } from "../../middleware/auth";

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
  const body = await c.req.json();
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
  return c.json({ user: { id: user.id, email: user.email, displayName: user.displayName }, token }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
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

export default auth;
