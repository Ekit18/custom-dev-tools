"use client";

import { Toaster } from "react-hot-toast";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <Toaster position="top-right" />
      {children}
    </AppThemeProvider>
  );
}
