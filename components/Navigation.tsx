"use client";

import { Logout, Store } from "@mui/icons-material";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import ThemeModeSwitcher from "@/components/theme/ThemeModeSwitcher";

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Store sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Shopify OAuth Platform
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <ThemeModeSwitcher />
          <Button color="inherit" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
          <Button color="inherit" startIcon={<Logout />} onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
