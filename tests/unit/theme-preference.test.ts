/** @jest-environment jsdom */

import {
  getSystemPrefersDark,
  readThemePreference,
  resolveEffectiveMode,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from "@/lib/theme-preference";

type MatchMediaState = Record<string, { setMatches: (value: boolean) => void }>;

function getMatchMediaState(): MatchMediaState {
  return (globalThis as unknown as { __matchMediaState: MatchMediaState })
    .__matchMediaState;
}

describe("theme-preference helpers", () => {
  it("resolves explicit light mode", () => {
    expect(resolveEffectiveMode("light", true)).toBe("light");
  });

  it("resolves explicit dark mode", () => {
    expect(resolveEffectiveMode("dark", false)).toBe("dark");
  });

  it("resolves system mode to dark when system prefers dark", () => {
    expect(resolveEffectiveMode("system", true)).toBe("dark");
  });

  it("resolves system mode to light when system does not prefer dark", () => {
    expect(resolveEffectiveMode("system", false)).toBe("light");
  });

  it("writes and reads a valid localStorage preference", () => {
    writeThemePreference("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference()).toBe("dark");
  });

  it("falls back to system for invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "invalid");
    expect(readThemePreference()).toBe("system");
  });

  it("falls back to system when no value exists", () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    expect(readThemePreference()).toBe("system");
  });

  it("returns system prefers dark from matchMedia", () => {
    const state = getMatchMediaState()["(prefers-color-scheme: dark)"];
    state.setMatches(true);
    expect(getSystemPrefersDark()).toBe(true);
    state.setMatches(false);
    expect(getSystemPrefersDark()).toBe(false);
  });
});
