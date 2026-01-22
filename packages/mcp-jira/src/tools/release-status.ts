/**
 * Release Status Tool
 *
 * Tracks release progress across deployment environments.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue } from "../domain/types.js";
import {
  getReleaseStatus,
  getDeploymentHealth,
  calculateReleaseProgress,
} from "../analysis/cicd/index.js";

/**
 * Input schema for release status tool.
 */
export const ReleaseStatusInputSchema = z.object({
  projectKey: z
    .string()
    .min(1, "Project key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be alphanumeric")
    .describe("The project key (e.g., 'PROJ')"),
  version: z
    .string()
    .optional()
    .describe("Filter by fix version"),
  sprintId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by sprint ID"),
  targetEnvironment: z
    .enum(["development", "staging", "production", "qa"])
    .optional()
    .default("production")
    .describe("Target environment for progress tracking"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format"),
});

export type ReleaseStatusInput = z.infer<typeof ReleaseStatusInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const releaseStatusTool = {
  name: "devflow_release_status",
  description:
    "Tracks release progress across deployment environments. Shows which issues have been deployed where, identifies blockers, and provides release recommendations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., 'PROJ')",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      version: {
        type: "string",
        description: "Filter by fix version",
      },
      sprintId: {
        type: "number",
        description: "Filter by sprint ID",
      },
      targetEnvironment: {
        type: "string",
        enum: ["development", "staging", "production", "qa"],
        description: "Target environment for progress tracking",
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
 * Fetches issues for release tracking.
 */
async function fetchReleaseIssues(
  client: JiraClient,
  projectKey: string,
  version?: string,
  sprintId?: number
): Promise<JiraIssue[]> {
  const conditions: string[] = [`project = "${projectKey}"`];

  if (version) {
    conditions.push(`fixVersion = "${version}"`);
  }

  if (sprintId) {
    conditions.push(`sprint = ${sprintId}`);
  }

  // Get issues that are in progress or done
  conditions.push('status in ("In Progress", "In Review", "Done")');

  const jql = conditions.join(" AND ") + " ORDER BY status DESC, priority DESC";

  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  let pagesLoaded = 0;

  do {
    const result = await client.searchJql(jql, {
      maxResults: 50,
      nextPageToken,
    });

    allIssues.push(...result.issues);
    nextPageToken = result.nextPageToken;
    pagesLoaded++;
  } while (nextPageToken && pagesLoaded < 4);

  return allIssues;
}

/**
 * Executes the release status tool.
 */
export async function executeReleaseStatus(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = ReleaseStatusInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKey, version, sprintId, targetEnvironment, outputMode } = parseResult.data;
  const normalizedProjectKey = projectKey.toUpperCase();

  try {
    // Fetch issues for the release
    const issues = await fetchReleaseIssues(
      client,
      normalizedProjectKey,
      version,
      sprintId
    );

    if (issues.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                projectKey: normalizedProjectKey,
                version,
                sprintId,
                message: "No issues found matching the criteria",
                recommendation: "Adjust version or sprint filter",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const issueKeys = issues.map((i) => i.key);

    // Get release status
    const status = getReleaseStatus(
      normalizedProjectKey,
      version ?? `Sprint ${sprintId ?? "current"}`,
      issueKeys
    );

    // Get deployment health
    const health = getDeploymentHealth();

    // Calculate progress
    const progress = calculateReleaseProgress(issueKeys, targetEnvironment as any);

    // Build response
    const response: Record<string, unknown> = {
      projectKey: normalizedProjectKey,
      version: version ?? undefined,
      sprintId: sprintId ?? undefined,
      targetEnvironment,
      outputMode,
    };

    // Progress summary
    response["progress"] = {
      totalIssues: status.totalIssues,
      progressPercentage: `${status.progressPercentage}%`,
      byEnvironment: {
        development: status.inDevelopment,
        staging: status.inStaging,
        production: status.inProduction,
      },
    };

    // Issues breakdown by status
    const doneIssues = issues.filter((i) => i.status.categoryKey === "done");
    const inProgressIssues = issues.filter((i) => i.status.categoryKey === "indeterminate");

    response["issueStatus"] = {
      done: doneIssues.length,
      inProgress: inProgressIssues.length,
      total: issues.length,
    };

    // Blockers
    if (status.blockers.length > 0) {
      response["blockers"] = {
        count: status.blockers.length,
        issues: status.blockers.slice(0, 10),
      };
    }

    // Environment health
    response["environmentHealth"] = Object.fromEntries(
      Object.entries(health).map(([env, info]) => [
        env,
        {
          status: info.status,
          successRate: `${info.successRate}%`,
          lastDeployment: info.lastDeployment,
        },
      ])
    );

    // Recommendations
    if (status.recommendations.length > 0) {
      response["recommendations"] = status.recommendations;
    }

    // Detailed output - add environment breakdown
    if (outputMode !== "summary") {
      response["environments"] = progress.environments.map((env) => ({
        name: env.environment,
        deployedIssues: env.deploymentCount,
        lastDeployment: env.lastDeployedAt,
        status: env.lastStatus,
        health: env.health,
      }));
    }

    // Full output - add issue list
    if (outputMode === "full") {
      response["issues"] = issues.map((i) => ({
        key: i.key,
        summary: i.summary.slice(0, 60),
        status: i.status.name,
        type: i.issueType.name,
        points: i.storyPoints,
        assignee: i.assignee?.displayName,
      }));

      if (progress.pendingIssues.length > 0) {
        response["pendingDeployment"] = progress.pendingIssues;
      }
    }

    // Release readiness
    const isReadyForRelease =
      status.progressPercentage >= 80 &&
      status.blockers.length === 0 &&
      health["staging"]?.status === "success";

    response["releaseReadiness"] = {
      ready: isReadyForRelease,
      progressMet: status.progressPercentage >= 80,
      noBlockers: status.blockers.length === 0,
      stagingHealthy: health["staging"]?.status === "success",
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

    return {
      content: [
        {
          type: "text",
          text: `Failed to get release status: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
