"use client";

import { Toaster } from "react-hot-toast";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Shopify OAuth Platform</title>
      </head>
      <body>
        <AppThemeProvider>
          <Toaster position="top-right" />
          {children}
        </AppThemeProvider>
      </body>
    </html>
  );
}
