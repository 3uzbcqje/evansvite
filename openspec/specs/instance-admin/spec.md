## ADDED Requirements

### Requirement: Instance configuration
The system SHALL allow the instance administrator to configure instance name, description, and icon/logo.

#### Scenario: Set instance metadata
- **WHEN** the admin updates instance name and description
- **THEN** the system saves the configuration and displays it on the instance about page

#### Scenario: Set instance icon
- **WHEN** the admin uploads an instance icon
- **THEN** the system serves the icon as the instance avatar in ActivityPub Actor representation

### Requirement: Registration control
The system SHALL allow the instance admin to toggle open registration or require invite codes.

#### Scenario: Enable open registration
- **WHEN** the admin enables open registration
- **THEN** new users can register without an invite code

#### Scenario: Require invite codes
- **WHEN** the admin disables open registration
- **THEN** new users require a valid invite code to register

#### Scenario: Generate invite codes
- **WHEN** the admin generates invite codes
- **THEN** the system creates one-time-use invite codes the admin can share

### Requirement: Moderation
The system SHALL provide moderation tools to block or silence remote instances.

#### Scenario: Block remote instance
- **WHEN** the admin blocks a remote instance
- **THEN** the system drops all activities from that instance and removes its events from the federated feed

#### Scenario: Unblock remote instance
- **WHEN** the admin unblocks a remote instance
- **THEN** the system resumes accepting activities from that instance

#### Scenario: Delete reported event
- **WHEN** the admin deletes a federated event
- **THEN** the system removes the event from the local database and federated feed
