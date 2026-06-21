## 1. Set JWT as httpOnly cookie on login and register

- [x] 1.1 In `src/routes/auth/index.ts`, add `Set-Cookie` header to login success response (httpOnly, SameSite=Lax, Path=/, max-age=7 days)
- [x] 1.2 Add same `Set-Cookie` header to register success response
- [x] 1.3 Add same `Set-Cookie` header to the register success response for htmx requests too
- [x] 1.4 On logout, clear the cookie via `Set-Cookie: token=; Max-Age=0`

## 2. Update auth middleware to read JWT from cookies

- [x] 2.1 In `src/middleware/auth.ts`, add a fallback to read the token from `c.req.cookie("token")` when no Authorization header is present
- [x] 2.2 Verify existing Authorization header path still works (backward compatible)
- [x] 2.3 Ensure `optionalAuthMiddleware` also checks cookies

## 3. Update nav to show auth state

- [x] 3.1 In `src/views/layout.tsx`, accept an optional `user` prop for auth state
- [x] 3.2 Update nav to show "Login" link when no user, and "Profile" / "Logout" when logged in
- [x] 3.3 Update `src/routes/pages.ts` to pass `user` from the JWT cookie to the Layout on every page render
- [x] 3.4 In non-page routes that use Layout, add a helper to decode the cookie token

## 4. User-friendly error display

- [x] 4.1 In `src/routes/auth/index.ts`, return plain text error messages for htmx requests (when `HX-Request` header is present) instead of JSON
- [x] 4.2 Return HTML snippet with styling (e.g., `<p style="color:#e63946">Invalid credentials</p>`) for htmx requests, so it renders cleanly in the `#result` div
- [x] 4.3 Verify login and register error responses look correct in the `#result` div
