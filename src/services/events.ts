import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { federateEvent } from "../lib/activitypub.js";

// Validation schemas live here so both HTTP surfaces (JSON API + HTML pages)
// share one definition and can't drift.
export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventRow = typeof schema.events.$inferSelect;

export type MutationResult =
  | { ok: true; event: EventRow }
  | { ok: false; error: "not_found" | "forbidden" };

export type DeleteResult = { ok: true } | { ok: false; error: "not_found" | "forbidden" };

export async function getEvent(id: number): Promise<EventRow | undefined> {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  return event;
}

export async function createEvent(data: CreateEventInput, organizerId: number): Promise<EventRow> {
  const [event] = await db.insert(schema.events).values({
    ...data,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : null,
    organizerId,
  }).returning();

  // Fire-and-forget federation to followers.
  federateEvent(event.id).catch(() => {});

  return event;
}

export async function updateEvent(
  id: number,
  data: UpdateEventInput,
  userId: number,
): Promise<MutationResult> {
  const existing = await getEvent(id);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.organizerId !== userId) return { ok: false, error: "forbidden" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.startTime !== undefined) updates.startTime = new Date(data.startTime);
  if (data.endTime !== undefined) updates.endTime = data.endTime ? new Date(data.endTime) : null;
  if (data.location !== undefined) updates.location = data.location;
  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
  if (data.capacity !== undefined) updates.capacity = data.capacity;
  if (data.visibility !== undefined) updates.visibility = data.visibility;

  const [updated] = await db.update(schema.events)
    .set(updates)
    .where(eq(schema.events.id, id))
    .returning();

  return { ok: true, event: updated };
}

export async function deleteEvent(id: number, userId: number): Promise<DeleteResult> {
  const existing = await getEvent(id);
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.organizerId !== userId) return { ok: false, error: "forbidden" };

  await db.delete(schema.events).where(eq(schema.events.id, id));
  return { ok: true };
}
