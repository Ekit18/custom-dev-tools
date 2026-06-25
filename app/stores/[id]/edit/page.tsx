'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import StoreForm from '@/components/StoreForm';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

type UpdateState = 'idle' | 'loading' | 'error';

export default function EditStorePage() {
  const params = useParams();
  const storeId = params.id as string;
  const [store, setStore] = useState<any>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const response = await fetchWithAuth(`/api/stores/${storeId}`);
      const data = await response.json();
      if (!response.ok) {
        setFetchError(data.error || 'Failed to fetch store');
        return;
      }
      setStore(data.store);
    } catch {
      setFetchError('Network error. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (data: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    adminScopes: string[];
    storefrontScopes: string[];
  }) => {
    setUpdateState('loading');
    setErrorMsg('');

    const response = await fetchWithAuth(`/api/stores/${storeId}/oauth/reinitiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminScopes: data.adminScopes,
        storefrontScopes: data.storefrontScopes,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setUpdateState('error');
      setErrorMsg(result.error || 'Failed to update scopes');
      throw new Error(result.error || 'Failed to update scopes');
    }

    // Full-page redirect to Shopify's OAuth screen. A top-level navigation is
    // never popup-blocked (unlike window.open). Shopify redirects back to
    // /api/stores/oauth/callback once the user reinstalls with the new scopes.
    window.location.href = result.oauthUrl;
  };

  if (fetchLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError || !store) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{fetchError || 'Store not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Update Scopes — {store.shopDomain}
      </Typography>

      {updateState === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to update scopes
        </Typography>
        <Stepper orientation="vertical" nonLinear activeStep={-1}>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>Select new scopes &amp; copy</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Use the selectors below to choose the new scopes. Copy the
                generated scope string.
              </Typography>
            </StepContent>
          </Step>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>Update &amp; publish in Shopify Dev Dashboard</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                Open your Custom App in <strong>Shopify Admin → Settings → Apps and sales channels → Develop apps</strong>.
                Paste the new scopes into <em>Admin API access scopes</em>, save,
                and <strong>release a new app version</strong>.
              </Typography>
            </StepContent>
          </Step>
          <Step expanded>
            <StepLabel>
              <Typography fontWeight={500}>Click "Update Scopes" below</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                You'll be redirected to Shopify to reinstall the app on your
                store. This grants the new scopes and issues a fresh access token.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scopes Configuration
        </Typography>
        <Box sx={{ mt: 2 }}>
          <StoreForm
            initialData={{
              shopDomain: store.shopDomain,
              clientId: store.clientId,
              clientSecret: '',
              adminScopes: store.adminScopes,
              storefrontScopes: store.storefrontScopes,
            }}
            onSubmit={handleSubmit}
            submitLabel="Update Scopes"
            hideCredentials
          />
        </Box>
      </Paper>
    </Container>
  );
}
