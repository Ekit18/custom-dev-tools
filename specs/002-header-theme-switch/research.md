# Research: Header Theme Switching (Light, Dark, System)

**Branch**: `002-header-theme-switch` | **Date**: 2026-03-27
**Phase**: 0 — all technical choices resolved before implementation

---

## Decision 1: Theme state ownership and rendering strategy

**Decision**: Introduce a client-side `AppThemeProvider` that owns the selected mode
(`light | dark | system`) and computes an effective palette mode (`light | dark`) for MUI
`ThemeProvider`.

**Rationale**:
- Current app uses a static imported theme (`app/theme.ts` with fixed `mode: 'light'`).
- Centralized provider avoids scattering mode checks across components.
- Keeps mode changes instant and local (no API/database dependency).

**Alternatives considered**:
- Global state library (Redux/Zustand) — unnecessary complexity for one small preference.
- Route-level theming — duplicates logic and risks inconsistency.

---

## Decision 2: Persistence format and storage key

**Decision**: Persist explicit user selection in localStorage under key
`theme-preference` with allowed values `"light" | "dark" | "system"`.

**Rationale**:
- Matches feature requirement to persist across refresh and sessions on same device/browser.
- Tiny payload and zero backend migration.
- Easy to validate and recover from invalid values.

**Alternatives considered**:
- Cookies — workable but unnecessary for purely client-side preference.
- User profile DB field — enables cross-device sync but out of current scope.

---

## Decision 3: System mode resolution behavior

**Decision**: Use `window.matchMedia('(prefers-color-scheme: dark)')` when selected mode
is `system`; subscribe to `change` events to live-update theme while app remains open.

**Rationale**:
- Directly aligns with user story requiring system mode to track device changes.
- Event-driven update avoids polling overhead.

**Alternatives considered**:
- Resolve only on initial page load — fails live-update requirement.
- Polling every N seconds — less efficient and less responsive.

---

## Decision 4: Theme creation approach in MUI

**Decision**: Refactor `app/theme.ts` from a static theme export to a factory function that
returns `createTheme({ palette: { mode } ... })`, preserving existing brand colors while
allowing both light and dark token branches.

**Rationale**:
- Minimal change to current architecture.
- Keeps all color decisions in one file and avoids hardcoded inline colors.

**Alternatives considered**:
- Two separate files (`lightTheme.ts`, `darkTheme.ts`) — acceptable but introduces duplicate token sections.
- Runtime style overrides in components — violates consistency principle.

---

## Decision 5: Header control UX pattern

**Decision**: Add a compact theme control in `components/Navigation.tsx` using an accessible
MUI selector (e.g., `ToggleButtonGroup` or `Select`) with three explicit options: System,
Light, Dark.

**Rationale**:
- Header is explicitly requested interaction point.
- Option labels reduce ambiguity vs icon-only controls.
- MUI control ensures keyboard/focus behavior with minimal custom logic.

**Alternatives considered**:
- Icon-only cycle button — smaller UI but poorer discoverability and accessibility.
- Settings page-only control — does not satisfy header placement requirement.

---

## Decision 6: Avoiding style conflicts with existing global CSS

**Decision**: Update `app/globals.css` so global CSS variables no longer force a separate
`prefers-color-scheme` branch that can conflict with MUI runtime theme selection.

**Rationale**:
- Current stylesheet has a dark-mode media query that may visually conflict with MUI token
  application and cause mismatched colors during mode changes.
- Single source of truth should be MUI active theme mode.

**Alternatives considered**:
- Keep both systems in parallel — higher risk of inconsistent colors.
- Remove all CSS variables — unnecessary; only conflicting overrides need alignment.

---

## Decision 7: Test strategy for reliability

**Decision**: Add unit tests for preference helpers and integration tests for switcher UI,
including persistence and hydration behavior.

**Rationale**:
- LocalStorage and `matchMedia` interactions are common regression points.
- Constitution requires measurable test coverage and deterministic tests.

**Alternatives considered**:
- Manual-only verification — too fragile for a cross-cutting UI feature.

---

## Resolved Unknowns Summary

| Unknown | Decision |
|---------|----------|
| Where theme state should live | Dedicated `AppThemeProvider` wrapping app-level `ThemeProvider` |
| How to persist selection | localStorage key `theme-preference` |
| How `system` should work | `matchMedia('(prefers-color-scheme: dark)')` + live `change` listener |
| Theme token architecture | Refactor `app/theme.ts` into a mode-based theme factory |
| Header interaction style | Explicit 3-option accessible selector in `Navigation` |
| CSS conflict handling | Align/trim `globals.css` dark media overrides to avoid split theming logic |
| Verification strategy | Unit + integration tests with mocked localStorage and matchMedia |
