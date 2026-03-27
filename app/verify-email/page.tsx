import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import OtpVerificationForm from "@/components/auth/OtpVerificationForm";

export const metadata = { title: "Verify Your Email — Devit" };

export default function VerifyEmailPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 440 }}>
        <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
          Check your inbox
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We sent a 6-digit verification code to your @devit.group email address.
          Enter it below to complete registration.
        </Typography>
        <OtpVerificationForm />
      </Box>
    </Box>
  );
}
