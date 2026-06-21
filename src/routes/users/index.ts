import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { authMiddleware, AuthContext } from "../../middleware/auth.js";

type Variables = { user: AuthContext };
const users = new Hono<{ Variables: Variables }>();

users.get("/:id/profile", async (c) => {
  const id = Number(c.req.param("id"));
  const [user] = await db.select({
    id: schema.users.id,
    displayName: schema.users.displayName,
    bio: schema.users.bio,
    avatarUrl: schema.users.avatarUrl,
    createdAt: schema.users.createdAt,
  }).from(schema.users).where(eq(schema.users.id, id)).limit(1);

  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

users.put("/:id/profile", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const id = Number(c.req.param("id"));
  if (userId !== id) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  const [user] = await db.update(schema.users)
    .set({
      displayName: body.displayName ?? undefined,
      bio: body.bio ?? undefined,
      avatarUrl: body.avatarUrl ?? undefined,
    })
    .where(eq(schema.users.id, id))
    .returning();

  return c.json({ user });
});

export default users;
