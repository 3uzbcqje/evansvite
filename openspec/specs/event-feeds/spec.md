## ADDED Requirements

### Requirement: Local events feed
The system SHALL display a paginated feed of all public local events.

#### Scenario: View local feed
- **WHEN** any visitor navigates to the local events page
- **THEN** the system displays public events from the local instance ordered by date (upcoming first)

#### Scenario: Local feed pagination
- **WHEN** a visitor scrolls past the first page of events
- **THEN** the system loads and displays the next page of events

#### Scenario: Empty local feed
- **WHEN** there are no upcoming local events
- **THEN** the system displays a message that no events are scheduled

### Requirement: Federated events feed
The system SHALL display a paginated feed of public events from federated remote instances.

#### Scenario: View federated feed
- **WHEN** any visitor navigates to the federated events page
- **THEN** the system displays public events from all followed remote instances ordered by date (upcoming first)

#### Scenario: Federated feed pagination
- **WHEN** a visitor scrolls past the first page of federated events
- **THEN** the system loads and displays the next page

#### Scenario: Federated event shows source instance
- **WHEN** a federated event appears in the feed
- **THEN** the system displays the source instance name next to the event

### Requirement: Event search
The system SHALL allow searching events by title and description.

#### Scenario: Search finds matching events
- **WHEN** a visitor searches for a keyword matching event titles or descriptions
- **THEN** the system displays matching events from both local and federated feeds

#### Scenario: Search returns no results
- **WHEN** a visitor searches for a keyword that matches no events
- **THEN** the system displays a "no results" message with a suggestion to broaden the search
