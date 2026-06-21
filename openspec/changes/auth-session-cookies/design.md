## Context

The app uses JWT-based auth. The spec says login should "return a JWT in an httpOnly cookie," but the current implementation returns the token only in the JSON response body. The client never stores or uses the token, so the auth state is invisible and all authenticated requests fail.

## Goals / Non-Goals

**Goals:**
- JWT set as httpOnly cookie on login and register
- Auth middleware reads JWT from cookies as well as Authorization header
- Server-rendered nav shows "Login" or user info/Logout based on cookie presence
- Logout clears the cookie
- Auth error responses show user-friendly text instead of raw JSON

**Non-Goals:**
- Client-side JavaScript state management
- Refresh token rotation
- Remember-me / persistent sessions beyond cookie lifetime
- Role-based nav (every authenticated user sees the same nav)

## Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Token transport | httpOnly cookie on login/register + existing JSON body | Matches existing spec, works with htmx out of the box, auto-sent on every request, secure against XSS | localStorage + htmx header injection (not httpOnly, requires JS) |
| Cookie check in middleware | Fallback after Authorization header | Backward compatible — existing API clients using Bearer tokens continue to work | Cookie-only (breaks API clients) |
| Nav rendering | Server-side based on cookie presence in each route handler | No extra JS needed, works immediately with any page render | Client-side check via `/api/auth/me` (adds extra request, delays render) |
| Error display | Return `text/html` snippet for htmx requests instead of JSON when HX-Request is present | Clean error messages in the target div | Client-side JSON parsing (more complex, breaks fallback) |
| Logout | Clear cookie via `Set-Cookie: token=; Max-Age=0` | Simple, standard approach | Server-side blacklist (adds DB/storage dependency) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Cookie not sent cross-origin | CORS + same-origin policy — works for same-origin requests; API clients use the existing Bearer header instead |
| Cookie size limit (4KB) | JWT is well under 1KB — no concern |
| No CSRF protection on cookie-based auth | The app uses htmx with no cross-origin forms; acceptable for self-hosted. Add SameSite=Lax for basic protection. |
| Nav check on every page load reads cookie value | Cookie is sent with every request anyway — no additional overhead |
