/**
 * Get Board Sprints Tool
 *
 * MCP tool for listing sprints for a Jira board.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError, JiraBoardNotFoundError } from "../domain/jira-client.js";
import type { JiraSprintExtended } from "../domain/types.js";

/**
 * Maximum results per request.
 */
const MAX_RESULTS = 50;

/**
 * Default results per request.
 */
const DEFAULT_RESULTS = 50;

/**
 * Input schema for get_board_sprints tool.
 */
export const GetBoardSprintsInputSchema = z.object({
  boardId: z
    .number()
    .int()
    .positive()
    .describe("The board ID (required)"),
  state: z
    .enum(["future", "active", "closed", "all"])
    .optional()
    .describe("Filter sprints by state. 'all' returns sprints in all states."),
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

export type GetBoardSprintsInput = z.infer<typeof GetBoardSprintsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getBoardSprintsTool = {
  name: "get_board_sprints",
  description:
    "Lists sprints for a Jira board. Supports filtering by sprint state (future/active/closed/all). Returns paginated results.",
  inputSchema: {
    type: "object" as const,
    properties: {
      boardId: {
        type: "number",
        description: "The board ID (required)",
      },
      state: {
        type: "string",
        enum: ["future", "active", "closed", "all"],
        description: "Filter sprints by state. 'all' returns sprints in all states.",
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
    required: ["boardId"],
  },
};

/**
 * Formats a sprint for output.
 */
function formatSprint(sprint: JiraSprintExtended): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
  };

  if (sprint.goal) {
    result["goal"] = sprint.goal;
  }

  if (sprint.startDate) {
    result["startDate"] = sprint.startDate;
  }

  if (sprint.endDate) {
    result["endDate"] = sprint.endDate;
  }

  if (sprint.completeDate) {
    result["completeDate"] = sprint.completeDate;
  }

  return result;
}

/**
 * Executes the get_board_sprints tool.
 */
export async function executeGetBoardSprints(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetBoardSprintsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { boardId, state, startAt, maxResults } = parseResult.data;

  try {
    // Build options object, only including defined values
    const options: Parameters<typeof client.getBoardSprints>[1] = {
      startAt,
      maxResults,
    };

    if (state !== undefined) {
      options.state = state;
    }

    const result = await client.getBoardSprints(boardId, options);

    const response: Record<string, unknown> = {
      boardId,
      sprints: result.sprints.map(formatSprint),
      pagination: {
        startAt: result.startAt,
        maxResults: result.maxResults,
        total: result.total,
        isLast: result.isLast,
      },
    };

    // Add helpful message if no sprints found
    if (result.sprints.length === 0) {
      const stateFilter = state && state !== "all" ? ` with state '${state}'` : "";
      response["_info"] = `No sprints found for board ${boardId}${stateFilter}. ` +
        "Ensure the board uses sprints (Scrum boards only).";
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

    if (error instanceof JiraBoardNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Board with ID ${boardId} not found. Use get_boards to list available boards.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Failed to list sprints: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
