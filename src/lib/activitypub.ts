import crypto from "crypto";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

const INSTANCE_URL = () => process.env.INSTANCE_URL || "http://localhost:3000";

interface SignatureParts {
  keyId: string;
  algorithm: string;
  headers: string;
  signature: string;
}

function parseSignatureHeader(sigHeader: string): SignatureParts | null {
  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(",")) {
    const match = part.trim().match(/^(\w+)="([^"]*)"$/);
    if (match) {
      parts[match[1]] = match[2];
    }
  }
  if (!parts.keyId || !parts.algorithm || !parts.headers || !parts.signature) return null;
  return {
    keyId: parts.keyId,
    algorithm: parts.algorithm,
    headers: parts.headers,
    signature: parts.signature,
  };
}

function buildSignedString(headers: string[], incomingHeaders: Record<string, string>): string {
  return headers.map((h) => {
    const lower = h.toLowerCase();
    const value = incomingHeaders[lower] || "";
    return `${lower}: ${value}`;
  }).join("\n");
}

export async function verifyHttpSignature(
  incomingHeaders: Record<string, string>,
  body: string,
): Promise<{ verified: boolean; actorId?: string }> {
  const sigHeader = incomingHeaders["signature"];
  if (!sigHeader) return { verified: false };

  const parsed = parseSignatureHeader(sigHeader);
  if (!parsed) return { verified: false };

  const headersList = parsed.headers.split(" ");
  const signedString = buildSignedString(headersList, {
    ...incomingHeaders,
    "(request-target)": `post ${incomingHeaders["path"] || "/activitypub/inbox"}`,
  });

  let actorDoc: any;
  try {
    const response = await fetch(parsed.keyId, {
      headers: { Accept: "application/activity+json" },
    });
    actorDoc = await response.json();
  } catch {
    return { verified: false };
  }

  const publicKeyPem = actorDoc?.publicKey?.publicKeyPem;
  if (!publicKeyPem) return { verified: false };

  try {
    const verify = crypto.createVerify("sha256");
    verify.update(signedString, "utf-8");
    const result = verify.verify(publicKeyPem, parsed.signature, "base64");
    return { verified: result, actorId: parsed.keyId };
  } catch {
    return { verified: false };
  }
}

export async function fetchRemoteActor(actorUrl: string): Promise<any> {
  try {
    const response = await fetch(actorUrl, {
      headers: { Accept: "application/activity+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchRemoteObject(objectUrl: string): Promise<any> {
  try {
    const response = await fetch(objectUrl, {
      headers: { Accept: "application/activity+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return null;
  }
}

export async function sendActivity(
  inboxUrl: string,
  activity: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(inboxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/activity+json" },
      body: JSON.stringify(activity),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function federateEvent(eventId: number): Promise<void> {
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
  if (!event || !event.isLocal || event.visibility !== "public") return;

  const followers = await db.select()
    .from(schema.followers)
    .where(eq(schema.followers.following, true));

  const activity = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Create",
    id: `${INSTANCE_URL()}/activities/${event.id}`,
    actor: `${INSTANCE_URL()}/activitypub/actor/__instance__`,
    object: {
      type: "Event",
      id: `${INSTANCE_URL()}/events/${event.id}`,
      name: event.title,
      summary: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString() ?? undefined,
      location: event.location,
      attributedTo: `${INSTANCE_URL()}/activitypub/actor/__instance__`,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
    },
  };

  await Promise.allSettled(
    followers.map((f) => sendActivity(f.inboxUrl, activity)),
  );
}
