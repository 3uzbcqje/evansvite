## Why

Users have no way to remove their account and associated data from the system. This is a privacy and data sovereignty concern — users should be able to delete their account if they no longer wish to use the service. Without this, the only option is to abandon the account, leaving personal data permanently stored.

## What Changes

- New `DELETE /api/auth/account` endpoint for authenticated account deletion
- Backend logic to delete or anonymize the user's personal data (rsvps, events, profile)
- A frontend account deletion page or section in the profile/account management area
- Confirmation step to prevent accidental deletion (e.g., "Are you sure?" prompt or re-enter password)

## Capabilities

### New Capabilities

- `user-account-deletion`: Authenticated users can permanently delete their own account and associated data.

### Modified Capabilities

- `user-auth`: Extended with account deletion functionality (new endpoint, UI, and data cleanup logic).

## Impact

- No schema changes needed (cascading deletes and soft-delete columns are already handled or added)
- New endpoint and frontend view — no existing routes modified
- RSVPs and events owned by the deleted user must be handled (anonymize or delete)
- No breaking changes to existing API responses or behavior
