import { createTheme } from "@mui/material/styles";
import type { ResolvedThemeMode } from "@/lib/theme-preference";

export function getAppTheme(mode: ResolvedThemeMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#1976d2",
      },
      secondary: {
        main: "#dc004e",
      },
      background: {
        default: mode === "dark" ? "#0a0a0a" : "#ffffff",
        paper: mode === "dark" ? "#121212" : "#ffffff",
      },
    },
  });
}
