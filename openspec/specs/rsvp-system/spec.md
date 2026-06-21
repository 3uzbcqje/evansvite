## Purpose

Defines how authenticated users RSVP to events (yes/no/maybe), how RSVPs are updated and counted, and how attendee lists are displayed.

## Requirements

### Requirement: RSVP to event
The system SHALL allow any authenticated user to RSVP to an event with a status of "yes", "no", or "maybe".

#### Scenario: Successful RSVP
- **WHEN** an authenticated user submits an RSVP with status "yes"
- **THEN** the system records the RSVP and displays the user in the attendee list

#### Scenario: Change RSVP
- **WHEN** a user who already RSVPed submits a different status
- **THEN** the system updates the existing RSVP

#### Scenario: Cancel RSVP
- **WHEN** a user submits an RSVP with status "no"
- **THEN** the system records the decline and removes from the attendee count

#### Scenario: Unauthenticated RSVP rejected
- **WHEN** an unauthenticated user attempts to RSVP
- **THEN** the system returns a 401 Unauthorized

### Requirement: Capacity limits
The system SHALL enforce optional event capacity limits.

#### Scenario: RSVP accepted within capacity
- **WHEN** a user RSVPs "yes" to an event that has available capacity
- **THEN** the system confirms the RSVP

#### Scenario: Capacity full
- **WHEN** a user RSVPs "yes" to an event that has reached capacity
- **THEN** the system places the user on a waitlist and notifies them

### Requirement: Attendee list
The system SHALL display the list of confirmed attendees for an event.

#### Scenario: View attendees
- **WHEN** any visitor views an event page
- **THEN** the system shows the list of confirmed attendees with their display names and avatars

#### Scenario: Attendee count displayed
- **WHEN** any visitor views an event page
- **THEN** the system shows the total number of confirmed attendees and capacity (if set)
