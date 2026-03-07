import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { datasets } from "../session.js";
import { groupBy, valueCounts } from "../lib/aggregator.js";

export function registerAggregateTools(server: McpServer): void {
  server.tool(
    "aggregate_data",
    "Aggregate dataset rows using group-by with stat functions, or value counts for a categorical column.",
    {
      dataset_id: z.string().describe("Dataset ID to aggregate"),
      operation: z
        .enum(["group_by", "value_counts"])
        .describe("Aggregation operation"),
      group_by_columns: z
        .array(z.string())
        .optional()
        .describe("Columns to group by (required for group_by)"),
      aggregations: z
        .array(
          z.object({
            column: z.string(),
            function: z.enum(["sum", "avg", "min", "max", "count", "count_distinct"]),
            alias: z.string().optional(),
          })
        )
        .optional()
        .describe("Aggregation specs (required for group_by)"),
      value_counts_column: z
        .string()
        .optional()
        .describe("Column to count values for (required for value_counts)"),
      top_n: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Limit results to top N rows by count (value_counts only)"),
    },
    async ({ dataset_id, operation, group_by_columns, aggregations, value_counts_column, top_n }) => {
      const ds = datasets.get(dataset_id);
      if (!ds) {
        return { content: [{ type: "text", text: `Error: dataset "${dataset_id}" not found` }] };
      }

      if (operation === "group_by") {
        if (!group_by_columns || group_by_columns.length === 0) {
          return { content: [{ type: "text", text: "Error: group_by_columns required for group_by operation" }] };
        }
        if (!aggregations || aggregations.length === 0) {
          return { content: [{ type: "text", text: "Error: aggregations required for group_by operation" }] };
        }
        const result = groupBy(ds.rows, group_by_columns, aggregations);
        return {
          content: [
            {
              type: "text",
              text: `group_by result (${result.length} groups):\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } else {
        if (!value_counts_column) {
          return { content: [{ type: "text", text: "Error: value_counts_column required for value_counts operation" }] };
        }
        const result = valueCounts(ds.rows, value_counts_column, top_n);
        return {
          content: [
            {
              type: "text",
              text: `value_counts for "${value_counts_column}" (${result.length} values):\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }
    }
  );
}
