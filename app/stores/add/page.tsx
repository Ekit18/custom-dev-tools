"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  CheckCircle,
  OpenInNew,
  ArrowBack,
} from "@mui/icons-material";
import { ContentCopy, Check } from "@mui/icons-material";
import StoreForm from "@/components/StoreForm";
import toast from "react-hot-toast";

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

type InstallState = "idle" | "loading" | "waiting" | "success" | "error";

export default function AddStorePage() {
  const router = useRouter();
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel("oauth_callback");
    channel.onmessage = (event) => {
      if (event.data?.success) {
        setInstallState("success");
        toast.success("Store installed successfully!");
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    };
    return () => channel.close();
  }, [router]);

  const openPopup = (url: string) => {
    const popup = window.open(
      url,
      "shopify_oauth",
      "width=600,height=700,left=200,top=100"
    );
    popupRef.current = popup;
    if (!popup) {
      toast.error(
        "Popup was blocked. Please allow popups for this site, then click 'Open Installation Window'."
      );
    }
  };

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

    setOauthUrl(result.oauthUrl);
    openPopup(result.oauthUrl);
    setInstallState("waiting");
  };

  if (installState === "waiting" || installState === "success") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          {installState === "success" ? (
            <>
              <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Store installed!
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Redirecting to dashboard…
              </Typography>
              <CircularProgress size={24} />
            </>
          ) : (
            <>
              <CircularProgress size={48} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Complete installation in the popup window
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                A Shopify authorization window has been opened. Install the app
                there to continue.
              </Typography>
              <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                Once you click <strong>Install app</strong> in Shopify, this
                page will update automatically.
              </Alert>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Button
                  variant="contained"
                  startIcon={<OpenInNew />}
                  onClick={() => openPopup(oauthUrl)}
                  disabled={!oauthUrl}
                >
                  Open Installation Window
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => setInstallState("idle")}
                >
                  Start Over
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    );
  }

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
                form below. Click <strong>Install App</strong> — a popup will
                open for you to authorize the installation.
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
