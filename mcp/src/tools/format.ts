import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { datasets } from "../session.js";
import {
  toMarkdownTable,
  toSummary,
  toQualityReport,
  toSchema,
} from "../lib/formatter.js";

export function registerFormatTools(server: McpServer): void {
  server.tool(
    "format_data",
    "Render dataset rows to a prompt-ready format: markdown table, summary, quality report, or schema.",
    {
      dataset_id: z.string().describe("Dataset ID to format"),
      format: z
        .enum(["markdown_table", "summary", "quality_report", "schema"])
        .describe("Output format"),
      max_rows: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max rows to include (markdown_table only)"),
      columns: z
        .array(z.string())
        .optional()
        .describe("Column subset to include (markdown_table only)"),
    },
    async ({ dataset_id, format, max_rows, columns }) => {
      const ds = datasets.get(dataset_id);
      if (!ds) {
        return { content: [{ type: "text", text: `Error: dataset "${dataset_id}" not found` }] };
      }

      let output: string;
      switch (format) {
        case "markdown_table":
          output = toMarkdownTable(ds.rows, { maxRows: max_rows, columns });
          break;
        case "summary":
          output = toSummary(ds);
          break;
        case "quality_report":
          output = toQualityReport(ds.rows);
          break;
        case "schema":
          output = toSchema(ds.rows);
          break;
      }

      return { content: [{ type: "text", text: output }] };
    }
  );
}
