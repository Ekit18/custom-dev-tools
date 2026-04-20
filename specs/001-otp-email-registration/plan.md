# Implementation Plan: OTP Email Verification for Registration

**Branch**: `001-otp-email-registration` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-otp-email-registration/spec.md`

## Summary

Extend the existing registration flow to (a) restrict new sign-ups to `@devit.group` email
addresses only, (b) send a time-limited 6-digit OTP via Resend immediately after
account creation, and (c) gate all protected routes behind a verified-email check enforced
in Next.js middleware. The `isVerified` flag lives in the Prisma User model and is also
embedded in the JWT so middleware never needs a DB round-trip.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16.1.6 (App Router)
**Primary Dependencies**: Next.js 16, MUI v7 (@mui/material), Prisma 5.22.0, `resend`, bcryptjs, jsonwebtoken
**Storage**: SQLite via Prisma (prisma/schema.prisma) — User table + new OtpRequest table
**Testing**: Jest + React Testing Library (to be configured; Biome for lint)
**Target Platform**: Web browser, responsive (MUI breakpoints, mobile-first)
**Project Type**: web-service (Next.js full-stack, App Router)
**Performance Goals**: OTP email delivery ≤ 60 s (SC-003); API p95 ≤ 200 ms
**Constraints**: <200 ms p95 API; JS bundle increase ≤ 5 kB gzip/PR; Core Web Vitals in Good range; zero DB calls in middleware
**Scale/Scope**: ~100 internal @devit.group users; 1 new page, 2 new API routes, 2 modified routes, 1 modified middleware

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I — Code Quality | TypeScript strict mode; zero Biome warnings; SRP modules | ✅ PASS | New `lib/email/resend.ts` and `lib/otp/generator.ts` modules keep concerns separated. JWT helpers updated in `lib/auth.ts` only. |
| I — Code Quality | No inline TODOs without issue references | ✅ PASS | All deferred items tracked in this plan. |
| II — Testing Standards | ≥ 80% coverage on new files; unit tests for OTP generator and Resend service (mocked); integration test for register→verify flow | ✅ PASS | Resend MUST be mocked via `jest.mock`; no live email in tests. |
| II — Testing Standards | Test-first feasible: write tests that fail before implementation | ✅ PASS | Integration tests for API routes and unit tests for pure functions planned before code. |
| III — UX Consistency | MUI components only; no hardcoded design tokens; all 4 UI states (loading/error/empty/success) | ✅ PASS | MUI v7 already in root layout; `OtpVerificationForm` will use MUI `TextField`, `Button`, `CircularProgress`, `Alert`. |
| III — UX Consistency | WCAG 2.1 AA; axe check passes on new UI | ✅ PASS | MUI components are AA-compliant by default; axe CI check required before merge. |
| IV — Performance | isVerified in JWT → zero DB call in middleware; OTP page code-split | ✅ PASS | JWT payload extended to `{ userId, isVerified }`. Next.js automatically code-splits `/verify-email`. |
| IV — Performance | New DB queries indexed; no N+1 patterns | ✅ PASS | `OtpRequest.email` indexed; user lookup by JWT userId is PK lookup. No new N+1 introduced. |

**Post-Phase-0 re-check**: All gates confirmed — no violations requiring Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/001-otp-email-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── register.md
│   ├── verify-otp.md
│   └── resend-otp.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── auth/
│       ├── register/route.ts       MODIFY — add domain check, create user with isVerified=false, generate+send OTP
│       ├── login/route.ts          MODIFY — embed isVerified in JWT payload; return redirectTo hint
│       ├── verify-otp/route.ts     NEW    — validate OTP, set isVerified=true, re-issue JWT
│       └── resend-otp/route.ts     NEW    — rate-limited OTP resend
├── verify-email/
│   └── page.tsx                    NEW    — OTP entry page (hidden for verified users via middleware)
└── (all other pages unchanged)

components/
└── auth/
    └── OtpVerificationForm.tsx     NEW    — MUI form: 6-digit input, submit, resend button; all 4 UI states

lib/
├── auth.ts                         MODIFY — extend JWT payload to { userId, isVerified }
├── email/
│   └── resend.ts                   NEW    — Resend client + sendOtpEmail() helper
└── otp/
    └── generator.ts                NEW    — generateOtp(), hashOtp(), verifyOtp() pure functions

prisma/
└── schema.prisma                   MODIFY — User: add isVerified Boolean; add OtpRequest model

middleware.ts                       MODIFY — add verification guard: !isVerified → /verify-email

tests/
├── integration/
│   ├── register-otp.test.ts        NEW    — POST /api/auth/register (domain check, OTP dispatch, cookie)
│   └── verify-otp.test.ts          NEW    — POST /api/auth/verify-otp (happy path, wrong code, expired)
└── unit/
    ├── otp-generator.test.ts       NEW    — generateOtp, hashOtp, verifyOtp
    └── resend.service.test.ts      NEW    — sendOtpEmail with mocked `resend`
```

**Structure Decision**: Single Next.js App Router project — no separate frontend/backend split.
All new code lives in the existing `app/`, `components/`, `lib/`, and `prisma/` directories
following established project conventions.

## Complexity Tracking

> No constitution violations requiring justification. All gates passed cleanly.
