import { Hono } from "hono";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { authMiddleware, AuthContext } from "../../middleware/auth.js";
import {
  createEventSchema,
  updateEventSchema,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../../services/events.js";

type Variables = { user: AuthContext };
const events = new Hono<{ Variables: Variables }>();

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

  const event = await createEvent(parsed.data, userId);
  return c.json({ event }, 201);
});

events.put("/:id", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const id = Number(c.req.param("id"));

  const body = await c.req.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const result = await updateEvent(id, parsed.data, userId);
  if (!result.ok) {
    return result.error === "not_found"
      ? c.json({ error: "Event not found" }, 404)
      : c.json({ error: "Forbidden" }, 403);
  }

  return c.json({ event: result.event });
});

events.delete("/:id", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const id = Number(c.req.param("id"));

  const result = await deleteEvent(id, userId);
  if (!result.ok) {
    return result.error === "not_found"
      ? c.json({ error: "Event not found" }, 404)
      : c.json({ error: "Forbidden" }, 403);
  }

  return c.json({ message: "Event deleted" });
});

export default events;
