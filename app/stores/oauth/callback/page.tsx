'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    if (success) {
      try {
        const channel = new BroadcastChannel('oauth_callback');
        channel.postMessage({ success: true });
        channel.close();
      } catch (_) {}
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, [success]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        {success ? (
          <>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your Shopify store has been successfully connected.
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              This window will close automatically in 2 seconds...
            </Alert>
            <Button
              variant="contained"
              onClick={() => window.close()}
              fullWidth
            >
              Close Window
            </Button>
          </>
        ) : (
          <>
            <Error sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Authorization Failed
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              There was an error connecting your Shopify store. Please try again.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => window.close()}
              >
                Close Window
              </Button>
              <Button
                variant="contained"
                href="/stores/add"
              >
                Try Again
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1">Loading...</Typography>
          </Paper>
        </Container>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
