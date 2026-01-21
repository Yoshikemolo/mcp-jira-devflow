/**
 * MCP Jira Server
 *
 * Entry point for the Jira MCP server.
 * Provides tools for reading Jira issues, searching with JQL, and retrieving comments.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv } from "./config/index.js";
import { JiraClient } from "./domain/jira-client.js";
import { registerTools } from "./tools/index.js";

const SERVER_NAME = "mcp-jira";
const SERVER_VERSION = "0.1.0";

/**
 * Creates and configures the MCP server instance.
 */
function createServer(client: JiraClient): Server {
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

  // Register all Jira tools
  registerTools(server, client);

  return server;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  // Load configuration from environment
  let config;
  try {
    config = loadConfigFromEnv();
  } catch (error) {
    console.error(
      "Configuration error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    console.error(
      "\nRequired environment variables:\n" +
        "  JIRA_BASE_URL - Jira instance URL (e.g., https://company.atlassian.net)\n" +
        "  JIRA_USER_EMAIL - Your Jira email\n" +
        "  JIRA_API_TOKEN - Your Jira API token"
    );
    process.exit(1);
  }

  // Create Jira client
  const client = new JiraClient(config);

  // Create and start server
  const server = createServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log startup (to stderr to not interfere with MCP protocol)
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    await server.close();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
