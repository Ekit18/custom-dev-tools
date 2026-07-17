"use client";

import {
  AutoAwesome,
  CopyAll,
  Delete,
  Edit,
  RequestPage,
  Settings,
  Store as StoreIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import React, { type Dispatch, type SetStateAction } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Store {
  id: string;
  shopDomain: string;
  adminScopes: string[];
  storefrontScopes: string[];
  installedAt: string;
  updatedAt: string;
  adminAccessToken: string | null;
  storefrontAccessToken: string | null;
  expireAt: string | null;
}

interface StoreCardProps {
  store: Store;
  onDelete: (id: string) => void;
  setStores: Dispatch<SetStateAction<Store[]>>;
}

function isAdminTokenExpired(expireAt: string | null): boolean {
  if (!expireAt) return true;
  // Match the 60s safety buffer used server-side in lib/access-token.ts
  return Date.now() >= new Date(expireAt).getTime() - 60_000;
}

export default function StoreCard({ store, onDelete, setStores }: StoreCardProps) {
  const router = useRouter();

  // Popover state
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [refreshingAdminToken, setRefreshingAdminToken] = React.useState(false);

  const handleGearClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handlePopoverClose = () => {
    setAnchorEl(null);
    setCopied(null);
  };
  const open = Boolean(anchorEl);

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  };

  const handleCopyAdminToken = async () => {
    if (store.adminAccessToken && !isAdminTokenExpired(store.expireAt)) {
      copyToClipboard(store.adminAccessToken, "admin");
      return;
    }

    setRefreshingAdminToken(true);
    try {
      const response = await fetchWithAuth(
        `/api/stores/${store.id}/refresh-token`
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to refresh access token");
        return;
      }
      setStores((prev) =>
        prev.map((s) =>
          s.id === store.id
            ? {
                ...s,
                adminAccessToken: data.shopifyAccessToken,
                expireAt: data.expireAt,
              }
            : s
        )
      );
      copyToClipboard(data.shopifyAccessToken, "admin");
    } catch {
      toast.error("Network error while refreshing access token");
    } finally {
      setRefreshingAdminToken(false);
    }
  };

  const handleCopyStorefrontToken = () => {
    if (store.storefrontAccessToken) {
      copyToClipboard(store.storefrontAccessToken, "storefront");
    }
  };

  return (
    <Card sx={{ minWidth: 275, mb: 2, position: "relative" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 2,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <StoreIcon sx={{ mr: 1 }} />
            <Typography variant="h5" component="div">
              {store.shopDomain}
            </Typography>
          </Box>
          <IconButton onClick={handleGearClick} aria-label="settings">
            <Settings />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Installed: {new Date(store.installedAt).toLocaleDateString()}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Admin API Scopes ({store.adminScopes.length}):
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {store.adminScopes.slice(0, 5).map((scope) => (
              <Chip key={scope} label={scope} size="small" />
            ))}
            {store.adminScopes.length > 5 && (
              <Chip
                label={`+${store.adminScopes.length - 5} more`}
                size="small"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Storefront API Scopes ({store.storefrontScopes.length}):
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {store.storefrontScopes.slice(0, 5).map((scope) => (
              <Chip key={scope} label={scope} size="small" color="secondary" />
            ))}
            {store.storefrontScopes.length > 5 && (
              <Chip
                label={`+${store.storefrontScopes.length - 5} more`}
                size="small"
                color="secondary"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoAwesome />}
            onClick={() => router.push(`/stores/${store.id}/mock-generate`)}
            fullWidth
          >
            Generate mock data
          </Button>
        </Box>
      </CardContent>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, minWidth: 340, borderRadius: 3 } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Store Tokens
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label="Admin Token"
              value={store.adminAccessToken || ""}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
                sx: { borderRadius: 2, fontSize: 13 },
              }}
            />
            <Tooltip
              title={
                copied === "admin"
                  ? "Copied!"
                  : refreshingAdminToken
                    ? "Refreshing..."
                    : "Copy"
              }
            >
              <span>
                <IconButton
                  onClick={handleCopyAdminToken}
                  size="small"
                  sx={{ ml: 0.5 }}
                  disabled={refreshingAdminToken}
                >
                  {refreshingAdminToken ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CopyAll
                      fontSize="small"
                      color={copied === "admin" ? "success" : "inherit"}
                    />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label="Storefront Token"
              value={store.storefrontAccessToken || ""}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
                sx: { borderRadius: 2, fontSize: 13 },
              }}
            />
            <Tooltip title={copied === "storefront" ? "Copied!" : "Copy"}>
              <IconButton
                onClick={handleCopyStorefrontToken}
                size="small"
                sx={{ ml: 0.5 }}
              >
                <CopyAll
                  fontSize="small"
                  color={copied === "storefront" ? "success" : "inherit"}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{ my: 2, borderBottom: "1px solid", borderColor: "divider" }}
        />
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Edit />}
            onClick={() => {
              router.push(`/stores/${store.id}/edit`);
              handlePopoverClose();
            }}
            fullWidth
          >
            Edit Store Scopes
          </Button>
          <Button
            size="small"
            color="primary"
            startIcon={<RequestPage />}
            onClick={() => {
              router.push(`/stores/${store.id}/graphql`);
              handlePopoverClose();
            }}
            fullWidth
          >
            Make GraphQL Request
          </Button>
          {/* <Button
              size='small'
              color='primary'
              startIcon={<RequestPage />}
              onClick={() => {
                router.push(`/stores/${store.id}/feeds`);
                handlePopoverClose();
              }}
              fullWidth
            >
              Generate Feeds
            </Button> */}
          <Button
            size="small"
            color="error"
            startIcon={<Delete />}
            onClick={() => {
              onDelete(store.id);
              handlePopoverClose();
            }}
            fullWidth
            sx={{ fontWeight: 600 }}
          >
            Delete
          </Button>
        </Box>
      </Popover>
    </Card>
  );
}
