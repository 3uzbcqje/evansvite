## Purpose

Defines ActivityPub federation: actor discovery, inbox/outbox handling, follow relationships, and delivery of events across the fediverse.

## Requirements

### Requirement: Actor discovery via WebFinger
The system SHALL implement WebFinger so that users and instances can be discovered across the fediverse.

#### Scenario: WebFinger lookup for local user
- **WHEN** a remote instance performs a WebFinger lookup for `user@evansvite.example`
- **THEN** the system returns the actor URL and public key information

### Requirement: Actor representation
The system SHALL expose each user and the instance itself as ActivityPub Actors with standard endpoints (inbox, outbox, followers, following).

#### Scenario: Fetch actor profile
- **WHEN** a remote instance fetches a user's Actor JSON
- **THEN** the system returns a valid ActivityPub Actor object with id, inbox, outbox, followers, following, and publicKey

### Requirement: Outgoing activities
The system SHALL send ActivityPub activities when events are created, updated, or deleted to federated followers.

#### Scenario: Federate new event
- **WHEN** a user creates a public event
- **THEN** the system sends a `Create` activity with the Event object to all remote followers of the instance or user

#### Scenario: Federate event update
- **WHEN** an organizer updates a federated event
- **THEN** the system sends an `Update` activity to remote followers

#### Scenario: Federate event deletion
- **WHEN** an organizer deletes a federated event
- **THEN** the system sends a `Delete` activity to remote followers

### Requirement: Incoming activities
The system SHALL receive and process ActivityPub activities from remote instances.

#### Scenario: Receive remote event
- **WHEN** the system receives a `Create` activity containing an Event object from a remote instance
- **THEN** the system stores the federated event and displays it in the federated feed

#### Scenario: Receive remote event update
- **WHEN** the system receives an `Update` activity for a known federated event
- **THEN** the system updates the stored event data

#### Scenario: Receive remote event deletion
- **WHEN** the system receives a `Delete` activity for a known federated event
- **THEN** the system removes the event from the local database

### Requirement: Follow instance
The system SHALL support the `Follow` activity so instances can subscribe to each other's events.

#### Scenario: Instance follows another instance
- **WHEN** instance A sends a `Follow` activity targeting instance B's actor
- **THEN** instance B records the follow relationship and sends an `Accept` activity

#### Scenario: Instance unfollows
- **WHEN** instance A sends an `Undo` activity for a previous `Follow`
- **THEN** instance B removes the follow relationship and stops receiving events

### Requirement: HTTP Signature verification
The system SHALL verify HTTP Signatures on incoming ActivityPub requests to authenticate remote instances.

#### Scenario: Valid HTTP Signature
- **WHEN** a request includes a valid HTTP Signature matching a known actor
- **THEN** the system processes the activity

#### Scenario: Invalid or missing signature
- **WHEN** a request has an invalid or missing HTTP Signature
- **THEN** the system rejects the request with a 401 Unauthorized

### Requirement: ActivityPub Event object type
The system SHALL use a standard Event object type for federation, compatible with existing ActivityPub implementations.

#### Scenario: Event serialization
- **WHEN** a federated event is serialized to ActivityPub JSON
- **THEN** the object includes `type: "Event"`, `name`, `startTime`, `endTime`, `location`, `summary`, `attributedTo`, and `to`
