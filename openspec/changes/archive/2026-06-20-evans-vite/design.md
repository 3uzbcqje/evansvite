## Context

evansVite is a greenfield, open-source, self-hostable event management platform with ActivityPub federation. The system must support local event CRUD, RSVPs, and cross-instance event discovery via the ActivityPub protocol. The platform targets individual instance operators (hobbyists, small communities) and therefore must be lightweight to deploy and maintain.

## Goals / Non-Goals

**Goals:**
- Provide full event creation, browsing, and RSVP management
- Implement ActivityPub federation for event sharing between instances
- Serve local and federated event feeds with pagination
- Support self-hosting via Docker Compose with minimal configuration
- Provide instance administration tools (moderation, registration control)
- Keep the system free and open-source (AGPL or similar)

**Non-Goals:**
- Native mobile apps (responsive web only)
- Real-time collaborative editing of events
- Paid tiers or premium features
- Direct messaging between users
- Calendar integration (iCal export is a future possibility)

## Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Language & Runtime | TypeScript on Node.js (v20+) | Stable LTS, broad ecosystem, excellent TypeScript support | Bun (not available in dev env), Go (larger boilerplate) |
| Web Framework | Hono | Lightweight, fast, great TypeScript support, edge-compatible | Express (heavier, less modern), Fastify (good but more complex) |
| Database | PostgreSQL | Mature, JSONB for ActivityPub data, strong relational model for events/RSVPs | SQLite (good for single-user but poor for federation concurrency) |
| ORM | Drizzle | Type-safe, lightweight, great PostgreSQL support | Prisma (heavier), Kysely (lower level) |
| Frontend | htmx + server-rendered HTML | Minimal JS, good UX for content-focused apps, simple to build and maintain | React/SPA (overkill for this use case), plain SSR templates |
| ActivityPub | Custom lightweight implementation | ActivityPub is a protocol (spec + JSON), not a library; a custom implementation keeps control and reduces dependencies | go-fed (Go only), activitypub-express (Node, but opinionated) |
| Auth | Session-based with JWT | Simple, stateless option for API auth; sessions via httpOnly cookies | OAuth (overkill for self-hosted), OIDC (complex) |
| Deployment | Docker Compose | Single command to deploy all services (app + db) | Kubernetes (overkill), bare-metal (harder to maintain) |
| Federation approach | WebFinger + ActivityPub C2S/S2S | Standard ActivityPub with Event as the primary object type; Mastodon-compatible | Custom API (defeats federation purpose) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| ActivityPub protocol complexity leads to bugs | Start with a minimal required subset (Create, Follow, Undo activities) and iterate |
| Federation performance at scale | Implement pagination, remote content caching, async delivery |
| Spam from federated instances | Moderation tools: instance blocking, report system |
| Security surface from federation | Sandbox HTTP fetching, validate all remote content, rate limiting |
| Low adoption due to self-hosted nature | Provide excellent Docker Compose experience and documentation |
