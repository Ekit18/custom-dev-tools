/**
 * Parse MongoDB shell-style `db.collection.aggregate([ ... ])` or a plain JSON pipeline array.
 */

const SHELL_PREFIX =
  /^\s*db\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*aggregate\s*\(\s*/;

export type ParsedAggregate =
  | { ok: true; collection: string; pipeline: unknown[] }
  | { ok: false; error: string };

/** Extract `[ ... ]` at `start`, respecting strings and line/block comments. */
function extractBalancedArray(
  src: string,
  start: number,
): { content: string } | null {
  if (src[start] !== "[") return null;
  let depth = 0;
  let i = start;
  let inString: false | '"' | "'" | "`" = false;
  let escaped = false;

  while (i < src.length) {
    const c = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        i++;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        i++;
        continue;
      }
      if (c === inString) {
        inString = false;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inString = c;
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      i += 2;
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length - 1 && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        return { content: src.slice(start, i + 1) };
      }
    }
    i++;
  }
  return null;
}

function evalPipelineArray(arrayLiteral: string): unknown[] {
  const fn = new Function(`return ${arrayLiteral}`);
  const v = fn();
  if (!Array.isArray(v)) {
    throw new Error("Expression did not evaluate to an array");
  }
  return v;
}

export function parseShellAggregate(raw: string): ParsedAggregate {
  const trimmed = raw.trim().replace(/;+\s*$/, "");

  const shellMatch = trimmed.match(SHELL_PREFIX);
  if (shellMatch?.[1]) {
    const collection = shellMatch[1];
    const afterParen = trimmed.slice(shellMatch[0].length);
    let i = 0;
    while (i < afterParen.length && /\s/.test(afterParen[i])) i++;
    const extracted = extractBalancedArray(afterParen, i);
    if (!extracted) {
      return {
        ok: false,
        error:
          "Could not find a matching [...] pipeline after aggregate(. Check brackets.",
      };
    }
    try {
      const pipeline = evalPipelineArray(extracted.content);
      return { ok: true, collection, pipeline };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? `Could not parse pipeline: ${e.message}`
            : "Could not parse pipeline",
      };
    }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return { ok: true, collection: "", pipeline: parsed };
    }
    return {
      ok: false,
      error:
        "JSON value must be an array of stages, or use db.name.aggregate([...]).",
    };
  } catch {
    return {
      ok: false,
      error:
        "Expected db.collection.aggregate([...]) (shell style) or a JSON array of stages.",
    };
  }
}
