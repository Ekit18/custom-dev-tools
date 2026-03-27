# Contract: POST /api/auth/resend-otp (new)

**Route**: `app/api/auth/resend-otp/route.ts`
**Change type**: New endpoint
**Date**: 2026-03-27

---

## Purpose

Issue a fresh OTP for the authenticated user's email address. Invalidates all previously
active OTPs for that email, generates a new 6-digit code, and dispatches it via SendGrid.
Subject to a rate limit of 3 requests per email per hour.

Authentication is required — the request must carry the `token` cookie.

---

## Request

```
POST /api/auth/resend-otp
Content-Type: application/json
Cookie: token=<JWT>
```

No request body required. The target email is derived from `userId` in the JWT.

---

## Responses

### 200 OK — new OTP sent

```jsonc
{
  "success": true,
  "message": "A new verification code has been sent to your email address."
}
```

**Side effects**:
- All existing active `OtpRequest` records for the email are marked `usedAt = now()`.
- A new `OtpRequest` record is created (hashed, expires in 10 min).
- New OTP email dispatched via SendGrid.

---

### 401 Unauthorized — not authenticated

```jsonc
{
  "error": "Not authenticated."
}
```

---

### 409 Conflict — already verified

```jsonc
{
  "error": "Email address is already verified.",
  "redirectTo": "/dashboard"
}
```

---

### 429 Too Many Requests — rate limit exceeded

Returned when 3 or more OTP requests have been made for this email in the past hour.
`retryAfterSeconds` indicates how long the caller must wait before the next request
is allowed.

```jsonc
{
  "error": "Too many verification code requests. Please wait before requesting another.",
  "retryAfterSeconds": 1847
}
```

The `Retry-After` HTTP header is also set with the same value in seconds.

---

### 503 Service Unavailable — email delivery failed

```jsonc
{
  "error": "Failed to send verification email. Please try again."
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

## Rate Limit Logic

```
hourlyCount = COUNT(OtpRequest WHERE email = X AND createdAt > now() - 1 hour)
IF hourlyCount >= 3 THEN → 429
ELSE → proceed
```

`retryAfterSeconds` is computed as:
```
oldestEligibleRequest = OtpRequest WHERE email = X ORDER BY createdAt ASC LIMIT 1
retryAfterSeconds = max(0, (oldestEligibleRequest.createdAt + 1 hour) - now())
```

## Security Notes

- The email address is NEVER taken from the request body; it is always resolved from
  the JWT `userId` via a DB lookup. This prevents a user from triggering OTP sends to
  arbitrary addresses.
- Rate limit is enforced per email address, not per IP.
