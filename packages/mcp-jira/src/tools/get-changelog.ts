/**
 * Get Changelog Tool
 *
 * MCP tool for retrieving the changelog (history) of a Jira issue.
 * Returns all changes made to the issue including field changes, status transitions, etc.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraNotFoundError, JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for get_issue_changelog tool.
 */
export const GetChangelogInputSchema = z.object({
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
    .describe("The index of the first changelog entry to return (0-based)"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100)
    .describe("Maximum number of changelog entries to return (1-100, default 100)"),
});

export type GetChangelogInput = z.infer<typeof GetChangelogInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getChangelogTool = {
  name: "get_issue_changelog",
  description:
    "Retrieves the changelog (history) for a Jira issue. Returns all changes made to the issue including field changes (like Story Points), status transitions, assignee changes, and more. Useful for tracking when estimates were changed, who made changes, and the history of an issue. Supports pagination.",
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
        description: "The index of the first changelog entry to return (0-based, default 0)",
        minimum: 0,
      },
      maxResults: {
        type: "number",
        description: "Maximum number of changelog entries to return (1-100, default 100)",
        minimum: 1,
        maximum: 100,
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the get_issue_changelog tool.
 */
export async function executeGetChangelog(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetChangelogInputSchema.safeParse(input);

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
    const result = await client.getIssueChangelog(issueKey, { startAt, maxResults });

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
              changelogCount: result.changelog.length,
              changelog: result.changelog,
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
          text: `Failed to retrieve changelog: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
