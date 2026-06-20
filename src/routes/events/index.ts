import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { authMiddleware, AuthContext } from "../../middleware/auth";
import { federateEvent } from "../../lib/activitypub";

type Variables = { user: AuthContext };
const events = new Hono<{ Variables: Variables }>();

const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
});

const updateEventSchema = createEventSchema.partial();

events.get("/", async (c) => {
  const scope = c.req.query("scope") || "local";
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit")) || 20, 50);

  const conditions = [eq(schema.events.visibility, "public")];
  if (scope === "local") {
    conditions.push(eq(schema.events.isLocal, true));
  } else if (scope === "federated") {
    conditions.push(eq(schema.events.isLocal, false));
  }
  if (cursor) {
    conditions.push(lt(schema.events.startTime, new Date(cursor)));
  }

  const rows = await db.select()
    .from(schema.events)
    .where(and(...conditions))
    .orderBy(desc(schema.events.startTime))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].startTime.toISOString() : null;

  return c.json({ items, nextCursor });
});

events.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ items: [] });

  const rows = await db.select().from(schema.events)
    .where(and(
      eq(schema.events.visibility, "public"),
      sql`(title ILIKE ${`%${q}%`} OR description ILIKE ${`%${q}%`})`,
    ))
    .orderBy(desc(schema.events.startTime))
    .limit(50);

  return c.json({ items: rows });
});

events.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!event) return c.json({ error: "Event not found" }, 404);

  const [organizer] = await db.select({
    id: schema.users.id,
    displayName: schema.users.displayName,
    avatarUrl: schema.users.avatarUrl,
  }).from(schema.users).where(eq(schema.users.id, event.organizerId)).limit(1);

  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.rsvps)
    .where(and(eq(schema.rsvps.eventId, id), eq(schema.rsvps.status, "yes")));

  return c.json({ event, organizer, attendeeCount: Number(countResult.count) });
});

events.post("/", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const body = await c.req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const [event] = await db.insert(schema.events).values({
    ...parsed.data,
    startTime: new Date(parsed.data.startTime),
    endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
    organizerId: userId,
  }).returning();

  federateEvent(event.id).catch(() => {});

  return c.json({ event }, 201);
});

events.put("/:id", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const id = Number(c.req.param("id"));

  const [existing] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!existing) return c.json({ error: "Event not found" }, 404);
  if (existing.organizerId !== userId) return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.startTime !== undefined) updates.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime !== undefined) updates.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null;
  if (parsed.data.location !== undefined) updates.location = parsed.data.location;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity;
  if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility;

  const [updated] = await db.update(schema.events)
    .set(updates)
    .where(eq(schema.events.id, id))
    .returning();

  return c.json({ event: updated });
});

events.delete("/:id", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const id = Number(c.req.param("id"));

  const [existing] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!existing) return c.json({ error: "Event not found" }, 404);
  if (existing.organizerId !== userId) return c.json({ error: "Forbidden" }, 403);

  await db.delete(schema.events).where(eq(schema.events.id, id));
  return c.json({ message: "Event deleted" });
});

export default events;
