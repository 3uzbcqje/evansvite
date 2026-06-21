## 1. API Endpoint — Account Deletion

- [x] 1.1 Add `DELETE /api/auth/account` route in `src/routes/auth/index.ts`
- [x] 1.2 Require `authMiddleware` to authenticate the request
- [x] 1.3 Accept password in request body for confirmation
- [x] 1.4 Verify password against stored hash before proceeding
- [x] 1.5 Delete all RSVPs belonging to the user (`rsvps` table)
- [x] 1.6 Delete all events owned by the user (`events` table)
- [x] 1.7 Update invite codes referencing the user (`invite_codes.usedBy` → null, delete `invite_codes.createdBy` = user.id)
- [x] 1.8 Delete the user record (`users` table)
- [x] 1.9 Return 200 on success, 401 on wrong password, 401 on no auth

## 2. Frontend — Account Deletion Page

- [x] 2.1 Add `GET /account/delete` page route in `src/routes/pages.ts`
- [x] 2.2 Create a confirmation form with:
  - Warning text explaining what will be deleted (account, events, RSVPs)
  - Password input for re-authentication
  - "Delete My Account" submit button (styled as danger/red)
  - "Cancel" link back to profile or home
- [x] 2.3 Form submits via htmx `hx-delete="/api/auth/account"` with `hx-target` for result display
- [x] 2.4 Handle success response: redirect to `/` with cleared session (via `HX-Redirect`)
- [x] 2.5 Handle error response: display error message (e.g., wrong password) via htmx target
- [x] 2.6 Add "Delete Account" link to profile page

## 3. Verification

- [x] 3.1 Verify RSVPs are deleted for the removed user
- [x] 3.2 Verify events owned by the user are deleted
- [x] 3.3 Verify FK constraints are satisfied (no orphaned references)
- [x] 3.4 Verify re-registration with the same email works after deletion
- [x] 3.5 Verify wrong password returns 401 and does not delete
