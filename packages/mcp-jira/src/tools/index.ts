/**
 * Tools Registration
 *
 * Registers all MCP tools with the server.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { JiraClient } from "../domain/jira-client.js";

import { getIssueTool, executeGetIssue } from "./get-issue.js";
import { searchJqlTool, executeSearchJql } from "./search-jql.js";
import { getCommentsTool, executeGetComments } from "./get-comments.js";

/**
 * All available tools.
 */
const tools = [getIssueTool, searchJqlTool, getCommentsTool];

/**
 * Registers all Jira tools with the MCP server.
 */
export function registerTools(server: Server, client: JiraClient): void {
  // Handle list_tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle call_tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_issue":
        return executeGetIssue(client, args);

      case "search_jql":
        return executeSearchJql(client, args);

      case "get_issue_comments":
        return executeGetComments(client, args);

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  });
}

// Re-export individual tools for testing
export { getIssueTool, executeGetIssue } from "./get-issue.js";
export { searchJqlTool, executeSearchJql } from "./search-jql.js";
export { getCommentsTool, executeGetComments } from "./get-comments.js";
