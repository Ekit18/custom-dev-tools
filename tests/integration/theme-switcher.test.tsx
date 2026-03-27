/** @jest-environment jsdom */

import { useTheme } from "@mui/material/styles";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import ThemeModeSwitcher from "@/components/theme/ThemeModeSwitcher";

type MatchMediaState = Record<string, { setMatches: (value: boolean) => void }>;

function getMatchMediaState(): MatchMediaState {
  return (globalThis as unknown as { __matchMediaState: MatchMediaState })
    .__matchMediaState;
}

function ThemeModeProbe() {
  const theme = useTheme();
  return <div data-testid="effective-mode">{theme.palette.mode}</div>;
}

function TestHarness() {
  return (
    <AppThemeProvider>
      <ThemeModeSwitcher />
      <ThemeModeProbe />
    </AppThemeProvider>
  );
}

describe("theme switcher integration", () => {
  it("renders all three mode options", () => {
    render(<TestHarness />);
    expect(screen.getByLabelText("System theme")).toBeTruthy();
    expect(screen.getByLabelText("Light theme")).toBeTruthy();
    expect(screen.getByLabelText("Dark theme")).toBeTruthy();
  });

  it("switches to dark mode immediately", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByLabelText("Dark theme"));
    expect(screen.getByTestId("effective-mode").textContent).toBe("dark");
  });

  it("switches to light mode immediately", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByLabelText("Light theme"));
    expect(screen.getByTestId("effective-mode").textContent).toBe("light");
  });

  it("persists selection in localStorage", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByLabelText("Dark theme"));
    expect(window.localStorage.getItem("theme-preference")).toBe("dark");
  });

  it("hydrates from stored preference on mount", () => {
    window.localStorage.setItem("theme-preference", "dark");
    render(<TestHarness />);
    expect(screen.getByTestId("effective-mode").textContent).toBe("dark");
  });

  it("updates in system mode when matchMedia changes", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByLabelText("System theme"));

    const state = getMatchMediaState()["(prefers-color-scheme: dark)"];
    act(() => {
      state.setMatches(true);
    });
    expect(screen.getByTestId("effective-mode").textContent).toBe("dark");

    act(() => {
      state.setMatches(false);
    });
    expect(screen.getByTestId("effective-mode").textContent).toBe("light");
  });

  it("ignores matchMedia changes when explicit dark selected", () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByLabelText("Dark theme"));

    const state = getMatchMediaState()["(prefers-color-scheme: dark)"];
    act(() => {
      state.setMatches(false);
    });

    expect(screen.getByTestId("effective-mode").textContent).toBe("dark");
  });
});
