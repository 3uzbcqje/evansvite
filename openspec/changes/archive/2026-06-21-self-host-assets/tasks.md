## 1. Serve htmx locally

- [x] 1.1 Install `htmx.org` as a runtime dependency
- [x] 1.2 Read `htmx.min.js` from node_modules at server startup in `src/index.ts`
- [x] 1.3 Add `GET /static/htmx.min.js` route handler serving the file with `Content-Type: application/javascript`
- [x] 1.4 Update `src/views/layout.tsx` to load htmx from `/static/htmx.min.js` instead of the CDN URL
- [x] 1.5 Add `action` and `method` fallback attributes to login and register forms (in `src/routes/pages.ts`) as a safety net if htmx fails to load

## 2. Verify no remaining CDN references

- [x] 2.1 Audit all `.ts` and `.tsx` files for external script/style CDN URLs
- [x] 2.2 Confirm all resource loads come from the application server
- [x] 2.3 Verify htmx is served correctly via `/static/htmx.min.js`
- [x] 2.4 Verify login and register forms submit successfully with local htmx

## 3. Documentation

- [x] 3.1 Document the self-hosted asset convention in project docs (all static assets go under `/static/*`, served from a route handler)
- [x] 3.2 Add a note to the README about the no-CDN policy
