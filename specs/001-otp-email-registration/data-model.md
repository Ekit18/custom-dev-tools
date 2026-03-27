# Data Model: OTP Email Verification for Registration

**Branch**: `001-otp-email-registration` | **Date**: 2026-03-27
**Source**: `prisma/schema.prisma`

---

## Entities

### User (existing — modified)

Represents a registered account. The new `isVerified` field tracks whether the user has
completed email verification.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | No change |
| email | String | Unique, NOT NULL | No change |
| password | String | NOT NULL | No change |
| **isVerified** | Boolean | NOT NULL, default `false` | **NEW** — set to `true` after successful OTP verification |
| stores | Store[] | Relation | No change |
| createdAt | DateTime | default now() | No change |
| updatedAt | DateTime | @updatedAt | No change |

**State transitions for `isVerified`**:

```
Registration → isVerified = false
       ↓
OTP submitted & correct & not expired
       ↓
isVerified = true  (permanent — cannot be reset to false)
```

**Validation rules**:
- `email` MUST match `^[^\s@]+@devit\.com$` (case-insensitive) at the application layer
  before the record is created.
- `isVerified` is NEVER set to `true` by the registration route; it is ONLY set by the
  verify-otp route after OTP validation succeeds.

---

### OtpRequest (new)

Represents a single issued OTP for a specific email address. One active (unused,
non-expired) OTP may exist per email at a time; a resend invalidates all prior codes
for that email by setting `usedAt` to the current timestamp.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Auto-generated |
| email | String | NOT NULL, indexed | Target email address |
| codeHash | String | NOT NULL | SHA-256 hash of the 6-digit code |
| expiresAt | DateTime | NOT NULL | `createdAt + 10 minutes` |
| usedAt | DateTime? | Nullable | Set when the code is consumed or invalidated |
| attempts | Int | NOT NULL, default `0` | Incremented on each wrong guess; max 5 before auto-invalidation |
| createdAt | DateTime | default now() | Used for rate-limit queries |

**Indexes**:
- `email` — single-column index for all lookup and rate-limit queries.
- `(email, createdAt)` — compound index for the rate-limit count query
  (`WHERE email = X AND createdAt > now - 1h`).

**Validation rules**:
- `expiresAt` = `createdAt + 600 seconds` (10 minutes).
- A record is considered **active** when: `usedAt IS NULL AND expiresAt > now()`.
- A resend MUST set `usedAt = now()` on ALL existing active OTPs for the email before
  inserting a new record.
- After 5 failed `attempts`, the record MUST be marked `usedAt = now()` to prevent
  further brute-force guesses.
- The rate limit is `COUNT(WHERE email = X AND createdAt > now - 1h) >= 3` — evaluated
  before a new OTP is created.

---

## Prisma Schema Changes

```prisma
// prisma/schema.prisma — diff summary

model User {
  id         String    @id @default(cuid())
  email      String    @unique
  password   String
  isVerified Boolean   @default(false)   // ← NEW FIELD
  stores     Store[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model OtpRequest {                         // ← NEW MODEL
  id        String    @id @default(cuid())
  email     String
  codeHash  String
  expiresAt DateTime
  usedAt    DateTime?
  attempts  Int       @default(0)
  createdAt DateTime  @default(now())

  @@index([email])
  @@index([email, createdAt])
}
```

**Migration**: A new Prisma migration adds:
1. `ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT FALSE`
2. `CREATE TABLE "OtpRequest" (...)` with both indexes.

Because `isVerified` has a default value, the migration is **non-breaking** for existing
User rows (all receive `isVerified = false`, requiring them to re-verify — acceptable for
an internal tool in active development).

---

## JWT Payload (extended)

The JWT token issued by `generateToken()` in `lib/auth.ts` is extended to carry
`isVerified` alongside `userId`. This allows Next.js middleware to gate protected routes
without a database lookup.

```typescript
// Before
{ userId: string }

// After
{ userId: string; isVerified: boolean }
```

Two JWT issuance points:
1. **Registration** (`POST /api/auth/register`): `isVerified: false`
2. **OTP verification** (`POST /api/auth/verify-otp`): `isVerified: true` — replaces
   the cookie with a fresh token.
3. **Login** (`POST /api/auth/login`): `isVerified: user.isVerified` — reads from DB
   and embeds the current value.

---

## Middleware Routing Logic (updated)

```text
Incoming request
    │
    ├── No token OR invalid token
    │       └── not public path → redirect /login
    │
    └── Valid token
            │
            ├── isVerified = false
            │       └── not /verify-email → redirect /verify-email
            │       └── /verify-email → allow
            │
            └── isVerified = true
                    ├── /verify-email → redirect /dashboard  (hide page)
                    ├── /login or /register → redirect /dashboard
                    ├── / → redirect /dashboard
                    └── everything else → allow
```

**Public paths** (no token required): `/login`, `/register`
**Verification path** (token required, verification optional): `/verify-email`
**Protected paths** (token + isVerified = true required): all other routes
