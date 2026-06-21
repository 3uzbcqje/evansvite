import { Hono, type Context, type Next } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { authMiddleware, AuthContext } from "../../middleware/auth.js";
import crypto from "crypto";

type Variables = { user: AuthContext };
const admin = new Hono<{ Variables: Variables }>();
admin.use("*", authMiddleware);

async function requireAdmin(c: Context<{ Variables: Variables }>, next: Next) {
  const { userId } = c.var.user as AuthContext;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user?.isAdmin) return c.json({ error: "Admin access required" }, 403);
  await next();
}

admin.get("/config", requireAdmin, async (c) => {
  const configs = await db.select().from(schema.instanceConfig);
  const result: Record<string, unknown> = {};
  for (const cfg of configs) {
    result[cfg.key] = cfg.value;
  }
  return c.json(result);
});

admin.put("/config/:key", requireAdmin, async (c) => {
  const key = c.req.param("key");
  if (!key) return c.json({ error: "Missing config key" }, 400);
  const body = await c.req.json();
  const existing = await db.select()
    .from(schema.instanceConfig)
    .where(eq(schema.instanceConfig.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db.update(schema.instanceConfig)
      .set({ value: body.value })
      .where(eq(schema.instanceConfig.key, key));
  } else {
    await db.insert(schema.instanceConfig).values({ key, value: body.value });
  }

  return c.json({ message: "Config updated" });
});

admin.get("/invite-codes", requireAdmin, async (c) => {
  const codes = await db.select()
    .from(schema.inviteCodes)
    .orderBy(schema.inviteCodes.createdAt);
  return c.json(codes);
});

admin.post("/invite-codes", requireAdmin, async (c) => {
  const { userId } = c.var.user as AuthContext;
  const code = crypto.randomBytes(4).toString("hex");
  await db.insert(schema.inviteCodes).values({ code, createdBy: userId });
  return c.json({ code }, 201);
});

admin.get("/blocked-instances", requireAdmin, async (c) => {
  const blocked = await db.select().from(schema.blockedInstances);
  return c.json(blocked);
});

admin.post("/blocked-instances", requireAdmin, async (c) => {
  const body = await c.req.json();
  const domain = body.domain?.toLowerCase();
  if (!domain) return c.json({ error: "Domain required" }, 400);

  await db.insert(schema.blockedInstances).values({
    domain,
    reason: body.reason || null,
  });

  return c.json({ message: `Blocked ${domain}` }, 201);
});

admin.delete("/blocked-instances/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(schema.blockedInstances).where(eq(schema.blockedInstances.id, id));
  return c.json({ message: "Instance unblocked" });
});

admin.delete("/events/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(schema.events).where(eq(schema.events.id, id));
  return c.json({ message: "Event deleted by admin" });
});

export default admin;
