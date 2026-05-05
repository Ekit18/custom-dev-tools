"use client";

import { ArrowBack } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CsvDataTable from "@/components/mock-packs/CsvDataTable";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type TabKey = "products" | "collections" | "customers";

export function MockPackDetailClient() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tab, setTab] = useState<TabKey>("products");
  const [productsCsv, setProductsCsv] = useState("");
  const [collectionsCsv, setCollectionsCsv] = useState("");
  const [customersCsv, setCustomersCsv] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/api/mock-packs/${id}/data`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setName(body.pack?.name ?? "");
      setSlug(body.pack?.slug ?? "");
      setProductsCsv(body.data?.productsCsv ?? "");
      setCollectionsCsv(body.data?.collectionsCsv ?? "");
      setCustomersCsv(body.data?.customersCsv ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentCsv =
    tab === "products"
      ? productsCsv
      : tab === "collections"
        ? collectionsCsv
        : customersCsv;

  const currentFileLabel =
    tab === "products"
      ? "products.csv"
      : tab === "collections"
        ? "collections.csv"
        : "customers.csv";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          component={Link}
          href="/dashboard/mock-packs"
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        component={Link}
        href="/dashboard/mock-packs"
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {slug}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as TabKey)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab label="Products" value="products" />
        <Tab label="Collections" value="collections" />
        <Tab label="Customers" value="customers" />
      </Tabs>

      <CsvDataTable key={tab} csv={currentCsv} fileLabel={currentFileLabel} />
    </Box>
  );
}
