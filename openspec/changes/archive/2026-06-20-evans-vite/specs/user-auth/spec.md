## ADDED Requirements

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
