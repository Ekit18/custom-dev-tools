export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveEffectiveMode(
  selectedMode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedThemeMode {
  if (selectedMode === "light") return "light";
  if (selectedMode === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}

export function readThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "system";

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep runtime behavior working.
  }
}

export function getSystemPrefersDark(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
