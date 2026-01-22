/**
 * Sprint Predict Tool
 *
 * Predictive analytics for sprint success probability.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue, SprintVelocityEntry, JiraSprint } from "../domain/types.js";
import {
  analyzeTrend,
  predictSprint,
  calculateSpilloverRisk,
  getRiskLevelDescription,
} from "../analysis/velocity/index.js";

/**
 * Input schema for sprint predict tool.
 */
export const SprintPredictInputSchema = z.object({
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
    .describe("Optional sprint ID to analyze. Defaults to active sprint."),
  velocitySprintCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .optional()
    .default(5)
    .describe("Number of recent sprints for prediction (default: 5)"),
  includeIssueRisks: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include per-issue risk assessment (default: true)"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format"),
});

export type SprintPredictInput = z.infer<typeof SprintPredictInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const sprintPredictTool = {
  name: "devflow_sprint_predict",
  description:
    "Predictive analytics for sprint success. Calculates success probability, identifies spillover risks per issue, and provides intervention recommendations.",
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
        description: "Optional sprint ID (defaults to active sprint)",
      },
      velocitySprintCount: {
        type: "number",
        description: "Number of sprints for prediction (default: 5)",
        minimum: 3,
        maximum: 10,
      },
      includeIssueRisks: {
        type: "boolean",
        description: "Include per-issue risk assessment (default: true)",
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
 * Calculates days in current status for an issue.
 */
function estimateDaysInStatus(issue: JiraIssue): number {
  // Use updated date as a proxy for status change
  const updatedDate = new Date(issue.updated);
  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
 * Executes the sprint predict tool.
 */
export async function executeSprintPredict(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = SprintPredictInputSchema.safeParse(input);

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
    sprintId,
    velocitySprintCount,
    includeIssueRisks,
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

    // Fetch current/target sprint issues
    const { sprint, issues } = await fetchSprintIssues(
      client,
      normalizedProjectKey,
      sprintId
    );

    if (!sprint || issues.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                projectKey: normalizedProjectKey,
                error: "No active sprint or issues found",
                recommendation:
                  "Ensure the project has an active sprint with issues assigned",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Analyze trend
    const trend = analyzeTrend(velocityHistory, {
      sprintCount: velocitySprintCount,
    });

    // Generate prediction
    const prediction = predictSprint(velocityHistory, issues, {
      velocitySprintCount,
    });

    // Calculate per-issue risks if requested
    const issueRisks = includeIssueRisks
      ? issues.map((issue) =>
          calculateSpilloverRisk(
            issue,
            estimateDaysInStatus(issue),
            false, // Would need link data to detect external dependencies
            0 // Would need history to know previous spillovers
          )
        )
      : [];

    // Build response
    const response: Record<string, unknown> = {
      projectKey: normalizedProjectKey,
      outputMode,
    };

    // Sprint info
    response["sprint"] = {
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    };

    // Prediction summary
    response["prediction"] = {
      successProbability: `${Math.round(prediction.successProbability * 100)}%`,
      successLevel:
        prediction.successProbability >= 0.85
          ? "High"
          : prediction.successProbability >= 0.7
            ? "Medium"
            : "Low",
      predictedVelocity: prediction.predictedVelocity,
      predictionRange: `${prediction.lowerBound} - ${prediction.upperBound}`,
      confidence: `${Math.round(prediction.confidence * 100)}%`,
    };

    // Current sprint load
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const completedPoints = issues
      .filter((i) => i.status.categoryKey === "done")
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const inProgressPoints = issues
      .filter((i) => i.status.categoryKey === "indeterminate")
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    response["sprintStatus"] = {
      totalPoints,
      completedPoints,
      inProgressPoints,
      remainingPoints: totalPoints - completedPoints,
      completionPercentage: `${Math.round((completedPoints / totalPoints) * 100)}%`,
      loadVsRecommended: `${Math.round((totalPoints / prediction.recommendedLoad) * 100)}%`,
    };

    // Risk summary
    const highRiskIssues = issueRisks.filter(
      (r) => r.riskLevel === "high" || r.riskLevel === "critical"
    );
    const mediumRiskIssues = issueRisks.filter((r) => r.riskLevel === "medium");

    response["riskSummary"] = {
      criticalRiskCount: issueRisks.filter((r) => r.riskLevel === "critical")
        .length,
      highRiskCount: highRiskIssues.length,
      mediumRiskCount: mediumRiskIssues.length,
      lowRiskCount: issueRisks.filter((r) => r.riskLevel === "low").length,
    };

    // Risk factors
    if (prediction.riskFactors.length > 0) {
      response["riskFactors"] = prediction.riskFactors;
    }

    // Recommendations
    const recommendations: string[] = [...prediction.recommendations];

    // Add intervention recommendations based on progress
    if (sprint.startDate && sprint.endDate) {
      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const now = new Date();
      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const progressRatio = elapsedDays / totalDays;
      const completionRatio = completedPoints / totalPoints;

      if (progressRatio > 0.5 && completionRatio < 0.3) {
        recommendations.push(
          "Sprint is past halfway but less than 30% complete - consider scope reduction"
        );
      }
      if (progressRatio > 0.7 && inProgressPoints > completedPoints) {
        recommendations.push(
          "Focus on completing in-progress items before starting new work"
        );
      }
    }

    if (highRiskIssues.length > 2) {
      recommendations.push(
        "Multiple high-risk items detected - prioritize resolving blockers"
      );
    }

    response["recommendations"] = recommendations;

    // Detailed output - add issue risks
    if (outputMode !== "summary" && includeIssueRisks) {
      // Sort by risk score descending
      const sortedRisks = [...issueRisks].sort(
        (a, b) => b.riskScore - a.riskScore
      );

      response["issueRisks"] = sortedRisks.map((risk) => ({
        key: risk.issueKey,
        summary: risk.summary.slice(0, 60),
        points: risk.storyPoints,
        riskLevel: risk.riskLevel,
        riskScore: risk.riskScore,
        daysInStatus: risk.daysInStatus,
        factors: risk.riskFactors,
      }));
    }

    // Full output - add velocity context
    if (outputMode === "full") {
      response["velocityContext"] = {
        sprintsAnalyzed: trend.sprintCount,
        averageVelocity: trend.average,
        trendDirection: trend.direction,
        varianceCoefficient: `${trend.varianceCoefficient.toFixed(1)}%`,
      };

      // Add suggested interventions for high-risk items
      if (highRiskIssues.length > 0) {
        response["suggestedInterventions"] = highRiskIssues.map((risk) => ({
          issue: risk.issueKey,
          riskLevel: risk.riskLevel,
          description: getRiskLevelDescription(risk.riskLevel),
          action:
            risk.daysInStatus > 3
              ? "Check for blockers and reassign if needed"
              : "Monitor progress closely",
        }));
      }
    }

    // Info messages
    const infoMessages: string[] = [];
    if (velocityHistory.length < 3) {
      infoMessages.push(
        "Limited velocity data reduces prediction accuracy"
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
          text: `Failed to predict sprint success: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
