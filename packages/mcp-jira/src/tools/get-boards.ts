/**
 * Get Boards Tool
 *
 * MCP tool for listing Jira boards with optional filters.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraBoard } from "../domain/types.js";

/**
 * Maximum results per request.
 */
const MAX_RESULTS = 50;

/**
 * Default results per request.
 */
const DEFAULT_RESULTS = 50;

/**
 * Input schema for get_boards tool.
 */
export const GetBoardsInputSchema = z.object({
  projectKeyOrId: z
    .string()
    .optional()
    .describe("Filter boards by project key or ID"),
  type: z
    .enum(["scrum", "kanban", "simple"])
    .optional()
    .describe("Filter boards by type"),
  name: z
    .string()
    .optional()
    .describe("Filter boards by name (contains match)"),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("Index of the first result to return (0-based)"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULTS)
    .optional()
    .default(DEFAULT_RESULTS)
    .describe(`Maximum number of results to return (default: ${DEFAULT_RESULTS}, max: ${MAX_RESULTS})`),
});

export type GetBoardsInput = z.infer<typeof GetBoardsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getBoardsTool = {
  name: "get_boards",
  description:
    "Lists Jira boards with optional filters. Supports filtering by project, board type (scrum/kanban/simple), and name. Returns paginated results.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKeyOrId: {
        type: "string",
        description: "Filter boards by project key or ID",
      },
      type: {
        type: "string",
        enum: ["scrum", "kanban", "simple"],
        description: "Filter boards by type",
      },
      name: {
        type: "string",
        description: "Filter boards by name (contains match)",
      },
      startAt: {
        type: "number",
        description: "Index of the first result to return (0-based)",
        minimum: 0,
      },
      maxResults: {
        type: "number",
        description: `Maximum number of results to return (default: ${DEFAULT_RESULTS}, max: ${MAX_RESULTS})`,
        minimum: 1,
        maximum: MAX_RESULTS,
      },
    },
    required: [],
  },
};

/**
 * Formats a board for output.
 */
function formatBoard(board: JiraBoard): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: board.id,
    name: board.name,
    type: board.type,
  };

  if (board.location) {
    result["project"] = {
      key: board.location.projectKey,
      name: board.location.projectName,
    };
  }

  return result;
}

/**
 * Executes the get_boards tool.
 */
export async function executeGetBoards(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetBoardsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKeyOrId, type, name, startAt, maxResults } = parseResult.data;

  try {
    // Build options object, only including defined values
    const options: Parameters<typeof client.getBoards>[0] = {
      startAt,
      maxResults,
    };

    if (projectKeyOrId !== undefined) {
      options.projectKeyOrId = projectKeyOrId;
    }

    if (type !== undefined) {
      options.type = type;
    }

    if (name !== undefined) {
      options.name = name;
    }

    const result = await client.getBoards(options);

    const response: Record<string, unknown> = {
      boards: result.boards.map(formatBoard),
      pagination: {
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.isLast,
      },
    };

    // Add helpful message if no boards found
    if (result.boards.length === 0) {
      const filters: string[] = [];
      if (projectKeyOrId) filters.push(`project=${projectKeyOrId}`);
      if (type) filters.push(`type=${type}`);
      if (name) filters.push(`name contains "${name}"`);

      response["_info"] = filters.length > 0
        ? `No boards found matching filters: ${filters.join(", ")}`
        : "No boards found. Ensure you have access to at least one board.";
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof JiraAuthError) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed. Please check your Jira credentials.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Failed to list boards: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
