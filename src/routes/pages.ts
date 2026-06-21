import { Hono } from "hono";
import { Layout } from "../views/layout.js";
import { db, schema } from "../db/index.js";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { escapeHtml } from "../lib/escape.js";

const pages = new Hono();

pages.get("/", async (c) => {
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
    Layout({
      title: "Home",
      children: `
<h1>Welcome to evansVite</h1>
<p style="color:#666;margin-bottom:2rem">Free, open-source, federated event platform.</p>

<h2 style="margin-bottom:1rem">Upcoming Local Events</h2>
${localEvents.length === 0 ? '<p style="color:#999">No upcoming local events.</p>' : localEvents.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>${new Date(e.startTime).toLocaleDateString()} ${new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
    ${e.location ? `<span>📍 ${escapeHtml(e.location)}</span>` : ''}
    <span class="badge badge-local">Local</span>
  </div>
</div>
`).join('')}

<h2 style="margin:2rem 0 1rem">Federated Events</h2>
${federatedEvents.length === 0 ? '<p style="color:#999">No federated events yet.</p>' : federatedEvents.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>${new Date(e.startTime).toLocaleDateString()}</span>
    ${e.remoteInstance ? `<span>🌐 ${escapeHtml(e.remoteInstance)}</span>` : ''}
    <span class="badge badge-remote">Federated</span>
  </div>
</div>
`).join('')}
      `,
    }),
  );
});

pages.get("/login", (c) => {
  return c.html(
    Layout({
      title: "Login",
      children: `
<div class="card" style="max-width:400px;margin:0 auto">
  <h2 style="margin-bottom:1rem">Login</h2>
  <form hx-post="/api/auth/login" hx-target="#result" action="/api/auth/login" method="POST">
    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" required>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" name="password" required>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
  </form>
  <div id="result" style="margin-top:1rem"></div>
  <p style="margin-top:1rem;text-align:center;font-size:.9rem">
    No account? <a href="/register">Register</a>
  </p>
</div>
      `,
    }),
  );
});

pages.get("/register", (c) => {
  return c.html(
    Layout({
      title: "Register",
      children: `
<div class="card" style="max-width:400px;margin:0 auto">
  <h2 style="margin-bottom:1rem">Register</h2>
  <form hx-post="/api/auth/register" hx-target="#result" action="/api/auth/register" method="POST">
    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" required>
    </div>
    <div class="form-group">
      <label>Password (min 8 characters)</label>
      <input type="password" name="password" minlength="8" required>
    </div>
    <div class="form-group">
      <label>Display Name</label>
      <input type="text" name="displayName">
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%">Register</button>
  </form>
  <div id="result" style="margin-top:1rem"></div>
  <p style="margin-top:1rem;text-align:center;font-size:.9rem">
    Already have an account? <a href="/login">Login</a>
  </p>
</div>
      `,
    }),
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
    Layout({
      title: "Local Events",
      children: `
<h1>Local Events</h1>
<div class="tabs">
  <a href="/events/local" class="active">Local</a>
  <a href="/events/federated">Federated</a>
  <a href="/events/search">Search</a>
</div>
${items.length === 0 ? '<p style="color:#999">No upcoming local events.</p>' : items.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>📅 ${new Date(e.startTime).toLocaleDateString()} at ${new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
    ${e.location ? `<span>📍 ${escapeHtml(e.location)}</span>` : ''}
  </div>
  ${e.description ? `<p>${escapeHtml(e.description.slice(0, 200))}${e.description.length > 200 ? '...' : ''}</p>` : ''}
</div>
`).join('')}
${page > 1 ? `<div class="pagination"><a href="/events/local?page=${page - 1}" class="btn btn-outline btn-sm">← Previous</a></div>` : ''}
${hasMore ? `<div class="pagination"><a href="/events/local?page=${page + 1}" class="btn btn-outline btn-sm">Next →</a></div>` : ''}
      `,
    }),
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
    Layout({
      title: "Federated Events",
      children: `
<h1>Federated Events</h1>
<div class="tabs">
  <a href="/events/local">Local</a>
  <a href="/events/federated" class="active">Federated</a>
  <a href="/events/search">Search</a>
</div>
${items.length === 0 ? '<p style="color:#999">No federated events yet. Follow other instances to see their events here.</p>' : items.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>📅 ${new Date(e.startTime).toLocaleDateString()}</span>
    ${e.remoteInstance ? `<span>🌐 ${escapeHtml(e.remoteInstance)}</span>` : ''}
  </div>
  ${e.description ? `<p>${escapeHtml(e.description.slice(0, 200))}${e.description.length > 200 ? '...' : ''}</p>` : ''}
</div>
`).join('')}
${page > 1 ? `<div class="pagination"><a href="/events/federated?page=${page - 1}" class="btn btn-outline btn-sm">← Previous</a></div>` : ''}
${hasMore ? `<div class="pagination"><a href="/events/federated?page=${page + 1}" class="btn btn-outline btn-sm">Next →</a></div>` : ''}
      `,
    }),
  );
});

pages.get("/events/search", (c) => {
  return c.html(
    Layout({
      title: "Search Events",
      children: `
<h1>Search Events</h1>
<div class="tabs">
  <a href="/events/local">Local</a>
  <a href="/events/federated">Federated</a>
  <a href="/events/search" class="active">Search</a>
</div>
<div class="search-bar">
  <input type="search" id="q" name="q" placeholder="Search events..." hx-get="/events/search/results" hx-trigger="keyup changed delay:300ms" hx-target="#results">
</div>
<div id="results"></div>
      `,
    }),
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

  if (results.length === 0) return c.html('<p style="color:#999">No events found.</p>');

  return c.html(results.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>📅 ${new Date(e.startTime).toLocaleDateString()}</span>
    ${e.isLocal ? '<span class="badge badge-local">Local</span>' : '<span class="badge badge-remote">Federated</span>'}
  </div>
</div>
  `).join(''));
});

pages.get("/events/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  if (!event) return c.notFound();

  const [organizer] = event.organizerId > 0 ? await db.select({
    displayName: schema.users.displayName,
  }).from(schema.users).where(eq(schema.users.id, event.organizerId)).limit(1) : [{ displayName: event.remoteInstance || "Remote" }];

  return c.html(
    Layout({
      title: escapeHtml(event.title),
      children: `
<div class="card">
  ${event.imageUrl ? `<img src="${escapeHtml(event.imageUrl)}" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:1rem">` : ''}
  <h1>${escapeHtml(event.title)}</h1>
  <div class="meta" style="margin:1rem 0">
    <div>📅 ${new Date(event.startTime).toLocaleDateString()} at ${new Date(event.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    ${event.endTime ? `<div>⏱ Ends ${new Date(event.endTime).toLocaleDateString()} at ${new Date(event.endTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>` : ''}
    ${event.location ? `<div>📍 ${escapeHtml(event.location)}</div>` : ''}
    <div>👤 Organized by ${escapeHtml(organizer.displayName)}</div>
    ${event.isLocal ? '<span class="badge badge-local">Local</span>' : `<span class="badge badge-remote">🌐 ${escapeHtml(event.remoteInstance)}</span>`}
  </div>
  ${event.description ? `<div style="white-space:pre-wrap;margin:1rem 0">${escapeHtml(event.description)}</div>` : ''}
  ${event.capacity ? `<div>Capacity: ${event.capacity}</div>` : ''}
  <div id="rsvp-section" hx-get="/events/${id}/rsvp-status" hx-trigger="load"></div>
</div>
<div id="attendees" hx-get="/events/${id}/attendees-list" hx-trigger="load"></div>
      `,
    }),
  );
});

pages.get("/events/:id/rsvp-status", async (c) => {
  const eventId = Number(c.req.param("id"));
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);
  if (!event) return c.notFound();

  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(schema.rsvps)
    .where(and(eq(schema.rsvps.eventId, eventId), eq(schema.rsvps.status, "yes")));

  return c.html(`
<div style="margin:1rem 0">
  <strong>${Number(countResult.count)}</strong> confirmed attendee${Number(countResult.count) !== 1 ? 's' : ''}
  ${event.capacity ? `/ ${event.capacity}` : ''}
</div>
<form hx-post="/api/events/${eventId}/rsvp" hx-target="#rsvp-message" style="display:flex;gap:.5rem;margin-top:1rem">
  <button type="submit" name="status" value="yes" class="btn btn-primary btn-sm">✅ Yes</button>
  <button type="submit" name="status" value="no" class="btn btn-outline btn-sm">❌ No</button>
  <button type="submit" name="status" value="maybe" class="btn btn-outline btn-sm">❓ Maybe</button>
</form>
<div id="rsvp-message" style="margin-top:.5rem"></div>
  `);
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

  return c.html(`
<div class="card">
  <h3>Attendees</h3>
  ${attendees.map(a => `<div style="padding:.3rem 0">${escapeHtml(a.displayName)}</div>`).join('')}
</div>
  `);
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
    Layout({
      title: escapeHtml(user.displayName) || "User",
      children: `
<div class="card">
  <h1>${escapeHtml(user.displayName) || "Anonymous"}</h1>
  ${user.bio ? `<p>${escapeHtml(user.bio)}</p>` : ''}
  <p style="color:#777;font-size:.9rem">Joined ${new Date(user.createdAt).toLocaleDateString()}</p>
</div>
<h2 style="margin:1.5rem 0 1rem">Events by ${escapeHtml(user.displayName)}</h2>
${userEvents.length === 0 ? '<p style="color:#999">No events yet.</p>' : userEvents.map(e => `
<div class="event-card">
  <h3><a href="/events/${e.id}" style="text-decoration:none;color:inherit">${escapeHtml(e.title)}</a></h3>
  <div class="meta">
    <span>📅 ${new Date(e.startTime).toLocaleDateString()}</span>
  </div>
</div>
`).join('')}
<p style="margin-top:2rem;text-align:center;font-size:.9rem"><a href="/account/delete" style="color:#e63946">Delete Account</a></p>
      `,
    }),
  );
});

pages.get("/admin", async (c) => {
  return c.html(
    Layout({
      title: "Admin",
      children: `
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
      <input type="text" name="value" value="${process.env.INSTANCE_NAME || "evansVite"}">
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
        <option value='"open"'>Open</option>
        <option value='"invite"'>Invite Only</option>
      </select>
    </div>
    <button type="submit" class="btn btn-primary">Save</button>
  </form>
  <div id="reg-result" style="margin-top:.5rem"></div>
</div>
      `,
    }),
  );
});

pages.get("/admin/invites", async (c) => {
  const codes = await db.select().from(schema.inviteCodes).orderBy(desc(schema.inviteCodes.createdAt));

  return c.html(
    Layout({
      title: "Invite Codes",
      children: `
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
${codes.length === 0 ? '<p style="color:#999">No invite codes generated yet.</p>' : codes.map(c => `
<div class="card" style="display:flex;justify-content:space-between;align-items:center">
  <code style="font-size:1.1rem">${escapeHtml(c.code)}</code>
  <span style="color:#777;font-size:.9rem">${c.usedAt ? 'Used' : 'Available'}</span>
</div>
`).join('')}
</div>
      `,
    }),
  );
});

pages.get("/admin/moderation", async (c) => {
  const blocked = await db.select().from(schema.blockedInstances);

  return c.html(
    Layout({
      title: "Moderation",
      children: `
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
      <input type="text" name="domain" placeholder="example.com" required>
    </div>
    <button type="submit" class="btn btn-danger">Block</button>
  </form>
  <div id="block-result" style="margin-top:.5rem"></div>
</div>
<h3 style="margin:1rem 0">Blocked Instances</h3>
${blocked.length === 0 ? '<p style="color:#999">No instances blocked.</p>' : blocked.map(b => `
<div class="card" style="display:flex;justify-content:space-between;align-items:center">
  <div>
    <strong>${escapeHtml(b.domain)}</strong>
    ${b.reason ? `<span style="color:#777;font-size:.9rem"> — ${escapeHtml(b.reason)}</span>` : ''}
  </div>
  <button hx-delete="/api/admin/blocked-instances/${b.id}" hx-target="closest .card" hx-swap="outerHTML" class="btn btn-outline btn-sm">Unblock</button>
</div>
`).join('')}
      `,
    }),
  );
});

pages.get("/about", (c) => {
  return c.html(
    Layout({
      title: "About",
      children: `
<div class="card">
  <h1>${process.env.INSTANCE_NAME || "evansVite"}</h1>
  <p style="margin:1rem 0;color:#555">${process.env.INSTANCE_DESCRIPTION || "A federated event platform."}</p>
  <p style="color:#777">This instance runs <strong>evansVite</strong> — free, open-source event management with ActivityPub federation.</p>
  <p style="margin-top:1rem"><a href="https://github.com" target="_blank">GitHub</a> — Report issues, contribute, or self-host your own instance.</p>
</div>
      `,
    }),
  );
});

pages.get("/account/delete", async (c) => {
  return c.html(
    Layout({
      title: "Delete Account",
      children: `
<div class="card" style="max-width:500px;margin:0 auto">
  <h2 style="margin-bottom:1rem;color:#e63946">Delete Account</h2>
  <div class="alert alert-error">
    <strong>Warning:</strong> This action is permanent and cannot be undone.
    All of your events, RSVPs, and personal data will be deleted.
  </div>
  <form hx-delete="/api/auth/account" hx-target="#result">
    <div class="form-group">
      <label>Enter your password to confirm:</label>
      <input type="password" name="password" required>
    </div>
    <button type="submit" class="btn btn-danger" style="width:100%">Permanently Delete My Account</button>
  </form>
  <div id="result" style="margin-top:1rem"></div>
  <p style="margin-top:1rem;text-align:center;font-size:.9rem">
    <a href="/">Cancel and go home</a>
  </p>
</div>
      `,
    }),
  );
});

export default pages;
