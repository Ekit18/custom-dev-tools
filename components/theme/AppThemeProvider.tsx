"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAppTheme } from "@/app/theme";
import {
  getSystemPrefersDark,
  readThemePreference,
  resolveEffectiveMode,
  type ThemeMode,
  writeThemePreference,
} from "@/lib/theme-preference";

type ThemeModeContextValue = {
  selectedMode: ThemeMode;
  setSelectedMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within AppThemeProvider");
  }
  return context;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [selectedMode, setSelectedMode] = useState<ThemeMode>("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    setSelectedMode(readThemePreference());
    setSystemPrefersDark(getSystemPrefersDark());
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    writeThemePreference(selectedMode);
  }, [selectedMode]);

  const resolvedMode = resolveEffectiveMode(selectedMode, systemPrefersDark);
  const theme = useMemo(() => getAppTheme(resolvedMode), [resolvedMode]);

  const contextValue = useMemo(
    () => ({ selectedMode, setSelectedMode }),
    [selectedMode],
  );

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
