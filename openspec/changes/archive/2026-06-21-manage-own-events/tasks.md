## 1. Shared validation

- [x] 1.1 Export `createEventSchema` and `updateEventSchema` from `src/routes/events/index.ts` (or factor them into a shared module) so the page routes can reuse them
- [x] 1.2 Add a small helper to coerce empty-string form fields to `undefined` and `capacity` to a number before zod parsing

## 2. Create event page

- [x] 2.1 Add `GET /events/new` in `src/routes/pages.ts` rendering the create form (title, start time, end time, location, description, image URL, capacity, visibility) with `hx-post` plus plain `action`/`method` fallback; register it BEFORE `GET /events/:id`
- [x] 2.2 Redirect unauthenticated users (no `getUserFromCookie`) from `GET /events/new` to the login page
- [x] 2.3 Add `POST /events/new` that validates with `createEventSchema`, creates the event with `organizerId` = current user, and calls `federateEvent(id)` fire-and-forget
- [x] 2.4 On success, navigate to the new event (`HX-Redirect` for htmx, plain redirect otherwise); on validation failure re-render the form with submitted values and an error message (all values `escapeHtml()`-wrapped)

## 3. Edit event page

- [x] 3.1 Add `GET /events/:id/edit` rendering a form pre-filled with the event's current values; return 404 if missing, 403 if `organizerId` !== current user
- [x] 3.2 Add `POST /events/:id/edit` that re-checks ownership, validates with `updateEventSchema`, applies updates, and redirects to the event detail page on success
- [x] 3.3 Re-render the edit form with an error message on validation failure (escaped values)

## 4. Detail page controls + delete

- [x] 4.1 In `GET /events/:id`, render organizer-only Edit (link to `/events/:id/edit`) and Delete (`hx-delete`) controls when `getUserFromCookie(c)` matches `event.organizerId`
- [x] 4.2 Add a page delete handler that re-checks ownership (404/403 as appropriate), deletes the event, and issues `HX-Redirect` away from the deleted page

## 5. Navigation

- [x] 5.1 Add a "New Event" link to the page nav in `src/views/layout.tsx`, shown for authenticated users

## 6. Verification

- [x] 6.1 Run `npm run typecheck` and `npm run lint` clean — typecheck passes clean; `npm run lint` fails repo-wide because no `eslint.config.js` exists (pre-existing, unrelated to this change)
- [x] 6.2 Manually verify: create an event, confirm redirect; edit it as organizer; confirm a non-organizer gets 403 on edit/delete; confirm `/events/new` isn't captured by `/events/:id`; confirm Edit/Delete controls hidden for non-organizers — verified end-to-end against the live DB (create via form → 302; non-owner edit/delete → 403; route ordering correct; controls gated by `isOrganizer`)
