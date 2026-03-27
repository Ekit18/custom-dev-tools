"use client";

import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  OutlinedInput,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState({
    mainInput: false,
    confirmInput: false,
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Client-side domain restriction (T020) — prevents unnecessary round-trip
    if (mode === "register" && !email.toLowerCase().endsWith("@devit.group")) {
      setEmailError("Only @devit.group email addresses can register here.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // T019: Show domain-rejection errors inline on the email field
        if (
          response.status === 400 &&
          data.error?.toLowerCase().includes("devit.com")
        ) {
          setEmailError(data.error);
        } else {
          setError(data.error || "Something went wrong");
        }
        setLoading(false);
        return;
      }

      // Redirect using server-provided hint or fallback to /dashboard
      const destination = data.redirectTo ?? "/dashboard";
      setTimeout(() => {
        window.location.href = destination;
      }, 200);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 400,
        mx: "auto",
        mt: 8,
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
        {mode === "login" ? "Sign In" : "Sign Up"}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (emailError) setEmailError("");
        }}
        error={!!emailError}
        helperText={
          emailError ||
          (mode === "register"
            ? "Must be a @devit.group email address."
            : undefined)
        }
        required
        fullWidth
        autoComplete="email"
      />

      <OutlinedInput
        id="outlined-adornment-password"
        type={showPassword.mainInput ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label={
                showPassword.mainInput
                  ? "hide the password"
                  : "display the password"
              }
              onClick={() =>
                setShowPassword((prev) => ({
                  ...prev,
                  mainInput: !prev.mainInput,
                }))
              }
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={(e) => e.preventDefault()}
              edge="end"
            >
              {showPassword.mainInput ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }
      />

      {mode === "register" && (
        <OutlinedInput
          id="outlined-adornment-confirm-password"
          type={showPassword.confirmInput ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          fullWidth
          autoComplete="new-password"
          endAdornment={
            <InputAdornment position="end">
              <IconButton
                aria-label={
                  showPassword.confirmInput
                    ? "hide the password"
                    : "display the password"
                }
                onClick={() =>
                  setShowPassword((prev) => ({
                    ...prev,
                    confirmInput: !prev.confirmInput,
                  }))
                }
                onMouseDown={(e) => e.preventDefault()}
                onMouseUp={(e) => e.preventDefault()}
                edge="end"
              >
                {showPassword.confirmInput ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
        />
      )}

      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={loading}
        fullWidth
      >
        {loading ? "Loading..." : mode === "login" ? "Sign In" : "Sign Up"}
      </Button>

      <Typography textAlign="center" variant="body2">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <Button
              onClick={() => router.push("/register")}
              variant="text"
              size="small"
            >
              Sign Up
            </Button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Button
              onClick={() => router.push("/login")}
              variant="text"
              size="small"
            >
              Sign In
            </Button>
          </>
        )}
      </Typography>
    </Box>
  );
}
