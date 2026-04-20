/**
 * Turn HTML-ish CSV fields into readable plain text for table preview (no rendering of HTML).
 */
export function htmlColumnToPlainText(value: string): string {
  if (!value) return "";
  let s = value.replace(/<[^>]*>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number.parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** Columns whose values are stored as HTML in mock packs — show plain text in the grid. */
export function isHtmlContentColumn(header: string): boolean {
  const h = header.trim().toLowerCase();
  return h === "body_html" || h.endsWith("_html");
}
