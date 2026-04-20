# Contract: POST /api/auth/register (modified)

**Route**: `app/api/auth/register/route.ts`
**Change type**: Modification of existing endpoint
**Date**: 2026-03-27

---

## Purpose

Register a new user with a `@devit.group` email address. Creates the user record with
`isVerified = false`, issues a JWT cookie, generates a 6-digit OTP, and dispatches it
via Resend. The caller is expected to redirect the user to `/verify-email`.

---

## Request

```
POST /api/auth/register
Content-Type: application/json
```

```jsonc
{
  "email": "alice@devit.group",   // string, required — must end with @devit.group
  "password": "s3cr3tPass!"     // string, required — minimum 8 characters
}
```

---

## Responses

### 201 Created — registration succeeded, OTP dispatched

```jsonc
{
  "user": {
    "id": "clxyz123",
    "email": "alice@devit.group",
    "isVerified": false
  },
  "redirectTo": "/verify-email"
}
```

**Side effects**:
- `Set-Cookie: token=<JWT>; HttpOnly; SameSite=Lax; Max-Age=604800`
  JWT payload: `{ userId: "clxyz123", isVerified: false }`
- OTP record created in `OtpRequest` table (hashed, expires in 10 min)
- OTP email dispatched via Resend to `alice@devit.group`

---

### 400 Bad Request — validation failure

Returned when required fields are missing, password is too short, email is malformed,
or the domain is not `@devit.group`.

```jsonc
{
  "error": "Only @devit.group email addresses are permitted to register."
}
```

Other 400 messages:
- `"Email and password are required."`
- `"Password must be at least 8 characters."`
- `"Invalid email address format."`

---

### 409 Conflict — email already registered

```jsonc
{
  "error": "An account with this email address already exists."
}
```

---

### 503 Service Unavailable — OTP email delivery failed

Returned when Resend cannot dispatch the OTP. The user record is **rolled back** (or
the OtpRequest is deleted) so the user can retry registration cleanly.

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

## Validation Rules

| Field | Rule |
|-------|------|
| `email` | Required; valid email syntax; domain MUST be `devit.com` (case-insensitive) |
| `password` | Required; minimum 8 characters |

## Behaviour Changes from Previous Version

| Before | After |
|--------|-------|
| Any valid email accepted | Only `@devit.group` emails accepted |
| User created with no verification step | User created with `isVerified = false` |
| Token issued, redirected to `/dashboard` | Token issued with `isVerified: false`; caller redirects to `/verify-email` |
| No OTP | OTP generated and emailed via Resend |
