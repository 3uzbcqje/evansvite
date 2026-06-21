import { Hono } from "hono";
import { Layout } from "../views/layout.js";
import { db, schema } from "../db/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { safeUrl } from "../lib/escape.js";
import { getUserFromCookie } from "../middleware/auth.js";
import {
  createEventSchema,
  updateEventSchema,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../services/events.js";

const pages = new Hono();

const fmtDate = (d: Date) => new Date(d).toLocaleDateString();
const fmtTime = (d: Date) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Coerce a parsed form body into the shape expected by the event zod schemas:
// empty strings become undefined, datetime-local values become ISO strings,
// and capacity becomes a number. Invalid datetimes are passed through so zod rejects them.
function eventFormToInput(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);
  const toIso = (v: unknown) => {
    const s = str(v);
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString();
  };
  const cap = str(body.capacity);
  return {
    title: str(body.title),
    description: str(body.description),
    startTime: toIso(body.startTime),
    endTime: toIso(body.endTime),
    location: str(body.location),
    imageUrl: str(body.imageUrl),
    capacity: cap !== undefined ? Number(cap) : undefined,
    visibility: str(body.visibility),
  };
}

// Shared create/edit event form. JSX auto-escapes every interpolated value, so
// no manual escaping is needed.
function EventForm(props: {
  action: string;
  heading: string;
  submitLabel: string;
  values?: Record<string, unknown>;
  error?: string;
}) {
  const v = props.values ?? {};
  const sv = (x: unknown) => (x === undefined || x === null ? "" : String(x));
  return (
    <div class="card" style="max-width:600px;margin:0 auto">
      <h2 style="margin-bottom:1rem">{props.heading}</h2>
      {props.error ? <div class="alert alert-error">{props.error}</div> : null}
      <form hx-post={props.action} action={props.action} method="post">
        <div class="form-group">
          <label>Title</label>
          <input type="text" name="title" maxlength={300} required value={sv(v.title)} />
        </div>
        <div class="form-group">
          <label>Start time</label>
          <input type="datetime-local" name="startTime" required value={sv(v.startTime)} />
        </div>
        <div class="form-group">
          <label>End time (optional)</label>
          <input type="datetime-local" name="endTime" value={sv(v.endTime)} />
        </div>
        <div class="form-group">
          <label>Location (optional)</label>
          <input type="text" name="location" maxlength={500} value={sv(v.location)} />
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <textarea name="description" maxlength={5000}>{sv(v.description)}</textarea>
        </div>
        <div class="form-group">
          <label>Image URL (optional)</label>
          <input type="url" name="imageUrl" value={sv(v.imageUrl)} />
        </div>
        <div class="form-group">
          <label>Capacity (optional)</label>
          <input type="number" name="capacity" min={1} value={sv(v.capacity)} />
        </div>
        <div class="form-group">
          <label>Visibility</label>
          <select name="visibility">
            <option value="public" selected={v.visibility === "public"}>Public</option>
            <option value="unlisted" selected={v.visibility === "unlisted"}>Unlisted</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">{props.submitLabel}</button>
      </form>
    </div>
  );
}

function EventTabs(props: { active: "local" | "federated" | "search" }) {
  return (
    <div class="tabs">
      <a href="/events/local" class={props.active === "local" ? "active" : ""}>Local</a>
      <a href="/events/federated" class={props.active === "federated" ? "active" : ""}>Federated</a>
      <a href="/events/search" class={props.active === "search" ? "active" : ""}>Search</a>
    </div>
  );
}

pages.get("/", async (c) => {
  const currentUser = await getUserFromCookie(c);
  const localEvents = await db.select()
    .from(schema.events)
    .where(and(eq(schema.events.visibility, "public"), eq(schema.events.isLocal, true)))
    .orderBy(desc(schema.events.startTime))
    .limit(5);

  const federatedEvents = await db.select()
    .from(schema.events)
    .where(and(eq(schema.events.visibility, "public"), eq(schema.events.isLocal, false)))
    .orderBy(desc(schema.events.startTime))
    .limit(5);

  return c.html(
    <Layout title="Home" user={currentUser}>
      <h1>Welcome to evansVite</h1>
      <p style="color:#666;margin-bottom:2rem">Free, open-source, federated event platform.</p>

      <h2 style="margin-bottom:1rem">Upcoming Local Events</h2>
      {localEvents.length === 0 ? (
        <p style="color:#999">No upcoming local events.</p>
      ) : (
        localEvents.map((e) => (
          <div class="event-card">
            <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
            <div class="meta">
              <span>{fmtDate(e.startTime)} {fmtTime(e.startTime)}</span>
              {e.location ? <span>📍 {e.location}</span> : null}
              <span class="badge badge-local">Local</span>
            </div>
          </div>
        ))
      )}

      <h2 style="margin:2rem 0 1rem">Federated Events</h2>
      {federatedEvents.length === 0 ? (
        <p style="color:#999">No federated events yet.</p>
      ) : (
        federatedEvents.map((e) => (
          <div class="event-card">
            <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
            <div class="meta">
              <span>{fmtDate(e.startTime)}</span>
              {e.remoteInstance ? <span>🌐 {e.remoteInstance}</span> : null}
              <span class="badge badge-remote">Federated</span>
            </div>
          </div>
        ))
      )}
    </Layout>,
  );
});

pages.get("/login", async (c) => {
  return c.html(
    <Layout title="Login" user={await getUserFromCookie(c)}>
      <div class="card" style="max-width:400px;margin:0 auto">
        <h2 style="margin-bottom:1rem">Login</h2>
        <form hx-post="/api/auth/login" hx-target="#result" action="/api/auth/login" method="post">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
        </form>
        <div id="result" style="margin-top:1rem"></div>
        <p style="margin-top:1rem;text-align:center;font-size:.9rem">
          No account? <a href="/register">Register</a>
        </p>
      </div>
    </Layout>,
  );
});

pages.get("/register", async (c) => {
  return c.html(
    <Layout title="Register" user={await getUserFromCookie(c)}>
      <div class="card" style="max-width:400px;margin:0 auto">
        <h2 style="margin-bottom:1rem">Register</h2>
        <form hx-post="/api/auth/register" hx-target="#result" action="/api/auth/register" method="post">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>
          <div class="form-group">
            <label>Password (min 8 characters)</label>
            <input type="password" name="password" minlength={8} required />
          </div>
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" name="displayName" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">Register</button>
        </form>
        <div id="result" style="margin-top:1rem"></div>
        <p style="margin-top:1rem;text-align:center;font-size:.9rem">
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </Layout>,
  );
});

pages.get("/events/local", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const events = await db.select()
    .from(schema.events)
    .where(and(eq(schema.events.visibility, "public"), eq(schema.events.isLocal, true)))
    .orderBy(desc(schema.events.startTime))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = events.length > limit;
  const items = hasMore ? events.slice(0, limit) : events;

  return c.html(
    <Layout title="Local Events" user={await getUserFromCookie(c)}>
      <h1>Local Events</h1>
      <EventTabs active="local" />
      {items.length === 0 ? (
        <p style="color:#999">No upcoming local events.</p>
      ) : (
        items.map((e) => (
          <div class="event-card">
            <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
            <div class="meta">
              <span>📅 {fmtDate(e.startTime)} at {fmtTime(e.startTime)}</span>
              {e.location ? <span>📍 {e.location}</span> : null}
            </div>
            {e.description ? (
              <p>{e.description.slice(0, 200)}{e.description.length > 200 ? "..." : ""}</p>
            ) : null}
          </div>
        ))
      )}
      {page > 1 ? (
        <div class="pagination"><a href={`/events/local?page=${page - 1}`} class="btn btn-outline btn-sm">← Previous</a></div>
      ) : null}
      {hasMore ? (
        <div class="pagination"><a href={`/events/local?page=${page + 1}`} class="btn btn-outline btn-sm">Next →</a></div>
      ) : null}
    </Layout>,
  );
});

pages.get("/events/federated", async (c) => {
  const page = Number(c.req.query("page")) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const events = await db.select()
    .from(schema.events)
    .where(and(eq(schema.events.visibility, "public"), eq(schema.events.isLocal, false)))
    .orderBy(desc(schema.events.startTime))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = events.length > limit;
  const items = hasMore ? events.slice(0, limit) : events;

  return c.html(
    <Layout title="Federated Events" user={await getUserFromCookie(c)}>
      <h1>Federated Events</h1>
      <EventTabs active="federated" />
      {items.length === 0 ? (
        <p style="color:#999">No federated events yet. Follow other instances to see their events here.</p>
      ) : (
        items.map((e) => (
          <div class="event-card">
            <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
            <div class="meta">
              <span>📅 {fmtDate(e.startTime)}</span>
              {e.remoteInstance ? <span>🌐 {e.remoteInstance}</span> : null}
            </div>
            {e.description ? (
              <p>{e.description.slice(0, 200)}{e.description.length > 200 ? "..." : ""}</p>
            ) : null}
          </div>
        ))
      )}
      {page > 1 ? (
        <div class="pagination"><a href={`/events/federated?page=${page - 1}`} class="btn btn-outline btn-sm">← Previous</a></div>
      ) : null}
      {hasMore ? (
        <div class="pagination"><a href={`/events/federated?page=${page + 1}`} class="btn btn-outline btn-sm">Next →</a></div>
      ) : null}
    </Layout>,
  );
});

pages.get("/events/search", async (c) => {
  return c.html(
    <Layout title="Search Events" user={await getUserFromCookie(c)}>
      <h1>Search Events</h1>
      <EventTabs active="search" />
      <div class="search-bar">
        <input
          type="search"
          id="q"
          name="q"
          placeholder="Search events..."
          hx-get="/events/search/results"
          hx-trigger="keyup changed delay:300ms"
          hx-target="#results"
        />
      </div>
      <div id="results"></div>
    </Layout>,
  );
});

pages.get("/events/search/results", async (c) => {
  const q = c.req.query("q");
  if (!q || q.length < 2) return c.html("");

  const results = await db.select()
    .from(schema.events)
    .where(and(
      eq(schema.events.visibility, "public"),
      sql`(title ILIKE ${`%${q}%`} OR description ILIKE ${`%${q}%`})`,
    ))
    .orderBy(desc(schema.events.startTime))
    .limit(50);

  if (results.length === 0) return c.html(<p style="color:#999">No events found.</p>);

  return c.html(
    <>
      {results.map((e) => (
        <div class="event-card">
          <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
          <div class="meta">
            <span>📅 {fmtDate(e.startTime)}</span>
            {e.isLocal ? (
              <span class="badge badge-local">Local</span>
            ) : (
              <span class="badge badge-remote">Federated</span>
            )}
          </div>
        </div>
      ))}
    </>,
  );
});

// Registered BEFORE /events/:id so "new" is not captured as an :id.
pages.get("/events/new", async (c) => {
  const user = await getUserFromCookie(c);
  if (!user) return c.redirect("/login");
  return c.html(
    <Layout title="New Event" user={user}>
      <EventForm action="/events/new" heading="Create Event" submitLabel="Create Event" />
    </Layout>,
  );
});

pages.post("/events/new", async (c) => {
  const user = await getUserFromCookie(c);
  if (!user) {
    if (c.req.header("HX-Request")) {
      c.header("HX-Redirect", "/login");
      return c.body(null);
    }
    return c.redirect("/login");
  }

  const body = await c.req.parseBody();
  const parsed = createEventSchema.safeParse(eventFormToInput(body));
  if (!parsed.success) {
    return c.html(
      <Layout title="New Event" user={user}>
        <EventForm
          action="/events/new"
          heading="Create Event"
          submitLabel="Create Event"
          values={body}
          error="Please fix the errors and try again."
        />
      </Layout>,
    );
  }

  const event = await createEvent(parsed.data, user.userId);

  if (c.req.header("HX-Request")) {
    c.header("HX-Redirect", `/events/${event.id}`);
    return c.body(null);
  }
  return c.redirect(`/events/${event.id}`);
});

pages.get("/events/:id/edit", async (c) => {
  const user = await getUserFromCookie(c);
  if (!user) return c.redirect("/login");

  const id = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!event) return c.notFound();
  if (event.organizerId !== user.userId) return c.text("Forbidden", 403);

  const toLocal = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");
  return c.html(
    <Layout title="Edit Event" user={user}>
      <EventForm
        action={`/events/${id}/edit`}
        heading="Edit Event"
        submitLabel="Save Changes"
        values={{
          title: event.title,
          description: event.description ?? "",
          startTime: toLocal(event.startTime),
          endTime: toLocal(event.endTime),
          location: event.location ?? "",
          imageUrl: event.imageUrl ?? "",
          capacity: event.capacity ?? "",
          visibility: event.visibility,
        }}
      />
    </Layout>,
  );
});

pages.post("/events/:id/edit", async (c) => {
  const user = await getUserFromCookie(c);
  if (!user) {
    if (c.req.header("HX-Request")) {
      c.header("HX-Redirect", "/login");
      return c.body(null);
    }
    return c.redirect("/login");
  }

  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();
  const parsed = updateEventSchema.safeParse(eventFormToInput(body));
  if (!parsed.success) {
    return c.html(
      <Layout title="Edit Event" user={user}>
        <EventForm
          action={`/events/${id}/edit`}
          heading="Edit Event"
          submitLabel="Save Changes"
          values={body}
          error="Please fix the errors and try again."
        />
      </Layout>,
    );
  }

  const result = await updateEvent(id, parsed.data, user.userId);
  if (!result.ok) {
    return result.error === "not_found" ? c.notFound() : c.text("Forbidden", 403);
  }

  if (c.req.header("HX-Request")) {
    c.header("HX-Redirect", `/events/${id}`);
    return c.body(null);
  }
  return c.redirect(`/events/${id}`);
});

pages.delete("/events/:id", async (c) => {
  const user = await getUserFromCookie(c);
  if (!user) return c.text("Authentication required", 401);

  const id = Number(c.req.param("id"));
  const result = await deleteEvent(id, user.userId);
  if (!result.ok) {
    return result.error === "not_found" ? c.notFound() : c.text("Forbidden", 403);
  }

  c.header("HX-Redirect", "/");
  return c.body(null);
});

pages.get("/events/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!event) return c.notFound();

  const [organizer] = event.organizerId > 0 ? await db.select({
    displayName: schema.users.displayName,
  }).from(schema.users).where(eq(schema.users.id, event.organizerId)).limit(1) : [{ displayName: event.remoteInstance || "Remote" }];

  const currentUser = await getUserFromCookie(c);
  const isOrganizer = !!currentUser && event.isLocal && currentUser.userId === event.organizerId;
  const image = event.imageUrl ? safeUrl(event.imageUrl) : "";

  return c.html(
    <Layout title={event.title} user={currentUser}>
      <div class="card">
        {image ? (
          <img src={image} style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:1rem" />
        ) : null}
        <h1>{event.title}</h1>
        <div class="meta" style="margin:1rem 0">
          <div>📅 {fmtDate(event.startTime)} at {fmtTime(event.startTime)}</div>
          {event.endTime ? <div>⏱ Ends {fmtDate(event.endTime)} at {fmtTime(event.endTime)}</div> : null}
          {event.location ? <div>📍 {event.location}</div> : null}
          <div>👤 Organized by {organizer.displayName}</div>
          {event.isLocal ? (
            <span class="badge badge-local">Local</span>
          ) : (
            <span class="badge badge-remote">🌐 {event.remoteInstance}</span>
          )}
        </div>
        {event.description ? (
          <div style="white-space:pre-wrap;margin:1rem 0">{event.description}</div>
        ) : null}
        {event.capacity ? <div>Capacity: {event.capacity}</div> : null}
        {isOrganizer ? (
          <div style="display:flex;gap:.5rem;margin:1rem 0">
            <a href={`/events/${id}/edit`} class="btn btn-outline btn-sm">Edit</a>
            <button
              class="btn btn-danger btn-sm"
              hx-delete={`/events/${id}`}
              hx-confirm="Delete this event? This cannot be undone."
            >Delete</button>
          </div>
        ) : null}
        <div id="rsvp-section" hx-get={`/events/${id}/rsvp-status`} hx-trigger="load"></div>
      </div>
      <div id="attendees" hx-get={`/events/${id}/attendees-list`} hx-trigger="load"></div>
    </Layout>,
  );
});

pages.get("/events/:id/rsvp-status", async (c) => {
  const eventId = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
  if (!event) return c.notFound();

  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.rsvps)
    .where(and(eq(schema.rsvps.eventId, eventId), eq(schema.rsvps.status, "yes")));
  const count = Number(countResult.count);

  return c.html(
    <>
      <div style="margin:1rem 0">
        <strong>{count}</strong> confirmed attendee{count !== 1 ? "s" : ""}
        {event.capacity ? ` / ${event.capacity}` : ""}
      </div>
      <form hx-post={`/api/events/${eventId}/rsvp`} hx-target="#rsvp-message" style="display:flex;gap:.5rem;margin-top:1rem">
        <button type="submit" name="status" value="yes" class="btn btn-primary btn-sm">✅ Yes</button>
        <button type="submit" name="status" value="no" class="btn btn-outline btn-sm">❌ No</button>
        <button type="submit" name="status" value="maybe" class="btn btn-outline btn-sm">❓ Maybe</button>
      </form>
      <div id="rsvp-message" style="margin-top:.5rem"></div>
    </>,
  );
});

pages.get("/events/:id/attendees-list", async (c) => {
  const eventId = Number(c.req.param("id"));
  const attendees = await db.select({
    displayName: schema.users.displayName,
  })
  .from(schema.rsvps)
  .innerJoin(schema.users, eq(schema.rsvps.userId, schema.users.id))
  .where(and(eq(schema.rsvps.eventId, eventId), eq(schema.rsvps.status, "yes")));

  if (attendees.length === 0) return c.html("");

  return c.html(
    <div class="card">
      <h3>Attendees</h3>
      {attendees.map((a) => <div style="padding:.3rem 0">{a.displayName}</div>)}
    </div>,
  );
});

pages.get("/profile/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!user) return c.notFound();

  const userEvents = await db.select()
    .from(schema.events)
    .where(eq(schema.events.organizerId, id))
    .orderBy(desc(schema.events.startTime))
    .limit(20);

  return c.html(
    <Layout title={user.displayName || "User"} user={await getUserFromCookie(c)}>
      <div class="card">
        <h1>{user.displayName || "Anonymous"}</h1>
        {user.bio ? <p>{user.bio}</p> : null}
        <p style="color:#777;font-size:.9rem">Joined {fmtDate(user.createdAt)}</p>
      </div>
      <h2 style="margin:1.5rem 0 1rem">Events by {user.displayName}</h2>
      {userEvents.length === 0 ? (
        <p style="color:#999">No events yet.</p>
      ) : (
        userEvents.map((e) => (
          <div class="event-card">
            <h3><a href={`/events/${e.id}`} style="text-decoration:none;color:inherit">{e.title}</a></h3>
            <div class="meta">
              <span>📅 {fmtDate(e.startTime)}</span>
            </div>
          </div>
        ))
      )}
      <p style="margin-top:2rem;text-align:center;font-size:.9rem"><a href="/account/delete" style="color:#e63946">Delete Account</a></p>
    </Layout>,
  );
});

pages.get("/admin", async (c) => {
  return c.html(
    <Layout title="Admin" user={await getUserFromCookie(c)}>
      <h1>Instance Administration</h1>
      <div class="tabs">
        <a href="/admin" class="active">Settings</a>
        <a href="/admin/invites">Invite Codes</a>
        <a href="/admin/moderation">Moderation</a>
      </div>
      <div class="card">
        <h3>Instance Settings</h3>
        <form hx-put="/api/admin/config/instance_name" hx-target="#config-result">
          <div class="form-group">
            <label>Instance Name</label>
            <input type="text" name="value" value={process.env.INSTANCE_NAME || "evansVite"} />
          </div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
        <div id="config-result" style="margin-top:.5rem"></div>
      </div>
      <div class="card">
        <h3>Registration</h3>
        <form hx-put="/api/admin/config/registration" hx-target="#reg-result">
          <div class="form-group">
            <label>Registration Mode</label>
            <select name="value">
              <option value={'"open"'}>Open</option>
              <option value={'"invite"'}>Invite Only</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
        <div id="reg-result" style="margin-top:.5rem"></div>
      </div>
    </Layout>,
  );
});

pages.get("/admin/invites", async (c) => {
  const codes = await db.select().from(schema.inviteCodes).orderBy(desc(schema.inviteCodes.createdAt));

  return c.html(
    <Layout title="Invite Codes" user={await getUserFromCookie(c)}>
      <h1>Invite Codes</h1>
      <div class="tabs">
        <a href="/admin">Settings</a>
        <a href="/admin/invites" class="active">Invite Codes</a>
        <a href="/admin/moderation">Moderation</a>
      </div>
      <div class="card">
        <button hx-post="/api/admin/invite-codes" hx-target="#codes-list" hx-swap="afterbegin" class="btn btn-primary">Generate Code</button>
      </div>
      <div id="codes-list">
        {codes.length === 0 ? (
          <p style="color:#999">No invite codes generated yet.</p>
        ) : (
          codes.map((code) => (
            <div class="card" style="display:flex;justify-content:space-between;align-items:center">
              <code style="font-size:1.1rem">{code.code}</code>
              <span style="color:#777;font-size:.9rem">{code.usedAt ? "Used" : "Available"}</span>
            </div>
          ))
        )}
      </div>
    </Layout>,
  );
});

pages.get("/admin/moderation", async (c) => {
  const blocked = await db.select().from(schema.blockedInstances);

  return c.html(
    <Layout title="Moderation" user={await getUserFromCookie(c)}>
      <h1>Moderation</h1>
      <div class="tabs">
        <a href="/admin">Settings</a>
        <a href="/admin/invites">Invite Codes</a>
        <a href="/admin/moderation" class="active">Moderation</a>
      </div>
      <div class="card">
        <h3>Block Instance</h3>
        <form hx-post="/api/admin/blocked-instances" hx-target="#block-result">
          <div class="form-group">
            <label>Domain</label>
            <input type="text" name="domain" placeholder="example.com" required />
          </div>
          <button type="submit" class="btn btn-danger">Block</button>
        </form>
        <div id="block-result" style="margin-top:.5rem"></div>
      </div>
      <h3 style="margin:1rem 0">Blocked Instances</h3>
      {blocked.length === 0 ? (
        <p style="color:#999">No instances blocked.</p>
      ) : (
        blocked.map((b) => (
          <div class="card" style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>{b.domain}</strong>
              {b.reason ? <span style="color:#777;font-size:.9rem"> — {b.reason}</span> : null}
            </div>
            <button hx-delete={`/api/admin/blocked-instances/${b.id}`} hx-target="closest .card" hx-swap="outerHTML" class="btn btn-outline btn-sm">Unblock</button>
          </div>
        ))
      )}
    </Layout>,
  );
});

pages.get("/about", async (c) => {
  return c.html(
    <Layout title="About" user={await getUserFromCookie(c)}>
      <div class="card">
        <h1>{process.env.INSTANCE_NAME || "evansVite"}</h1>
        <p style="margin:1rem 0;color:#555">{process.env.INSTANCE_DESCRIPTION || "A federated event platform."}</p>
        <p style="color:#777">This instance runs <strong>evansVite</strong> — free, open-source event management with ActivityPub federation.</p>
        <p style="margin-top:1rem"><a href="https://github.com" target="_blank">GitHub</a> — Report issues, contribute, or self-host your own instance.</p>
      </div>
    </Layout>,
  );
});

pages.get("/account/delete", async (c) => {
  return c.html(
    <Layout title="Delete Account" user={await getUserFromCookie(c)}>
      <div class="card" style="max-width:500px;margin:0 auto">
        <h2 style="margin-bottom:1rem;color:#e63946">Delete Account</h2>
        <div class="alert alert-error">
          <strong>Warning:</strong> This action is permanent and cannot be undone.
          All of your events, RSVPs, and personal data will be deleted.
        </div>
        <form hx-delete="/api/auth/account" hx-target="#result">
          <div class="form-group">
            <label>Enter your password to confirm:</label>
            <input type="password" name="password" required />
          </div>
          <button type="submit" class="btn btn-danger" style="width:100%">Permanently Delete My Account</button>
        </form>
        <div id="result" style="margin-top:1rem"></div>
        <p style="margin-top:1rem;text-align:center;font-size:.9rem">
          <a href="/">Cancel and go home</a>
        </p>
      </div>
    </Layout>,
  );
});

export default pages;
