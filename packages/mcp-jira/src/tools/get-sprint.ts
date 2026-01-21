/**
 * Get Sprint Tool
 *
 * MCP tool for getting sprint details with issues.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import {
  JiraAuthError,
  JiraSprintNotFoundError,
} from "../domain/jira-client.js";
import type { JiraIssue, JiraSprintExtended } from "../domain/types.js";

/**
 * Maximum issues per request.
 */
const MAX_ISSUES = 100;

/**
 * Default issues to include.
 */
const DEFAULT_ISSUES = 50;

/**
 * Threshold for using compact output mode.
 */
const COMPACT_THRESHOLD = 10;

/**
 * Output mode for sprint results.
 */
export type SprintOutputMode = "auto" | "compact" | "full";

/**
 * Input schema for get_sprint tool.
 */
export const GetSprintInputSchema = z.object({
  sprintId: z
    .number()
    .int()
    .positive()
    .describe("The sprint ID (required)"),
  includeIssues: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to include issues in the response (default: true)"),
  maxIssues: z
    .number()
    .int()
    .min(1)
    .max(MAX_ISSUES)
    .optional()
    .default(DEFAULT_ISSUES)
    .describe(`Maximum number of issues to return (default: ${DEFAULT_ISSUES}, max: ${MAX_ISSUES})`),
  jql: z
    .string()
    .optional()
    .describe("Additional JQL filter to apply to issues"),
  outputMode: z
    .enum(["auto", "compact", "full"])
    .optional()
    .default("auto")
    .describe(
      "Output format: 'auto' (compact for >10 issues), 'compact' (minimal fields), 'full' (all fields)"
    ),
});

export type GetSprintInput = z.infer<typeof GetSprintInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const getSprintTool = {
  name: "get_sprint",
  description:
    "Gets sprint details with its issues. Supports JQL filtering and token-optimized output modes. Use outputMode 'compact' for large result sets.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sprintId: {
        type: "number",
        description: "The sprint ID (required)",
      },
      includeIssues: {
        type: "boolean",
        description: "Whether to include issues in the response (default: true)",
      },
      maxIssues: {
        type: "number",
        description: `Maximum number of issues to return (default: ${DEFAULT_ISSUES}, max: ${MAX_ISSUES})`,
        minimum: 1,
        maximum: MAX_ISSUES,
      },
      jql: {
        type: "string",
        description: "Additional JQL filter to apply to issues",
      },
      outputMode: {
        type: "string",
        enum: ["auto", "compact", "full"],
        description:
          "Output format: 'auto' (compact for >10 issues), 'compact' (minimal fields), 'full' (all fields)",
      },
    },
    required: ["sprintId"],
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
    originBoardId: sprint.originBoardId,
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
 * Formats an issue for compact output.
 */
function formatIssueCompact(issue: JiraIssue): Record<string, unknown> {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    assignee: issue.assignee?.displayName,
    storyPoints: issue.storyPoints,
    issueType: issue.issueType.name,
  };
}

/**
 * Formats an issue for full output.
 */
function formatIssueFull(issue: JiraIssue): Record<string, unknown> {
  return {
    key: issue.key,
    summary: issue.summary,
    description: issue.description,
    status: {
      name: issue.status.name,
      category: issue.status.categoryKey,
    },
    priority: issue.priority?.name,
    assignee: issue.assignee
      ? {
          displayName: issue.assignee.displayName,
          accountId: issue.assignee.accountId,
        }
      : undefined,
    reporter: issue.reporter
      ? {
          displayName: issue.reporter.displayName,
          accountId: issue.reporter.accountId,
        }
      : undefined,
    issueType: issue.issueType.name,
    storyPoints: issue.storyPoints,
    labels: issue.labels,
    created: issue.created,
    updated: issue.updated,
  };
}

/**
 * Calculates sprint metrics from issues.
 */
function calculateMetrics(issues: readonly JiraIssue[]): Record<string, unknown> {
  let totalIssues = issues.length;
  let completedIssues = 0;
  let totalPoints = 0;
  let completedPoints = 0;

  for (const issue of issues) {
    const points = issue.storyPoints ?? 0;
    totalPoints += points;

    if (issue.status.categoryKey === "done") {
      completedIssues++;
      completedPoints += points;
    }
  }

  return {
    totalIssues,
    completedIssues,
    remainingIssues: totalIssues - completedIssues,
    totalPoints,
    completedPoints,
    remainingPoints: totalPoints - completedPoints,
    completionPercentage:
      totalIssues > 0
        ? Math.round((completedIssues / totalIssues) * 100)
        : 0,
    pointsCompletionPercentage:
      totalPoints > 0
        ? Math.round((completedPoints / totalPoints) * 100)
        : 0,
  };
}

/**
 * Executes the get_sprint tool.
 */
export async function executeGetSprint(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = GetSprintInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { sprintId, includeIssues, maxIssues, jql, outputMode } =
    parseResult.data;

  try {
    // Get sprint details
    const sprint = await client.getSprint(sprintId);

    const response: Record<string, unknown> = {
      sprint: formatSprint(sprint),
    };

    // Get issues if requested
    if (includeIssues) {
      // Build options object, only including defined values
      const issueOptions: Parameters<typeof client.getSprintIssues>[1] = {
        maxResults: maxIssues,
      };

      if (jql !== undefined) {
        issueOptions.jql = jql;
      }

      const issuesResult = await client.getSprintIssues(sprintId, issueOptions);

      const issues = issuesResult.issues;

      // Calculate metrics
      response["metrics"] = calculateMetrics(issues);

      // Determine output mode
      const effectiveMode =
        outputMode === "auto"
          ? issues.length > COMPACT_THRESHOLD
            ? "compact"
            : "full"
          : outputMode;

      // Format issues based on mode
      const formatIssue =
        effectiveMode === "compact" ? formatIssueCompact : formatIssueFull;

      response["issues"] = issues.map(formatIssue);
      response["issueCount"] = issues.length;
      response["outputMode"] = effectiveMode;

      // Add pagination info if there are more issues
      if (!issuesResult.isLast) {
        response["_info"] =
          `Showing ${issues.length} of ${issuesResult.total > 0 ? issuesResult.total : "more"} issues. ` +
          "Increase maxIssues to see more.";
      }

      // Add info about JQL filter
      if (jql) {
        response["appliedJql"] = jql;
      }
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

    return {
      content: [
        {
          type: "text",
          text: `Failed to get sprint: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
