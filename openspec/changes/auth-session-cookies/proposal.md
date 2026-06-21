## Why

The login and registration flow returns a JWT token in the JSON response body, but nothing uses it client-side. After logging in, the browser has no token — the nav still shows "Login" and the user appears logged out. Error responses (e.g., wrong password) also show raw JSON like `{"error":"Invalid credentials"}` in the htmx target, which is confusing.

This makes every authenticated feature unusable: the user can log in but can't tell they're logged in, and no subsequent request includes an Authorization header.

## What Changes

- Set the JWT as an httpOnly cookie on login and register responses (matching the existing spec)
- Update `authMiddleware` to read the JWT from cookies as a fallback (alongside the Authorization header)
- Update the nav layout to show auth state server-side — display "Logout" / profile link when the cookie is present, "Login" when absent
- On logout, clear the cookie
- Display error messages from auth endpoints as user-friendly text instead of raw JSON

## Capabilities

### Modified Capabilities

- `user-auth`: Login and register now set an httpOnly cookie for session persistence. Nav shows auth state. Error display is user-friendly.

## Impact

- Login and register now set a `token` httpOnly cookie alongside the existing JSON body response
- `authMiddleware` gains a cookie check fallback — no breaking change to the Authorization header path
- `Logout` endpoint clears the cookie
- Layout renders nav links based on cookie presence
- `#result` div shows plain text error messages instead of raw JSON (e.g., "Invalid credentials" instead of `{"error":"Invalid credentials"}`)
- No schema changes
