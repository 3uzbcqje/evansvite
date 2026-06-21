## Why

Users can already create, edit, and delete events through the JSON REST API (`/api/events`), but there is no way to do any of this from the browser. The server-rendered HTML surface (`routes/pages.ts`) only renders read views — feeds, search, and event detail — so a person using the site through htmx has no path to author or manage their own events. This change closes that gap by adding the missing UI surface.

## What Changes

- Add a `GET /events/new` page rendering an event creation form (title, start/end time, location, description, image URL, capacity, visibility).
- Add a `POST /events/new` page handler that validates input, creates the event owned by the current user, and redirects to the new event page (htmx `HX-Redirect` / plain redirect fallback).
- Add a `GET /events/:id/edit` page rendering a pre-filled edit form, restricted to the event organizer.
- Add a `POST /events/:id/edit` page handler that validates input, enforces organizer ownership, and updates the event.
- Add organizer-only **Edit** and **Delete** controls on the event detail page (`GET /events/:id`), with delete wired through htmx and an ownership check.
- Add a "New Event" entry point to the page navigation/layout for authenticated users.
- Reuse the existing zod validation rules and ownership semantics already enforced by the `/api/events` routes; no JSON API behavior changes.

## Capabilities

### New Capabilities
<!-- None — the behaviors already exist as requirements; this adds the HTML/htmx surface. -->

### Modified Capabilities
- `event-management`: extend the Create/Update/Delete/View requirements to cover the server-rendered HTML + htmx surface (creation form page, edit form page, organizer-only edit/delete controls, redirect-on-success behavior, and ownership/auth enforcement on the page routes).

## Impact

- **Code**: `src/routes/pages.ts` (new create/edit/delete page routes and organizer controls on the detail view), `src/views/layout.tsx` (nav entry point). No schema migration — the `events` table already has every needed column.
- **Existing behavior**: unchanged JSON API; new page routes mirror its validation (`createEventSchema`/`updateEventSchema`) and ownership rules.
- **Security**: all interpolated user/DB data on the new pages must be wrapped in `escapeHtml()`; mutating page routes require an authenticated user via `getUserFromCookie` and enforce organizer ownership before update/delete.
