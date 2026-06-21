## Context

Users need the ability to permanently delete their account and associated data. Currently there is no mechanism for data removal — accounts persist indefinitely.

## Goals / Non-Goals

**Goals:**
- Authenticated users can delete their own account via API
- All personal data is removed or anonymized (events, RSVPs, invite codes)
- A UI page/section allows users to request deletion with password confirmation
- Toast/success feedback and redirect after deletion
- Password re-entry required to prevent accidental or unauthorized deletion

**Non-Goals:**
- Admin-initiated user deletion (out of scope)
- Soft-delete or account restoration (permanent deletion only)
- GDPR data export (separate feature)
- Bulk account deletion

## Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Endpoint | `DELETE /api/auth/account` | Follows existing auth route pattern (`/api/auth/*`) | `DELETE /api/users/:id` (would allow deleting other users) |
| Auth | Requires `authMiddleware` + password re-confirmation in body | Prevents XSRF and accidental deletion | No confirmation (risk of accidental deletion) |
| Event handling | Delete all events owned by user | Cleanest outcome — user's events go with their account | Anonymize (leaves orphaned content), reassign to "deleted user" record (more complex) |
| RSVP handling | Delete all RSVPs by user | No reason to keep attendance records for deleted users | Keep anonymized (no benefit) |
| Follower records | Delete follower/following records | User is gone, no need to maintain federation links | Keep (no meaningful target) |
| Invite codes | Update `usedBy` to null, reassign `createdBy` to admin or null | Preserves invite code integrity without FK violation | Delete all (loses audit trail) |
| Frontend route | `GET /account/delete` with confirmation form | Simple page under an account management section | Modal on profile (harder to style), separate settings page |
| Redirect after deletion | Redirect to `/` with cleared auth state | User is logged out, home page is the natural landing | Redirect to goodbye page (extra page to maintain) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| User deletes account with upcoming events they organize | Events are deleted too — this is intentional; user is warned on the confirmation page |
| Password confirmation is weak against session hijacking | Acceptable for self-hosted; session + re-auth is reasonable for this use case |
| FK constraints on `events.organizerId` block deletion | Delete events before user record in the handler (ordered DML) |
| User re-registers with same email after deletion | Email is unique — deletion removes the row so re-registration is possible |
