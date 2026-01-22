/**
 * Capacity Forecast Tool
 *
 * Team capacity forecasting based on velocity history and team composition.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue, SprintVelocityEntry, JiraSprint } from "../domain/types.js";
import {
  forecastCapacity,
  getCapacitySummary,
  getSeasonalAdjustment,
} from "../analysis/velocity/index.js";

/**
 * Input schema for capacity forecast tool.
 */
export const CapacityForecastInputSchema = z.object({
  projectKey: z
    .string()
    .min(1, "Project key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be alphanumeric")
    .describe("The project key (e.g., 'PROJ')"),
  sprintDays: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(10)
    .describe("Sprint duration in days (default: 10)"),
  velocitySprintCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .optional()
    .default(5)
    .describe("Number of recent sprints for calculation (default: 5)"),
  meetingOverhead: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .default(0.15)
    .describe("Meeting overhead percentage (default: 0.15 = 15%)"),
  bufferPercentage: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .default(0.1)
    .describe("Buffer percentage for planning (default: 0.1 = 10%)"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format"),
});

export type CapacityForecastInput = z.infer<typeof CapacityForecastInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const capacityForecastTool = {
  name: "devflow_capacity_forecast",
  description:
    "Team capacity forecasting based on historical velocity. Calculates recommended sprint load with configurable buffers and meeting overhead adjustments.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., 'PROJ')",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      sprintDays: {
        type: "number",
        description: "Sprint duration in days (default: 10)",
        minimum: 1,
        maximum: 30,
      },
      velocitySprintCount: {
        type: "number",
        description: "Number of recent sprints for calculation (default: 5)",
        minimum: 3,
        maximum: 10,
      },
      meetingOverhead: {
        type: "number",
        description: "Meeting overhead percentage 0-0.5 (default: 0.15)",
        minimum: 0,
        maximum: 0.5,
      },
      bufferPercentage: {
        type: "number",
        description: "Buffer percentage 0-0.5 (default: 0.1)",
        minimum: 0,
        maximum: 0.5,
      },
      outputMode: {
        type: "string",
        enum: ["summary", "detailed", "full"],
        description: "Output format",
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

  return Array.from(sprintMap.values())
    .filter(({ sprint }) => sprint.state === "closed")
    .sort((a, b) => {
      const dateA = a.sprint.completeDate ?? "";
      const dateB = b.sprint.completeDate ?? "";
      return dateA.localeCompare(dateB);
    })
    .slice(-sprintCount)
    .map(({ sprint, issues }) => {
      let completedPoints = 0;
      let committedPoints = 0;
      let completedIssues = 0;

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
    });
}

/**
 * Executes the capacity forecast tool.
 */
export async function executeCapacityForecast(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = CapacityForecastInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const {
    projectKey,
    sprintDays,
    velocitySprintCount,
    meetingOverhead,
    bufferPercentage,
    outputMode,
  } = parseResult.data;
  const normalizedProjectKey = projectKey.toUpperCase();

  try {
    // Fetch velocity history
    const velocityHistory = await fetchVelocityHistory(
      client,
      normalizedProjectKey,
      velocitySprintCount
    );

    // Calculate capacity forecast
    const forecast = forecastCapacity(undefined, {
      sprintDays,
      meetingOverhead,
      bufferPercentage,
      velocitySprints: velocityHistory,
    });

    // Get seasonal adjustment for current date
    const now = new Date();
    const sprintEnd = new Date(now.getTime() + sprintDays * 24 * 60 * 60 * 1000);
    const seasonalAdj = getSeasonalAdjustment(now, sprintEnd);

    // Build response
    const response: Record<string, unknown> = {
      projectKey: normalizedProjectKey,
      outputMode,
    };

    // Capacity forecast
    response["capacity"] = {
      sprintDays,
      effectiveCapacity: `${forecast.effectiveCapacity} person-days`,
      meetingOverhead: `${Math.round(meetingOverhead * 100)}%`,
      bufferPercentage: `${Math.round(bufferPercentage * 100)}%`,
    };

    // Point recommendations
    response["pointRecommendations"] = {
      recommendedLoad: forecast.recommendedPoints,
      maxSafeLoad: forecast.maxPoints,
      pointsPerPersonDay: forecast.pointsPerPersonDay,
      confidence: `${Math.round(forecast.confidence * 100)}%`,
    };

    // Velocity-based calculation
    if (velocityHistory.length > 0) {
      const avgVelocity =
        velocityHistory.reduce((sum, v) => sum + v.completedPoints, 0) /
        velocityHistory.length;

      response["velocityBasis"] = {
        sprintsAnalyzed: velocityHistory.length,
        averageVelocity: Math.round(avgVelocity * 10) / 10,
      };
    }

    // Seasonal adjustment
    if (seasonalAdj.factor !== 1.0) {
      response["seasonalAdjustment"] = {
        factor: seasonalAdj.factor,
        reason: seasonalAdj.reason,
        adjustedRecommendation: Math.round(
          forecast.recommendedPoints * seasonalAdj.factor * 10
        ) / 10,
      };
    }

    // Detailed output
    if (outputMode !== "summary") {
      response["summary"] = getCapacitySummary(forecast);
      response["factors"] = forecast.factors;

      // Planning scenarios
      response["planningScenarios"] = {
        conservative: {
          load: Math.round(forecast.recommendedPoints * 0.8 * 10) / 10,
          description: "80% of recommended - lower risk, buffer for unknowns",
        },
        standard: {
          load: forecast.recommendedPoints,
          description: "Recommended load with standard buffer",
        },
        aggressive: {
          load: Math.round(forecast.maxPoints * 0.95 * 10) / 10,
          description: "95% of max - higher risk, experienced teams only",
        },
      };
    }

    // Full output - add velocity history
    if (outputMode === "full" && velocityHistory.length > 0) {
      response["sprintHistory"] = velocityHistory.map((v) => ({
        sprint: v.sprint.name,
        completedPoints: v.completedPoints,
        committedPoints: v.committedPoints,
        completionRate:
          v.committedPoints > 0
            ? `${Math.round((v.completedPoints / v.committedPoints) * 100)}%`
            : "N/A",
        date: v.sprint.completeDate,
      }));
    }

    // Recommendations
    const recommendations: string[] = [];

    if (velocityHistory.length < 3) {
      recommendations.push(
        "Collect more sprint data for accurate forecasting (minimum 3 sprints)"
      );
    }
    if (forecast.confidence < 0.6) {
      recommendations.push(
        "Low confidence in forecast - use conservative planning"
      );
    }
    if (seasonalAdj.factor < 1) {
      recommendations.push(
        `Consider seasonal adjustment: ${seasonalAdj.reason}`
      );
    }

    if (recommendations.length > 0) {
      response["recommendations"] = recommendations;
    }

    // Info messages
    const infoMessages: string[] = [];
    if (velocityHistory.length === 0) {
      infoMessages.push("No velocity history found. Using default assumptions.");
    } else if (velocityHistory.length < velocitySprintCount) {
      infoMessages.push(
        `Only ${velocityHistory.length} closed sprint(s) available (requested ${velocitySprintCount}).`
      );
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
          text: `Failed to forecast capacity: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
