"use client";

import { ArrowBack } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MockPackTopicSelect from "@/components/MockPackTopicSelect";
import Navigation from "@/components/Navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type PackOption = {
  id: string;
  slug: string;
  name: string;
  source: "UPLOADED" | "BUILT_IN";
  status: string;
  description: string | null;
};

export default function MockGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [packs, setPacks] = useState<PackOption[]>([]);
  const [packId, setPackId] = useState("");
  const [productCount, setProductCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/mock-packs", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: PackOption[] = (data.packs ?? []).map((p: PackOption) => p);
      setPacks(list);
      const firstActive = list.find((p) => p.status === "ACTIVE");
      if (firstActive) {
        setPackId(firstActive.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load packs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setJobStatus(null);
    setJobError(null);
    if (!packId) {
      setError("Select a mock pack");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/api/stores/${storeId}/mock-generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, productCount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const st = data.job?.status as string | undefined;
      setJobStatus(st ?? "unknown");
      setJobError(data.job?.errorMessage ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navigation />
      <Box sx={{ p: 3, maxWidth: 560 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push("/dashboard")}
          sx={{ mb: 2 }}
        >
          Back to dashboard
        </Button>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Generate mock data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates products with a shared tag, a smart collection matching that
          tag, and sample customers in your connected Shopify store.
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <Paper component="form" onSubmit={onSubmit} sx={{ p: 2 }}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : null}
            <MockPackTopicSelect
              packs={packs}
              value={packId}
              onChange={setPackId}
              disabled={submitting}
            />
            <TextField
              label="How many products to create"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              inputProps={{ min: 1, max: 500 }}
              value={productCount}
              onChange={(e) => setProductCount(Number(e.target.value))}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={submitting || !packId}
            >
              {submitting ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Generate"
              )}
            </Button>
            {jobStatus ? (
              <Alert
                severity={jobStatus === "SUCCEEDED" ? "success" : "warning"}
                sx={{ mt: 2 }}
              >
                Job status: {jobStatus}
                {jobError ? ` — ${jobError}` : null}
              </Alert>
            ) : null}
          </Paper>
        )}
      </Box>
    </>
  );
}
