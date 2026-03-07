import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerLoadTools } from "./tools/load.js";
import { registerCleanTools } from "./tools/clean.js";
import { registerAggregateTools } from "./tools/aggregate.js";
import { registerFormatTools } from "./tools/format.js";

const server = new McpServer({
  name: "excel",
  version: "1.0.0",
});

registerLoadTools(server);
registerCleanTools(server);
registerAggregateTools(server);
registerFormatTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
