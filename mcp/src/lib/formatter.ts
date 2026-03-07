import type { Row, CellValue, Dataset } from "../session.js";

// ---------- helpers ----------

function isEmpty(v: CellValue): boolean {
  return v === null || v === undefined || v === "";
}

function typeOf(v: CellValue): string {
  if (v === null || v === undefined) return "null";
  if (v instanceof Date) return "date";
  return typeof v;
}

// ---------- markdown_table ----------

interface TableOptions {
  maxRows?: number;
  columns?: string[];
}

export function toMarkdownTable(rows: Row[], opts: TableOptions = {}): string {
  if (rows.length === 0) return "_No data._";

  let cols = opts.columns ?? Object.keys(rows[0]);
  // Only keep columns that exist in the data
  const allCols = Object.keys(rows[0]);
  cols = cols.filter((c) => allCols.includes(c));
  if (cols.length === 0) cols = allCols;

  const displayRows = opts.maxRows ? rows.slice(0, opts.maxRows) : rows;

  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = displayRows
    .map((row) => `| ${cols.map((c) => String(row[c] ?? "")).join(" | ")} |`)
    .join("\n");

  const truncNote =
    opts.maxRows && rows.length > opts.maxRows
      ? `\n_Showing ${opts.maxRows} of ${rows.length} rows._`
      : "";

  return `${header}\n${sep}\n${body}${truncNote}`;
}

// ---------- summary ----------

export function toSummary(ds: Dataset): string {
  const { rows, name, sheet, loadedAt } = ds;
  if (rows.length === 0)
    return `Dataset "${name}" (sheet "${sheet}") is empty.`;

  const cols = Object.keys(rows[0]);
  const lines: string[] = [
    `## Dataset Summary`,
    `- **File**: ${name}`,
    `- **Sheet**: ${sheet}`,
    `- **Loaded**: ${loadedAt.toISOString()}`,
    `- **Rows**: ${rows.length}`,
    `- **Columns**: ${cols.length}`,
    "",
    `### Column Overview`,
  ];

  for (const col of cols) {
    const values = rows.map((r) => r[col]);
    const nonNull = values.filter((v) => !isEmpty(v));
    const types = new Set(values.map(typeOf));
    const typeSummary = Array.from(types).join(", ");
    lines.push(
      `- **${col}**: ${nonNull.length}/${rows.length} non-null, types: ${typeSummary}`
    );
  }

  // 3 sample rows
  lines.push("", "### Sample Rows (first 3)");
  const sample = rows.slice(0, 3);
  for (const row of sample) {
    const parts = cols.map((c) => `${c}=${JSON.stringify(row[c])}`).join(", ");
    lines.push(`- ${parts}`);
  }

  return lines.join("\n");
}

// ---------- quality_report ----------

export function toQualityReport(rows: Row[]): string {
  if (rows.length === 0) return "_No data to report._";

  const cols = Object.keys(rows[0]);
  const lines: string[] = [
    `## Quality Report`,
    `- Total rows: ${rows.length}`,
    `- Total columns: ${cols.length}`,
    "",
    `### Null Counts`,
    `| Column | Null Count | Null % |`,
    `| --- | --- | --- |`,
  ];

  for (const col of cols) {
    const nullCount = rows.filter((r) => isEmpty(r[col])).length;
    const pct = ((nullCount / rows.length) * 100).toFixed(1);
    lines.push(`| ${col} | ${nullCount} | ${pct}% |`);
  }

  // Duplicate rows
  const seen = new Set<string>();
  let dupCount = 0;
  for (const row of rows) {
    const key = JSON.stringify(Object.values(row));
    if (seen.has(key)) dupCount++;
    else seen.add(key);
  }
  lines.push("", `### Duplicates`, `- Duplicate rows: ${dupCount}`);

  // Type breakdown per column
  lines.push("", `### Type Breakdown`, `| Column | Types |`);
  lines.push(`| --- | --- |`);
  for (const col of cols) {
    const typeCounts = new Map<string, number>();
    for (const row of rows) {
      const t = typeOf(row[col]);
      typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    const summary = Array.from(typeCounts.entries())
      .map(([t, n]) => `${t}: ${n}`)
      .join(", ");
    lines.push(`| ${col} | ${summary} |`);
  }

  return lines.join("\n");
}

// ---------- schema ----------

export function toSchema(rows: Row[]): string {
  if (rows.length === 0) return JSON.stringify({ columns: [] }, null, 2);

  const cols = Object.keys(rows[0]);
  const schema = cols.map((col) => {
    const values = rows.map((r) => r[col]);
    const nonNull = values.filter((v) => !isEmpty(v));
    const types = Array.from(new Set(nonNull.map(typeOf)));
    const uniqueVals = new Set(values.map((v) => JSON.stringify(v)));
    return {
      name: col,
      inferred_types: types,
      nullable: values.some((v) => isEmpty(v)),
      unique_count: uniqueVals.size,
      row_count: rows.length,
    };
  });

  return JSON.stringify({ columns: schema }, null, 2);
}
