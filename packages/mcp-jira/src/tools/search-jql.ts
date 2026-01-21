/**
 * Search JQL Tool
 *
 * MCP tool for searching Jira issues using JQL.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue, JiraIssueCompact } from "../domain/types.js";

/**
 * Output mode for search results.
 * - "auto": Automatically use compact mode for large result sets (>5 results)
 * - "compact": Always use compact format (key, summary, status, priority, assignee, issueType)
 * - "full": Always use full format with all fields
 */
export type OutputMode = "auto" | "compact" | "full";

/**
 * Threshold for automatic compact mode activation.
 * If results exceed this number in "auto" mode, compact format is used.
 */
const AUTO_COMPACT_THRESHOLD = 5;

/**
 * Input schema for search_jql tool.
 */
export const SearchJqlInputSchema = z.object({
  jql: z
    .string()
    .min(1, "JQL query cannot be empty")
    .describe("The JQL query string"),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("(Deprecated) The index of the first result to return (0-based). Use nextPageToken instead."),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(50)
    .describe("Maximum number of results to return (max 50)"),
  nextPageToken: z
    .string()
    .optional()
    .describe("Token for fetching the next page of results"),
  outputMode: z
    .enum(["auto", "compact", "full"])
    .optional()
    .default("auto")
    .describe("Output format: 'auto' (compact for >5 results), 'compact' (minimal fields), 'full' (all fields)"),
});

/**
 * Converts a full JiraIssue to compact format.
 */
function toCompactIssue(issue: JiraIssue): JiraIssueCompact {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    priority: issue.priority?.name,
    assignee: issue.assignee?.displayName,
    issueType: issue.issueType.name,
  };
}

export type SearchJqlInput = z.infer<typeof SearchJqlInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const searchJqlTool = {
  name: "search_jql",
  description:
    "Searches for Jira issues using JQL (Jira Query Language). Returns a list of matching issues with pagination support. Maximum 50 results per request. Use nextPageToken from the response to fetch subsequent pages. By default uses 'auto' outputMode which returns compact format for large result sets to optimize token usage.",
  inputSchema: {
    type: "object" as const,
    properties: {
      jql: {
        type: "string",
        description: "The JQL query string (e.g., 'project = PROJ AND status = Open')",
      },
      startAt: {
        type: "number",
        description: "(Deprecated) Use nextPageToken for pagination instead.",
        minimum: 0,
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (1-50, default 50)",
        minimum: 1,
        maximum: 50,
      },
      nextPageToken: {
        type: "string",
        description: "Token for fetching the next page of results",
      },
      outputMode: {
        type: "string",
        enum: ["auto", "compact", "full"],
        description: "Output format: 'auto' (compact for >5 results, default), 'compact' (minimal fields only), 'full' (all fields)",
      },
    },
    required: ["jql"],
  },
};

/**
 * Generates the informational message for compact mode.
 */
function getCompactModeMessage(issueCount: number, isAutoActivated: boolean): string {
  const activationReason = isAutoActivated
    ? `This query returned ${issueCount} results (>${AUTO_COMPACT_THRESHOLD}). Compact mode was automatically activated to optimize token usage.`
    : "Compact mode is active.";

  return `${activationReason}

Showing: key, summary, status, priority, assignee, issueType.

To see full details of a specific issue, use get_issue with the issue key (e.g., PROJ-123).
To force full results, use outputMode: "full" (not recommended for large result sets).`;
}

/**
 * Executes the search_jql tool.
 */
export async function executeSearchJql(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = SearchJqlInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { jql, startAt, maxResults, nextPageToken, outputMode } = parseResult.data;

  try {
    const result = await client.searchJql(jql, { startAt, maxResults, nextPageToken });

    // Determine if we should use compact mode
    const issueCount = result.issues.length;
    const shouldUseCompact =
      outputMode === "compact" ||
      (outputMode === "auto" && issueCount > AUTO_COMPACT_THRESHOLD);
    const isAutoActivated = outputMode === "auto" && issueCount > AUTO_COMPACT_THRESHOLD;

    // Build response with appropriate format
    const response: Record<string, unknown> = {
      issueCount,
      isLast: result.isLast,
      outputMode: shouldUseCompact ? "compact" : "full",
    };

    // Add issues in appropriate format
    if (shouldUseCompact) {
      response["issues"] = result.issues.map(toCompactIssue);
      response["_info"] = getCompactModeMessage(issueCount, isAutoActivated);
    } else {
      response["issues"] = result.issues;
    }

    // Include nextPageToken only if there are more pages
    if (result.nextPageToken) {
      response["nextPageToken"] = result.nextPageToken;
    }

    // Include legacy pagination fields for backwards compatibility
    if (result.total >= 0) {
      response["total"] = result.total;
    }
    response["startAt"] = result.startAt;
    response["maxResults"] = result.maxResults;

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

    // JQL syntax errors or other errors
    return {
      content: [
        {
          type: "text",
          text: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
