import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { datasets } from "../session.js";
import {
  dropEmptyRows,
  dropEmptyCols,
  trimStrings,
  normalizeColumnNames,
  inferTypes,
  deduplicate,
  dropColumns,
} from "../lib/cleaner.js";

export function registerCleanTools(server: McpServer): void {
  server.tool(
    "clean_data",
    "Apply configurable cleaning steps to a dataset in-place.",
    {
      dataset_id: z.string().describe("Dataset ID to clean"),
      steps: z
        .array(
          z.enum([
            "drop_empty_rows",
            "drop_empty_cols",
            "trim_strings",
            "normalize_column_names",
            "infer_types",
            "deduplicate",
            "drop_columns",
          ])
        )
        .describe("Cleaning steps to apply, in order"),
      deduplicate_subset: z
        .array(z.string())
        .optional()
        .describe("Column subset for deduplication (omit = all columns)"),
      columns_to_drop: z
        .array(z.string())
        .optional()
        .describe("Column names to drop (used by drop_columns step)"),
    },
    async ({ dataset_id, steps, deduplicate_subset, columns_to_drop }) => {
      const ds = datasets.get(dataset_id);
      if (!ds) {
        return { content: [{ type: "text", text: `Error: dataset "${dataset_id}" not found` }] };
      }

      const before = ds.rows.length;
      const beforeCols =
        ds.rows.length > 0 ? Object.keys(ds.rows[0]).length : 0;

      let rows = ds.rows;
      const log: string[] = [];

      for (const step of steps) {
        const prevLen = rows.length;
        const prevCols = rows.length > 0 ? Object.keys(rows[0]).length : 0;

        switch (step) {
          case "drop_empty_rows":
            rows = dropEmptyRows(rows);
            log.push(`drop_empty_rows: ${prevLen} → ${rows.length} rows`);
            break;
          case "drop_empty_cols":
            rows = dropEmptyCols(rows);
            log.push(
              `drop_empty_cols: ${prevCols} → ${rows.length > 0 ? Object.keys(rows[0]).length : 0} cols`
            );
            break;
          case "trim_strings":
            rows = trimStrings(rows);
            log.push("trim_strings: done");
            break;
          case "normalize_column_names":
            rows = normalizeColumnNames(rows);
            log.push("normalize_column_names: done");
            break;
          case "infer_types":
            rows = inferTypes(rows);
            log.push("infer_types: done");
            break;
          case "deduplicate":
            rows = deduplicate(rows, deduplicate_subset);
            log.push(`deduplicate: ${prevLen} → ${rows.length} rows`);
            break;
          case "drop_columns":
            rows = dropColumns(rows, columns_to_drop ?? []);
            log.push(
              `drop_columns: ${prevCols} → ${rows.length > 0 ? Object.keys(rows[0]).length : 0} cols`
            );
            break;
        }
      }

      ds.rows = rows;

      const after = rows.length;
      const afterCols = rows.length > 0 ? Object.keys(rows[0]).length : 0;

      const summary = [
        `Cleaned dataset ${dataset_id}`,
        `Rows: ${before} → ${after}`,
        `Cols: ${beforeCols} → ${afterCols}`,
        "",
        ...log,
      ].join("\n");

      return { content: [{ type: "text", text: summary }] };
    }
  );
}
