import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { datasets, newDatasetId } from "../session.js";
import { readWorkbook, sheetToRows } from "../lib/excel.js";

export function registerLoadTools(server: McpServer): void {
  // load_excel
  server.tool(
    "load_excel",
    "Parse an .xlsx or .xls file, load a sheet into memory, and return a dataset ID.",
    {
      file_path: z.string().describe("Absolute path to the Excel file"),
      sheet_name: z
        .string()
        .optional()
        .describe("Sheet name to load (defaults to first sheet)"),
    },
    async ({ file_path, sheet_name }) => {
      const wb = readWorkbook(file_path);
      const sheetNames: string[] = wb.SheetNames;
      if (sheetNames.length === 0) {
        return { content: [{ type: "text", text: "Error: workbook has no sheets" }] };
      }
      const targetSheet = sheet_name ?? sheetNames[0];
      if (!sheetNames.includes(targetSheet)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: sheet "${targetSheet}" not found. Available: ${sheetNames.join(", ")}`,
            },
          ],
        };
      }
      const rows = sheetToRows(wb.Sheets[targetSheet]);
      const id = newDatasetId();
      const fileName = file_path.split(/[\\/]/).pop() ?? file_path;
      datasets.set(id, {
        id,
        name: fileName,
        sheet: targetSheet,
        rows,
        loadedAt: new Date(),
      });
      return {
        content: [
          {
            type: "text",
            text: `Loaded "${fileName}" / sheet "${targetSheet}" → dataset ID: ${id}\nRows: ${rows.length}, Columns: ${rows.length > 0 ? Object.keys(rows[0]).length : 0}`,
          },
        ],
      };
    }
  );

  // list_datasets
  server.tool(
    "list_datasets",
    "List all datasets currently loaded in the session.",
    {},
    async () => {
      if (datasets.size === 0) {
        return { content: [{ type: "text", text: "No datasets loaded." }] };
      }
      const lines = Array.from(datasets.values()).map(
        (ds) =>
          `• ${ds.id}  |  "${ds.name}" / "${ds.sheet}"  |  ${ds.rows.length} rows  |  loaded ${ds.loadedAt.toISOString()}`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  // drop_dataset
  server.tool(
    "drop_dataset",
    "Remove a dataset from memory.",
    {
      dataset_id: z.string().describe("Dataset ID to remove"),
    },
    async ({ dataset_id }) => {
      if (!datasets.has(dataset_id)) {
        return { content: [{ type: "text", text: `Error: dataset "${dataset_id}" not found` }] };
      }
      datasets.delete(dataset_id);
      return { content: [{ type: "text", text: `Dataset "${dataset_id}" removed.` }] };
    }
  );
}
