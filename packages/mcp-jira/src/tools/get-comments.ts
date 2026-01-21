/**
 * Get Comments Tool
 *
 * MCP tool for retrieving comments from a Jira issue.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraNotFoundError, JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for get_issue_comments tool.
 */
export const GetCommentsInputSchema = z.object({
  issueKey: z
    .string()
    .regex(
      /^[A-Z][A-Z0-9]*-\d+$/i,
      "Issue key must be in format PROJECT-123"
    )
    .describe("The Jira issue key (e.g., PROJECT-123)"),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("The index of the first comment to return (0-based)"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe("Maximum number of comments to return"),
});

export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getCommentsTool = {
  name: "get_issue_comments",
  description:
    "Retrieves comments from a Jira issue. Returns comments with author, body, and timestamps. Supports pagination.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., PROJECT-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      startAt: {
        type: "number",
        description: "The index of the first comment to return (0-based, default 0)",
        minimum: 0,
      },
      maxResults: {
        type: "number",
        description: "Maximum number of comments to return (1-100, default 50)",
        minimum: 1,
        maximum: 100,
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the get_issue_comments tool.
 */
export async function executeGetComments(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetCommentsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, startAt, maxResults } = parseResult.data;

  try {
    const result = await client.getComments(issueKey, { startAt, maxResults });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              issueKey,
              total: result.total,
              startAt: result.startAt,
              maxResults: result.maxResults,
              commentCount: result.comments.length,
              comments: result.comments,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    if (error instanceof JiraNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Issue '${issueKey}' not found`,
          },
        ],
        isError: true,
      };
    }

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

    // Generic error
    return {
      content: [
        {
          type: "text",
          text: `Failed to retrieve comments: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
