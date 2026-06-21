# evansVite

Free, open-source, self-hostable event management platform with ActivityPub federation.

## Prerequisites

- Node.js >= 22
- PostgreSQL >= 17

## Setup

```bash
cp .env.example .env
npm install
```

Edit `.env` with your database URL and a secure `JWT_SECRET`.

## Database

Generate and apply migrations (`drizzle.config.ts` reads `DATABASE_URL` from `.env`):

```bash
npm run db:generate
npm run db:push
```

Seed the database with sample data (optional):

```bash
npm run db:seed
```

## Development

```bash
npm run dev
```

Starts a hot-reload dev server on `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

## Docker

```bash
docker compose build app
docker compose up -d
```

Apply migrations:

```bash
docker compose exec app npx drizzle-kit push
```

Seed data (optional):

```bash
docker compose exec app npm run db:seed
```

## Self-Hosted Assets

This project **does not load any external assets from CDNs**. All static assets (JavaScript, CSS, etc.) are served from the application server via `/static/*` route handlers defined in `src/index.ts`. Files are read from `node_modules` at startup — no disk I/O on requests.

To add a new self-hosted asset:

1. Install the package (e.g., `npm install some-lib`)
2. Add a route handler in `src/index.ts` that reads the file at module scope:
   ```ts
   import { readFileSync } from "node:fs";
   const asset = readFileSync("node_modules/some-lib/dist/file.min.js", "utf-8");
   app.get("/static/file.min.js", (c) => c.body(asset, 200, { "Content-Type": "application/javascript" }));
   ```
3. Reference the local path in templates (e.g., `<script src="/static/file.min.js">`)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT signing |
| `PORT` | `3000` | HTTP server port |
| `INSTANCE_URL` | `http://localhost:3000` | Public-facing instance URL |
| `INSTANCE_NAME` | `evansVite` | Instance display name |
| `INSTANCE_DESCRIPTION` | `A federated event platform` | Instance description |
