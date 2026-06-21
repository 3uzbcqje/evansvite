## ADDED Requirements

### Requirement: Account deletion
The system SHALL allow authenticated users to permanently delete their own account.

#### Scenario: Successful account deletion
- **WHEN** an authenticated user submits a valid password confirmation to the account deletion endpoint
- **THEN** the system deletes their RSVPs, events, and user record, and returns a success response

#### Scenario: Wrong password prevents deletion
- **WHEN** an authenticated user submits an incorrect password to the account deletion endpoint
- **THEN** the system returns a 401 error and does not delete the account

#### Scenario: Data cleanup on deletion
- **WHEN** a user deletes their account
- **THEN** the system deletes all RSVPs made by that user
- **AND** the system deletes all events organized by that user
- **AND** the system removes or updates invite code references to that user
- **AND** the system deletes the user's follower/following records

#### Scenario: Re-registration after deletion
- **WHEN** a user deletes their account and later registers with the same email
- **THEN** the system treats it as a new account (no data retained from the deleted account)

#### Scenario: Account deletion page
- **WHEN** a user navigates to the account deletion page
- **THEN** the system shows a confirmation form with password input and a warning about data loss
