import { Hono } from "hono";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { authMiddleware, AuthContext } from "../../middleware/auth";

type Variables = { user: AuthContext };
const rsvpRouter = new Hono<{ Variables: Variables }>();

const rsvpSchema = z.object({
  status: z.enum(["yes", "no", "maybe"]),
});

rsvpRouter.post("/:eventId/rsvp", authMiddleware, async (c) => {
  const { userId } = c.var.user;
  const eventId = Number(c.req.param("eventId"));
  const body = await c.req.json();
  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }

  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
  if (!event) return c.json({ error: "Event not found" }, 404);

  if (parsed.data.status === "yes" && event.capacity) {
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.rsvps)
      .where(and(eq(schema.rsvps.eventId, eventId), eq(schema.rsvps.status, "yes")));

    const [existingRsvp] = await db.select()
      .from(schema.rsvps)
      .where(and(eq(schema.rsvps.userId, userId), eq(schema.rsvps.eventId, eventId)))
      .limit(1);

    if (Number(countResult.count) >= event.capacity && (!existingRsvp || existingRsvp.status !== "yes")) {
      return c.json({ error: "Event is at capacity" }, 409);
    }
  }

  const [existing] = await db.select()
    .from(schema.rsvps)
    .where(and(eq(schema.rsvps.userId, userId), eq(schema.rsvps.eventId, eventId)))
    .limit(1);

  let rsvp;
  if (existing) {
    [rsvp] = await db.update(schema.rsvps)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(schema.rsvps.id, existing.id))
      .returning();
  } else {
    [rsvp] = await db.insert(schema.rsvps).values({
      userId,
      eventId,
      status: parsed.data.status,
    }).returning();
  }

  return c.json({ rsvp });
});

rsvpRouter.get("/:eventId/attendees", async (c) => {
  const eventId = Number(c.req.param("eventId"));

  const attendees = await db.select({
    id: schema.users.id,
    displayName: schema.users.displayName,
    avatarUrl: schema.users.avatarUrl,
    status: schema.rsvps.status,
  })
  .from(schema.rsvps)
  .innerJoin(schema.users, eq(schema.rsvps.userId, schema.users.id))
  .where(and(eq(schema.rsvps.eventId, eventId), eq(schema.rsvps.status, "yes")));

  const counts = await db.select({
    status: schema.rsvps.status,
    count: sql<number>`count(*)`,
  })
  .from(schema.rsvps)
  .where(eq(schema.rsvps.eventId, eventId))
  .groupBy(schema.rsvps.status);

  return c.json({ attendees, counts });
});

export default rsvpRouter;
