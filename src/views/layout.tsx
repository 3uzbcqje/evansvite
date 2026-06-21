import { raw } from "hono/html";
import type { Child } from "hono/jsx";

const STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; color: #333; }
nav { background: #fff; border-bottom: 1px solid #ddd; padding: 1rem 2rem; display: flex; gap: 1.5rem; align-items: center; }
nav a { text-decoration: none; color: #555; font-weight: 500; }
nav a:hover { color: #000; }
nav .brand { font-weight: 700; font-size: 1.2rem; color: #000; margin-right: auto; }
.container { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
.card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.btn { display: inline-block; padding: .5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-size: .9rem; text-decoration: none; }
.btn-primary { background: #4361ee; color: #fff; }
.btn-primary:hover { background: #3a56d4; }
.btn-outline { background: none; border: 1px solid #4361ee; color: #4361ee; }
.btn-outline:hover { background: #4361ee; color: #fff; }
.btn-danger { background: #e63946; color: #fff; }
.btn-sm { padding: .3rem .7rem; font-size: .8rem; }
input, textarea, select { width: 100%; padding: .5rem; border: 1px solid #ddd; border-radius: 6px; font-size: .9rem; }
textarea { min-height: 100px; resize: vertical; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 500; margin-bottom: .3rem; font-size: .9rem; }
.event-card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.event-card h3 { margin-bottom: .5rem; }
.event-card .meta { color: #777; font-size: .85rem; margin-bottom: .5rem; }
.event-card .meta span { margin-right: 1rem; }
.badge { display: inline-block; padding: .2rem .5rem; border-radius: 4px; font-size: .75rem; font-weight: 600; }
.badge-local { background: #e0f2fe; color: #0369a1; }
.badge-remote { background: #fef3c7; color: #92400e; }
.tabs { display: flex; gap: 0; margin-bottom: 1.5rem; border-bottom: 2px solid #ddd; }
.tabs a { padding: .5rem 1rem; text-decoration: none; color: #777; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tabs a.active { color: #4361ee; border-bottom-color: #4361ee; }
.search-bar { display: flex; gap: .5rem; margin-bottom: 1.5rem; }
.search-bar input { flex: 1; }
.pagination { text-align: center; margin-top: 1rem; }
.alert { padding: .8rem; border-radius: 6px; margin-bottom: 1rem; }
.alert-error { background: #fee2e2; color: #991b1b; }
.alert-success { background: #dcfce7; color: #166534; }
`;

export function Layout(props: {
  title: string;
  children: Child;
  user?: { userId: number; email: string } | null;
}) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{props.title} - evansVite</title>
          <script src="/static/htmx.min.js"></script>
          <style>{raw(STYLES)}</style>
        </head>
        <body>
          <nav>
            <a href="/" class="brand">evansVite</a>
            <a href="/events/local">Local Events</a>
            <a href="/events/federated">Federated</a>
            <a href="/events/search">Search</a>
            {props.user ? (
              <>
                <a href="/events/new">New Event</a>
                <a href={`/profile/${props.user.userId}`} style="font-weight:600">{props.user.email}</a>
                <a href="/api/auth/logout" id="logout-link">Logout</a>
              </>
            ) : (
              <a href="/login" id="auth-link">Login</a>
            )}
          </nav>
          <div class="container">{props.children}</div>
        </body>
      </html>
    </>
  );
}
