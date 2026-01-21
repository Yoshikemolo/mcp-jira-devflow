/**
 * Get Sprint Velocity Tool
 *
 * MCP tool for calculating sprint velocity metrics for a project.
 * Returns aggregated metrics optimized for token usage.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type {
  JiraIssue,
  JiraIssueCompact,
  JiraSprint,
  SprintVelocityEntry,
  SprintVelocitySummary,
} from "../domain/types.js";

/**
 * Output mode for velocity results.
 * - "summary": Only averages and totals (most token-efficient)
 * - "detailed": Per-sprint metrics without issue list
 * - "full": Includes issue list in compact format
 */
export type VelocityOutputMode = "summary" | "detailed" | "full";

/**
 * Maximum number of sprints to analyze.
 */
const MAX_SPRINT_COUNT = 10;

/**
 * Default number of sprints to analyze.
 */
const DEFAULT_SPRINT_COUNT = 5;

/**
 * Threshold for warning about large result sets in full mode.
 */
const LARGE_RESULT_THRESHOLD = 50;

/**
 * Input schema for get_sprint_velocity tool.
 */
export const SprintVelocityInputSchema = z.object({
  projectKey: z
    .string()
    .min(1, "Project key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be alphanumeric and start with a letter")
    .describe("The project key (e.g., 'PROJ')"),
  sprintCount: z
    .number()
    .int()
    .min(1)
    .max(MAX_SPRINT_COUNT)
    .optional()
    .default(DEFAULT_SPRINT_COUNT)
    .describe(`Number of recent closed sprints to analyze (default: ${DEFAULT_SPRINT_COUNT}, max: ${MAX_SPRINT_COUNT})`),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format: 'summary' (averages only), 'detailed' (per-sprint metrics), 'full' (includes issue list)"),
});

export type SprintVelocityInput = z.infer<typeof SprintVelocityInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const sprintVelocityTool = {
  name: "get_sprint_velocity",
  description:
    "Calculates sprint velocity metrics for a project. Returns aggregated metrics to optimize token usage. Analyzes closed sprints and calculates completed vs committed story points.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., 'PROJ')",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      sprintCount: {
        type: "number",
        description: `Number of recent closed sprints to analyze (default: ${DEFAULT_SPRINT_COUNT}, max: ${MAX_SPRINT_COUNT})`,
        minimum: 1,
        maximum: MAX_SPRINT_COUNT,
      },
      outputMode: {
        type: "string",
        enum: ["summary", "detailed", "full"],
        description: "Output format: 'summary' (averages only), 'detailed' (per-sprint metrics), 'full' (includes issue list)",
      },
    },
    required: ["projectKey"],
  },
};

/**
 * Converts a full JiraIssue to compact format for velocity reporting.
 */
function toCompactIssue(issue: JiraIssue): JiraIssueCompact {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    priority: issue.priority?.name,
    assignee: issue.assignee?.displayName,
    issueType: issue.issueType.name,
    storyPoints: issue.storyPoints,
  };
}

/**
 * Groups issues by their sprint ID.
 */
function groupIssuesBySprint(
  issues: readonly JiraIssue[]
): Map<number, { sprint: JiraSprint; issues: JiraIssue[] }> {
  const sprintMap = new Map<number, { sprint: JiraSprint; issues: JiraIssue[] }>();

  for (const issue of issues) {
    // An issue may be associated with multiple sprints; we use the primary sprint
    const sprint = issue.sprint;
    if (!sprint) continue;

    const existing = sprintMap.get(sprint.id);
    if (existing) {
      existing.issues.push(issue);
    } else {
      sprintMap.set(sprint.id, { sprint, issues: [issue] });
    }
  }

  return sprintMap;
}

/**
 * Calculates velocity metrics for a single sprint.
 */
function calculateSprintMetrics(
  sprint: JiraSprint,
  issues: readonly JiraIssue[]
): SprintVelocityEntry {
  let completedPoints = 0;
  let completedIssues = 0;
  let committedPoints = 0;
  let committedIssues = issues.length;

  for (const issue of issues) {
    const points = issue.storyPoints ?? 0;
    committedPoints += points;

    // Consider "done" status category as completed
    if (issue.status.categoryKey === "done") {
      completedPoints += points;
      completedIssues++;
    }
  }

  return {
    sprint,
    completedPoints,
    completedIssues,
    committedPoints,
    committedIssues,
  };
}

/**
 * Fetches all issues from closed sprints for the project.
 * Handles pagination internally.
 */
async function fetchSprintIssues(
  client: JiraClient,
  projectKey: string,
  sprintCount: number
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  let pagesLoaded = 0;
  const maxPages = 10; // Safety limit to prevent infinite loops

  // JQL to find issues in closed sprints for the project
  // We use "sprint in closedSprints()" to get issues from completed sprints
  const jql = `project = "${projectKey}" AND sprint in closedSprints() ORDER BY updated DESC`;

  do {
    const result = await client.searchJql(jql, {
      maxResults: 50,
      nextPageToken,
    });

    allIssues.push(...result.issues);
    nextPageToken = result.nextPageToken;
    pagesLoaded++;

    // Check if we have enough sprints already
    const sprintMap = groupIssuesBySprint(allIssues);
    const closedSprints = Array.from(sprintMap.values())
      .filter(({ sprint }) => sprint.state === "closed")
      .sort((a, b) => {
        // Sort by completeDate descending (most recent first)
        const dateA = a.sprint.completeDate ?? "";
        const dateB = b.sprint.completeDate ?? "";
        return dateB.localeCompare(dateA);
      });

    if (closedSprints.length >= sprintCount) {
      break;
    }
  } while (nextPageToken && pagesLoaded < maxPages);

  return allIssues;
}

/**
 * Calculates the sprint velocity summary.
 */
function calculateVelocitySummary(
  projectKey: string,
  sprintMetrics: readonly SprintVelocityEntry[]
): SprintVelocitySummary {
  const sprintCount = sprintMetrics.length;

  if (sprintCount === 0) {
    return {
      projectKey,
      sprintCount: 0,
      sprints: [],
      averageVelocity: 0,
      averageCompletedIssues: 0,
      totalCompletedPoints: 0,
      totalCompletedIssues: 0,
    };
  }

  const totalCompletedPoints = sprintMetrics.reduce(
    (sum, m) => sum + m.completedPoints,
    0
  );
  const totalCompletedIssues = sprintMetrics.reduce(
    (sum, m) => sum + m.completedIssues,
    0
  );

  return {
    projectKey,
    sprintCount,
    sprints: sprintMetrics,
    averageVelocity: Math.round((totalCompletedPoints / sprintCount) * 10) / 10,
    averageCompletedIssues: Math.round((totalCompletedIssues / sprintCount) * 10) / 10,
    totalCompletedPoints,
    totalCompletedIssues,
  };
}

/**
 * Executes the get_sprint_velocity tool.
 */
export async function executeSprintVelocity(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = SprintVelocityInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKey, sprintCount, outputMode } = parseResult.data;

  try {
    // Fetch issues from closed sprints
    const issues = await fetchSprintIssues(client, projectKey.toUpperCase(), sprintCount);

    // Group issues by sprint
    const sprintMap = groupIssuesBySprint(issues);

    // Filter to closed sprints and sort by completion date
    const closedSprints = Array.from(sprintMap.values())
      .filter(({ sprint }) => sprint.state === "closed")
      .sort((a, b) => {
        const dateA = a.sprint.completeDate ?? "";
        const dateB = b.sprint.completeDate ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, sprintCount);

    // Calculate metrics for each sprint
    const sprintMetrics = closedSprints.map(({ sprint, issues: sprintIssues }) =>
      calculateSprintMetrics(sprint, sprintIssues)
    );

    // Calculate summary
    const summary = calculateVelocitySummary(projectKey.toUpperCase(), sprintMetrics);

    // Build response based on output mode
    const response: Record<string, unknown> = {
      projectKey: summary.projectKey,
      sprintCount: summary.sprintCount,
      averageVelocity: summary.averageVelocity,
      averageCompletedIssues: summary.averageCompletedIssues,
      totalCompletedPoints: summary.totalCompletedPoints,
      totalCompletedIssues: summary.totalCompletedIssues,
      outputMode,
    };

    // Add informational messages
    const infoMessages: string[] = [];

    if (summary.sprintCount === 0) {
      infoMessages.push("No closed sprints found for this project.");
      infoMessages.push("Ensure the project uses Scrum boards with sprints.");
    } else if (summary.sprintCount < sprintCount) {
      infoMessages.push(
        `Only ${summary.sprintCount} closed sprint(s) found (requested ${sprintCount}).`
      );
    }

    // Check if story points are being used
    const hasStoryPoints = issues.some((i) => i.storyPoints !== undefined);
    if (!hasStoryPoints && summary.sprintCount > 0) {
      infoMessages.push(
        "No story points found on issues. Velocity metrics are calculated by issue count only."
      );
      infoMessages.push(
        "If your project uses story points, they may be stored in a different custom field."
      );
    }

    // Add sprint details for detailed and full modes
    if (outputMode !== "summary" && summary.sprintCount > 0) {
      response["sprints"] = sprintMetrics.map((m) => ({
        name: m.sprint.name,
        state: m.sprint.state,
        startDate: m.sprint.startDate,
        endDate: m.sprint.endDate,
        completeDate: m.sprint.completeDate,
        completedPoints: m.completedPoints,
        completedIssues: m.completedIssues,
        committedPoints: m.committedPoints,
        committedIssues: m.committedIssues,
        completionRate:
          m.committedPoints > 0
            ? `${Math.round((m.completedPoints / m.committedPoints) * 100)}%`
            : "N/A",
      }));
    }

    // Add issues for full mode
    if (outputMode === "full" && summary.sprintCount > 0) {
      const allSprintIssues = closedSprints.flatMap(({ issues: i }) => i);

      if (allSprintIssues.length > LARGE_RESULT_THRESHOLD) {
        infoMessages.push(
          `Large result set (${allSprintIssues.length} issues). Consider using 'detailed' mode for better performance.`
        );
      }

      response["issues"] = allSprintIssues.map(toCompactIssue);
    }

    if (infoMessages.length > 0) {
      response["_info"] = infoMessages.join("\n");
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
          text: `Failed to calculate sprint velocity: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
