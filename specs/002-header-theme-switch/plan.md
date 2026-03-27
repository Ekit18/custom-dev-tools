# Implementation Plan: Header Theme Switching (Light, Dark, System)

**Branch**: `002-header-theme-switch` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-header-theme-switch/spec.md`

## Summary

Add a global header theme switcher with three modes (light, dark, system), persist the
user’s selected mode in localStorage, restore it on refresh/new session, and apply the
selected mode consistently across application UI (components, buttons, typography, and
surfaces) using a single app-wide theming source of truth.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16.1.6 (App Router)
**Primary Dependencies**: Next.js 16, React 19, MUI v7 (`@mui/material`, `@mui/icons-material`)
**Storage**: Browser localStorage (`theme-preference`) for persisted mode (`light|dark|system`)
**Testing**: Jest + React Testing Library for unit/integration UI behavior; Biome for lint
**Target Platform**: Web browser (desktop + mobile responsive header)
**Project Type**: web application (single Next.js App Router project)
**Performance Goals**: Theme switch applies visually in < 200 ms after selection; first render avoids prolonged flash of wrong theme
**Constraints**: Preserve WCAG-readable contrast in both modes; no full page reload for switching; JS bundle delta <= 5 kB gzip/PR
**Scale/Scope**: 1 shared theme provider update, 1 header switcher UI, 1 localStorage persistence path, global styling consistency across existing pages/components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I — Code Quality | Strict typing, SRP modules, no ad-hoc theme logic spread | ✅ PASS | Plan centralizes behavior in a dedicated theme preference provider + small header switcher component. |
| I — Code Quality | No untracked debt / TODO placeholders | ✅ PASS | All decisions and tradeoffs captured in research/design artifacts. |
| II — Testing Standards | Test-first coverage for selection, persistence, and system-follow behavior | ✅ PASS | Unit tests planned for mode resolution and localStorage hydration; integration UI test for switcher behavior. |
| III — UX Consistency | MUI design tokens only; all 4 UI states considered | ✅ PASS | Existing `ThemeProvider` and `CssBaseline` are extended; no hardcoded per-component color overrides in feature logic. |
| III — UX Consistency | Accessibility (keyboard + readable labels + focus) | ✅ PASS | Switcher contract requires keyboard operability and explicit mode indication. |
| IV — Performance | No heavy runtime cost; no unnecessary rerenders or API calls | ✅ PASS | Client-only mode state; no network/database changes; mode computed locally. |
| IV — Performance | Bundle-size guard <= 5 kB gzip increase unless approved | ✅ PASS | Feature reuses existing MUI dependencies; expected to stay within threshold. |

**Post-Phase-0 re-check**: All gates remain compliant after research and design; no violations require Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/002-header-theme-switch/
├── plan.md                # This file
├── research.md            # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/             # Phase 1 output
│   └── theme-switcher.md
└── tasks.md               # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                         MODIFY — use dynamic app theme provider instead of static theme import
├── theme.ts                           MODIFY — expose factory/getTheme(mode) for light/dark generation
└── globals.css                        MODIFY — avoid conflicting forced dark media rule; align base vars with active theme

components/
├── Navigation.tsx                     MODIFY — add header theme switch control
└── theme/
    ├── ThemeModeSwitcher.tsx          NEW    — UI control with 3 options (system/light/dark)
    └── AppThemeProvider.tsx           NEW    — localStorage hydration + system preference listening + MUI ThemeProvider wiring

lib/
└── theme-preference.ts                NEW    — typed helpers for read/write/resolve mode (`light|dark|system`)

tests/
├── integration/
│   └── theme-switcher.test.tsx        NEW    — header switching flow + persisted value restoration
└── unit/
    └── theme-preference.test.ts       NEW    — mode resolution/localStorage helpers
```

**Structure Decision**: Keep single-project Next.js structure and add a focused `components/theme/` area for theme orchestration, while keeping pure preference logic in `lib/` for testability.

## Complexity Tracking

> No constitution violations requiring justification. All gates passed cleanly.
