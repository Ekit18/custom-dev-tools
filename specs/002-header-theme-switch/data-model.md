# Data Model: Header Theme Switching (Light, Dark, System)

**Branch**: `002-header-theme-switch` | **Date**: 2026-03-27
**Source**: App UI preference state (`localStorage` + runtime mode resolution)

---

## Entities

### ThemePreference (client-side persisted preference)

Represents the user’s explicit appearance choice. This is persisted in browser storage and
re-hydrated on app load.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| selectedMode | enum | Required; one of `light`, `dark`, `system` | Stored in localStorage key `theme-preference` |
| updatedAt | runtime event | Optional (not persisted in v1) | Useful for debugging only; not required by spec |

**Validation rules**:
- Values outside `light|dark|system` are treated as invalid and replaced with default
  (`system`).
- Missing value implies first-time visitor and defaults to `system`.

---

### EffectiveTheme (derived runtime state)

Represents the actual applied palette mode at render time.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| resolvedMode | enum | `light` or `dark` only | Derived from `selectedMode` and system preference |
| source | enum | `explicit` or `system` | Indicates whether result came from user override or system setting |

**Resolution logic**:

```text
if selectedMode == "light"  => resolvedMode = "light"
if selectedMode == "dark"   => resolvedMode = "dark"
if selectedMode == "system" => resolvedMode = systemPrefersDark ? "dark" : "light"
```

---

## State Transitions

```text
Initial load
  ├─ localStorage has valid value -> selectedMode = persisted value
  └─ localStorage missing/invalid -> selectedMode = "system"

selectedMode changes from header control
  -> write to localStorage("theme-preference", selectedMode)
  -> recompute resolvedMode
  -> re-render ThemeProvider with updated MUI theme

system preference changes (only when selectedMode == "system")
  -> recompute resolvedMode
  -> re-render ThemeProvider
```

---

## Persistence Contract

- **Storage medium**: `window.localStorage`
- **Key**: `theme-preference`
- **Allowed values**: `"light"`, `"dark"`, `"system"`
- **Fallback behavior**:
  - no key: use `system`
  - invalid value: overwrite with `system`

---

## UI Mapping Rules

- Header control displays `selectedMode` (explicit choice), not `resolvedMode`.
- Visual styling across app uses `resolvedMode` through MUI `ThemeProvider`.
- All MUI components consume theme tokens (palette/text/background/action), ensuring
  buttons, text, and surfaces adapt together.

---

## Non-Goals (explicitly out of model scope)

- No server-side persistence of theme preference.
- No per-component independent theme overrides in this feature.
- No user-account-level sync of preference between devices.
