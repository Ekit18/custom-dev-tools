"use client";

import React, { useMemo, useState, useEffect } from "react";
import "graphiql/style.css";
import { GraphiQL } from "graphiql";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { ArrowBack } from "@mui/icons-material";
import { createGraphiQLFetcher, type Fetcher } from "@graphiql/toolkit";
import {
  buildClientSchema,
  getIntrospectionQuery,
  type GraphQLSchema,
} from "graphql";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

const schemas = ["admin", "storefront"];

const versions = ["2026-01", "2025-10", "2025-07", "2025-04"];

export default function GraphqlPage() {
  const params = useParams();
  const storeId = params.id as string | undefined;
  const router = useRouter();
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [graphqlSettings, setGraphqlSettings] = useState({
    version: "2026-01",
    schema: "admin",
  });

  const NAMESPACE = `graphiql:${storeId}`;
  // Only define storage on the client
  const storage = useMemo(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return undefined;
    }
    return {
      ...localStorage,
      getItem(key: string) {
        return localStorage.getItem(`${NAMESPACE}:${key}`);
      },
      setItem(key: string, value: string) {
        return localStorage.setItem(`${NAMESPACE}:${key}`, value);
      },
      removeItem(key: string) {
        return localStorage.removeItem(`${NAMESPACE}:${key}`);
      },
    } as typeof localStorage;
  }, [NAMESPACE]);
  // Create a custom fetcher
  const fetcher: Fetcher = useMemo(() => {
    if (!storeId) {
      return async () => ({ data: null });
    }

    return async (graphQLParams) => {
      const fetcher = createGraphiQLFetcher({
        url: `/api/stores/${storeId}/graphql?version=${graphqlSettings.version}&schema=${graphqlSettings.schema}`,
      });
      return fetcher(graphQLParams);
    };
  }, [storeId, graphqlSettings]);

  // Fetch schema for autocomplete
  useEffect(() => {
    if (!storeId) return;

    const fetchSchema = async () => {
      try {
        const response = await fetchWithAuth(`/api/stores/${storeId}/graphql?version=${graphqlSettings.version}&schema=${graphqlSettings.schema}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: getIntrospectionQuery(),
          }),
        });
        const result = await response.json();

        if (result.data) {
          const clientSchema = buildClientSchema(result.data);
          setSchema(clientSchema);
        }
      } catch (error) {
        console.error("Failed to fetch schema:", error);
      }
    };

    fetchSchema();
  }, [storeId, graphqlSettings]);

  if (!storeId) return null;

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        p: 0,
        m: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Button
          variant='outlined'
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Box sx={{ display: "inline-flex", ml: 2, gap: 2 }}>
          <FormControl variant='outlined' size='small'>
            <InputLabel id='schema-label'>Schema</InputLabel>
            <Select
              labelId='schema-label'
              id='schema-select'
              value={graphqlSettings.schema}
              onChange={(e) =>
                setGraphqlSettings((prev) => ({
                  ...prev,
                  schema: e.target.value,
                }))
              }
              label='Schema'
            >
              {schemas.map((schema) => (
                <MenuItem key={schema} value={schema}>
                  {schema.charAt(0).toUpperCase() + schema.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant='outlined' size='small'>
            <InputLabel id='version-label'>API Version</InputLabel>
            <Select
              labelId='version-label'
              id='version-select'
              value={graphqlSettings.version}
              onChange={(e) =>
                setGraphqlSettings((prev) => ({
                  ...prev,
                  version: e.target.value,
                }))
              }
              label='API Version'
            >
              {versions.map((version) => (
                <MenuItem key={version} value={version}>
                  {version}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {!schema ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <GraphiQL fetcher={fetcher} storage={storage} />
        )}
      </Box>
    </Box>
  );
}
