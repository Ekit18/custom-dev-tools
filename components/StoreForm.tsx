'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  TextareaAutosize,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Save, ContentCopy, Check } from '@mui/icons-material';
import ScopeSelector from './ScopeSelector';
import { ADMIN_API_SCOPES, STOREFRONT_API_SCOPES } from '@/lib/scopes';
import { validateShopDomain } from '@/lib/shopify';

interface StoreFormProps {
  initialData?: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    adminScopes: string[];
    storefrontScopes: string[];
  };
  onSubmit: (data: {
    shopDomain: string;
    clientId: string;
    clientSecret: string;
    adminScopes: string[];
    storefrontScopes: string[];
  }) => Promise<void>;
  submitLabel?: string;
  /** Hide shop domain, client ID, and client secret fields (use for edit/scope-only mode) */
  hideCredentials?: boolean;
}

export default function StoreForm({
  initialData,
  onSubmit,
  submitLabel = 'Install App',
  hideCredentials = false,
}: StoreFormProps) {
  const [shopDomain, setShopDomain] = useState(initialData?.shopDomain || '');
  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [clientSecret, setClientSecret] = useState(initialData?.clientSecret || '');
  const [adminScopes, setAdminScopes] = useState<string[]>(initialData?.adminScopes || []);
  const [storefrontScopes, setStorefrontScopes] = useState<string[]>(
    initialData?.storefrontScopes || []
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const scopesRow = useMemo(() => {
    const allScopes = [...adminScopes, ...storefrontScopes];
    return allScopes.length > 0 ? allScopes.join(',') : 'No scopes selected';
  }, [adminScopes, storefrontScopes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hideCredentials) {
      if (!validateShopDomain(shopDomain)) {
        setError('Invalid shop domain. Must be in format: yourstore.myshopify.com');
        return;
      }
      if (!clientId || !clientSecret) {
        setError('Client ID and Client Secret are required');
        return;
      }
    }

    if (adminScopes.length === 0 && storefrontScopes.length === 0) {
      setError('Please select at least one scope');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        shopDomain,
        clientId,
        clientSecret,
        adminScopes,
        storefrontScopes,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!hideCredentials && (
        <>
          <TextField
            label="Shop Domain"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
            placeholder="yourstore.myshopify.com"
            required
            fullWidth
            disabled={!!initialData?.shopDomain}
            sx={{ mb: 2 }}
            helperText="Your Shopify store domain (e.g., yourstore.myshopify.com)"
          />

          <TextField
            label="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            fullWidth
            disabled={!!initialData?.clientId}
            sx={{ mb: 2 }}
            helperText="From your Custom App in Shopify Admin"
          />

          <TextField
            label="Client Secret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            type="password"
            required
            fullWidth
            sx={{ mb: 3 }}
            helperText="From your Custom App in Shopify Admin (keep it secure)"
          />
        </>
      )}

      <ScopeSelector
        title="Admin API Scopes"
        scopes={ADMIN_API_SCOPES}
        selectedScopes={adminScopes}
        onChange={setAdminScopes}
      />

      <ScopeSelector
        title="Storefront API Scopes"
        scopes={STOREFRONT_API_SCOPES}
        selectedScopes={storefrontScopes}
        onChange={setStorefrontScopes}
      />

      <Box sx={{ mb: 3 }}>
        <Box component="label" sx={{ display: 'block', mb: 0.5, fontSize: 12, color: 'text.secondary' }}>
          Scopes for Shopify App Version (copy into your dev dashboard)
        </Box>
        <Box sx={{ position: 'relative' }}>
        <TextareaAutosize
          minRows={3}
          value={scopesRow}
          readOnly
          style={{
            width: '100%',
            padding: '10px 40px 10px 12px',
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.5,
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.23)',
            background: 'rgba(0,0,0,0.04)',
            color: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <Tooltip title={copied ? 'Copied!' : 'Copy scopes'}>
          <IconButton
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(
                [...adminScopes, ...storefrontScopes].join(',')
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            disabled={adminScopes.length === 0 && storefrontScopes.length === 0}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            {copied ? <Check fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
          </IconButton>
        </Tooltip>
        </Box>
      </Box>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <Save />}
      >
        {loading ? 'Processing...' : submitLabel}
      </Button>
    </Box>
  );
}
