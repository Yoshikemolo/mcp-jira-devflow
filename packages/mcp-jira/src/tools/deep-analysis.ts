/**
 * Deep Analysis Tool
 *
 * MCP tool that fetches and analyzes related context for a Jira issue.
 * Provides hierarchy analysis, metrics, and anomaly detection.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError, JiraNotFoundError } from "../domain/jira-client.js";
import {
  fetchContext,
  buildHierarchy,
  calculateMetrics,
  detectAnomalies,
  formatAnalysisOutput,
  formatAsJson,
} from "../analysis/index.js";
import type {
  AnalysisDepth,
  AnalysisOutputMode,
  DeepAnalysisResult,
} from "../analysis/index.js";

/**
 * Maximum children limit.
 */
const MAX_CHILDREN_LIMIT = 100;

/**
 * Default children limit.
 */
const DEFAULT_CHILDREN_LIMIT = 50;

/**
 * Input schema for jira_deep_analysis tool.
 */
export const DeepAnalysisInputSchema = z.object({
  issueKey: z
    .string()
    .min(1, "Issue key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Invalid issue key format (e.g., PROJ-123)")
    .describe("The Jira issue key (e.g., EPIC-123)"),
  depth: z
    .enum(["shallow", "standard", "deep"])
    .optional()
    .default("standard")
    .describe("Analysis depth: 'shallow' (root only), 'standard' (immediate children), 'deep' (full traversal)"),
  outputMode: z
    .enum(["summary", "detailed", "full"])
    .optional()
    .default("detailed")
    .describe("Output verbosity: 'summary' (metrics only), 'detailed' (with children), 'full' (all details)"),
  maxChildren: z
    .number()
    .int()
    .min(1)
    .max(MAX_CHILDREN_LIMIT)
    .optional()
    .default(DEFAULT_CHILDREN_LIMIT)
    .describe(`Maximum children to fetch (default: ${DEFAULT_CHILDREN_LIMIT}, max: ${MAX_CHILDREN_LIMIT})`),
  includeLinks: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include linked issues in analysis (default: true)"),
});

export type DeepAnalysisInput = z.infer<typeof DeepAnalysisInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const deepAnalysisTool = {
  name: "jira_deep_analysis",
  description:
    "Analyzes a Jira issue with its related context (parent, children, linked issues). " +
    "Provides hierarchy visualization, aggregated metrics, and detects anomalies like " +
    "story point mismatches, unestimated children, and stale in-progress issues. " +
    "Token-aware output automatically adjusts verbosity for large hierarchies.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., EPIC-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      depth: {
        type: "string",
        enum: ["shallow", "standard", "deep"],
        description:
          "Analysis depth: 'shallow' (root only), 'standard' (immediate children), 'deep' (full traversal)",
      },
      outputMode: {
        type: "string",
        enum: ["summary", "detailed", "full"],
        description:
          "Output verbosity: 'summary' (metrics only), 'detailed' (with children), 'full' (all details)",
      },
      maxChildren: {
        type: "number",
        description: `Maximum children to fetch (default: ${DEFAULT_CHILDREN_LIMIT}, max: ${MAX_CHILDREN_LIMIT})`,
        minimum: 1,
        maximum: MAX_CHILDREN_LIMIT,
      },
      includeLinks: {
        type: "boolean",
        description: "Include linked issues in analysis (default: true)",
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the jira_deep_analysis tool.
 */
export async function executeDeepAnalysis(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = DeepAnalysisInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, depth, outputMode, maxChildren, includeLinks } = parseResult.data;

  try {
    // Fetch context with related issues
    const context = await fetchContext(
      client,
      issueKey.toUpperCase(),
      depth as AnalysisDepth,
      maxChildren,
      includeLinks
    );

    // Build hierarchy from fetched context
    const hierarchy = buildHierarchy(context);

    // Calculate metrics
    const metrics = calculateMetrics(hierarchy);

    // Detect anomalies
    const anomalies = detectAnomalies(hierarchy);

    // Build result
    const result: DeepAnalysisResult = {
      issueKey: issueKey.toUpperCase(),
      hierarchy,
      metrics,
      anomalies,
      tokenLevel: context.tokenLevel,
      outputMode: outputMode as AnalysisOutputMode,
    };

    // Format output
    const formattedOutput = formatAnalysisOutput(result);

    // Add truncation info if applicable
    if (context.truncated && context.truncationInfo) {
      const info = formattedOutput._info
        ? `${formattedOutput._info}. ${context.truncationInfo}`
        : context.truncationInfo;
      (formattedOutput as { _info: string })._info = info;
    }

    // Add parent info to output if available
    if (hierarchy.parent) {
      (formattedOutput.summary as { parent?: string }).parent =
        `${hierarchy.parent.key}: ${hierarchy.parent.summary}`;
    }

    return {
      content: [
        {
          type: "text",
          text: formatAsJson(formattedOutput),
        },
      ],
    };
  } catch (error) {
    if (error instanceof JiraNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Issue '${error.issueKey}' not found. Please verify the issue key is correct.`,
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

    return {
      content: [
        {
          type: "text",
          text: `Failed to analyze issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
