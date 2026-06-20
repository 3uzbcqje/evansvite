## Why

Existing event management and RSVP platforms like Evite are proprietary, centralized services. Users have no control over their data, privacy, or the longevity of the service. There is no open-source, self-hostable alternative that uses decentralized protocols. evansVite fills this gap by providing a free, open-source, self-hostable event management platform built on ActivityPub — enabling a federated network of event-hosting instances, similar to how Lemmy works for social discussion.

## What Changes

- Creation of a new web service called evansVite from scratch
- User registration and authentication system
- Event creation, browsing, and RSVP management
- ActivityPub federation for event sharing between instances
- Local events feed showing events from the user's home instance
- Federated events feed showing events from known remote instances
- Self-hostable via Docker/deployment scripts

## Capabilities

### New Capabilities
- `user-auth`: User registration, login, session management, and profile management
- `event-management`: Create, read, update, and delete events with details (title, date, time, location, description, image)
- `rsvp-system`: RSVP to events with statuses (yes, no, maybe), attendee tracking, and capacity limits
- `activitypub-federation`: ActivityPub protocol implementation for sending/receiving event-related activities between instances; WebFinger, Actor, Inbox, Outbox, and Follow activities
- `event-feeds`: Local events feed and federated events feed with pagination and search
- `instance-admin`: Instance administration — moderation, invite codes or open registration toggle, instance metadata

### Modified Capabilities

_(None — this is the initial build.)_

## Impact

- New codebase — no existing code to modify
- New dependencies: a web framework (TBD, e.g., Node.js/Express, Go, or Python), ActivityPub library components, database (PostgreSQL or SQLite)
- No breaking changes to existing systems (greenfield project)
