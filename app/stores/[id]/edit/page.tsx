'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Button,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { CheckCircle, OpenInNew, ArrowBack } from '@mui/icons-material';
import StoreForm from '@/components/StoreForm';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

type UpdateState = 'idle' | 'loading' | 'waiting' | 'success' | 'error';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;
  const [store, setStore] = useState<any>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [oauthUrl, setOauthUrl] = useState('');
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    const channel = new BroadcastChannel('oauth_callback');
    channel.onmessage = (event) => {
      if (event.data?.success) {
        setUpdateState('success');
        toast.success('Scopes updated and app reinstalled!');
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    };
    return () => channel.close();
  }, [router]);

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

  const openPopup = (url: string) => {
    const popup = window.open(url, 'shopify_oauth', 'width=600,height=700,left=200,top=100');
    popupRef.current = popup;
    if (!popup) {
      toast.error('Popup was blocked. Allow popups for this site, then click "Open Installation Window".');
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

    setOauthUrl(result.oauthUrl);
    openPopup(result.oauthUrl);
    setUpdateState('waiting');
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

  if (updateState === 'waiting' || updateState === 'success') {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {updateState === 'success' ? (
            <>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Scopes updated!
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
                Complete reinstallation in the popup window
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                A Shopify authorization window has been opened. Reinstall the
                app there to apply the new scopes.
              </Typography>
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                Once you click <strong>Install app</strong> in Shopify, this
                page will update automatically.
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                  onClick={() => setUpdateState('idle')}
                >
                  Back to Form
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
                A popup will open for you to reinstall the app on your store.
                This grants the new scopes and issues a fresh access token.
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
