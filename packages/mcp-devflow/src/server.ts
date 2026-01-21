/**
 * MCP DevFlow Server
 *
 * Entry point for the DevFlow MCP server.
 * Handles Git, PR, and test execution workflows.
 * This is a placeholder - implementation will follow feature specifications.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const SERVER_NAME = "mcp-devflow";
const SERVER_VERSION = "0.1.0";

/**
 * Creates and configures the MCP server instance.
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tools will be registered here as features are implemented

  return server;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
