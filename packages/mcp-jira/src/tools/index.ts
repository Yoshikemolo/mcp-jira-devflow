/**
 * Tools Registration
 *
 * Registers all MCP tools with the server.
 * Supports both configured and unconfigured server states.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getServerState, getClient } from "../server-state.js";
import { getMissingConfigFields } from "../config/index.js";

// Setup tools (always available)
import { setupGuideTool, executeSetupGuide } from "./setup-guide.js";
import { configureTool, executeConfigure } from "./configure.js";

// Development tools (available when JIRA_MCP_DEV=true)
import {
  devReloadTool,
  executeDevReload,
  isDevModeEnabled,
} from "./dev-reload.js";

// Jira tools (require configuration)
import { getIssueTool, executeGetIssue } from "./get-issue.js";
import { searchJqlTool, executeSearchJql } from "./search-jql.js";
import { getCommentsTool, executeGetComments } from "./get-comments.js";
import { scrumGuidanceTool, executeScrumGuidance } from "./scrum-guidance.js";
import { sprintVelocityTool, executeSprintVelocity } from "./get-sprint-velocity.js";
import { deepAnalysisTool, executeDeepAnalysis } from "./deep-analysis.js";
import { createIssueTool, executeCreateIssue } from "./create-issue.js";
import { updateIssueTool, executeUpdateIssue } from "./update-issue.js";
import { transitionIssueTool, executeTransitionIssue } from "./transition-issue.js";

// Board and Sprint management tools
import { getBoardsTool, executeGetBoards } from "./get-boards.js";
import { getBoardSprintsTool, executeGetBoardSprints } from "./get-board-sprints.js";
import { getSprintTool, executeGetSprint } from "./get-sprint.js";
import { moveIssuesToSprintTool, executeMoveIssuesToSprint } from "./move-issues-to-sprint.js";
import { updateSprintTool, executeUpdateSprint } from "./update-sprint.js";

/**
 * Tool definition type.
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tools that are always available regardless of configuration state.
 */
const alwaysAvailableTools: ToolDefinition[] = [setupGuideTool, configureTool];

/**
 * Development tools (only available when JIRA_MCP_DEV=true).
 */
const devTools: ToolDefinition[] = [devReloadTool];

/**
 * Tools that require Jira to be configured.
 */
const jiraTools: ToolDefinition[] = [
  getIssueTool,
  searchJqlTool,
  getCommentsTool,
  scrumGuidanceTool,
  sprintVelocityTool,
  deepAnalysisTool,
  createIssueTool,
  updateIssueTool,
  transitionIssueTool,
  // Board and Sprint management
  getBoardsTool,
  getBoardSprintsTool,
  getSprintTool,
  moveIssuesToSprintTool,
  updateSprintTool,
];

/**
 * Jira tool names for quick lookup.
 */
const jiraToolNames = new Set(jiraTools.map((t) => t.name));

/**
 * Generates an error response for unconfigured state.
 */
function getUnconfiguredError(): {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
} {
  const missing = getMissingConfigFields();
  const missingList = missing.map((f) => f.envVar).join(", ");

  return {
    content: [
      {
        type: "text",
        text: `Jira is not configured. Missing: ${missingList}

Use \`jira_setup_guide\` for setup instructions, or \`jira_configure\` to set credentials now.`,
      },
    ],
    isError: true,
  };
}

/**
 * Registers all Jira tools with the MCP server.
 * Tools are state-aware: some require configuration, others are always available.
 */
export function registerTools(server: Server): void {
  // Handle list_tools request - returns tools based on current state
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const state = getServerState();

    // Always show setup tools
    const availableTools = [...alwaysAvailableTools];

    // Add Jira tools only when configured
    if (state.status === "configured") {
      availableTools.push(...jiraTools);
    }

    // Add development tools when dev mode is enabled
    if (isDevModeEnabled()) {
      availableTools.push(...devTools);
    }

    return {
      tools: availableTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle call_tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const state = getServerState();

    // Setup tools - always available
    switch (name) {
      case "jira_setup_guide":
        return executeSetupGuide();

      case "jira_configure":
        return executeConfigure(args);

      case "jira_dev_reload":
        // Dev tool - check if enabled
        if (isDevModeEnabled()) {
          return executeDevReload(args);
        }
        // Fall through to unknown tool if not in dev mode
        break;
    }

    // Jira tools - require configuration
    if (state.status !== "configured") {
      // Check if this is a known Jira tool
      if (jiraToolNames.has(name)) {
        return getUnconfiguredError();
      }

      // Unknown tool
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

    // Server is configured - get client
    const client = getClient();
    if (!client) {
      // This shouldn't happen if state is configured, but handle gracefully
      return getUnconfiguredError();
    }

    switch (name) {
      case "get_issue":
        return executeGetIssue(client, args);

      case "search_jql":
        return executeSearchJql(client, args);

      case "get_issue_comments":
        return executeGetComments(client, args);

      case "jira_scrum_guidance":
        return executeScrumGuidance(client, args);

      case "get_sprint_velocity":
        return executeSprintVelocity(client, args);

      case "jira_deep_analysis":
        return executeDeepAnalysis(client, args);

      case "create_issue":
        return executeCreateIssue(client, args);

      case "update_issue":
        return executeUpdateIssue(client, args);

      case "transition_issue":
        return executeTransitionIssue(client, args);

      // Board and Sprint management
      case "get_boards":
        return executeGetBoards(client, args);

      case "get_board_sprints":
        return executeGetBoardSprints(client, args);

      case "get_sprint":
        return executeGetSprint(client, args);

      case "move_issues_to_sprint":
        return executeMoveIssuesToSprint(client, args);

      case "update_sprint":
        return executeUpdateSprint(client, args);

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
export { setupGuideTool, executeSetupGuide } from "./setup-guide.js";
export { configureTool, executeConfigure } from "./configure.js";
export { scrumGuidanceTool, executeScrumGuidance } from "./scrum-guidance.js";
export { sprintVelocityTool, executeSprintVelocity } from "./get-sprint-velocity.js";
export { deepAnalysisTool, executeDeepAnalysis } from "./deep-analysis.js";
export { createIssueTool, executeCreateIssue } from "./create-issue.js";
export { updateIssueTool, executeUpdateIssue } from "./update-issue.js";
export { transitionIssueTool, executeTransitionIssue } from "./transition-issue.js";
// Board and Sprint management
export { getBoardsTool, executeGetBoards } from "./get-boards.js";
export { getBoardSprintsTool, executeGetBoardSprints } from "./get-board-sprints.js";
export { getSprintTool, executeGetSprint } from "./get-sprint.js";
export { moveIssuesToSprintTool, executeMoveIssuesToSprint } from "./move-issues-to-sprint.js";
export { updateSprintTool, executeUpdateSprint } from "./update-sprint.js";
