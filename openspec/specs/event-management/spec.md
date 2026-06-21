## Purpose

Defines how users create, update, delete, and view events — across both the JSON API and the server-rendered HTML surface — including organizer ownership rules and event visibility.
## Requirements
### Requirement: Create event
The system SHALL allow authenticated users to create events with title, date/time, location, description, image, and optional capacity limit, through both the JSON API and the server-rendered HTML form.

#### Scenario: Successful event creation
- **WHEN** an authenticated user submits valid event details
- **THEN** the system creates the event and assigns the user as the organizer

#### Scenario: Unauthenticated creation rejected
- **WHEN** an unauthenticated user attempts to create an event
- **THEN** the system returns a 401 Unauthorized

#### Scenario: Missing required fields
- **WHEN** a user submits an event without a title or date
- **THEN** the system returns validation errors for the missing fields

#### Scenario: Authenticated user opens the create form
- **WHEN** an authenticated user navigates to the new-event page
- **THEN** the system renders an event creation form with fields for title, start time, optional end time, location, description, image URL, capacity, and visibility

#### Scenario: Unauthenticated user blocked from create form
- **WHEN** an unauthenticated user navigates to the new-event page
- **THEN** the system redirects them to the login page instead of rendering the form

#### Scenario: Successful creation via HTML form redirects to event
- **WHEN** an authenticated user submits a valid create form
- **THEN** the system creates the event owned by that user and navigates the browser to the new event's detail page

#### Scenario: Invalid HTML form submission re-renders with errors
- **WHEN** an authenticated user submits an invalid create form
- **THEN** the system re-renders the form with the submitted values and a validation error message, and does not create an event

### Requirement: Update event
The system SHALL allow the event organizer to update event details, through both the JSON API and the server-rendered HTML form.

#### Scenario: Organizer updates event
- **WHEN** the event organizer submits updated event details
- **THEN** the system updates the event

#### Scenario: Non-organizer update rejected
- **WHEN** a user who is not the organizer attempts to update the event
- **THEN** the system returns a 403 Forbidden

#### Scenario: Organizer opens the edit form
- **WHEN** the event organizer navigates to the edit page for their event
- **THEN** the system renders an edit form pre-filled with the event's current details

#### Scenario: Non-organizer blocked from edit form
- **WHEN** a user who is not the organizer navigates to the edit page
- **THEN** the system denies access with a 403 Forbidden and does not render the form

#### Scenario: Successful update via HTML form redirects to event
- **WHEN** the organizer submits a valid edit form
- **THEN** the system updates the event and navigates the browser to the event's detail page

### Requirement: Delete event
The system SHALL allow the event organizer to delete an event, through both the JSON API and the server-rendered HTML controls.

#### Scenario: Organizer deletes event
- **WHEN** the event organizer clicks delete
- **THEN** the system removes the event and notifies confirmed attendees

#### Scenario: Non-organizer delete rejected
- **WHEN** a user who is not the organizer attempts to delete the event
- **THEN** the system returns a 403 Forbidden

#### Scenario: Delete control visible only to organizer
- **WHEN** a visitor views an event detail page
- **THEN** the system shows Edit and Delete controls only when the current authenticated user is the event organizer

#### Scenario: Organizer deletes via HTML control
- **WHEN** the organizer triggers delete from the event detail page
- **THEN** the system removes the event and navigates the browser away from the now-deleted event page

### Requirement: View event details
The system SHALL display event details to any visitor, and SHALL surface organizer management controls to the organizer.

#### Scenario: View public event
- **WHEN** any visitor navigates to an event page
- **THEN** the system displays the event title, date/time, location, description, image, organizer, and attendee count

#### Scenario: Event not found
- **WHEN** a visitor navigates to a non-existent event
- **THEN** the system returns a 404 Not Found

#### Scenario: Organizer sees management controls
- **WHEN** the event organizer views their own event's detail page
- **THEN** the system displays Edit and Delete controls alongside the event details

### Requirement: Event privacy
The system SHALL support public and unlisted event visibility settings.

#### Scenario: Public event discoverable
- **WHEN** a user creates a public event
- **THEN** the event appears in feeds and is federated to other instances

#### Scenario: Unlisted event hidden from feeds
- **WHEN** a user creates an unlisted event
- **THEN** the event is accessible via direct link but excluded from feeds and federation

