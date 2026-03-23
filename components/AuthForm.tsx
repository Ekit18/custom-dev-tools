"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FilledInput,
  InputAdornment,
  IconButton,
  OutlinedInput,
} from "@mui/material";
import { VisibilityOff, Visibility } from '@mui/icons-material';

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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Успішний логін - чекаємо щоб cookies точно встановились, потім redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 200);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Box
      component='form'
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
      <Typography variant='h4' component='h1' textAlign='center' gutterBottom>
        {mode === "login" ? "Sign In" : "Sign Up"}
      </Typography>

      {error && <Alert severity='error'>{error}</Alert>}

      <TextField
        label='Email'
        type='email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        autoComplete='email'
      />

      <OutlinedInput
        id='outlined-adornment-password'
        type={showPassword.mainInput ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        autoComplete={mode === "login" ? 'current-password' : 'new-password'}
        endAdornment={
          <InputAdornment position='end'>
            <IconButton
              aria-label={
                showPassword.mainInput ? "hide the password" : "display the password"
              }
              
              onClick={() => setShowPassword((prev) => ({ ...prev, mainInput: !prev.mainInput }))}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={(e) => e.preventDefault()}
              edge='end'
            >
              {showPassword.mainInput ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }
      />

      {mode === "register" && (
        <OutlinedInput
          id='outlined-adornment-confirm-password'
          type={showPassword.confirmInput ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          fullWidth
          autoComplete='new-password'
          endAdornment={
            <InputAdornment position='end'>
              <IconButton
                aria-label={
                  showPassword.confirmInput ? "hide the password" : "display the password"
                }
                onClick={() => setShowPassword((prev) => ({ ...prev, confirmInput: !prev.confirmInput }))}
                onMouseDown={(e) => e.preventDefault()}
                onMouseUp={(e) => e.preventDefault()}
                edge='end'
              >
                {showPassword.confirmInput ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
        />
      )}

      <Button
        type='submit'
        variant='contained'
        size='large'
        disabled={loading}
        fullWidth
      >
        {loading ? "Loading..." : mode === "login" ? "Sign In" : "Sign Up"}
      </Button>

      <Typography textAlign='center' variant='body2'>
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <Button
              onClick={() => router.push("/register")}
              variant='text'
              size='small'
            >
              Sign Up
            </Button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Button
              onClick={() => router.push("/login")}
              variant='text'
              size='small'
            >
              Sign In
            </Button>
          </>
        )}
      </Typography>
    </Box>
  );
}
