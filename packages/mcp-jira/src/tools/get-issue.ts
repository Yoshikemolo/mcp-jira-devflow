/**
 * Get Issue Tool
 *
 * MCP tool for retrieving a single Jira issue by key.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraNotFoundError, JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for get_issue tool.
 */
export const GetIssueInputSchema = z.object({
  issueKey: z
    .string()
    .regex(
      /^[A-Z][A-Z0-9]*-\d+$/i,
      "Issue key must be in format PROJECT-123"
    )
    .describe("The Jira issue key (e.g., PROJECT-123)"),
});

export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getIssueTool = {
  name: "get_issue",
  description:
    "Retrieves a Jira issue by its key. Returns issue details including summary, description, status, assignee, and other metadata.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., PROJECT-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the get_issue tool.
 */
export async function executeGetIssue(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetIssueInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey } = parseResult.data;

  try {
    const issue = await client.getIssue(issueKey);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(issue, null, 2),
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
          text: `Failed to retrieve issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
