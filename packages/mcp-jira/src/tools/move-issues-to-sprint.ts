/**
 * Move Issues to Sprint Tool
 *
 * MCP tool for moving issues to a sprint.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import {
  JiraAuthError,
  JiraSprintNotFoundError,
  JiraApiError,
} from "../domain/jira-client.js";

/**
 * Maximum issues per request.
 */
const MAX_ISSUES = 50;

/**
 * Input schema for move_issues_to_sprint tool.
 */
export const MoveIssuesToSprintInputSchema = z.object({
  sprintId: z
    .number()
    .int()
    .positive()
    .describe("The sprint ID to move issues to (required)"),
  issueKeys: z
    .array(
      z.string().regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Invalid issue key format")
    )
    .min(1, "At least one issue key is required")
    .max(MAX_ISSUES, `Maximum ${MAX_ISSUES} issues per request`)
    .describe("Array of issue keys to move (e.g., ['PROJ-123', 'PROJ-456'])"),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, validate the operation without executing it"),
});

export type MoveIssuesToSprintInput = z.infer<typeof MoveIssuesToSprintInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const moveIssuesToSprintTool = {
  name: "move_issues_to_sprint",
  description:
    "Moves issues to a sprint. Supports dry run mode to validate without executing. Issues will be added to the sprint backlog.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sprintId: {
        type: "number",
        description: "The sprint ID to move issues to (required)",
      },
      issueKeys: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[A-Z][A-Z0-9]*-\\d+$",
        },
        description: "Array of issue keys to move (e.g., ['PROJ-123', 'PROJ-456'])",
        minItems: 1,
        maxItems: MAX_ISSUES,
      },
      dryRun: {
        type: "boolean",
        description: "If true, validate the operation without executing it",
      },
    },
    required: ["sprintId", "issueKeys"],
  },
};

/**
 * Executes the move_issues_to_sprint tool.
 */
export async function executeMoveIssuesToSprint(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = MoveIssuesToSprintInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { sprintId, issueKeys, dryRun } = parseResult.data;

  // Normalize issue keys to uppercase
  const normalizedKeys = issueKeys.map((key) => key.toUpperCase());

  try {
    // Verify the sprint exists first
    const sprint = await client.getSprint(sprintId);

    // Check if sprint is in a valid state for adding issues
    if (sprint.state === "closed") {
      return {
        content: [
          {
            type: "text",
            text: `Cannot add issues to closed sprint '${sprint.name}' (ID: ${sprintId}). ` +
              "Issues can only be added to future or active sprints.",
          },
        ],
        isError: true,
      };
    }

    // Dry run - just validate
    if (dryRun) {
      const response = {
        dryRun: true,
        valid: true,
        sprintId,
        sprintName: sprint.name,
        sprintState: sprint.state,
        issueKeys: normalizedKeys,
        message: `Validation successful. ${normalizedKeys.length} issue(s) can be moved to sprint '${sprint.name}'.`,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Execute the move
    const result = await client.moveIssuesToSprint({
      sprintId,
      issueKeys: normalizedKeys,
    });

    const response = {
      success: result.success,
      sprintId: result.sprintId,
      sprintName: sprint.name,
      movedIssues: result.movedIssues,
      message: `Successfully moved ${result.movedIssues.length} issue(s) to sprint '${sprint.name}'.`,
    };

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

    if (error instanceof JiraSprintNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Sprint with ID ${sprintId} not found. Use get_board_sprints to list available sprints.`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof JiraApiError) {
      // Handle specific error cases
      if (error.statusCode === 400) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid request: One or more issue keys may be invalid or you may not have permission to move them. Issue keys: ${normalizedKeys.join(", ")}`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Failed to move issues to sprint: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
