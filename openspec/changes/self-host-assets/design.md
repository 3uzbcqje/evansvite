## Context

The app uses htmx for dynamic frontend behavior. Previously, htmx was loaded from an unpkg.com CDN URL in the HTML layout. Any additional static assets (CSS libraries, JS utils) should follow the same self-hosted pattern.

## Goals / Non-Goals

**Goals:**
- All static assets served from the application server
- No external CDN script or style requests on page load
- Simple, extensible mechanism for adding future assets
- Backward compatible — no functional changes to the UI

**Non-Goals:**
- Bundling or minification pipeline (htmx is already minified in its npm package)
- Asset cache-busting or versioning (can be added later if needed)
- Serving user-uploaded files (separate concern)

## Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| Serving method | Route handler in `src/index.ts` that reads file at startup | Simple, no extra dependencies, file is in memory for fast response | `serveStatic` middleware (adds dependency), nginx proxy (adds infra complexity) |
| Asset path | `/static/*` | Conventional path for static files, easy to extend | `/assets/*`, `/js/*` |
| Storage | Read from `node_modules` at server start | htmx is an npm dependency, no need to copy files around | Copy to `public/` dir (duplication, needs build step) |
| File loading | `readFileSync` at module scope | Single read at startup, no disk I/O on requests | Lazy read per request (unnecessary I/O), dynamic import (complex) |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| htmx version pinned to what's in `node_modules` at build time | Standard npm versioning applies — update via `npm update htmx.org` |
| Large file read at startup blocks event loop | htmx.min.js is ~40KB — negligible impact |
| Path hardcoded to `node_modules/htmx.org/dist/htmx.min.js` | Must be updated if htmx package changes its dist structure — low probability |
