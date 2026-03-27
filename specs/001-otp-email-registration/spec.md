# Feature Specification: OTP Email Verification for Registration

**Feature Branch**: `001-otp-email-registration`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Add new functionality to registration proccess in which now will be added otp check by email, and only new users with devit email will be allowed to register."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Registration with Devit Email and OTP (Priority: P1)

A new user with a valid `@devit.group` email address opens the registration form, submits
their details, receives a one-time code by email, enters it, and gains access to the
platform as a newly created account holder.

**Why this priority**: This is the end-to-end happy path that defines the core value of
the feature. Without this working, nothing else in the feature is deliverable.

**Independent Test**: Can be fully tested by submitting a `@devit.group` email through the
registration form, retrieving the OTP from the inbox, entering it, and confirming a new
account exists and the user is redirected to the post-registration destination.

**Acceptance Scenarios**:

1. **Given** a user on the registration page who has not previously registered, **When**
   they submit a valid `@devit.group` email address and their registration details, **Then**
   the system sends a one-time code to that email and displays an OTP entry screen.
2. **Given** the OTP entry screen is displayed, **When** the user enters the correct
   code within the validity window, **Then** the system creates their account and
   redirects them to the post-registration destination.
3. **Given** a successful registration, **When** the user attempts to register again
   with the same email, **Then** the system informs them the email is already registered
   and prevents duplicate account creation.

---

### User Story 2 - Non-Devit Email Rejected at Submission (Priority: P2)

A user who does not hold a `@devit.group` email attempts to register and is turned away
at the point of email entry — before any OTP is issued — with a clear explanation.

**Why this priority**: Domain restriction is a security and access-control gate; it must
be in place before any OTP infrastructure goes live so that only authorised users reach
the next step.

**Independent Test**: Can be fully tested by submitting an email address from any domain
other than `@devit.group` and confirming the form shows a rejection message and does not
proceed to the OTP step.

**Acceptance Scenarios**:

1. **Given** a user on the registration page, **When** they submit an email address that
   does not end in `@devit.group` (e.g., `user@gmail.com`, `user@company.org`), **Then**
   the system immediately rejects the submission with a message stating that only
   `@devit.group` addresses are permitted, and no OTP is generated or sent.
2. **Given** a user who submits a malformed email address, **When** the form is
   submitted, **Then** the system rejects the submission with a validation error before
   domain checking occurs.

---

### User Story 3 - OTP Expiry and Resend (Priority: P3)

A user with a valid `@devit.group` email either did not receive the OTP or let it expire
and requests a new one, allowing them to complete registration without starting over.

**Why this priority**: Without a resend mechanism, any delivery delay causes the user to
be permanently stuck; this is required for a usable registration flow even if it can
ship shortly after the core path.

**Independent Test**: Can be fully tested by advancing time past the OTP validity window
(or triggering an expiry scenario), requesting a new code, and completing registration
with the fresh OTP.

**Acceptance Scenarios**:

1. **Given** a user on the OTP entry screen whose code has passed the validity window,
   **When** they submit the expired code, **Then** the system rejects it with a message
   indicating the code has expired and offers a resend option.
2. **Given** a user on the OTP entry screen, **When** they request a new OTP, **Then**
   the system invalidates any previously issued code for that email, generates a fresh
   code, sends it, and resets the validity timer.
3. **Given** a user who has requested the maximum number of OTPs allowed within the
   rate-limit window, **When** they attempt to request another, **Then** the system
   refuses and informs them how long they must wait before trying again.

---

### UI State Coverage *(mandatory for user-facing features)*

- **Loading**: A visible progress indicator is shown on the registration form while the
  OTP is being generated and dispatched, and on the OTP entry screen while the submitted
  code is being verified. Interactive elements are disabled during these transitions to
  prevent duplicate submissions.
- **Error**: Inline error messages appear directly below the relevant field for: invalid
  email domain, malformed email, incorrect OTP code, expired OTP code, and rate-limit
  reached. Each message includes a clear recovery action (e.g., "Request a new code",
  "Use a @devit.group email address").
- **Empty**: The OTP entry field starts blank with a placeholder that instructs the user
  where to find their code (e.g., "Check your @devit.group inbox").
- **Success**: After successful OTP verification, the user sees a brief confirmation
  before being automatically redirected to the post-registration destination. No manual
  action is required to proceed.

### Edge Cases

- What happens when the user submits the OTP entry form with an empty code field?
- What happens if the email delivery service fails to dispatch the OTP?
- What if the user navigates away from the OTP screen and returns via the browser's
  back button — is the session preserved or does the flow restart?
- What if an attacker attempts to brute-force the OTP by submitting many guesses?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reject any registration submission whose email address does not
  belong to the `@devit.group` domain and MUST display an explanatory message to the user.
- **FR-002**: System MUST generate a unique, time-limited one-time code upon successful
  domain validation and MUST deliver it to the submitted `@devit.group` email address.
- **FR-003**: System MUST present the user with an OTP entry screen after dispatching the
  code, without requiring the user to navigate away from the registration flow.
- **FR-004**: System MUST verify the submitted OTP against the issued code before
  creating the user account; account creation MUST NOT occur without a successful match.
- **FR-005**: System MUST expire OTP codes after 10 minutes from issuance and MUST
  communicate expiry clearly to the user at the point of failed submission.
- **FR-006**: System MUST invalidate a previously issued OTP for a given email when a
  new code is requested, ensuring only the most recently issued code is ever valid.
- **FR-007**: System MUST allow users to request a replacement OTP from the OTP entry
  screen, subject to rate-limiting.
- **FR-008**: System MUST enforce a rate limit of no more than 3 OTP requests per email
  address per hour and MUST inform the user of the wait period when the limit is reached.
- **FR-009**: System MUST prevent creation of duplicate accounts; a `@devit.group` email
  that already has a registered account MUST be rejected with an appropriate message.
- **FR-010**: System MUST ensure each OTP code can be used only once; a successfully
  verified code MUST be immediately invalidated to prevent replay use.

### Key Entities

- **OTPRequest**: Represents a single issued one-time code. Attributes: target email
  address, the code value, issuance timestamp, expiry timestamp, consumed status. Related
  to a pending registration attempt.
- **PendingRegistration**: Represents an in-progress registration that has passed domain
  validation but has not yet completed OTP verification. Holds the user-supplied
  registration details until verification succeeds or the session expires.
- **User**: Represents a successfully registered account. Gains an entry in the system
  only after OTP verification succeeds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user with a valid `@devit.group` address can complete the full
  registration flow (form submission → OTP receipt → verification → account created) in
  under 3 minutes under normal conditions.
- **SC-002**: 100% of registration attempts using a non-`@devit.group` email address are
  blocked before an OTP is generated or any account record is created.
- **SC-003**: OTP emails are delivered to the user's inbox within 60 seconds of
  submission in at least 95% of attempts.
- **SC-004**: Zero user accounts are created without a successfully verified, non-expired,
  single-use OTP — verified via audit of the registration log.
- **SC-005**: Users who receive an expired or undelivered OTP can successfully re-request
  a code and complete registration without abandoning the flow.

## Assumptions

- "Devit email" refers specifically to the `@devit.group` email domain.
- An existing registration form and user account system are already in place; this
  feature extends the existing flow rather than replacing it.
- The platform already has access to an email dispatch capability; this feature adds a
  new trigger to it rather than building email sending from scratch.
- OTP codes are 6 digits, numeric only — consistent with widely recognised patterns that
  minimise user error during manual entry.
- OTP validity window is 10 minutes — a common industry default that balances security
  with usability.
- Rate limit for OTP resend is 3 requests per hour per email address.
- The restriction applies only to new registrations; existing user accounts and the
  login flow are out of scope and remain unchanged.
- Mobile browser support is included; no separate native-app OTP flow is in scope.
- There is no requirement for SMS-based OTP delivery in this version; email is the sole
  channel.
