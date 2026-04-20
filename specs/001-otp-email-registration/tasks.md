---

description: "Task list for OTP Email Verification for Registration"
---

> **Migration (2026):** OTP email now uses **Resend** (`lib/email/resend.ts`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Tasks below may still reference SendGrid text from the original delivery.

# Tasks: OTP Email Verification for Registration

**Input**: Design documents from `specs/001-otp-email-registration/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Included — plan.md explicitly defines test files and Constitution Principle II
requires ≥ 80% coverage on all new files. Tests are written FIRST per the test-first directive.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in all descriptions

## Path Conventions

Single Next.js project — all paths relative to repository root:
`app/`, `components/`, `lib/`, `prisma/`, `middleware.ts`, `tests/`

---

## Phase 1: Setup

**Purpose**: Install new dependency, configure environment variables, and set up the test runner.

- [x] T001 Install @sendgrid/mail — run `npm install @sendgrid/mail` and verify entry added to package.json dependencies
- [x] T002 [P] Add SendGrid environment variables to `.env` and `.env.example` — add `SENDGRID_API_KEY=""` and `SENDGRID_FROM_EMAIL=""` entries with inline comments explaining required values
- [x] T003 [P] Configure Jest + React Testing Library — install `jest jest-environment-jsdom ts-jest @testing-library/react @testing-library/jest-dom @types/jest` as devDependencies; create `jest.config.ts` with `testEnvironment: 'node'` for unit/integration tests; create `jest.setup.ts`; add `"test": "jest --coverage"` script to `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. MUST be complete before any story work begins.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T004 Update `prisma/schema.prisma` — add `isVerified Boolean @default(false)` field to the User model; add the full `OtpRequest` model with fields `id`, `email`, `codeHash`, `expiresAt`, `usedAt?`, `attempts`, `createdAt`; add `@@index([email])` and `@@index([email, createdAt])` compound index to OtpRequest
- [x] T005 Run Prisma migration — execute `npx prisma migrate dev --name add-otp-verification`; confirm User table has isVerified column and OtpRequest table exists; depends on T004
- [x] T006 [P] Extend JWT payload in `lib/auth.ts` — update `generateToken(userId, isVerified)` signature to accept and embed `isVerified: boolean` in the JWT payload; update `verifyToken` return type to `{ userId: string; isVerified: boolean } | null`
- [x] T007 [P] Create `lib/otp/generator.ts` — implement and export three pure functions: `generateOtp(): string` (uses `crypto.randomInt(100000, 999999)`, returns 6-digit string); `hashOtp(code: string): string` (SHA-256 via Node.js `crypto.createHash`); `verifyOtp(code: string, hash: string): boolean` (compares SHA-256 of code to stored hash)
- [x] T008 [P] Create `lib/email/sendgrid.ts` — import and initialise `@sendgrid/mail` with `process.env.SENDGRID_API_KEY` at module load; export `sendOtpEmail(to: string, code: string): Promise<void>` that sends a plain-text + HTML email with subject "Your Devit verification code" from `process.env.SENDGRID_FROM_EMAIL`; throw on non-2xx response
- [x] T009 [P] Modify `app/api/auth/login/route.ts` — after successful credential validation, pass `user.isVerified` to `generateToken(user.id, user.isVerified)`; add `redirectTo: user.isVerified ? null : '/verify-email'` to the JSON response body so the client can redirect appropriately
- [x] T010 Update `middleware.ts` — add verification guard after existing token validation: decode `isVerified` from JWT payload; if `decoded.isVerified === false` and `pathname` does not start with `/verify-email`, redirect to `/verify-email`; if `decoded.isVerified === true` and `pathname` starts with `/verify-email`, redirect to `/dashboard`; add `/verify-email` to neither `publicPaths` nor `authPaths` (it is only accessible to authenticated but unverified users)

**Checkpoint**: Foundation ready — prisma migration applied, JWT carries isVerified, middleware guards verification route.

---

## Phase 3: User Story 1 - Successful Registration with Devit Email and OTP (Priority: P1) 🎯 MVP

**Goal**: A new @devit.group user registers, receives an OTP by email, enters it on the
verification screen, and lands on /dashboard with isVerified=true.

**Independent Test**: Register with a @devit.group email, read the OTP from the `OtpRequest`
table in Prisma Studio, enter it on `/verify-email`, confirm redirect to `/dashboard`, and
confirm `User.isVerified = true` in the database.

### Tests for User Story 1 ⚠️

> **Write these FIRST — verify they FAIL before starting T015–T018**

- [x] T011 [P] [US1] Write unit tests for OTP generator in `tests/unit/otp-generator.test.ts` — test: `generateOtp()` returns a 6-character string of digits in range 100000–999999; `hashOtp()` produces the same hash for the same input; `verifyOtp(code, hash)` returns true for correct code and false for wrong code
- [x] T012 [P] [US1] Write unit tests for SendGrid service in `tests/unit/sendgrid.service.test.ts` — mock `@sendgrid/mail` with `jest.mock`; test: `sendOtpEmail(to, code)` calls `sgMail.send` exactly once with `to`, `subject` containing "verification code", and body containing the OTP code; test: function throws when `sgMail.send` rejects
- [x] T013 [P] [US1] Write integration test for POST /api/auth/register (happy path) in `tests/integration/register-otp.test.ts` — mock `sendOtpEmail`; POST `{ email: 'test@devit.group', password: 'password123' }` → expect 201, response body contains `user.isVerified: false` and `redirectTo: '/verify-email'`, `token` cookie set with `isVerified: false` in JWT payload, OtpRequest row exists in DB with matching email
- [x] T014 [P] [US1] Write integration test for POST /api/auth/verify-otp (happy path) in `tests/integration/verify-otp.test.ts` — seed DB with User (isVerified=false) and active OtpRequest; POST `{ code: '<correct code>' }` with valid JWT cookie → expect 200, `redirectTo: '/dashboard'`, User.isVerified=true in DB, OtpRequest.usedAt set, new `token` cookie issued with `isVerified: true` in payload

### Implementation for User Story 1

- [x] T015 [US1] Modify `app/api/auth/register/route.ts` — add domain validation: `email.toLowerCase().endsWith('@devit.group')` else return 400 `"Only @devit.group email addresses are permitted to register."`; after `prisma.user.create`, call `generateOtp()`, store `OtpRequest` with `hashOtp(code)` and `expiresAt = now + 10 min`, call `sendOtpEmail(email, code)` (return 503 if it throws and delete user record); update `generateToken(user.id, false)`; return 201 with `{ user: { id, email, isVerified: false }, redirectTo: '/verify-email' }`
- [x] T016 [US1] Create `app/api/auth/verify-otp/route.ts` — authenticate via `token` cookie using `verifyToken`; return 401 if missing/invalid; if `decoded.isVerified` return 409 `"Email already verified"`; find active `OtpRequest` WHERE `email = user.email AND usedAt IS NULL AND expiresAt > now()` else return 410; verify `verifyOtp(body.code, request.codeHash)`: if wrong increment `attempts`, if `attempts >= 5` set `usedAt = now()` and return 410, else return 422 with `attemptsRemaining`; on match: set `OtpRequest.usedAt = now()`, `User.isVerified = true`, issue new JWT with `generateToken(userId, true)`, set cookie, return 200 `{ success: true, redirectTo: '/dashboard' }`
- [x] T017 [P] [US1] Create `components/auth/OtpVerificationForm.tsx` — MUI client component: `TextField` (label "Verification Code", inputProps `maxLength={6}`, `placeholder="Enter 6-digit code"`, `type="text" inputMode="numeric"`); "Verify" `Button` with `CircularProgress` when loading (disable all inputs during submission); `Alert severity="error"` for error messages; `Alert severity="success"` for success message before redirect; call `POST /api/auth/verify-otp`; on success call `router.push(redirectTo)`; all four UI states implemented: loading, error, empty, success
- [x] T018 [US1] Create `app/verify-email/page.tsx` — Next.js page component that renders `OtpVerificationForm`; add `<title>Verify Your Email</title>` and an MUI `Typography` heading "Check your inbox"; ensure page is accessible without `isVerified=true` (middleware handles routing)

**Checkpoint**: User Story 1 fully functional — @devit.group registration → OTP email → verification screen → /dashboard.

---

## Phase 4: User Story 2 - Non-Devit Email Rejected at Submission (Priority: P2)

**Goal**: Any email domain other than @devit.group is rejected with a clear inline MUI
error message before an OTP is ever generated.

**Independent Test**: Submit `user@gmail.com` on `/register`, confirm MUI error appears
below the email field, confirm no network request reaches the API (client-side), and
confirm no OtpRequest row is created in the DB.

### Implementation for User Story 2

- [x] T019 [P] [US2] Update `components/AuthForm.tsx` — handle 400 response from `POST /api/auth/register` with domain-rejection message: display using MUI `TextField` `error` + `helperText` props or an `Alert` directly below the email field; do not reset the email field value so the user can correct it without re-typing
- [x] T020 [US2] Add client-side @devit.group domain validation to `components/AuthForm.tsx` — on form submit, before making the API call, check `email.toLowerCase().endsWith('@devit.group')`; if false: set field-level MUI error state with helperText "Only @devit.group email addresses can register here." and abort submission; this prevents a round-trip for the common case

**Checkpoint**: User Story 2 complete — non-@devit.group emails blocked with inline error; zero OTPs generated.

---

## Phase 5: User Story 3 - OTP Expiry and Resend (Priority: P3)

**Goal**: A user whose OTP expired or was not delivered can request a fresh code without
abandoning the flow; the rate limit is enforced and communicated clearly.

**Independent Test**: Manually set `OtpRequest.expiresAt` to a past time in Prisma Studio,
submit the old code, confirm 410 response with "Resend" option visible; click Resend,
confirm new OtpRequest row, receive email, complete verification.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create `app/api/auth/resend-otp/route.ts` — authenticate via JWT cookie (401 if missing); return 409 if `decoded.isVerified`; query `COUNT(OtpRequest WHERE email = user.email AND createdAt > now - 1hr)`, if `>= 3` return 429 with `retryAfterSeconds` (time until oldest qualifying request ages out of the 1-hr window) and `Retry-After` header; invalidate all active OTPs for email (`UPDATE usedAt = now() WHERE usedAt IS NULL`); generate new OTP, store OtpRequest, call `sendOtpEmail`; return 200
- [x] T022 [US3] Update `components/auth/OtpVerificationForm.tsx` — add "Resend Code" `Button` (calls `POST /api/auth/resend-otp`); handle 410 response from verify endpoint: show "Your code has expired." MUI Alert + enable Resend button; handle 422 response: show "Incorrect code. X attempts remaining." inline; handle 429 resend response: disable Resend button and show "Try again in X seconds" with a live countdown (decrement via `setInterval`)
- [x] T023 [US3] Extend `tests/integration/verify-otp.test.ts` — add test cases: expired OtpRequest returns 410 `canResend: true`; wrong code returns 422 with decreasing `attemptsRemaining`; 5th wrong code auto-invalidates OtpRequest and returns 410; POST /api/auth/resend-otp returns 429 after 3rd OTP in 1 hour

**Checkpoint**: All three user stories independently functional and tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ensure all Constitution quality gates pass before PR is opened.

- [x] T024 [P] Verify bundle size impact — run `npm run build`; check the generated chunk for `/verify-email` in `.next/static/`; confirm the total JS gzip increase attributable to this feature is ≤ 5 kB; document the measured delta in the PR description (Constitution Gate IV)
- [x] T025 [P] Run accessibility audit — install and run `@axe-core/cli` (or use browser axe DevTools extension) against the running dev server on `/register` and `/verify-email`; confirm zero WCAG 2.1 AA violations on all new MUI components (Constitution Gate III)
- [x] T026 [P] Performance check — code-review `middleware.ts` and confirm zero `prisma.*` calls remain in the middleware function; run `npm run build` and confirm no new build warnings; verify `lib/email/sendgrid.ts` is server-only (not imported by any client component)
- [x] T027 Run full lint and type check — run `npm run lint` (Biome, expect zero warnings/errors) then `npx tsc --noEmit` (TypeScript strict, expect zero errors); fix all issues before proceeding (Constitution Gate I)
- [x] T028 Run quickstart.md validation — execute all 5 manual scenarios from `specs/001-otp-email-registration/quickstart.md` against the local dev server: (1) happy path, (2) non-devit rejection, (3) expiry + resend, (4) login redirect for unverified, (5) /verify-email hidden for verified user

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (for T008) — start after npm install
  - T004 → T005 (migration depends on schema change)
  - T006, T007, T008, T009, T010 can run in parallel once T001 is done
  - T009 depends on T006 (uses updated generateToken)
  - T010 can run in parallel with T006–T009
- **User Story 1 (Phase 3)**: Depends on all of Phase 2
  - Tests T011–T014 can run in parallel with each other
  - T015 depends on T007 (generateOtp/hashOtp) and T008 (sendOtpEmail)
  - T016 depends on T007 (verifyOtp) and T006 (generateToken)
  - T017 is independent (UI component, no backend deps)
  - T018 depends on T017 (renders OtpVerificationForm)
- **User Story 2 (Phase 4)**: Depends on T015 (register API change delivers the error message)
  - T019 depends on T015 (needs the 400 response format to be in place)
  - T020 can run in parallel with T019 (pure client-side, no API dependency)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs OtpVerificationForm from T017)
  - T021 is independent of T022 (different file)
  - T022 depends on T017 (extends the existing form)
  - T023 depends on T021 (tests the new endpoint)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 or US3 — start immediately after Phase 2
- **US2 (P2)**: Backend gate (domain check) already in T015; US2 adds client-side UX on top
- **US3 (P3)**: Extends the OtpVerificationForm built in US1; T022 depends on T017

### Within Each User Story

- Tests MUST be written and verified to FAIL before implementing their subject task
- Foundational utilities (T007, T008) before API routes (T015, T016)
- API routes (T015, T016) before page/form components (T017, T018) where applicable
- Server components before client forms

### Parallel Opportunities

```bash
# Phase 1 — all parallel after T001:
T002, T003

# Phase 2 — parallel once T001 done (T005 waits for T004):
T006, T007, T008, T009, T010  # (T009 needs T006 done first)

# Phase 3 — tests all parallel; T017 parallel with T015/T016:
T011, T012, T013, T014, T017

# Phase 5:
T021 (parallel with T022 setup)

# Phase 6 — all parallel:
T024, T025, T026
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T010) — **BLOCKS all stories**
3. Write US1 tests (T011–T014) — verify they FAIL
4. Implement US1 (T015–T018)
5. **STOP and VALIDATE**: Run tests, open `/register` with a @devit.group email, verify the full flow end-to-end
6. Demo: the core value is delivered — @devit.group-only registration with email OTP is live

### Incremental Delivery

1. MVP (US1) → test + demo → merge if approved
2. Add US2 (T019–T020) → test domain rejection UI → demo
3. Add US3 (T021–T023) → test expiry/resend flow → demo
4. Polish (T024–T028) → all Constitution gates green → open PR

### Parallel Team Strategy

With two developers after Phase 2 is complete:
- Developer A: US1 backend (T015, T016) + US3 backend (T021)
- Developer B: US1 frontend (T017, T018) + US2 frontend (T019, T020) + US3 frontend (T022)

---

## Notes

- `[P]` = different files, no incomplete task dependencies — safe to run in parallel
- `[USn]` label maps each task to its user story for traceability
- Verify tests FAIL before implementing their subject — Red-Green-Refactor cycle
- Commit after each Checkpoint (end of each Phase 3–5 user story)
- Do not proceed to Polish until all three user story checkpoints pass independently
- Avoid: cross-story imports, same-file parallel edits, hard-coded design tokens
