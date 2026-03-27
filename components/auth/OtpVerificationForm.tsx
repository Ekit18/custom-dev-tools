"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function OtpVerificationForm() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [success, setSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    setRetryAfter(seconds);
    countdownRef.current = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAttemptsRemaining(null);

    if (!code || !/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push(data.redirectTo ?? "/dashboard"), 1000);
        return;
      }

      if (res.status === 410) {
        setError(data.error);
      } else if (res.status === 422) {
        setAttemptsRemaining(data.attemptsRemaining ?? null);
        setError(data.error);
      } else {
        setError(data.error ?? "Verification failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setCode("");
        setError(null);
        setAttemptsRemaining(null);
      } else if (res.status === 429) {
        startCountdown(data.retryAfterSeconds ?? 60);
        setError(
          `Too many requests. Try again in ${data.retryAfterSeconds ?? 60} seconds.`,
        );
      } else {
        setError(data.error ?? "Failed to resend code. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setResendLoading(false);
    }
  }

  const isSubmitting = verifyLoading || resendLoading;

  if (success) {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        Email verified! Redirecting to your dashboard…
      </Alert>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleVerify}
      noValidate
      sx={{ width: "100%", maxWidth: 400 }}
    >
      <Stack spacing={2}>
        {error && (
          <Alert severity="error">
            {error}
            {attemptsRemaining !== null && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""}{" "}
                remaining.
              </Typography>
            )}
          </Alert>
        )}

        <TextField
          label="Verification Code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="Enter 6-digit code"
          inputProps={{ maxLength: 6, inputMode: "numeric", pattern: "[0-9]*" }}
          disabled={isSubmitting}
          fullWidth
          autoFocus
          helperText="Check your @devit.group inbox for a 6-digit code."
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isSubmitting || code.length !== 6}
          startIcon={
            verifyLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : null
          }
        >
          {verifyLoading ? "Verifying…" : "Verify Email"}
        </Button>

        <Button
          variant="text"
          onClick={handleResend}
          disabled={isSubmitting || retryAfter > 0}
          fullWidth
        >
          {resendLoading
            ? "Sending…"
            : retryAfter > 0
              ? `Resend available in ${retryAfter}s`
              : "Resend Code"}
        </Button>
      </Stack>
    </Box>
  );
}
