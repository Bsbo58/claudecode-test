import type { Row, CellValue } from "../session.js";

// ---------- helpers ----------

function isEmpty(v: CellValue): boolean {
  return v === null || v === undefined || v === "";
}

// ---------- steps ----------

/** Remove rows where every cell is null/empty */
export function dropEmptyRows(rows: Row[]): Row[] {
  return rows.filter((row) => Object.values(row).some((v) => !isEmpty(v)));
}

/** Remove columns where every value is null/empty */
export function dropEmptyCols(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;
  const cols = Object.keys(rows[0]);
  const keepCols = cols.filter((col) =>
    rows.some((row) => !isEmpty(row[col]))
  );
  return rows.map((row) => {
    const out: Row = {};
    for (const col of keepCols) out[col] = row[col];
    return out;
  });
}

/** Trim all strings; replace empty string with null */
export function trimStrings(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string") {
        const trimmed = v.trim();
        out[k] = trimmed === "" ? null : trimmed;
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

/** Lowercase + replace non-alphanumeric runs with _ + deduplicate */
export function normalizeColumnNames(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;
  const originalCols = Object.keys(rows[0]);
  const seen = new Map<string, number>();
  const mapping: Record<string, string> = {};

  for (const col of originalCols) {
    let norm = col
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (norm === "") norm = "col";
    const count = seen.get(norm) ?? 0;
    seen.set(norm, count + 1);
    mapping[col] = count === 0 ? norm : `${norm}_${count}`;
  }

  return rows.map((row) => {
    const out: Row = {};
    for (const [oldKey, newKey] of Object.entries(mapping)) {
      out[newKey] = row[oldKey];
    }
    return out;
  });
}

const THRESHOLD = 0.8;

function tryParseNumber(v: CellValue): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n) && v.trim() !== "") return n;
  }
  return null;
}

function tryParseBoolean(v: CellValue): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const lower = v.toLowerCase().trim();
    if (lower === "true" || lower === "yes" || lower === "1") return true;
    if (lower === "false" || lower === "no" || lower === "0") return false;
  }
  return null;
}

function tryParseDate(v: CellValue): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Cast columns to number/boolean/date if >80% of non-null values parse successfully */
export function inferTypes(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;
  const cols = Object.keys(rows[0]);

  const casts: Record<string, "number" | "boolean" | "date" | null> = {};

  for (const col of cols) {
    const nonNull = rows.filter((r) => !isEmpty(r[col]));
    if (nonNull.length === 0) { casts[col] = null; continue; }

    const numParseable = nonNull.filter((r) => tryParseNumber(r[col]) !== null).length;
    if (numParseable / nonNull.length >= THRESHOLD) { casts[col] = "number"; continue; }

    const boolParseable = nonNull.filter((r) => tryParseBoolean(r[col]) !== null).length;
    if (boolParseable / nonNull.length >= THRESHOLD) { casts[col] = "boolean"; continue; }

    const dateParseable = nonNull.filter((r) => tryParseDate(r[col]) !== null).length;
    if (dateParseable / nonNull.length >= THRESHOLD) { casts[col] = "date"; continue; }

    casts[col] = null;
  }

  return rows.map((row) => {
    const out: Row = {};
    for (const col of cols) {
      const v = row[col];
      if (isEmpty(v)) { out[col] = null; continue; }
      switch (casts[col]) {
        case "number": out[col] = tryParseNumber(v) ?? v; break;
        case "boolean": out[col] = tryParseBoolean(v) ?? v; break;
        case "date": out[col] = tryParseDate(v) ?? v; break;
        default: out[col] = v;
      }
    }
    return out;
  });
}

/** Remove exact-duplicate rows (or by a subset of columns) */
export function deduplicate(rows: Row[], subset?: string[]): Row[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = JSON.stringify(
      subset ? subset.map((c) => row[c]) : Object.values(row)
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Remove named columns */
export function dropColumns(rows: Row[], columns: string[]): Row[] {
  const dropSet = new Set(columns);
  return rows.map((row) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(row)) {
      if (!dropSet.has(k)) out[k] = v;
    }
    return out;
  });
}
