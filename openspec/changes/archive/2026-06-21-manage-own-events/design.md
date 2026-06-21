## Context

evansVite exposes two parallel HTTP surfaces over the same DB (`src/index.ts`): a JSON REST API under `/api/*` and server-rendered HTML pages under `/` (`routes/pages.ts`). The event CRUD behaviors already exist on the API side: `routes/events/index.ts` implements `POST /`, `PUT /:id`, and `DELETE /:id` with zod validation (`createEventSchema` / `updateEventSchema`) and organizer ownership checks (`existing.organizerId !== userId → 403`).

The HTML surface, however, only renders read views: feeds (`/events/local`, `/events/federated`), search, and the detail page (`/events/:id`). There is no create form, no edit form, and no edit/delete controls. Per repo convention (CLAUDE.md), a feature must be wired on *both* surfaces; the page surface is the gap this change fills.

Constraints from the codebase:
- Pages read the current user via `getUserFromCookie(c)`, not `authMiddleware`.
- HTML is built by string interpolation with no auto-escaping — every user/DB value must be wrapped in `escapeHtml()` (`lib/escape.ts`).
- htmx convention: branch on `HX-Request`; use `HX-Redirect` for navigation; forms carry both `hx-post` and a plain `action`/`method` fallback.
- Static assets only; no new dependencies.

## Goals / Non-Goals

**Goals:**
- Authenticated users can create an event from the browser.
- Organizers can edit and delete their own events from the browser.
- Organizer-only Edit/Delete controls appear on the event detail page.
- Page routes mirror the API's validation and ownership rules exactly; no divergence in behavior.

**Non-Goals:**
- No changes to the JSON API routes or their behavior.
- No schema/migration changes — the `events` table already has every needed column.
- No new event fields, image upload handling, or rich-text editing (image is a URL, as today).
- No changes to federation; event creation continues to call `federateEvent(id)` fire-and-forget where applicable.

## Decisions

**1. Add page routes to `routes/pages.ts` rather than new files.**
All other page views live in `pages.ts`; keeping create/edit/delete there matches the existing structure and the `getUserFromCookie` access pattern. New routes: `GET /events/new`, `POST /events/new`, `GET /events/:id/edit`, `POST /events/:id/edit`, and a delete handler reachable from the detail page.

- *Route ordering*: `GET /events/new` MUST be registered before `GET /events/:id` so "new" is not captured as an `:id`. The same applies to any `/events/:id/edit` relative to `:id` (distinct path, but register the static-segment routes deliberately).

**2. Page handlers POST to themselves (form-friendly) instead of reusing the JSON `PUT`/`DELETE`.**
Browsers can't issue `PUT`/`DELETE` from plain forms, and the page surface already owns its own handlers elsewhere. Each page handler re-runs the same zod schema and ownership check the API uses, so logic is consistent without coupling. Delete is triggered via `hx-delete` to a page delete route (htmx can issue DELETE), with a plain-form fallback consideration; on success it issues `HX-Redirect`.

- *Alternative considered*: have the forms call the existing `/api/events` endpoints directly via htmx. Rejected because those return JSON, not HTML fragments/redirects, so error re-rendering and navigation would be awkward and inconsistent with the rest of `pages.ts`.

**3. Reuse `createEventSchema` / `updateEventSchema` from `routes/events/index.ts`.**
Export and import them (or factor into a shared module) so validation rules can't drift between surfaces. Form field names map 1:1 to schema keys; empty optional strings are normalized to `undefined` before parsing.

**4. Ownership and auth enforced in the page handlers.**
`GET/POST /events/new` require a logged-in user (else redirect to login). `GET/POST /events/:id/edit` and delete load the event and return 403 when `organizerId !== currentUser.id`. Edit/Delete controls render on the detail page only when `getUserFromCookie(c)` matches `event.organizerId`.

**5. Escaping.**
Every interpolated value in the new forms and controls — including re-rendered form values on validation error — is wrapped in `escapeHtml()`. Form value attributes use escaped values to avoid attribute-breakout.

## Risks / Trade-offs

- **Duplicated handler logic across API and pages** → Mitigated by sharing the zod schemas and keeping the ownership check identical; the duplication is the create/update/delete glue, which is small and already the established two-surface pattern in this repo.
- **Route-ordering bug (`/events/new` captured by `/events/:id`)** → Mitigated by registering static-segment routes first and verifying with a manual request to `/events/new`.
- **XSS via un-escaped form re-render** → Mitigated by routing all interpolation through `escapeHtml()`, including attribute values on error re-render.
- **Forged `organizerId`/privilege escalation** → Mitigated by deriving the owner from the authenticated cookie user and never trusting a client-supplied organizer field.

## Migration Plan

No data migration. Ship the new page routes and the layout nav entry. Rollback is removing the routes and the nav link; no schema or API change to revert.
