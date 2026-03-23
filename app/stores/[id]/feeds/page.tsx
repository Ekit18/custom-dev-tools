"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Slider,
  Button,
  TextField,
  Alert,
  Container,
} from "@mui/material";
import { useParams } from "next/navigation";
import { Store } from "@prisma/client";

export default function FeedsPage() {
  const { id: storeId } = useParams();
  const router = useRouter();
  const [productCount, setProductCount] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState("");
  const [disabledFeedGeneration, setDisabledFeedGeneration] = useState(false);

  const handleSliderChange = (_: any, value: number | number[]) => {
    setProductCount(Array.isArray(value) ? value[0] : value);
  };

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch store");
        return;
      }

      setStore(data.store);
      const hasRequiredScopes =
        data.store.adminAccessToken ||
        data.store.adminScopes.includes("write_products") ||
        data.store.adminScopes.includes("write_locations");
      setDisabledFeedGeneration(!hasRequiredScopes);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/feeds/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: productCount }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult(`Error: ${data.error || res.statusText}`);
      } else {
        setResult(
          `Created ${data.created} products. ${data.errors?.length ? `Errors: ${data.errors.length}` : ""}`,
        );
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  

  if (error || !store) {
    return (
      <Container maxWidth='md' sx={{ py: 4 }}>
        <Alert severity='error'>{error || "Store not found"}</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: "auto",
        mt: 6,
        p: 3,
        boxShadow: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => router.back()}>
        Back
      </Button>
      {disabledFeedGeneration && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          Your store is missing required scopes (write_products,
          write_locations) or access token. Please update your store settings to
          enable feed generation.
        </Alert>
      )}
      <Typography variant='h5' gutterBottom>
        Generate Product Feed
      </Typography>
      <Typography gutterBottom>
        Select number of products to generate:
      </Typography>
      <Slider
        value={productCount}
        min={0}
        max={20000}
        step={100}
        marks={[
          { value: 0, label: "0" },
          { value: 10000, label: "10k" },
          { value: 20000, label: "20k" },
        ]}
        onChange={handleSliderChange}
        valueLabelDisplay='auto'
        sx={{ mb: 2 }}
      />
      <TextField
        label='Product Count'
        type='number'
        value={productCount}
        onChange={(e) => setProductCount(Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Typography variant='body2' sx={{ mb: 2 }}>
        Selected: <b>{productCount}</b> products
      </Typography>
      <Button
        variant='contained'
        color='primary'
        onClick={handleGenerate}
        disabled={loading || productCount === 0 || disabledFeedGeneration}
      >
        {loading ? "Generating..." : "Generate Feed"}
      </Button>
      {result && (
        <Typography color='success.main' sx={{ mt: 2 }}>
          {result}
        </Typography>
      )}
    </Box>
  );
}
