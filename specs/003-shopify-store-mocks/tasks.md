---
description: "Task list for Shopify store mock data (003-shopify-store-mocks)"
---

# Tasks: Shopify store mock data

**Input**: Design documents from `D:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Omitted (not explicitly requested in spec); add unit tests for `lib/mock-packs/validateMockPackCsv.ts` in Polish phase if time permits.

**Organization**: Tasks grouped by user story for independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies among marked tasks)
- **[Story]**: [US1], [US2], [US3] for user-story phases only

## Phase 1: Setup (shared infrastructure)

**Purpose**: Environment and module scaffolding before schema work.

- [x] T001 Add Google Drive and mock-pack variable placeholders to `d:\work\pet-projects\custom-dev-tools\.env.example` (e.g. `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_MOCK_PACK_PARENT_ID`, optional row/size caps)
- [x] T002 [P] Create shared TypeScript types for parsed CSV rows and API payloads in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\types.ts`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Database entities, CSV validation, and Drive upload helpers required before any user story ships end-to-end.

**⚠️ CRITICAL**: Complete this phase before starting User Story UI/API work.

- [x] T003 Extend `d:\work\pet-projects\custom-dev-tools\prisma\schema.prisma` with `MockDataPack`, `MockPackDriveFile`, and `MockGenerationJob` models per `d:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\data-model.md` (relations to `User` and `Store` as needed)
- [x] T004 Generate and apply Prisma migration under `d:\work\pet-projects\custom-dev-tools\prisma\migrations\` for the new models (depends on T003)
- [x] T005 [P] Implement CSV validation and cross-file rules in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\validateMockPackCsv.ts` following `d:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\contracts\mock-pack-csv.md`
- [x] T006 [P] Implement multipart and zip extraction to three in-memory CSV buffers in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\parseMockPackUpload.ts`
- [x] T007 [P] Implement Google Drive upload (service account JWT + `files.create` multipart) in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\driveUpload.ts` per `d:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\research.md` §1

**Checkpoint**: Schema migrated; validators callable from routes with no UI.

---

## Phase 3: User Story 1 — Manage platform mock data packs (Priority: P1) 🎯 MVP

**Goal**: Operators can list mock packs, upload `products.csv` / `collections.csv` / `customers.csv` (or zip), validate-before-commit, store files in Drive, persist metadata for all platform users.

**Independent Test**: Upload valid three-file CSV pack; see it in catalog from a second session; invalid CSV returns row-level errors and no DB row.

### Implementation for User Story 1

- [x] T008 [US1] Implement `GET` and `POST` handlers in `d:\work\pet-projects\custom-dev-tools\app\api\mock-packs\route.ts` per `d:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\contracts\mock-packs-api.md` (wire T005–T007; enforce auth consistent with existing `app\api\stores\route.ts` patterns)
- [x] T009 [US1] Implement `DELETE` or `PATCH` (archive) in `d:\work\pet-projects\custom-dev-tools\app\api\mock-packs\[id]\route.ts` for FR-011 with safe conflict checks
- [x] T010 [US1] Create catalog page with loading, error, and empty states in `d:\work\pet-projects\custom-dev-tools\app\dashboard\mock-packs\page.tsx`
- [x] T011 [US1] Create add-pack wizard in `d:\work\pet-projects\custom-dev-tools\app\dashboard\mock-packs\new\page.tsx` (name, three CSVs or zip, submit, validation error display)
- [x] T012 [US1] Add dashboard navigation entry to mock packs in `d:\work\pet-projects\custom-dev-tools\components\Navigation.tsx`

**Checkpoint**: User Story 1 works end-to-end without generation.

---

## Phase 4: User Story 2 — Generate mock catalog and buyers for a store (Priority: P2)

**Goal**: From a store card, user opens generation settings, picks pack + product count, job creates Shopify products (`productSet`), smart collection (`collectionCreate` + `ruleSet`), and mock customers (`customerCreate`).

**Independent Test**: Run generation against a dev store; verify product count, one smart collection including generated products, and customers; job status visible until completion or failure.

### Implementation for User Story 2

- [x] T013 [US2] Implement Shopify Admin GraphQL seeding helpers in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\shopifySeed.ts` using `d:\work\pet-projects\custom-dev-tools\lib\access-token.ts`, `d:\work\pet-projects\custom-dev-tools\lib\encryption.ts`, and patterns from `d:\work\pet-projects\custom-dev-tools\app\api\stores\[id]\feeds\generate\route.ts` (align API version with `d:\work\pet-projects\custom-dev-tools\app\api\stores\[id]\graphql\route.ts`)
- [x] T014 [US2] Implement generation start and job status JSON API in `d:\work\pet-projects\custom-dev-tools\app\api\stores\[id]\mock-generate\route.ts` and `d:\work\pet-projects\custom-dev-tools\app\api\stores\[id]\mock-jobs\[jobId]\route.ts` (persist `MockGenerationJob`, prevent concurrent `running` per store)
- [x] T015 [US2] Add “Generate mock data” control and navigation in `d:\work\pet-projects\custom-dev-tools\components\StoreCard.tsx` targeting `d:\work\pet-projects\custom-dev-tools\app\stores\[id]\mock-generate\page.tsx`
- [x] T016 [US2] Build generation settings UI in `d:\work\pet-projects\custom-dev-tools\app\stores\[id]\mock-generate\page.tsx` (pack/topic select from `GET /api/mock-packs`, product count, submit, loading/error/success, optional job polling via T014)

**Checkpoint**: User Stories 1 and 2 both work; generation does not require revisiting upload wizard for repeat runs.

---

## Phase 5: User Story 3 — Discover and reuse existing packs (Priority: P3)

**Goal**: Users see which topics/packs exist (including built-ins) before generating so the selector is explainable (spec acceptance: topic list matches catalog + built-ins).

**Independent Test**: With only built-in packs seeded, open generation page and still see at least one selectable topic; with custom packs, see both sources clearly.

### Implementation for User Story 3

- [x] T017 [US3] Seed or register built-in mock packs (e.g. electronics, apparel) per FR-012 in `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\builtInPacks.ts` and invoke from `d:\work\pet-projects\custom-dev-tools\prisma\seed.ts` or a one-time bootstrap in `d:\work\pet-projects\custom-dev-tools\app\api\mock-packs\route.ts` `GET` handler (document choice in code comments)
- [x] T018 [US3] Add source indicators (`built_in` vs `uploaded`) and short descriptions in the pack selector on `d:\work\pet-projects\custom-dev-tools\app\stores\[id]\mock-generate\page.tsx` (or extract `d:\work\pet-projects\custom-dev-tools\components\MockPackTopicSelect.tsx` if the file grows too large)

**Checkpoint**: All three user stories satisfied independently.

---

## Phase 6: Polish and cross-cutting concerns

**Purpose**: Constitution alignment, consistency, and operator docs.

- [x] T019 [P] Normalize hard-coded Shopify Admin API version strings across `d:\work\pet-projects\custom-dev-tools\app\api\stores\[id]\feeds\generate\route.ts` and `d:\work\pet-projects\custom-dev-tools\lib\mock-packs\shopifySeed.ts` via a shared constant in `d:\work\pet-projects\custom-dev-tools\lib\shopifyAdminVersion.ts`
- [x] T020 [P] Run `npm run lint` and `npx tsc --noEmit` from `d:\work\pet-projects\custom-dev-tools` and fix new issues introduced by this feature
- [x] T021 Reconcile `d:\work\pet-projects\custom-dev-tools\specs\003-shopify-store-mocks\quickstart.md` with final env var names and routes after implementation

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user stories**.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2 and **US1 data path** (`MockDataPack` rows + Drive files readable for generation); practically start after Phase 3 minimum viable `GET /api/mock-packs` + at least one pack.
- **Phase 5 (US3)**: Depends on Phase 4 UI existing (extend selector); can parallelize T017 with late Phase 4 if built-in seed runs first.
- **Phase 6 (Polish)**: Depends on desired user stories being feature-complete.

### User story dependencies

| Story | Depends on |
|-------|------------|
| US1 | Phase 2 only |
| US2 | Phase 2 + US1 catalog/API for pack list and pack content resolution |
| US3 | US2 generation page shell; enhances UX and FR-012 data |

### Parallel opportunities

- **Phase 2**: T005, T006, T007 parallel after T003 schema types are stable (field names for validators).
- **Phase 6**: T019 and T020 parallel.
- **Different stories**: US3 tasks T017/T018 can overlap with late US2 if two developers coordinate on `mock-generate/page.tsx`.

### Parallel example: Phase 2

```text
# After T003 defines Prisma models and enums used by validators:
T005  lib/mock-packs/validateMockPackCsv.ts
T006  lib/mock-packs/parseMockPackUpload.ts
T007  lib/mock-packs/driveUpload.ts
```

---

## Implementation strategy

### MVP first (User Story 1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. **Stop and validate**: upload/list/archive flows per spec FR-001–FR-004, FR-011.

### Incremental delivery

1. Foundation ready → US1 (catalog) → demo MVP.
2. Add US2 (generation) → demo full operator loop.
3. Add US3 (built-in visibility + seeds) → demo empty-tenant story.

### Suggested MVP scope

- **MVP = User Story 1** (Phase 3 after Phase 2): platform mock pack catalog with CSV + Drive + validation.

---

## Notes

- Total tasks: **21** (T001–T021).
- Every task includes at least one concrete repo path.
- Re-run `d:\work\pet-projects\custom-dev-tools\.specify\scripts\powershell\check-prerequisites.ps1 -Json` if the feature directory moves.
