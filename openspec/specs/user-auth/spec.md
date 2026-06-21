## Purpose

Defines user registration, login and logout, session handling, and account management for the platform.

## Requirements

### Requirement: User registration
The system SHALL allow new users to register with an email address and password.

#### Scenario: Successful registration
- **WHEN** a user submits a valid email and password
- **THEN** the system creates an account and returns a session token

#### Scenario: Duplicate email
- **WHEN** a user submits an email that is already registered
- **THEN** the system returns an error message that the email is already in use

#### Scenario: Weak password rejected
- **WHEN** a user submits a password shorter than 8 characters
- **THEN** the system returns an error that the password does not meet requirements

### Requirement: User login
The system SHALL authenticate users via email and password and issue a session token.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the system creates a session and returns a JWT in an httpOnly cookie

#### Scenario: Invalid credentials
- **WHEN** a user submits an incorrect email or password
- **THEN** the system returns a generic "invalid credentials" error

### Requirement: Session management
The system SHALL maintain user sessions and allow logout.

#### Scenario: Authenticated request
- **WHEN** a request includes a valid session cookie
- **THEN** the system identifies the user and processes the request

#### Scenario: Expired session
- **WHEN** a request includes an expired session cookie
- **THEN** the system returns a 401 Unauthorized and prompts re-login

#### Scenario: Logout
- **WHEN** a user clicks logout
- **THEN** the system invalidates the session and clears the cookie

### Requirement: Profile management
The system SHALL allow users to view and edit their profile (display name, bio, avatar).

#### Scenario: View own profile
- **WHEN** an authenticated user views their profile
- **THEN** the system displays their display name, bio, and avatar

#### Scenario: Edit profile
- **WHEN** an authenticated user submits updated profile fields
- **THEN** the system updates and saves the changes

#### Scenario: View other user's public profile
- **WHEN** any user views another user's profile
- **THEN** the system shows the display name, bio, avatar, and public event history

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
