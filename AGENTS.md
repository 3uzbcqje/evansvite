# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, opencode, Codex, and others) when working with code in this repository. `CLAUDE.md` is a symlink to this file.

## What this is

evansVite is a self-hostable event management platform with ActivityPub federation. Hono server (Node + TypeScript ESM), Drizzle ORM over PostgreSQL, server-rendered HTML with htmx. No client-side framework, no build step for the frontend.

## Commands

```bash
npm run dev          # hot-reload dev server (tsx watch) on :3000
npm run build        # tsc -> dist/
npm start            # run built dist/index.js
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
npm run format       # prettier --write src/

npm run db:generate  # generate SQL migration from schema.ts into ./drizzle
npm run db:push      # push schema directly to DB (dev workflow used in README)
npm run db:migrate   # apply generated migrations
npm run db:seed      # tsx src/db/seed.ts

npm test             # vitest run  (NOTE: no test files exist yet under src/)
```

All DB commands read `DATABASE_URL` from `.env` (via `dotenv/config`). Requires Node >= 22, PostgreSQL >= 17. `docker compose up -d` brings up app + a postgres:17 container.

## Architecture

### Two parallel HTTP surfaces over the same DB
Wired together in `src/index.ts`:
- **JSON REST API under `/api/*`** (`routes/auth`, `routes/events`, `routes/events/rsvp`, `routes/users`, `routes/admin`). Returns JSON, authenticates via `authMiddleware`.
- **Server-rendered HTML pages under `/`** (`routes/pages.ts`). Returns full HTML documents built with `views/layout.ts`, enhanced with htmx attributes (`hx-post`, `hx-get`, `hx-target`). Reads the current user via `getUserFromCookie`, not middleware.
- **ActivityPub under `/`** (`routes/activitypub`): webfinger, actor docs, inbox/outbox, followers/following.

When editing a feature, check whether it needs changes in **both** the `/api` route and the corresponding `pages.ts` view — they are separate code paths that often mirror each other.

### Auth
JWT (`lib/jwt.ts`, 7-day expiry) carried either as `Authorization: Bearer <token>` or an `HttpOnly` cookie named `token`. `middleware/auth.ts` exposes `authMiddleware` (401 if missing), `optionalAuthMiddleware`, and `getUserFromCookie` (used by pages). On login/register the route sets the cookie via a raw `Set-Cookie` header. The authenticated user is stored on the Hono context as `c.var.user` / `c.set("user", ...)` (`{ userId, email }`).

### htmx request/response convention
Routes detect `c.req.header("HX-Request")` and branch:
- htmx request → return an **HTML fragment** (often via `c.html(...)`) and/or set `HX-Redirect` header for navigation.
- otherwise → return JSON.

See `routes/auth/index.ts` (`errorResponse` helper, register/login) for the canonical pattern. Forms include both `hx-post` and a plain `action`/`method` fallback.

### Rendering and XSS — important
`pages.ts` builds HTML by **string interpolation**, and `views/layout.ts` injects `props.children` with `raw()`. There is no automatic escaping. **Every piece of user/DB-derived data interpolated into markup must be wrapped in `escapeHtml()` (`lib/escape.ts`).** Follow the surrounding code — escaping is applied call-site by call-site, not centrally.

`tsconfig.json` sets `jsx: react-jsx` / `jsxImportSource: hono/jsx`, so `.tsx` + Hono JSX is available, but current views use tagged-template `html`/`raw` strings.

### Data model (`src/db/schema.ts`)
`users`, `events`, `rsvps`, `followers`, `inviteCodes`, `blockedInstances`, `instanceConfig`. Notable: events carry `isLocal` + `remoteId`/`remoteInstance` to distinguish locally-created vs federated-in events (federated events use `organizerId: 0`). Users hold ActivityPub `actorId`/`publicKey`/`privateKey`. Import the DB as `import { db, schema } from ".../db/index.js"` and query with Drizzle (`eq`, `and`, `desc`, `sql`).

### ActivityPub federation
`lib/activitypub.ts` handles HTTP Signature verification on the inbox, fetching remote actors/objects, and outbound delivery. There is a synthetic instance actor at username `__instance__`. `federateEvent(id)` fans a `Create`/Event activity out to followers; it is called fire-and-forget (`.catch(() => {})`) after event creation. Inbound `Follow`/`Create`/`Update`/`Delete`/`Undo` activities are handled in `routes/activitypub/index.ts`.

### Static assets — no CDNs
The app serves all static assets itself. Files are `readFileSync`'d from `node_modules` **at module load** in `src/index.ts` (e.g. `htmx.min.js` → `/static/htmx.min.js`) — never read from disk per request. To add an asset: install the package, read it at module scope, register a `/static/...` route, and reference the local path in templates. Do not add external `<script>`/`<link>` to CDNs.

## Conventions

- **ESM with explicit `.js` import extensions** in TypeScript source (e.g. `import ... from "./routes/auth/index.js"`). Keep this — it's required for the Node ESM output.
- Environment lookups are wrapped in lazy getters (e.g. `const SECRET = () => process.env.JWT_SECRET || ...`) so `dotenv/config` has loaded before first use.
- Input validation uses zod schemas (`safeParse`) at the top of mutating routes.

## OpenSpec change workflow

`openspec/` holds spec-driven change proposals (`openspec/changes/*`, archived under `openspec/changes/archive/`) and capability specs (`openspec/specs/*`). `.opencode/` contains the commands/skills (`opsx:propose`, `opsx:apply`, `opsx:archive`, etc.) that drive this workflow. Consult these specs when a task references an OpenSpec change.
