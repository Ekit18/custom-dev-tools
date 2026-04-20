import { parse } from "csv-parse/sync";

export type CsvGrid = {
  headers: string[];
  rows: string[][];
  /** Set when parsing failed (malformed CSV). */
  parseError?: string;
};

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}

/**
 * Parse CSV into a header row + data rows for table display (column order preserved).
 */
export function csvStringToGrid(csv: string): CsvGrid {
  const text = stripBom(csv);
  if (!text.trim()) {
    return { headers: [], rows: [] };
  }
  try {
    const all = parse(text, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as string[][];
    if (all.length === 0) {
      return { headers: [], rows: [] };
    }
    const headers = all[0].map((h) => (h ?? "").trim());
    const rows = all.slice(1).map((line) => {
      const cells = line.map((c) => (c ?? "").trim());
      const padded = [...cells];
      while (padded.length < headers.length) {
        padded.push("");
      }
      if (padded.length > headers.length) {
        return padded.slice(0, headers.length);
      }
      return padded;
    });
    return { headers, rows };
  } catch (e) {
    return {
      headers: [],
      rows: [],
      parseError:
        e instanceof Error ? e.message : "Could not parse CSV for table view",
    };
  }
}
