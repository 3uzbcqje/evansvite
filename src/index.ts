import "dotenv/config";
import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serve } from "@hono/node-server";
import { validateJwtConfig } from "./lib/jwt.js";

// Fail fast on a misconfigured production deploy before accepting any requests.
validateJwtConfig();

const htmxJs = readFileSync("node_modules/htmx.org/dist/htmx.min.js", "utf-8");

import authRoutes from "./routes/auth/index.js";
import eventsRoutes from "./routes/events/index.js";
import rsvpRoutes from "./routes/events/rsvp.js";
import activitypubRoutes from "./routes/activitypub/index.js";
import adminRoutes from "./routes/admin/index.js";
import usersRoutes from "./routes/users/index.js";
import pagesRoutes from "./routes/pages.js";

type Variables = {
  user: { userId: number; email: string };
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", logger());
app.use("*", secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    // htmx is self-hosted at /static/htmx.min.js and there are no inline scripts,
    // so scripts are locked to same-origin — the key XSS mitigation.
    scriptSrc: ["'self'"],
    // The views use inline style="" attributes and a <style> block.
    styleSrc: ["'self'", "'unsafe-inline'"],
    // Event/avatar images may be hosted on remote (federated) https origins.
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
  },
}));
app.use("*", cors({
  origin: process.env.INSTANCE_URL || "http://localhost:3000",
  credentials: true,
}));

// CSRF protection for cookie-authed form submissions. hono/csrf only checks
// requests with HTML-form content types (urlencoded/multipart/text-plain), so
// JSON API calls and ActivityPub federation (application/activity+json) are
// unaffected. Defaults to same-origin; operators behind a proxy that rewrites
// the Host header may need to set an explicit `origin`.
app.use("*", csrf());

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/static/htmx.min.js", (c) => c.body(htmxJs, 200, { "Content-Type": "application/javascript" }));

app.route("/api/auth", authRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/events", rsvpRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/admin", adminRoutes);
app.route("/", activitypubRoutes);
app.route("/", pagesRoutes);

const port = Number(process.env.PORT) || 3000;

serve(
  { fetch: app.fetch, port },
  (info) => console.log(`evansVite running on http://localhost:${info.port}`),
);

export default {
  port,
  fetch: app.fetch,
};
