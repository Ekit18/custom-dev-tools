---
description: "Task list for Header Theme Switching (Light, Dark, System)"
---

# Tasks: Header Theme Switching (Light, Dark, System)

**Input**: Design documents from `specs/002-header-theme-switch/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Included — plan and constitution require deterministic verification of mode selection, persistence, and system-follow behavior.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in all descriptions

## Path Conventions

Single Next.js project — all paths relative to repository root:
`app/`, `components/`, `lib/`, `tests/`

---

## Phase 1: Setup

**Purpose**: Prepare test/runtime scaffolding for theme preference behavior.

- [x] T001 Add browser API test shims in `jest.setup.ts` for `window.matchMedia` and localStorage reset between tests
- [x] T002 [P] Create `lib/theme-preference.ts` type exports and constants (`ThemeMode`, `THEME_STORAGE_KEY`) as implementation stubs
- [x] T003 [P] Create `components/theme/` directory and placeholder files `components/theme/AppThemeProvider.tsx` and `components/theme/ThemeModeSwitcher.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core architecture that all stories depend on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T004 Refactor `app/theme.ts` into a mode-aware theme factory (`getAppTheme(resolvedMode)`) with light/dark palette branches
- [x] T005 [P] Implement pure theme preference helpers in `lib/theme-preference.ts` (`readThemePreference`, `writeThemePreference`, `resolveEffectiveMode`)
- [x] T006 [P] Implement `components/theme/AppThemeProvider.tsx` to own selected mode, resolve effective mode, react to `matchMedia` changes, and wrap MUI `ThemeProvider`
- [x] T007 Update `app/layout.tsx` to replace static `ThemeProvider theme={theme}` usage with `AppThemeProvider`
- [x] T008 Update `app/globals.css` to remove conflicting `prefers-color-scheme` overrides that can disagree with MUI active theme

**Checkpoint**: Foundation ready — app-level dynamic theming + persistence plumbing exists.

---

## Phase 3: User Story 1 - Choose Appearance from the Header (Priority: P1) 🎯 MVP

**Goal**: User can switch light/dark/system from header and see immediate app-wide visual change.

**Independent Test**: On a page with header, select Light/Dark/System and confirm mode applies without page reload.

### Tests for User Story 1 ⚠️

> **Write these FIRST — verify they FAIL before implementation**

- [x] T009 [P] [US1] Add unit tests in `tests/unit/theme-preference.test.ts` for effective-mode resolution (`light`, `dark`, `system`)
- [x] T010 [P] [US1] Add integration tests in `tests/integration/theme-switcher.test.tsx` for header control rendering and immediate mode switching

### Implementation for User Story 1

- [x] T011 [US1] Implement `components/theme/ThemeModeSwitcher.tsx` with accessible three-option control (`system`, `light`, `dark`) and selected-state indication
- [x] T012 [US1] Integrate `ThemeModeSwitcher` into `components/Navigation.tsx` header layout (desktop + responsive header-equivalent region)
- [x] T013 [US1] Ensure MUI components in `components/Navigation.tsx` and app shell consume theme tokens (no hardcoded conflicting text/surface colors)

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Remembered Preference Across Sessions (Priority: P2)

**Goal**: Selected mode persists after refresh and new browser session on same profile/device.

**Independent Test**: Set dark mode, refresh/reopen app, confirm dark mode restored before interaction.

### Tests for User Story 2 ⚠️

- [x] T014 [P] [US2] Extend `tests/unit/theme-preference.test.ts` with localStorage read/write validation and invalid-value fallback to `system`
- [x] T015 [P] [US2] Extend `tests/integration/theme-switcher.test.tsx` with hydration/persistence assertions across rerender/reload simulation

### Implementation for User Story 2

- [x] T016 [US2] Finalize persistence logic in `lib/theme-preference.ts` (safe localStorage access, invalid-value recovery)
- [x] T017 [US2] Wire persistence lifecycle in `components/theme/AppThemeProvider.tsx` (hydrate on mount, persist on selection change)

**Checkpoint**: User Stories 1 and 2 both functional and independently testable.

---

## Phase 5: User Story 3 - System Mode Tracks Device Changes (Priority: P3)

**Goal**: In system mode, app follows OS/browser light-dark changes live.

**Independent Test**: Select system mode, trigger `prefers-color-scheme` change, confirm UI updates without reload.

### Tests for User Story 3 ⚠️

- [x] T018 [P] [US3] Extend `tests/integration/theme-switcher.test.tsx` with mocked `matchMedia` `change` event assertions when selected mode is `system`
- [x] T019 [P] [US3] Add negative case in `tests/integration/theme-switcher.test.tsx` verifying explicit `light`/`dark` mode ignores `matchMedia` changes

### Implementation for User Story 3

- [x] T020 [US3] Complete `matchMedia('(prefers-color-scheme: dark)')` subscription and cleanup in `components/theme/AppThemeProvider.tsx`
- [x] T021 [US3] Ensure `resolveEffectiveMode` behavior in `lib/theme-preference.ts` supports environments without `matchMedia` (fallback to `light`)

**Checkpoint**: All three user stories independently functional and tested.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate constitution gates and delivery readiness.

- [x] T022 [P] Update `specs/002-header-theme-switch/quickstart.md` if implementation details diverge from planned verification steps
- [x] T023 [P] Run accessibility pass for theme switcher interactions (keyboard/focus/contrast) and capture notes in `specs/002-header-theme-switch/contracts/theme-switcher.md`
- [ ] T024 [P] Run full test suite via `npm test` and fix any regressions
- [ ] T025 Run lint and type checks (`npm run lint`, `npx tsc --noEmit`) and resolve issues
- [x] T026 Run production build (`npm run build`) and verify no unexpected warnings from theming changes
- [ ] T027 Execute all manual scenarios in `specs/002-header-theme-switch/quickstart.md` (mode switching, persistence, system-follow, responsive header access)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — blocks all user stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 2; builds on US1 switcher behavior
- **US3 (Phase 5)**: Depends on Phase 2; extends system-mode behavior introduced in US1/US2
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: MVP, first deliverable slice
- **US2 (P2)**: Adds persistence guarantees to existing switching
- **US3 (P3)**: Adds dynamic system-follow behavior

### Within Each User Story

- Tests must be written and confirmed failing before implementation tasks
- Helper/model logic before component wiring where applicable
- Provider/theme runtime behavior before final UI assertions

### Parallel Opportunities

```bash
# Setup
T002, T003

# Foundational
T005, T006

# US1 tests
T009, T010

# US2 tests
T014, T015

# US3 tests
T018, T019

# Polish
T022, T023, T024
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US1)
4. Validate header switching manually and via tests
5. Demo/ship MVP

### Incremental Delivery

1. US1: Header switching
2. US2: Persistence across refresh/session
3. US3: Live system-follow updates
4. Polish gates (lint/type/build/a11y/manual quickstart)

### Parallel Team Strategy

With two contributors after Phase 2:
- Developer A: Provider + helper logic (`lib/theme-preference.ts`, `components/theme/AppThemeProvider.tsx`)
- Developer B: Header control + integration tests (`components/theme/ThemeModeSwitcher.tsx`, `components/Navigation.tsx`, `tests/integration/theme-switcher.test.tsx`)

---

## Notes

- `[P]` means different files and safe concurrency
- Story labels map each task to user-story scope for traceability
- Preserve single source of truth for mode resolution in `lib/theme-preference.ts`
- Avoid ad-hoc component-level hardcoded color overrides; rely on theme tokens

