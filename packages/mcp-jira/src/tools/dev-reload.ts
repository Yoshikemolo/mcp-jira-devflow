/**
 * Development Reload Tool
 *
 * Provides a tool for developers to trigger a graceful server restart
 * when code changes have been made and compiled.
 *
 * This tool is only available when JIRA_MCP_DEV=true.
 */

import { triggerRestart, getLastChangeTime } from "../dev/watcher.js";

/**
 * Tool definition for dev reload.
 */
export const devReloadTool = {
  name: "jira_dev_reload",
  description:
    "Development tool: Triggers a graceful restart of the MCP server to reload code changes. " +
    "Only available in development mode (JIRA_MCP_DEV=true). " +
    "Use this after compiling TypeScript changes to apply them without restarting Claude Code.",
  inputSchema: {
    type: "object" as const,
    properties: {
      confirm: {
        type: "boolean",
        description:
          "Set to true to confirm the restart. The server will exit and should be restarted by the parent process.",
      },
    },
    required: ["confirm"],
  },
};

/**
 * Checks if dev mode is enabled.
 */
export function isDevModeEnabled(): boolean {
  return process.env["JIRA_MCP_DEV"] === "true";
}

/**
 * Executes the dev reload tool.
 */
export function executeDevReload(args: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  // Validate args
  const params = args as { confirm?: boolean } | undefined;

  if (!params?.confirm) {
    return {
      content: [
        {
          type: "text",
          text: `To restart the MCP server and reload code changes, call this tool with confirm: true.

**Warning:** This will cause the server process to exit. Claude Code should automatically reconnect.

Last detected file change: ${
            getLastChangeTime()
              ? new Date(getLastChangeTime()).toISOString()
              : "none"
          }`,
        },
      ],
    };
  }

  // Check if dev mode is enabled
  if (!isDevModeEnabled()) {
    return {
      content: [
        {
          type: "text",
          text: `Development mode is not enabled.

To enable dev mode, set the environment variable:
  JIRA_MCP_DEV=true

You can also enable auto-restart on file changes:
  JIRA_MCP_AUTO_RESTART=true`,
        },
      ],
      isError: true,
    };
  }

  // Trigger the restart
  // We return a message first, then the process will exit
  setTimeout(() => {
    triggerRestart();
  }, 100);

  return {
    content: [
      {
        type: "text",
        text: `Server restart initiated.

The MCP server will exit in ~200ms. Claude Code should automatically reconnect to the restarted server with the updated code.

If the server doesn't restart automatically, you may need to:
1. Check that the server process is being managed (e.g., by nodemon or a supervisor)
2. Or restart Claude Code manually`,
      },
    ],
  };
}
