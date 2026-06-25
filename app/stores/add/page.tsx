"use client";

import { useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Chip,
} from "@mui/material";
import { ContentCopy, Check } from "@mui/icons-material";
import StoreForm from "@/components/StoreForm";

const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function CopyableUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        mt: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontFamily: 'monospace',
        fontSize: 12,
        wordBreak: 'break-all',
        cursor: 'pointer',
        userSelect: 'all',
      }}
      onClick={copy}
      title="Click to copy"
    >
      <Box component="span" sx={{ flex: 1 }}>{value}</Box>
      {copied
        ? <Check sx={{ fontSize: 14, color: 'success.main', flexShrink: 0 }} />
        : <ContentCopy sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />}
    </Box>
  );
}

type InstallState = "idle" | "loading" | "error";

export default function AddStorePage() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (data: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    adminScopes: string[];
    storefrontScopes: string[];
  }) => {
    setInstallState("loading");
    setErrorMsg("");

    const response = await fetch("/api/stores/oauth/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      setInstallState("error");
      setErrorMsg(result.error || "Failed to initiate OAuth");
      throw new Error(result.error || "Failed to initiate OAuth");
    }

    // Full-page redirect to Shopify's OAuth screen. A top-level navigation is
    // never popup-blocked (unlike window.open). Shopify redirects back to
    // /api/stores/oauth/callback once the user authorizes the install.
    window.location.href = result.oauthUrl;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Add Shopify Store
      </Typography>

      {installState === "error" && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Setup Instructions
        </Typography>
        <Stepper orientation="vertical" nonLinear activeStep={-1}>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>Configure API Scopes</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Use the selectors below to choose the scopes your app needs.
                Copy the generated scope string.
              </Typography>
            </StepContent>
          </Step>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>
                Set up your Shopify Custom App
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                In <strong>Shopify Admin → Settings → Apps and sales
                channels → Develop apps</strong>, create or open your app and:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mt: 0.5 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Set the <strong>App URL</strong> to:
                  <CopyableUrl value={APP_URL} />
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Set the <strong>Allowed redirection URL</strong> to:
                  <CopyableUrl value={`${APP_URL}/api/stores/oauth/callback`} />
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Paste the copied scopes into <em>Admin API integration → Admin API access scopes</em>
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Save and release a new app version
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Copy your <strong>Client ID</strong> and <strong>Client secret</strong>
                </Typography>
              </Box>
            </StepContent>
          </Step>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>
                Enter credentials &amp; install
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Enter your store domain, Client ID and Client Secret in the
                form below. Click <strong>Install App</strong> — you'll be
                redirected to Shopify to authorize the installation.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6">Store Configuration</Typography>
          {installState === "loading" && (
            <Chip
              size="small"
              label="Saving…"
              icon={<CircularProgress size={12} />}
              color="default"
            />
          )}
        </Box>
        <StoreForm onSubmit={handleSubmit} submitLabel="Install App" />
      </Paper>
    </Container>
  );
}
