## 1. Project Scaffolding

- [x] 1.1 Initialize project with package.json and tsconfig.json
- [x] 1.2 Install dependencies (Hono, Drizzle ORM, PostgreSQL driver, JWT library, bcrypt)
- [x] 1.3 Set up project directory structure (src/routes, src/db, src/lib, src/middleware)
- [x] 1.4 Configure Drizzle schema and database connection
- [x] 1.5 Create Dockerfile and docker-compose.yml (app + postgres)
- [x] 1.6 Set up ESLint, Prettier, and basic CI configuration

## 2. User Authentication

- [x] 2.1 Implement user registration endpoint (POST /api/auth/register)
- [x] 2.2 Implement login endpoint (POST /api/auth/login) with JWT session token
- [x] 2.3 Implement logout endpoint (POST /api/auth/logout)
- [x] 2.4 Create auth middleware for protected routes
- [x] 2.5 Create user profile schema and model (display name, bio, avatar)
- [x] 2.6 Implement profile view and edit endpoints (GET/PUT /api/users/:id/profile)
- [x] 2.7 Implement password hashing with bcrypt

## 3. Event Management

- [x] 3.1 Create event database schema (title, date/time, location, description, image, capacity, visibility)
- [x] 3.2 Implement event creation endpoint (POST /api/events)
- [x] 3.3 Implement event update endpoint (PUT /api/events/:id)
- [x] 3.4 Implement event deletion endpoint (DELETE /api/events/:id)
- [x] 3.5 Implement event detail endpoint (GET /api/events/:id)
- [x] 3.6 Add organizer authorization checks on mutate endpoints
- [x] 3.7 Add input validation for all event fields

## 4. RSVP System

- [x] 4.1 Create RSVP database schema (user_id, event_id, status: yes/no/maybe)
- [x] 4.2 Implement RSVP create/update endpoint (POST /api/events/:id/rsvp)
- [x] 4.3 Implement capacity check and waitlist logic
- [x] 4.4 Implement attendee list endpoint (GET /api/events/:id/attendees)
- [x] 4.5 Display attendee count on event detail page

## 5. Event Feeds

- [x] 5.1 Implement local events feed endpoint (GET /api/events?scope=local) with pagination
- [x] 5.2 Implement federated events feed endpoint (GET /api/events?scope=federated) with pagination
- [x] 5.3 Implement event search endpoint (GET /api/events/search?q=keyword)
- [x] 5.4 Handle empty states for all feed endpoints

## 6. ActivityPub Federation

- [x] 6.1 Implement WebFinger endpoint (GET /.well-known/webfinger?resource=...)
- [x] 6.2 Create ActivityPub Actor representation for users and instance
- [x] 6.3 Implement actor endpoint (GET /activitypub/actor/:username)
- [x] 6.4 Implement inbox endpoint (POST /activitypub/inbox)
- [x] 6.5 Implement outbox endpoint (GET /activitypub/outbox)
- [x] 6.6 Implement outgoing activity delivery (Create, Update, Delete for Event objects)
- [x] 6.7 Implement incoming activity processing (Create, Update, Delete, Follow, Accept, Undo)
- [x] 6.8 Implement Follow/Unfollow instance logic
- [x] 6.9 Implement HTTP Signature verification for incoming requests
- [x] 6.10 Implement remote content fetching and caching

## 7. Instance Administration

- [x] 7.1 Create instance configuration schema and admin endpoints
- [x] 7.2 Implement open/invite-only registration toggle
- [x] 7.3 Implement invite code generation and validation
- [x] 7.4 Implement instance block/unblock moderation
- [x] 7.5 Implement federated event deletion by admin

## 8. Frontend

- [x] 8.1 Set up Hono JSX HTML template rendering with htmx
- [x] 8.2 Create login and registration pages
- [x] 8.3 Create event creation and edit forms
- [x] 8.4 Create event detail page with RSVP button and attendee list
- [x] 8.5 Create local events feed page
- [x] 8.6 Create federated events feed page
- [x] 8.7 Create event search page with live search
- [x] 8.8 Create user profile page
- [x] 8.9 Create admin settings, invite codes, and moderation pages
- [x] 8.10 Create instance about page

## 9. Deployment & Documentation

- [x] 9.1 Finalize Docker Compose configuration with environment variables
- [x] 9.2 Write setup and configuration documentation
- [x] 9.3 Write federation administration guide
- [x] 9.4 Add health check endpoint (GET /api/health)
- [x] 9.5 Create seed/migration scripts for initial database setup
