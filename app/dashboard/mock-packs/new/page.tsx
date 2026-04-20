"use client";

import { CheckCircle, Close, InsertDriveFile } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewMockPackPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"three" | "zip">("three");
  const [files, setFiles] = useState<{
    products?: File;
    collections?: File;
    customers?: File;
    archive?: File;
  }>({});
  /** Remount hidden inputs after clear so the same file can be chosen again */
  const [inputKeys, setInputKeys] = useState({
    products: 0,
    collections: 0,
    customers: 0,
    archive: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    { file: string; row: number; message: string }[]
  >([]);

  useEffect(() => {
    setFiles({});
    setInputKeys((k) => ({
      products: k.products + 1,
      collections: k.collections + 1,
      customers: k.customers + 1,
      archive: k.archive + 1,
    }));
  }, [mode]);

  const threeFileProgress = useMemo(() => {
    const n = [files.products, files.collections, files.customers].filter(
      Boolean,
    ).length;
    return (n / 3) * 100;
  }, [files.products, files.collections, files.customers]);

  function clearSlot(slot: "products" | "collections" | "customers" | "archive") {
    setFiles((f) => ({ ...f, [slot]: undefined }));
    setInputKeys((k) => ({ ...k, [slot]: k[slot] + 1 }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const fd = new FormData();
    fd.append("name", name.trim());
    if (mode === "zip") {
      if (!files.archive) {
        toast.error("Zip file is required");
        return;
      }
      fd.append("archive", files.archive);
    } else {
      if (!files.products || !files.collections || !files.customers) {
        toast.error("All three CSV files are required");
        return;
      }
      fd.append("products", files.products);
      fd.append("collections", files.collections);
      fd.append("customers", files.customers);
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/mock-packs", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors?.length) {
          setErrors(data.errors);
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      toast.success("Mock pack saved");
      if (data.id && typeof data.id === "string") {
        router.push(`/dashboard/mock-packs/${data.id}`);
      } else {
        router.push("/dashboard/mock-packs");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCsvCount = [
    files.products,
    files.collections,
    files.customers,
  ].filter(Boolean).length;
  const threeReady = Boolean(
    files.products && files.collections && files.customers,
  );

  function clearAllThree() {
    setFiles({});
    setInputKeys((k) => ({
      products: k.products + 1,
      collections: k.collections + 1,
      customers: k.customers + 1,
      archive: k.archive,
    }));
  }

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Upload mock pack (CSV)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Upload three separate CSV files, or one zip whose root contains exactly{" "}
        <code>products.csv</code>, <code>collections.csv</code>, and{" "}
        <code>customers.csv</code> (those filenames). Each file must use a{" "}
        <strong>header row</strong> with the column names below (UTF-8, comma
        separated).
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          bgcolor: "action.hover",
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Expected file layout
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 1.5 } }}>
          <li>
            <Typography variant="body2" component="span" fontWeight={600}>
              products.csv
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Required columns:</strong> <code>sku</code>,{" "}
              <code>title</code>, <code>price</code> (numeric; comma or dot as
              decimal). SKUs must be unique across rows.
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Optional:</strong> <code>body_html</code>,{" "}
              <code>vendor</code>, <code>product_type</code>,{" "}
              <code>compare_at_price</code>, <code>inventory_qty</code>,{" "}
              <code>tags</code> (semicolon-separated),{" "}
              <code>image_url_1</code> … <code>image_url_5</code> (http URLs).
            </Typography>
          </li>
          <li>
            <Typography variant="body2" component="span" fontWeight={600}>
              collections.csv
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Required columns:</strong> <code>title</code>,{" "}
              <code>rule_column</code>, <code>rule_relation</code>,{" "}
              <code>rule_condition</code> (each row must be filled for
              validation).
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Optional:</strong> <code>handle</code>,{" "}
              <code>applied_disjunctively</code>. At least one row. When you run
              mock generation, the first row’s <code>title</code> is used for
              the collection name; the rule applied in Shopify is a fixed tag
              match for the generated mock products (not the CSV rule fields).
            </Typography>
          </li>
          <li>
            <Typography variant="body2" component="span" fontWeight={600}>
              customers.csv
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Required column:</strong> <code>email</code> (unique per
              row, case-insensitive).
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary">
              <strong>Optional:</strong> <code>first_name</code>,{" "}
              <code>last_name</code>, <code>phone</code>, <code>tags</code>,{" "}
              <code>address1</code>, <code>city</code>,{" "}
              <code>province_code</code>, <code>country_code</code>,{" "}
              <code>zip</code>.
            </Typography>
          </li>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block">
          You need at least one product, one collection, and one customer row.
          Very large files may be rejected depending on server limits
          configured in the environment.
        </Typography>
      </Paper>

      <TextField
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Upload mode
      </Typography>
      <RadioGroup
        value={mode}
        onChange={(e) => setMode(e.target.value as "three" | "zip")}
      >
        <FormControlLabel
          value="three"
          control={<Radio />}
          label="Three CSV files"
        />
        <FormControlLabel
          value="zip"
          control={<Radio />}
          label="Single zip (products.csv, collections.csv, customers.csv at root)"
        />
      </RadioGroup>

      {mode === "three" ? (
        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <InsertDriveFile color="action" fontSize="small" />
              <Typography variant="subtitle2">Your CSV files</Typography>
            </Box>
            {(files.products || files.collections || files.customers) && (
              <Button size="small" onClick={clearAllThree}>
                Clear all
              </Button>
            )}
          </Box>

          <LinearProgress
            variant="determinate"
            value={threeFileProgress}
            sx={{ mb: 2, borderRadius: 1, height: 6 }}
          />

          {threeReady ? (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              icon={<CheckCircle fontSize="inherit" />}
            >
              All three files are loaded. Enter a display name and click{" "}
              <strong>Save pack</strong>.
            </Alert>
          ) : selectedCsvCount > 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedCsvCount} of 3 files selected — add the remaining{" "}
              {3 - selectedCsvCount}.
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pick a file for each row. The filename does not need to match; we
              use whichever file you assign to products, collections, and
              customers.
            </Typography>
          )}

          {(
            [
              {
                slot: "products" as const,
                title: "Products",
                hint: "maps to products.csv content",
              },
              {
                slot: "collections" as const,
                title: "Collections",
                hint: "maps to collections.csv content",
              },
              {
                slot: "customers" as const,
                title: "Customers",
                hint: "maps to customers.csv content",
              },
            ] as const
          ).map(({ slot, title, hint }, index) => {
            const file = files[slot];
            return (
              <Box
                key={slot}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 1.5,
                  py: 1.75,
                  borderTop:
                    index === 0 ? undefined : "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {hint}
                  </Typography>
                  {file ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 0.75,
                        minWidth: 0,
                      }}
                    >
                      <CheckCircle sx={{ fontSize: 18, flexShrink: 0 }} color="success" />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        title={`${file.name} (${formatBytes(file.size)})`}
                      >
                        {file.name}{" "}
                        <Typography component="span" variant="caption">
                          ({formatBytes(file.size)})
                        </Typography>
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ mt: 0.75 }}
                    >
                      No file yet
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  {file ? (
                    <Tooltip title="Remove this file">
                      <IconButton
                        size="small"
                        onClick={() => clearSlot(slot)}
                        aria-label={`Remove ${title} file`}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Button variant="outlined" size="small" component="label">
                    {file ? "Change" : "Browse"}
                    <input
                      key={inputKeys[slot]}
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(e) =>
                        setFiles((f) => ({
                          ...f,
                          [slot]: e.target.files?.[0],
                        }))
                      }
                    />
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <InsertDriveFile color="action" fontSize="small" />
            <Typography variant="subtitle2">Zip archive</Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={files.archive ? 100 : 0}
            sx={{ mb: 2, borderRadius: 1, height: 6 }}
          />

          {files.archive ? (
            <Alert
              severity="success"
              sx={{ mb: 2 }}
              icon={<CheckCircle fontSize="inherit" />}
            >
              Loaded <strong>{files.archive.name}</strong> (
              {formatBytes(files.archive.size)}). Root should contain the three
              CSV files. Enter a name and save.
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a single <code>.zip</code> with{" "}
              <code>products.csv</code>, <code>collections.csv</code>, and{" "}
              <code>customers.csv</code> at the top level.
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" size="small" component="label">
              {files.archive ? "Choose different zip" : "Browse zip"}
              <input
                key={inputKeys.archive}
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={(e) =>
                  setFiles((f) => ({
                    ...f,
                    archive: e.target.files?.[0],
                  }))
                }
              />
            </Button>
            {files.archive ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  {files.archive.name} · {formatBytes(files.archive.size)}
                </Typography>
                <Tooltip title="Remove archive">
                  <IconButton
                    size="small"
                    onClick={() => clearSlot("archive")}
                    aria-label="Remove zip file"
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
          </Box>
        </Paper>
      )}

      {errors.length > 0 ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.slice(0, 12).map((er, i) => (
            <div key={`${er.file}-${er.row}-${i}`}>
              {er.file} row {er.row}: {er.message}
            </div>
          ))}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button type="submit" variant="contained" disabled={submitting}>
          Save pack
        </Button>
        <Button
          type="button"
          onClick={() => router.push("/dashboard/mock-packs")}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
