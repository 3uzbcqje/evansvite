## Why

The application previously loaded htmx from an external CDN (unpkg.com). CDN dependencies create several problems:

- **Requires internet access**: The app cannot function fully offline or in air-gapped deployments
- **External failure point**: If the CDN is down or the URL changes, the UI breaks
- **Privacy leak**: Browser requests third-party domains even for a self-hosted app
- **Ad-blocker interference**: Users with ad-blockers may block CDN scripts, breaking functionality
- **Latency**: Adds an extra DNS lookup and HTTP round-trip for every page load

All assets should be served from the application server itself.

## What Changes

- Replace the CDN-sourced htmx script tag with a local `/static/htmx.min.js` route
- Serve htmx from a route handler that reads the file from `node_modules` at startup
- Update the HTML layout to reference the local path
- Establish a convention for serving future static assets locally

## Capabilities

### New Capabilities

- `static-asset-serving`: Static assets (JavaScript, CSS) are served from the application server via `/static/*` routes.

### Modified Capabilities

- `frontend`: The layout template no longer depends on external CDNs. All assets are self-hosted.

## Impact

- htmx is now a runtime dependency (`htmx.org` package) instead of a dev-only CDN reference
- One new route handler in `src/index.ts` serving the htmx file
- The layout template (`src/views/layout.tsx`) changes its script `src` from CDN URL to `/static/htmx.min.js`
- No external network requests on page load — fully self-contained
- No breaking changes to existing behavior
