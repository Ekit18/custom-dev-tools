# Quickstart: OTP Email Verification for Registration

**Branch**: `001-otp-email-registration` | **Date**: 2026-03-27

Use this guide to set up, run, and manually validate the feature end-to-end on a local
development machine.

---

## Prerequisites

- Node.js 20+ installed
- `npm` available
- A [Resend](https://resend.com) account with an API key and a verified sending domain (or Resend’s onboarding domain for development)
- Access to a `@devit.group` email inbox for manual OTP testing
  (or use Resend’s test mode / dashboard logs — see Testing Without Real Emails below)

---

## 1. Environment Variables

Add the following to your `.env` file (copy from `.env.example` if present):

```env
# Existing
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret-min-32-chars"

# New — required for this feature
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="Devit <noreply@yourdomain.com>"
```

> `RESEND_FROM_EMAIL` must use a domain you have verified in Resend (or Resend’s `onboarding@resend.dev` style sender for quick local tests).

---

## 2. Install New Dependency

```bash
npm install resend
```

---

## 3. Run the Database Migration

The migration adds `isVerified` to the `User` table and creates the `OtpRequest` table.

```bash
npx prisma migrate dev --name add-otp-verification
```

Verify the schema was applied:

```bash
npx prisma studio
```

Open Prisma Studio and confirm:
- `User` table has an `isVerified` column (default `false`)
- `OtpRequest` table exists with all fields

---

## 4. Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 5. Manual Validation Walkthrough

### Happy Path — New @devit.group User

1. Navigate to [http://localhost:3000/register](http://localhost:3000/register)
2. Enter a `@devit.group` email address and a password (≥ 8 chars) → click **Register**
3. **Expected**: You are redirected to `/verify-email`
4. Check the inbox for the submitted email — you should receive a 6-digit OTP
5. Enter the OTP in the verification form → click **Verify**
6. **Expected**: You are redirected to `/dashboard`
7. In Prisma Studio, confirm `User.isVerified = true` for the registered email

---

### Domain Restriction — Non-@devit.group Email

1. Navigate to `/register`
2. Enter `test@gmail.com` as the email → click **Register**
3. **Expected**: An inline error message appears: *"Only @devit.group email addresses are
   permitted to register."* — no redirect, no email sent

---

### OTP Expiry & Resend

1. Complete registration but do NOT verify immediately
2. Wait 10 minutes (or update `OtpRequest.expiresAt` directly in Prisma Studio to
   a past timestamp for faster testing)
3. Submit the expired OTP → **Expected**: Error message about expiry + resend option visible
4. Click **Resend** → **Expected**: New OTP arrives in inbox; old one no longer works

---

### Login Redirect for Unverified User

1. Log out (delete the `token` cookie)
2. Navigate to `/login`, enter credentials for the unverified account → click **Login**
3. **Expected**: You are redirected to `/verify-email`

---

### Verified User — /verify-email Hidden

1. Log in with a fully verified account
2. Navigate directly to [http://localhost:3000/verify-email](http://localhost:3000/verify-email)
3. **Expected**: Middleware immediately redirects you to `/dashboard`

---

### Protected Route Guard

1. Log out (delete the `token` cookie)
2. Navigate directly to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
3. **Expected**: Middleware redirects you to `/login`
4. Log in with an unverified account
5. Navigate directly to `/dashboard`
6. **Expected**: Middleware redirects you to `/verify-email`

---

## 6. Testing Without Real Emails

If you do not have access to a real `@devit.group` inbox during development, use one of
these approaches:

### Option A — Read the OTP from the API Response (dev mode only)

Temporarily return the plain OTP code in the registration response body when
`NODE_ENV === 'development'`. Remove before committing to any non-dev branch.

### Option B — Resend dashboard / limited recipients

Use the [Resend dashboard](https://resend.com/emails) to inspect sent messages, or send
only to addresses allowed on your Resend plan. For local debugging you can still read the
OTP from the `OtpRequest` table in Prisma Studio if you temporarily log it in development.

### Option C — CI / tests

Integration tests mock `lib/email/resend` so no real email is sent. For broader E2E,
consider a dedicated test API key and Resend’s test recipient rules.

---

## 7. Run Tests

```bash
# Unit tests
npm test -- tests/unit/otp-generator.test.ts
npm test -- tests/unit/resend.service.test.ts

# Integration tests
npm test -- tests/integration/register-otp.test.ts
npm test -- tests/integration/verify-otp.test.ts

# Full suite with coverage report
npm test -- --coverage
```

All tests MUST pass with ≥ 80% line coverage on all new files before this branch is
considered ready for review.

---

## 8. Lint & Type Check

```bash
npm run lint      # Biome — must exit 0 (zero warnings)
npx tsc --noEmit  # TypeScript strict compile — must exit 0
```

Both MUST pass cleanly before opening a pull request (Constitution Gate I).
