import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { verifyHttpSignature, sendActivity, fetchRemoteActor } from "../../lib/activitypub.js";

const activitypub = new Hono();

activitypub.get("/.well-known/webfinger", async (c) => {
  const resource = c.req.query("resource");
  if (!resource) return c.json({ error: "Missing resource parameter" }, 400);

  const match = resource.match(/^acct:(.+)@(.+)$/);
  if (!match) return c.json({ error: "Invalid resource format" }, 400);

  const username = match[1];
  const instanceUrl = process.env.INSTANCE_URL || "http://localhost:3000";

  return c.json({
    subject: resource,
    links: [{
      rel: "self",
      type: "application/activity+json",
      href: `${instanceUrl}/activitypub/actor/${username}`,
    }],
  });
});

activitypub.get("/activitypub/actor/:username", async (c) => {
  const username = c.req.param("username");
  const instanceUrl = process.env.INSTANCE_URL || "http://localhost:3000";

  if (username === "__instance__") {
    return c.json({
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Application",
      id: `${instanceUrl}/activitypub/actor/__instance__`,
      preferredUsername: "instance",
      name: process.env.INSTANCE_NAME || "evansVite",
      inbox: `${instanceUrl}/activitypub/inbox`,
      outbox: `${instanceUrl}/activitypub/outbox`,
      followers: `${instanceUrl}/activitypub/followers`,
      following: `${instanceUrl}/activitypub/following`,
      publicKey: {
        id: `${instanceUrl}/activitypub/actor/__instance__#main-key`,
        owner: `${instanceUrl}/activitypub/actor/__instance__`,
        publicKeyPem: "",
      },
    });
  }

  const actorId = `${instanceUrl}/users/${username}`;
  const [user] = await db.select()
    .from(schema.users)
    .where(eq(schema.users.actorId, actorId))
    .limit(1);

  if (!user) return c.json({ error: "Actor not found" }, 404);

  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Person",
    id: user.actorId,
    preferredUsername: username,
    name: user.displayName,
    summary: user.bio,
    icon: user.avatarUrl ? { type: "Image", url: user.avatarUrl } : undefined,
    inbox: `${instanceUrl}/activitypub/inbox`,
    outbox: `${instanceUrl}/activitypub/outbox`,
    followers: `${user.actorId}/followers`,
    following: `${user.actorId}/following`,
    publicKey: {
      id: `${user.actorId}#main-key`,
      owner: user.actorId,
      publicKeyPem: user.publicKey || "",
    },
  });
});

activitypub.post("/activitypub/inbox", async (c) => {
  const body = await c.req.json();

  const incomingHeaders: Record<string, string> = {};
  for (const [key, value] of c.req.raw.headers.entries()) {
    incomingHeaders[key.toLowerCase()] = value;
  }
  incomingHeaders["path"] = "/activitypub/inbox";

  const { verified, actorId } = await verifyHttpSignature(incomingHeaders, JSON.stringify(body));
  if (!verified) {
    return c.json({ error: "HTTP Signature verification failed" }, 401);
  }

  const { type, actor, object, id: activityId } = body;

  if (type === "Follow") {
    const actorUrl = typeof actor === "string" ? actor : actor.id;
    const actorDoc = await fetchRemoteActor(actorUrl);
    const inboxUrl = actorDoc?.inbox || (typeof actor === "object" ? actor.inbox : undefined) || `${actorUrl}/inbox`;

    const existing = await db.select()
      .from(schema.followers)
      .where(eq(schema.followers.actorId, actorUrl))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.followers)
        .set({ followedBy: true, inboxUrl })
        .where(eq(schema.followers.actorId, actorUrl));
    } else {
      await db.insert(schema.followers).values({
        actorId: actorUrl,
        inboxUrl,
        followedBy: true,
      });
    }

    const instanceUrl = process.env.INSTANCE_URL || "http://localhost:3000";
    const acceptActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Accept",
      id: `${activityId}/accept`,
      actor: `${instanceUrl}/activitypub/actor/__instance__`,
      object: body,
    };

    await sendActivity(inboxUrl, acceptActivity);

    return c.json({ message: "Follow accepted" }, 200);
  }

  if (type === "Create" && object?.type === "Event") {
    const existing = await db.select()
      .from(schema.events)
      .where(eq(schema.events.remoteId, object.id))
      .limit(1);

    if (existing.length === 0) {
      const remoteHost = new URL(object.id).hostname;
      await db.insert(schema.events).values({
        title: object.name || "Untitled Event",
        description: object.summary || "",
        startTime: new Date(object.startTime),
        endTime: object.endTime ? new Date(object.endTime) : null,
        location: object.location?.name || object.location,
        organizerId: 0,
        isLocal: false,
        remoteId: object.id,
        remoteInstance: remoteHost,
        visibility: "public",
      });
    }

    return c.json({ message: "Event received" }, 200);
  }

  if (type === "Update" && object?.type === "Event") {
    await db.update(schema.events)
      .set({
        title: object.name,
        description: object.summary,
        startTime: new Date(object.startTime),
        endTime: object.endTime ? new Date(object.endTime) : null,
      })
      .where(eq(schema.events.remoteId, object.id));

    return c.json({ message: "Event updated" }, 200);
  }

  if (type === "Delete" && object?.type === "Event") {
    await db.delete(schema.events)
      .where(eq(schema.events.remoteId, typeof object === "object" ? object.id : object));

    return c.json({ message: "Event deleted" }, 200);
  }

  if (type === "Undo" && object?.type === "Follow") {
    const actorUrl = typeof object.actor === "string" ? object.actor : object.actor?.id;
    if (actorUrl) {
      await db.update(schema.followers)
        .set({ followedBy: false })
        .where(eq(schema.followers.actorId, actorUrl));
    }
    return c.json({ message: "Follow undone" }, 200);
  }

  return c.json({ error: "Unknown activity type" }, 202);
});

activitypub.get("/activitypub/outbox", async (c) => {
  const events = await db.select()
    .from(schema.events)
    .where(eq(schema.events.isLocal, true))
    .orderBy(desc(schema.events.createdAt))
    .limit(20);

  const instanceUrl = process.env.INSTANCE_URL || "http://localhost:3000";
  const items = events.map((ev) => ({
    type: "Create",
    actor: `${instanceUrl}/activitypub/actor/__instance__`,
    object: {
      type: "Event",
      id: `${instanceUrl}/events/${ev.id}`,
      name: ev.title,
      summary: ev.description,
      startTime: ev.startTime.toISOString(),
      endTime: ev.endTime?.toISOString(),
      location: ev.location,
      attributedTo: `${instanceUrl}/activitypub/actor/__instance__`,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
    },
  }));

  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    totalItems: items.length,
    orderedItems: items,
  });
});

activitypub.get("/activitypub/followers", async (c) => {
  const followers = await db.select()
    .from(schema.followers)
    .where(eq(schema.followers.followedBy, true));

  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Collection",
    totalItems: followers.length,
    items: followers.map((f) => f.actorId),
  });
});

activitypub.get("/activitypub/following", async (c) => {
  const following = await db.select()
    .from(schema.followers)
    .where(eq(schema.followers.following, true));

  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Collection",
    totalItems: following.length,
    items: following.map((f) => f.actorId),
  });
});

export default activitypub;
