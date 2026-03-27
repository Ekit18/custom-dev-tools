# Contract: Header Theme Switcher (new UI contract)

**Surface**: `components/Navigation.tsx` + `components/theme/ThemeModeSwitcher.tsx`
**Change type**: New user-facing interaction contract
**Date**: 2026-03-27

---

## Purpose

Provide an always-available header control that lets users select one of three theme
preferences:

1. `system` (follow device/browser preference)
2. `light`
3. `dark`

Selection updates the app appearance immediately and persists across refresh/sessions on
the same browser/device.

---

## Control Contract

### Input

- User action via pointer (click/tap) or keyboard on header theme control.
- Allowed selected values: `system`, `light`, `dark`.

### Output / Effects

- Persist selected value into localStorage key `theme-preference`.
- Recompute effective mode and re-render app theme without full page reload.
- Header control visual state reflects currently selected value.

---

## Behavior Rules

1. **Initial hydration**
   - If localStorage contains valid value (`system|light|dark`), use it.
   - Else use default `system` and write default value lazily when first changed.

2. **System mode resolution**
   - `system` maps to current `prefers-color-scheme`:
     - prefers dark -> effective theme `dark`
     - otherwise -> effective theme `light`

3. **Live updates in system mode**
   - While selected value is `system`, OS/browser preference changes MUST update effective
     theme without page reload.

4. **Accessibility**
   - Control is keyboard operable.
   - Active option is perceivable via label and selected state.
   - Focus indicator remains visible in both light and dark themes.

5. **Layout fallback**
   - On narrow screens where header compresses, control remains available from the
     header-equivalent menu area.

---

## Error/Degraded Behavior

- If localStorage is unavailable, app still allows runtime switching for current session.
- If stored value is invalid/corrupted, app falls back to `system` and remains usable.
- If `matchMedia` is unavailable, `system` falls back to `light`.

---

## Test Assertions (contract-level)

- Selecting each option updates visible theme and selected state.
- Selected mode persists after page refresh.
- `system` mode reacts to mocked `prefers-color-scheme` change event.
- Header control remains interactive and accessible by keyboard.

---

## Accessibility Verification Notes

- `ToggleButtonGroup` options are reachable via keyboard focus and toggle activation.
- Each option exposes an explicit `aria-label` (`System theme`, `Light theme`, `Dark theme`).
- Control semantics remain visible in light and dark themes through default MUI focus/contrast behavior.
