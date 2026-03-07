import type { Row, CellValue } from "../session.js";

export type AggFunction = "sum" | "avg" | "min" | "max" | "count" | "count_distinct";

export interface AggSpec {
  column: string;
  function: AggFunction;
  alias?: string;
}

function toNumber(v: CellValue): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n)) return n;
  }
  return null;
}

function applyAgg(values: CellValue[], fn: AggFunction): CellValue {
  switch (fn) {
    case "count":
      return values.length;
    case "count_distinct":
      return new Set(values.map((v) => String(v))).size;
    case "sum": {
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      return nums.reduce((a, b) => a + b, 0);
    }
    case "avg": {
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      if (nums.length === 0) return null;
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    case "min": {
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      if (nums.length === 0) return null;
      return Math.min(...nums);
    }
    case "max": {
      const nums = values.map(toNumber).filter((n): n is number => n !== null);
      if (nums.length === 0) return null;
      return Math.max(...nums);
    }
  }
}

export function groupBy(rows: Row[], groupCols: string[], aggs: AggSpec[]): Row[] {
  const buckets = new Map<string, Row[]>();

  for (const row of rows) {
    const key = JSON.stringify(groupCols.map((c) => row[c]));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }

  const result: Row[] = [];
  for (const [keyStr, bucket] of buckets) {
    const keyVals: CellValue[] = JSON.parse(keyStr) as CellValue[];
    const out: Row = {};
    for (let i = 0; i < groupCols.length; i++) {
      out[groupCols[i]] = keyVals[i];
    }
    for (const agg of aggs) {
      const values = bucket.map((r) => r[agg.column]);
      const resultKey = agg.alias ?? `${agg.function}_${agg.column}`;
      out[resultKey] = applyAgg(values, agg.function);
    }
    result.push(out);
  }

  return result;
}

export function valueCounts(rows: Row[], column: string, topN?: number): Row[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[column] ?? "(null)");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count } as Row));

  if (topN !== undefined) sorted = sorted.slice(0, topN);
  return sorted;
}
