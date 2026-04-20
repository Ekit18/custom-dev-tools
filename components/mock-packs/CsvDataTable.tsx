"use client";

import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import {
  htmlColumnToPlainText,
  isHtmlContentColumn,
} from "@/lib/mock-packs/csvCellDisplay";
import { csvStringToGrid } from "@/lib/mock-packs/parseCsvDisplay";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type CsvDataTableProps = {
  csv: string;
  /** Shown in the raw section label */
  fileLabel?: string;
};

export default function CsvDataTable({ csv, fileLabel }: CsvDataTableProps) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const paperBg = theme.palette.background.paper;
  const headShadow =
    theme.palette.mode === "dark"
      ? "inset 0 -1px 0 rgba(255,255,255,0.12)"
      : "inset 0 -1px 0 rgba(0,0,0,0.12)";
  const stickyColShadow =
    theme.palette.mode === "dark"
      ? "4px 0 12px -6px rgba(0,0,0,0.6)"
      : "4px 0 8px -4px rgba(0,0,0,0.15)";

  const grid = useMemo(() => csvStringToGrid(csv), [csv]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return grid.rows.slice(start, start + rowsPerPage);
  }, [grid.rows, page, rowsPerPage]);

  const empty = grid.headers.length === 0 && grid.rows.length === 0;

  if (grid.parseError && csv.trim()) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Table view unavailable: {grid.parseError}. Use raw CSV below.
        </Alert>
        <Accordion defaultExpanded disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" color="text.secondary">
              Raw CSV{fileLabel ? ` (${fileLabel})` : ""}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <TextField
              value={csv}
              multiline
              fullWidth
              InputProps={{ readOnly: true }}
              minRows={12}
              maxRows={24}
              size="small"
              sx={{
                "& textarea": {
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.75rem",
                  lineHeight: 1.5,
                },
              }}
            />
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  }

  if (empty && !csv.trim()) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data.
      </Typography>
    );
  }

  if (empty && csv.trim()) {
    return (
      <Typography variant="body2" color="text.secondary">
        Could not parse CSV (empty or invalid).
      </Typography>
    );
  }

  return (
    <Box>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxHeight: { xs: 360, sm: 480 },
          overflow: "auto",
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            minWidth: 640,
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 6,
                  backgroundColor: paperBg,
                  fontWeight: 600,
                  width: 48,
                  minWidth: 48,
                  borderRight: 1,
                  borderColor: "divider",
                  boxShadow: `${headShadow}, ${stickyColShadow}`,
                }}
              >
                #
              </TableCell>
              {grid.headers.map((h, hi) => (
                <TableCell
                  key={`h-${hi}`}
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    backgroundColor: paperBg,
                    maxWidth: isHtmlContentColumn(h) ? 560 : 280,
                    boxShadow: headShadow,
                  }}
                  title={h}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row, i) => {
              const absoluteRow = page * rowsPerPage + i + 1;
              return (
                <TableRow key={`${page}-${i}`} hover>
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      backgroundColor: paperBg,
                      color: "text.secondary",
                      fontSize: "0.75rem",
                      borderRight: 1,
                      borderColor: "divider",
                      boxShadow: stickyColShadow,
                    }}
                  >
                    {absoluteRow}
                  </TableCell>
                  {grid.headers.map((headerName, j) => {
                    const raw = row[j] ?? "";
                    const htmlCol = isHtmlContentColumn(headerName);
                    const display = htmlCol
                      ? htmlColumnToPlainText(raw)
                      : raw;
                    return (
                      <TableCell
                        key={j}
                        sx={{
                          maxWidth: htmlCol ? 560 : 280,
                          minWidth: htmlCol ? 200 : undefined,
                          verticalAlign: "top",
                          wordBreak: "break-word",
                          whiteSpace: htmlCol ? "pre-wrap" : undefined,
                          color: htmlCol ? "text.primary" : undefined,
                          fontSize: htmlCol ? "0.8125rem" : undefined,
                          lineHeight: htmlCol ? 1.5 : undefined,
                        }}
                      >
                        {display}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={grid.rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number.parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
        labelRowsPerPage="Rows per page"
        sx={{ borderTop: 1, borderColor: "divider", px: 0 }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {grid.rows.length} data row{grid.rows.length === 1 ? "" : "s"} · {grid.headers.length}{" "}
        column{grid.headers.length === 1 ? "" : "s"}
      </Typography>

      <Accordion sx={{ mt: 2 }} disableGutters elevation={0}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" color="text.secondary">
            Raw CSV{fileLabel ? ` (${fileLabel})` : ""}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <TextField
            value={csv}
            multiline
            fullWidth
            InputProps={{ readOnly: true }}
            minRows={6}
            maxRows={16}
            size="small"
            sx={{
              "& textarea": {
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.75rem",
                lineHeight: 1.5,
              },
            }}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
