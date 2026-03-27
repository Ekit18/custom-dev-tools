# Research: OTP Email Verification for Registration

**Branch**: `001-otp-email-registration` | **Date**: 2026-03-27
**Phase**: 0 — all NEEDS CLARIFICATION items resolved before design begins

---

## Decision 1: Email Delivery Provider

**Decision**: SendGrid via the `@sendgrid/mail` npm package.

**Rationale**: Explicitly specified in user input. SendGrid provides reliable transactional
email delivery, a generous free tier, and a simple Node.js SDK that can be called from
any Next.js Route Handler without additional infrastructure.

**Alternatives considered**:
- Nodemailer + SMTP — works but requires managing an SMTP server or third-party relay; more
  configuration overhead.
- AWS SES — cheaper at scale but introduces AWS IAM dependency; out of scope.
- Resend — modern alternative with great DX, but not what was specified.

**Integration pattern in Next.js**:
SendGrid MUST be initialised server-side only. The API key is read from
`process.env.SENDGRID_API_KEY` at module load time in `lib/email/sendgrid.ts`.
This module is never imported from client components; Next.js tree-shaking and the
`server-only` package guard will enforce this.
SendGrid calls in API routes are awaited (not fire-and-forget) to allow the route to
return a 503 if delivery fails, giving the user an immediate actionable error.

---

## Decision 2: OTP Storage Location

**Decision**: Persisted in the database via a new `OtpRequest` Prisma model (SQLite).

**Rationale**: The project already uses Prisma + SQLite. Database storage is the correct
choice because:
1. It survives server restarts (unlike in-memory).
2. It supports rate-limit queries (count OTP requests per email per hour).
3. It enables proper expiry and single-use enforcement.
4. No additional infrastructure (Redis, etc.) is needed.

**Alternatives considered**:
- In-memory Map / LRU cache — fast but lost on server restart; not suitable for production.
- Redis / Upstash — better at scale but introduces infrastructure overhead not justified
  for ~100 internal users.
- Signed JWT as OTP token — avoids DB but makes revocation impossible without a blocklist.

**OTP security approach**:
The 6-digit code is stored **hashed** (SHA-256, using Node.js `crypto`) rather than in
plaintext. SHA-256 is appropriate here (not bcrypt) because:
- OTPs are short-lived (10 min) and single-use — brute-forcing the hash is not viable
  in that window against a 6-digit space.
- SHA-256 is orders of magnitude faster than bcrypt, keeping the verify-OTP endpoint
  under the 200 ms p95 budget.

---

## Decision 3: isVerified in JWT vs. DB Lookup in Middleware

**Decision**: Embed `isVerified: boolean` in the JWT payload. Middleware reads only the
cookie — no DB call on every request.

**Rationale**:
- The existing middleware uses `runtime = 'nodejs'`, but the pattern still benefits from
  avoiding a DB round-trip on every page load.
- When a user verifies their OTP, the server issues a **new JWT** with `isVerified: true`
  and replaces the cookie. This keeps the JWT and DB in sync without clock-skew issues.
- The JWT TTL is 7 days (existing configuration), so the window for a stale `isVerified:
  false` token is negligible — after successful OTP verification a fresh token is issued
  immediately.

**Alternatives considered**:
- DB lookup on every protected request — correct but adds latency and DB load.
- Session store (e.g., iron-session) — heavier setup not justified given the existing JWT
  cookie pattern.

---

## Decision 4: MUI Integration (already resolved)

**Decision**: MUI v7 is already installed and configured in `app/layout.tsx`
(`ThemeProvider` + `CssBaseline`). No additional setup required.

**Rationale**: The root layout already wraps the entire app with `ThemeProvider`. The
new `OtpVerificationForm` component and the `/verify-email` page will use MUI
`TextField`, `Button`, `CircularProgress`, `Alert`, `Box`, and `Typography` — all
already available.

**Note on Next.js App Router + MUI**: The root layout is marked `'use client'` which is
compatible with MUI's Emotion runtime. For strict RSC patterns, `@mui/material-nextjs`
(already a dependency) provides `AppRouterCacheProvider`. This is not required for the
current layout but is available if the project migrates to a fully server-first layout.

---

## Decision 5: Rate Limiting Implementation

**Decision**: Database-side rate limiting using an OtpRequest count query.

**Rationale**: Check `COUNT(OtpRequest WHERE email = X AND createdAt > now - 1h) >= 3`
before creating a new OTP. This is O(1) with a compound index on `(email, createdAt)` and
requires no additional middleware or Redis.

**Alternatives considered**:
- `next-rate-limit` / `express-rate-limit` — middleware-level; not easily scoped to a
  specific email address.
- IP-based rate limiting in middleware — less precise; a VPN or shared office IP would
  block multiple legitimate users.

---

## Decision 6: Domain Restriction — Validation Location

**Decision**: Validated **server-side only** in `POST /api/auth/register`. The client UI
may show an inline hint, but server-side validation is the authoritative gate.

**Rationale**: Client-only validation can be bypassed. The API must always enforce
`email.endsWith('@devit.group')` (case-insensitive after `toLowerCase()`).

---

## Decision 7: OTP Code Format

**Decision**: 6 digits, numeric, generated via Node.js `crypto.randomInt(100000, 999999)`.

**Rationale**: `crypto.randomInt` uses a cryptographically secure PRNG, avoiding the
weak uniformity of `Math.random()`. The 6-digit format is universally recognised by users
(used by Google, GitHub, etc.) and minimises transcription errors.

---

## Decision 8: Registration Flow — User Created Before or After OTP Verification?

**Decision**: User record is created **at registration time** with `isVerified = false`.
The existing `prisma.user.create` call in `/api/auth/register` is retained; only the
`isVerified` field and OTP generation are added.

**Rationale**:
- Simpler: no `PendingRegistration` table needed (the spec entity was a design-time
  consideration; the database pattern makes it unnecessary).
- The user can be uniquely identified by their email for duplicate-check purposes
  immediately.
- The existing JWT is issued at registration with `isVerified: false`; middleware
  redirects the user to `/verify-email` before they can access any protected route.

**Alternative considered**: Pending registration table (no user created until OTP verified)
— cleaner from a "no unverified rows" perspective but adds a table and migration complexity.
For an internal tool with ~100 users this overhead is not justified.

---

## Decision 9: Login Flow — Behaviour for Unverified Users

**Decision**: Login succeeds (credentials are valid) but the JWT is issued with
`isVerified: false`. Middleware redirects the user to `/verify-email` where a new OTP
is sent (or a resend option is shown if a recent OTP exists).

**Rationale**: The user's password is correct — rejecting the login would be confusing.
The verification guard is a post-login step, not a login blocker. This matches common
patterns (e.g., GitHub email verification).

---

## Resolved Unknowns Summary

| Unknown | Decision |
|---------|----------|
| Email provider | SendGrid (`@sendgrid/mail`) |
| OTP storage | Database — new `OtpRequest` Prisma model |
| OTP security | SHA-256 hash (not plaintext) |
| Middleware check | `isVerified` embedded in JWT; no DB call |
| Rate limiting | DB count query with compound index |
| Domain validation | Server-side only, case-insensitive |
| OTP format | 6 digits, `crypto.randomInt` |
| User creation timing | At registration (isVerified=false), not deferred |
| Unverified login | Login permitted; middleware redirects to /verify-email |
