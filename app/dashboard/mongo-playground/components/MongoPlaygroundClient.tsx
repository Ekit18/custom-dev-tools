"use client";

import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { parseShellAggregate } from "@/lib/mongo-playground/parseShellAggregate";

const DEFAULT_COLLECTION = "MockPackPayload";

const DEFAULT_INPUT = `db.products.aggregate([
  {
    $group: {
      _id: "$category",
      count: { $sum: 1 }
    }
  }
])`;

export function MongoPlaygroundClient() {
  const [collectionFallback, setCollectionFallback] =
    useState(DEFAULT_COLLECTION);
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError(null);
    setResultText(null);

    const parsed = parseShellAggregate(inputText);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const collection =
      parsed.collection.length > 0
        ? parsed.collection
        : collectionFallback.trim() || DEFAULT_COLLECTION;

    setLoading(true);
    try {
      const res = await fetch("/api/mongo/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          collection,
          pipeline: parsed.pipeline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Request failed",
        );
        return;
      }
      setResultText(JSON.stringify(data.result ?? data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Mongo aggregation playground
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Paste shell-style <code>db.collection.aggregate([...])</code> (Mongo
        object syntax with <code>$group</code>, etc.) or a plain JSON array of
        stages. The API returns Mongo's raw command response; documents are
        usually under <code>cursor.firstBatch</code>.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Collection (JSON-array mode only)"
          value={collectionFallback}
          onChange={(e) => setCollectionFallback(e.target.value)}
          size="small"
          sx={{ maxWidth: 420 }}
          helperText="When you paste only a JSON array, this collection name is used. Ignored for db.name.aggregate(...)."
        />

        <TextField
          label="Query"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          multiline
          minRows={14}
          fullWidth
          slotProps={{
            input: { sx: { fontFamily: "monospace", fontSize: 13 } },
          }}
        />

        <Box>
          <Button variant="contained" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run aggregation"}
          </Button>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {resultText ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Result
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                overflow: "auto",
                maxHeight: "min(70vh, 720px)",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              {resultText}
            </Box>
          </Paper>
        ) : null}
      </Box>
    </Container>
  );
}
