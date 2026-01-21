/**
 * MCP Jira Server
 *
 * Entry point for the Jira MCP server.
 * Provides tools for reading Jira issues, searching with JQL, and retrieving comments.
 *
 * The server supports graceful startup:
 * - With valid credentials: All Jira tools are available
 * - Without credentials: Setup tools guide the user through configuration
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  tryLoadConfigFromEnv,
  getMissingConfigFields,
} from "./config/index.js";
import { JiraClient } from "./domain/jira-client.js";
import { registerTools } from "./tools/index.js";
import { setConfigured, setUnconfigured, resolveFieldMappings } from "./server-state.js";
import { startWatcher, stopWatcher, getWatcherConfig } from "./dev/watcher.js";

const SERVER_NAME = "mcp-jira";
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

  // Register all tools (state-aware)
  registerTools(server);

  return server;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  // Try to load configuration from environment (graceful - no exit on failure)
  const config = tryLoadConfigFromEnv();

  if (config) {
    // Resolve field mappings from config
    const fieldMappings = resolveFieldMappings(config.fieldMappings);
    // Configuration available - create client and set configured state
    const client = new JiraClient(config, undefined, fieldMappings);
    setConfigured(config, client, fieldMappings);
    console.error(
      `${SERVER_NAME} v${SERVER_VERSION} started (configured: ${config.baseUrl})`
    );
  } else {
    // No configuration - start in unconfigured mode
    setUnconfigured();
    const missing = getMissingConfigFields();
    const missingVars = missing.map((f) => f.envVar).join(", ");
    console.error(
      `${SERVER_NAME} v${SERVER_VERSION} started (unconfigured - missing: ${missingVars})`
    );
    console.error(
      "Use jira_setup_guide tool for setup instructions, or jira_configure to set credentials."
    );
  }

  // Create and start server
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Start development watcher if enabled
  const watcherConfig = getWatcherConfig();
  if (watcherConfig.enabled) {
    startWatcher(server, watcherConfig);
    console.error(
      `${SERVER_NAME} development mode enabled (JIRA_MCP_DEV=true)`
    );
  }

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    stopWatcher();
    await server.close();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
