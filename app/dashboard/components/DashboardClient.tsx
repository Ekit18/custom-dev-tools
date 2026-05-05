"use client";

import { Add } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import StoreCard from "@/components/StoreCard";

interface Store {
  id: string;
  shopDomain: string;
  adminScopes: string[];
  storefrontScopes: string[];
  adminAccessToken: string | null;
  storefrontAccessToken: string | null;
  installedAt: string;
  updatedAt: string;
  expireAt: string | null;
}

export function DashboardClient() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    storeId: string;
    shopDomain: string;
  }>({
    open: false,
    storeId: "",
    shopDomain: "",
  });

  const fetchStores = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/stores");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch stores");
        return;
      }

      setStores(data.stores);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const handleDeleteClick = (id: string, shopDomain: string) => {
    setDeleteModal({ open: true, storeId: id, shopDomain });
  };

  const handleDeleteConfirm = async () => {
    const { storeId } = deleteModal;

    try {
      const response = await fetchWithAuth(`/api/stores/${storeId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete store");
        return;
      }

      toast.success("Store deleted successfully");
      fetchStores();
      setDeleteModal({ open: false, storeId: "", shopDomain: "" });
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" component="h1">
          My Stores
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          component={Link}
          href="/stores/add"
        >
          Add Store
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {stores.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 2,
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            No stores connected yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Add your first Shopify store to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            href="/stores/add"
          >
            Add Store
          </Button>
        </Box>
      ) : (
        <Box>
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onDelete={(id) => handleDeleteClick(id, store.shopDomain)}
              setStores={setStores}
            />
          ))}
        </Box>
      )}

      <DeleteConfirmModal
        open={deleteModal.open}
        shopDomain={deleteModal.shopDomain}
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteModal({ open: false, storeId: "", shopDomain: "" })
        }
      />
    </Container>
  );
}
