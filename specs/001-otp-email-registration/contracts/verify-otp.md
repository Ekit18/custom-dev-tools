# Contract: POST /api/auth/verify-otp (new)

**Route**: `app/api/auth/verify-otp/route.ts`
**Change type**: New endpoint
**Date**: 2026-03-27

---

## Purpose

Validate the 6-digit OTP the user received by email. On success: marks the user as
verified in the database, issues a new JWT with `isVerified: true`, and replaces the
cookie. The caller should redirect to `/dashboard`.

Authentication is required — the request must carry the `token` cookie issued at
registration or login.

---

## Request

```
POST /api/auth/verify-otp
Content-Type: application/json
Cookie: token=<JWT>
```

```jsonc
{
  "code": "482931"   // string, required — the 6-digit OTP from the email
}
```

---

## Responses

### 200 OK — OTP verified, user now verified

```jsonc
{
  "success": true,
  "redirectTo": "/dashboard"
}
```

**Side effects**:
- `User.isVerified` set to `true` in the database.
- `OtpRequest.usedAt` set to `now()` — code invalidated.
- `Set-Cookie: token=<new JWT>; HttpOnly; SameSite=Lax; Max-Age=604800`
  New JWT payload: `{ userId: "clxyz123", isVerified: true }`

---

### 400 Bad Request — missing or malformed code

```jsonc
{
  "error": "A 6-digit verification code is required."
}
```

---

### 401 Unauthorized — not authenticated

Returned when no valid `token` cookie is present.

```jsonc
{
  "error": "Not authenticated."
}
```

---

### 410 Gone — no active OTP found

Returned when no OTP exists for this user that is both unused and non-expired. Includes
a hint to request a new code.

```jsonc
{
  "error": "Verification code not found or has expired. Please request a new code.",
  "canResend": true
}
```

---

### 422 Unprocessable Entity — wrong code

Returned when an active OTP exists but the submitted code does not match.
`attemptsRemaining` helps the UI show a meaningful warning.

```jsonc
{
  "error": "Incorrect verification code.",
  "attemptsRemaining": 3
}
```

When `attemptsRemaining` reaches 0, the OTP is automatically invalidated and the
response becomes a 410 (above) on the next attempt.

---

### 409 Conflict — already verified

Returned when the authenticated user's `isVerified` is already `true`.

```jsonc
{
  "error": "Email address is already verified.",
  "redirectTo": "/dashboard"
}
```

---

### 500 Internal Server Error

```jsonc
{
  "error": "Internal server error"
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `code` | Required; exactly 6 characters; numeric digits only |

## Security Notes

- The endpoint MUST look up the active OTP by the `userId` from the JWT (not from the
  request body) to prevent one user from verifying another's email.
- After 5 failed attempts the `OtpRequest` is invalidated server-side regardless of
  whether the client retries.
- The new JWT is issued synchronously within the same transaction as the DB update so
  the cookie is never out of sync with the database state.
