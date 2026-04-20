"use client";

import { Add } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type PackRow = {
  id: string;
  slug: string;
  name: string;
  source: "UPLOADED" | "BUILT_IN";
  status: string;
  description: string | null;
  createdAt: string;
  rowCounts: { products: number; collections: number; customers: number };
};

export function MockPacksCatalogClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [packs, setPacks] = useState<PackRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mock-packs", { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPacks(data.packs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function archive(id: string) {
    try {
      const res = await fetch(`/api/mock-packs/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success("Pack archived");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    }
  }

  async function unarchive(id: string) {
    try {
      const res = await fetch(`/api/mock-packs/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success("Pack unarchived");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unarchive failed");
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Mock data packs</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          component={Link}
          href="/dashboard/mock-packs/new"
        >
          Add pack
        </Button>
      </Box>

      {packs.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No mock packs yet. Built-in packs appear after the first API load;
            add your own CSV pack to get started.
          </Typography>
        </Paper>
      ) : (
        <Table component={Paper}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Rows (p / c / u)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packs.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Typography fontWeight={600}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.source === "BUILT_IN" ? "Built-in" : "Uploaded"}
                    color={p.source === "BUILT_IN" ? "secondary" : "primary"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>
                  {p.rowCounts.products} / {p.rowCounts.collections} /{" "}
                  {p.rowCounts.customers}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    sx={{ mr: 1 }}
                    component={Link}
                    href={`/dashboard/mock-packs/${p.id}`}
                  >
                    View data
                  </Button>
                  {p.source === "UPLOADED" && p.status === "ACTIVE" ? (
                    <Button size="small" onClick={() => archive(p.id)}>
                      Archive
                    </Button>
                  ) : null}
                  {p.source === "UPLOADED" && p.status === "ARCHIVED" ? (
                    <Button size="small" onClick={() => unarchive(p.id)}>
                      Unarchive
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
