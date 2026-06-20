## ADDED Requirements

### Requirement: Create event
The system SHALL allow authenticated users to create events with title, date/time, location, description, image, and optional capacity limit.

#### Scenario: Successful event creation
- **WHEN** an authenticated user submits valid event details
- **THEN** the system creates the event and assigns the user as the organizer

#### Scenario: Unauthenticated creation rejected
- **WHEN** an unauthenticated user attempts to create an event
- **THEN** the system returns a 401 Unauthorized

#### Scenario: Missing required fields
- **WHEN** a user submits an event without a title or date
- **THEN** the system returns validation errors for the missing fields

### Requirement: Update event
The system SHALL allow the event organizer to update event details.

#### Scenario: Organizer updates event
- **WHEN** the event organizer submits updated event details
- **THEN** the system updates the event

#### Scenario: Non-organizer update rejected
- **WHEN** a user who is not the organizer attempts to update the event
- **THEN** the system returns a 403 Forbidden

### Requirement: Delete event
The system SHALL allow the event organizer to delete an event.

#### Scenario: Organizer deletes event
- **WHEN** the event organizer clicks delete
- **THEN** the system removes the event and notifies confirmed attendees

#### Scenario: Non-organizer delete rejected
- **WHEN** a user who is not the organizer attempts to delete the event
- **THEN** the system returns a 403 Forbidden

### Requirement: View event details
The system SHALL display event details to any visitor.

#### Scenario: View public event
- **WHEN** any visitor navigates to an event page
- **THEN** the system displays the event title, date/time, location, description, image, organizer, and attendee count

#### Scenario: Event not found
- **WHEN** a visitor navigates to a non-existent event
- **THEN** the system returns a 404 Not Found

### Requirement: Event privacy
The system SHALL support public and unlisted event visibility settings.

#### Scenario: Public event discoverable
- **WHEN** a user creates a public event
- **THEN** the event appears in feeds and is federated to other instances

#### Scenario: Unlisted event hidden from feeds
- **WHEN** a user creates an unlisted event
- **THEN** the event is accessible via direct link but excluded from feeds and federation
