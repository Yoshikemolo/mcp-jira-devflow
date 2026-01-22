/**
 * Sprint Plan Tool
 *
 * AI-powered sprint planning with velocity-based recommendations.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue, SprintVelocityEntry, JiraSprint } from "../domain/types.js";
import {
  analyzeTrend,
  predictSprint,
  forecastCapacity,
  getTrendDescription,
  getTrendRecommendations,
} from "../analysis/velocity/index.js";

/**
 * Output modes for sprint plan results.
 */
export type SprintPlanOutputMode = "summary" | "detailed" | "full";

/**
 * Input schema for sprint plan tool.
 */
export const SprintPlanInputSchema = z.object({
  projectKey: z
    .string()
    .min(1, "Project key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be alphanumeric")
    .describe("The project key (e.g., 'PROJ')"),
  sprintId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional sprint ID to analyze. If not provided, analyzes the active sprint."),
  velocitySprintCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .optional()
    .default(5)
    .describe("Number of recent sprints for velocity analysis (default: 5)"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format: 'summary' (recommendations only), 'detailed' (with metrics), 'full' (includes issues)"),
});

export type SprintPlanInput = z.infer<typeof SprintPlanInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const sprintPlanTool = {
  name: "devflow_sprint_plan",
  description:
    "AI-powered sprint planning with velocity-based recommendations. Analyzes historical velocity, predicts capacity, assesses risks, and provides actionable planning guidance.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., 'PROJ')",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      sprintId: {
        type: "number",
        description: "Optional sprint ID to analyze (defaults to active sprint)",
      },
      velocitySprintCount: {
        type: "number",
        description: "Number of recent sprints for velocity analysis (default: 5, max: 10)",
        minimum: 3,
        maximum: 10,
      },
      outputMode: {
        type: "string",
        enum: ["summary", "detailed", "full"],
        description: "Output format: 'summary', 'detailed', or 'full'",
      },
    },
    required: ["projectKey"],
  },
};

/**
 * Groups issues by sprint.
 */
function groupIssuesBySprint(
  issues: readonly JiraIssue[]
): Map<number, { sprint: JiraSprint; issues: JiraIssue[] }> {
  const sprintMap = new Map<number, { sprint: JiraSprint; issues: JiraIssue[] }>();

  for (const issue of issues) {
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
 * Calculates velocity for a sprint.
 */
function calculateSprintVelocity(
  sprint: JiraSprint,
  issues: readonly JiraIssue[]
): SprintVelocityEntry {
  let completedPoints = 0;
  let completedIssues = 0;
  let committedPoints = 0;

  for (const issue of issues) {
    const points = issue.storyPoints ?? 0;
    committedPoints += points;

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
    committedIssues: issues.length,
  };
}

/**
 * Fetches velocity history for the project.
 */
async function fetchVelocityHistory(
  client: JiraClient,
  projectKey: string,
  sprintCount: number
): Promise<SprintVelocityEntry[]> {
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  let pagesLoaded = 0;
  const maxPages = 10;

  const jql = `project = "${projectKey}" AND sprint in closedSprints() ORDER BY updated DESC`;

  do {
    const result = await client.searchJql(jql, {
      maxResults: 50,
      nextPageToken,
    });

    allIssues.push(...result.issues);
    nextPageToken = result.nextPageToken;
    pagesLoaded++;

    const sprintMap = groupIssuesBySprint(allIssues);
    const closedSprints = Array.from(sprintMap.values()).filter(
      ({ sprint }) => sprint.state === "closed"
    );

    if (closedSprints.length >= sprintCount) {
      break;
    }
  } while (nextPageToken && pagesLoaded < maxPages);

  const sprintMap = groupIssuesBySprint(allIssues);

  const velocityEntries = Array.from(sprintMap.values())
    .filter(({ sprint }) => sprint.state === "closed")
    .sort((a, b) => {
      const dateA = a.sprint.completeDate ?? "";
      const dateB = b.sprint.completeDate ?? "";
      return dateA.localeCompare(dateB);
    })
    .slice(-sprintCount)
    .map(({ sprint, issues }) => calculateSprintVelocity(sprint, issues));

  return velocityEntries;
}

/**
 * Fetches issues for a sprint.
 */
async function fetchSprintIssues(
  client: JiraClient,
  projectKey: string,
  sprintId?: number
): Promise<{ sprint: JiraSprint | null; issues: JiraIssue[] }> {
  const sprintClause = sprintId
    ? `sprint = ${sprintId}`
    : "sprint in openSprints()";

  const jql = `project = "${projectKey}" AND ${sprintClause}`;

  const result = await client.searchJql(jql, { maxResults: 100 });

  if (result.issues.length === 0) {
    return { sprint: null, issues: [] };
  }

  const firstIssue = result.issues[0];
  const sprint = firstIssue?.sprint ?? null;
  return { sprint, issues: [...result.issues] };
}

/**
 * Executes the sprint plan tool.
 */
export async function executeSprintPlan(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = SprintPlanInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKey, sprintId, velocitySprintCount, outputMode } = parseResult.data;
  const normalizedProjectKey = projectKey.toUpperCase();

  try {
    // Fetch velocity history
    const velocityHistory = await fetchVelocityHistory(
      client,
      normalizedProjectKey,
      velocitySprintCount
    );

    // Fetch current/target sprint issues
    const { sprint, issues } = await fetchSprintIssues(
      client,
      normalizedProjectKey,
      sprintId
    );

    // Analyze trend
    const trend = analyzeTrend(velocityHistory, {
      sprintCount: velocitySprintCount,
    });

    // Generate prediction
    const prediction = predictSprint(velocityHistory, issues, {
      velocitySprintCount,
      bufferPercentage: 0.1,
    });

    // Forecast capacity (available for future expansion)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void forecastCapacity(undefined, {
      velocitySprints: velocityHistory,
    });

    // Build response
    const response: Record<string, unknown> = {
      projectKey: normalizedProjectKey,
      outputMode,
    };

    // Sprint info
    if (sprint) {
      response["sprint"] = {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        goal: sprint.goal,
      };
    }

    // Velocity analysis
    response["velocityAnalysis"] = {
      sprintsAnalyzed: trend.sprintCount,
      averageVelocity: trend.average,
      weightedAverage: trend.weightedAverage,
      trendDirection: trend.direction,
      trendDescription: getTrendDescription(trend),
      confidence: `${Math.round(trend.confidence * 100)}%`,
    };

    // Prediction
    response["prediction"] = {
      predictedVelocity: prediction.predictedVelocity,
      predictionRange: `${prediction.lowerBound} - ${prediction.upperBound}`,
      recommendedLoad: prediction.recommendedLoad,
      maxSafeLoad: prediction.maxSafeLoad,
      successProbability: `${Math.round(prediction.successProbability * 100)}%`,
    };

    // Current sprint status
    if (issues.length > 0) {
      const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
      const completedPoints = issues
        .filter((i) => i.status.categoryKey === "done")
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

      response["currentLoad"] = {
        plannedPoints: totalPoints,
        completedPoints,
        remainingPoints: totalPoints - completedPoints,
        issueCount: issues.length,
        loadVsRecommended: `${Math.round((totalPoints / prediction.recommendedLoad) * 100)}%`,
      };
    }

    // Recommendations
    const allRecommendations = [
      ...prediction.recommendations,
      ...getTrendRecommendations(trend),
    ];

    // Risk factors
    if (prediction.riskFactors.length > 0 || trend.direction === "decreasing") {
      response["riskFactors"] = prediction.riskFactors;
    }

    response["recommendations"] = allRecommendations;

    // Detailed output - add sprint history
    if (outputMode !== "summary" && velocityHistory.length > 0) {
      response["velocityHistory"] = velocityHistory.map((v) => ({
        sprint: v.sprint.name,
        completed: v.completedPoints,
        committed: v.committedPoints,
        completionRate:
          v.committedPoints > 0
            ? `${Math.round((v.completedPoints / v.committedPoints) * 100)}%`
            : "N/A",
      }));
    }

    // Full output - add issue breakdown
    if (outputMode === "full" && issues.length > 0) {
      response["sprintIssues"] = issues.map((i) => ({
        key: i.key,
        summary: i.summary.slice(0, 80),
        status: i.status.name,
        points: i.storyPoints,
        assignee: i.assignee?.displayName,
      }));

      // Issue risks
      if (prediction.issueRisks && prediction.issueRisks.length > 0) {
        const highRiskIssues = prediction.issueRisks.filter(
          (r) => r.riskLevel === "high" || r.riskLevel === "critical"
        );
        if (highRiskIssues.length > 0) {
          response["highRiskIssues"] = highRiskIssues.map((r) => ({
            key: r.issueKey,
            riskLevel: r.riskLevel,
            riskScore: r.riskScore,
            factors: r.riskFactors,
          }));
        }
      }
    }

    // Info messages
    const infoMessages: string[] = [];
    if (velocityHistory.length < velocitySprintCount) {
      infoMessages.push(
        `Only ${velocityHistory.length} closed sprint(s) found (requested ${velocitySprintCount}).`
      );
    }
    if (!sprint) {
      infoMessages.push("No active sprint found. Showing general planning recommendations.");
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
          text: `Failed to generate sprint plan: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
