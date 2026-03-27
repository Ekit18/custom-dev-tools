# Quickstart: Header Theme Switching (Light, Dark, System)

**Branch**: `002-header-theme-switch` | **Date**: 2026-03-27

Use this guide to implement and manually validate the header-based theme switching
feature end-to-end in local development.

---

## Prerequisites

- Node.js 20+
- `npm` available
- Existing project dependencies installed

---

## 1. Install / verify dependencies

No new dependency is required for the planned approach (uses existing MUI + React).

```bash
npm install
```

---

## 2. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 3. Manual validation scenarios

### Scenario 1 — Header can switch all three modes

1. Open a page with the app header (for example `/dashboard` after login).
2. In the header, select **Light**.
3. **Expected**: app surfaces, text, and controls are in light appearance.
4. Select **Dark**.
5. **Expected**: app surfaces, text, and controls switch to dark appearance.
6. Select **System**.
7. **Expected**: app appearance matches current OS/browser preference.

---

### Scenario 2 — Preference persists through refresh

1. Select **Dark** from the header.
2. Refresh the page.
3. **Expected**: dark appearance remains active immediately after load.
4. In browser devtools, inspect localStorage key `theme-preference`.
5. **Expected**: value is `dark`.

---

### Scenario 3 — Persistence across new session

1. Select **Light** in the header.
2. Close browser tab/window and open app again in same browser profile.
3. **Expected**: light appearance is restored without re-selecting.

---

### Scenario 4 — System mode follows OS change live

1. Set mode to **System**.
2. Keep app open.
3. Change OS/browser appearance from light to dark (or reverse).
4. **Expected**: app updates mode automatically without full reload.

---

### Scenario 5 — Small-screen access

1. Open responsive mode in browser devtools (mobile width).
2. Navigate to a page with header/menu.
3. **Expected**: theme switcher is still reachable from header-equivalent area.
4. Change mode.
5. **Expected**: mode changes and persists as on desktop.

---

## 4. Automated verification commands

```bash
# Unit/integration tests
npm test

# Lint + typecheck
npm run lint
npx tsc --noEmit

# Production build
npm run build
```

All must pass before opening a PR.

---

## 5. Troubleshooting

- **Theme does not persist**: verify localStorage read/write key exactly matches
  `theme-preference`.
- **System mode not reacting**: verify `matchMedia('(prefers-color-scheme: dark)')`
  listener is attached and cleaned up correctly.
- **Mixed light/dark styling**: check for conflicting hardcoded colors or CSS media-rule
  overrides outside MUI theme tokens.
