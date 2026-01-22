/**
 * Dependency Map Tool
 *
 * Cross-project dependency visualization and risk analysis.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssueExtended } from "../domain/types.js";
import {
  buildDependencyGraph,
  getDependencyGraphSummary,
  getProjectRiskScore,
  getRiskRecommendations,
  getUnblockPriorities,
} from "../analysis/dependencies/index.js";

/**
 * Input schema for dependency map tool.
 */
export const DependencyMapInputSchema = z.object({
  projectKeys: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]*$/i))
    .min(1, "At least one project key required")
    .max(5, "Maximum 5 projects")
    .describe("Project keys to analyze (e.g., ['PROJ', 'INFRA'])"),
  linkTypes: z
    .array(z.string())
    .optional()
    .describe("Link types to include (default: blocking types only)"),
  detectCycles: z
    .boolean()
    .optional()
    .default(true)
    .describe("Detect circular dependencies (default: true)"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output format"),
});

export type DependencyMapInput = z.infer<typeof DependencyMapInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const dependencyMapTool = {
  name: "devflow_dependency_map",
  description:
    "Cross-project dependency visualization and risk analysis. Builds a dependency graph, detects cycles, identifies blocking chains, and calculates cascade risks.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKeys: {
        type: "array",
        items: { type: "string", pattern: "^[A-Z][A-Z0-9]*$" },
        description: "Project keys to analyze (e.g., ['PROJ', 'INFRA'])",
        minItems: 1,
        maxItems: 5,
      },
      linkTypes: {
        type: "array",
        items: { type: "string" },
        description: "Link types to include (default: blocking types)",
      },
      detectCycles: {
        type: "boolean",
        description: "Detect circular dependencies (default: true)",
      },
      outputMode: {
        type: "string",
        enum: ["summary", "detailed", "full"],
        description: "Output format",
      },
    },
    required: ["projectKeys"],
  },
};

/**
 * Fetches issues with links for the given projects.
 */
async function fetchProjectIssues(
  client: JiraClient,
  projectKeys: readonly string[]
): Promise<JiraIssueExtended[]> {
  const allIssues: JiraIssueExtended[] = [];

  for (const projectKey of projectKeys) {
    let nextPageToken: string | undefined;
    let pagesLoaded = 0;
    const maxPages = 10;

    // Get issues with issue links
    const jql = `project = "${projectKey}" AND issuelinks IS NOT EMPTY ORDER BY priority DESC, updated DESC`;

    do {
      const result = await client.searchJql(jql, {
        maxResults: 50,
        nextPageToken,
      });

      // Fetch extended issue data with links
      for (const issue of result.issues) {
        try {
          const extendedIssue = await client.getIssueExtended(issue.key);
          if (extendedIssue) {
            allIssues.push(extendedIssue);
          }
        } catch {
          // Skip issues that can't be fetched
        }
      }

      nextPageToken = result.nextPageToken;
      pagesLoaded++;
    } while (nextPageToken && pagesLoaded < maxPages);
  }

  return allIssues;
}

/**
 * Executes the dependency map tool.
 */
export async function executeDependencyMap(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = DependencyMapInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKeys, linkTypes, detectCycles, outputMode } = parseResult.data;
  const normalizedProjectKeys = projectKeys.map((k) => k.toUpperCase());

  try {
    // Fetch issues with links
    const issues = await fetchProjectIssues(client, normalizedProjectKeys);

    if (issues.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                projectKeys: normalizedProjectKeys,
                message: "No issues with dependencies found in the specified projects",
                recommendation: "Ensure the projects have issues with issue links",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Build dependency graph
    const graph = buildDependencyGraph(issues, {
      projectKeys: normalizedProjectKeys,
      linkTypes: linkTypes as any,
      detectCycles,
      calculateCascadeRisks: true,
    });

    // Get summary
    const summary = getDependencyGraphSummary(graph);

    // Get risk assessment
    const riskScore = getProjectRiskScore(graph.cascadeRisks);

    // Build response
    const response: Record<string, unknown> = {
      projectKeys: normalizedProjectKeys,
      outputMode,
    };

    // Summary section
    response["summary"] = {
      issuesAnalyzed: summary.nodeCount,
      dependencyLinks: summary.edgeCount,
      blockingLinks: summary.blockingEdgeCount,
      unresolvedBlocking: summary.unresolvedBlockingCount,
      circularDependencies: summary.cycleCount,
      longestBlockingChain: summary.longestChainLength,
      criticalBlockers: summary.criticalNodeCount,
    };

    // Risk assessment
    response["riskAssessment"] = {
      score: riskScore.score,
      level: riskScore.level,
      description: riskScore.description,
    };

    // Unblock priorities
    if (graph.cascadeRisks.length > 0) {
      const priorities = getUnblockPriorities(graph.cascadeRisks, 5);
      if (priorities.length > 0) {
        response["unblockPriorities"] = priorities;
      }
    }

    // Circular dependencies
    if (graph.cycles.length > 0) {
      response["circularDependencies"] = graph.cycles.map((c) => ({
        path: c.path,
        length: c.length,
        description: c.description,
      }));
    }

    // Blocking chains (top 5)
    if (graph.blockingChains.length > 0) {
      response["blockingChains"] = graph.blockingChains.slice(0, 5).map((c) => ({
        chain: c.chain,
        length: c.length,
        rootBlocker: c.rootBlocker,
        isRootResolved: c.isRootResolved,
        blockedPoints: c.blockedPoints,
      }));
    }

    // Recommendations
    const recommendations = getRiskRecommendations(graph.cascadeRisks);
    if (recommendations.length > 0) {
      response["recommendations"] = recommendations;
    }

    // Detailed output - add cascade risks
    if (outputMode !== "summary" && graph.cascadeRisks.length > 0) {
      response["cascadeRisks"] = graph.cascadeRisks.slice(0, 10).map((r) => ({
        issueKey: r.issueKey,
        riskLevel: r.riskLevel,
        directlyBlocked: r.directlyBlocked,
        transitivelyBlocked: r.transitivelyBlocked,
        pointsAtRisk: r.pointsAtRisk,
      }));
    }

    // Full output - add all nodes and edges
    if (outputMode === "full") {
      // Critical path nodes
      response["criticalPathNodes"] = graph.criticalPathNodes.map((key) => {
        const node = graph.nodes.find((n) => n.key === key);
        return node
          ? {
              key: node.key,
              summary: node.summary.slice(0, 60),
              status: node.status,
              inDegree: node.inDegree,
              outDegree: node.outDegree,
            }
          : { key };
      });

      // All edges (limited to 50)
      const edgeLimit = 50;
      response["dependencyEdges"] = graph.edges.slice(0, edgeLimit).map((e) => ({
        from: e.from,
        to: e.to,
        type: e.type,
        isBlocking: e.isBlocking,
        isResolved: e.isResolved,
        riskLevel: e.riskLevel,
      }));

      if (graph.edges.length > edgeLimit) {
        response["_edgeTruncated"] = `Showing ${edgeLimit} of ${graph.edges.length} edges`;
      }
    }

    // Cross-project summary
    if (normalizedProjectKeys.length > 1) {
      const crossProjectEdges = graph.edges.filter((e) => {
        const fromProject = e.from.split("-")[0];
        const toProject = e.to.split("-")[0];
        return fromProject !== toProject;
      });

      response["crossProjectDependencies"] = {
        count: crossProjectEdges.length,
        blockingCount: crossProjectEdges.filter((e) => e.isBlocking).length,
        projects: normalizedProjectKeys,
      };
    }

    // Info messages
    const infoMessages: string[] = [];
    if (issues.length > 100) {
      infoMessages.push(
        `Analyzed ${issues.length} issues - results may be limited for large graphs`
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
          text: `Failed to build dependency map: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
