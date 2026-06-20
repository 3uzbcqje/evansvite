import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import authRoutes from "./routes/auth/index";
import eventsRoutes from "./routes/events/index";
import rsvpRoutes from "./routes/events/rsvp";
import activitypubRoutes from "./routes/activitypub/index";
import adminRoutes from "./routes/admin/index";
import usersRoutes from "./routes/users/index";
import pagesRoutes from "./routes/pages";

type Variables = {
  user: { userId: number; email: string };
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
  origin: process.env.INSTANCE_URL || "http://localhost:3000",
  credentials: true,
}));

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/api/auth", authRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/events", rsvpRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/admin", adminRoutes);
app.route("/", activitypubRoutes);
app.route("/", pagesRoutes);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
  start() {
    console.log(`evansVite running on http://localhost:${port}`);
  },
};
