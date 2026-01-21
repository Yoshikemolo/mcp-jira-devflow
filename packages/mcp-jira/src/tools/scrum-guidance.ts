/**
 * SCRUM Guidance Tool
 *
 * MCP tool for analyzing Jira issues and providing SCRUM best practice
 * recommendations, workflow actions, and follow-up prompts.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraNotFoundError, JiraAuthError } from "../domain/jira-client.js";
import { analyzeIssue } from "../guidance/index.js";
import type { DetailLevel, GuidanceResult } from "../guidance/index.js";

/**
 * Input schema for jira_scrum_guidance tool.
 */
export const ScrumGuidanceInputSchema = z.object({
  issueKey: z
    .string()
    .regex(
      /^[A-Z][A-Z0-9]*-\d+$/i,
      "Issue key must be in format PROJECT-123"
    )
    .describe("The Jira issue key (e.g., PROJ-123)"),
  level: z
    .enum(["minimal", "standard", "verbose"])
    .default("standard")
    .describe(
      "Detail level for guidance: minimal (critical issues only), standard (recommended issues), verbose (all recommendations)"
    ),
});

export type ScrumGuidanceInput = z.infer<typeof ScrumGuidanceInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const scrumGuidanceTool = {
  name: "jira_scrum_guidance",
  description:
    "Analyzes a Jira issue and provides SCRUM best practice recommendations, workflow action suggestions, and contextual follow-up prompts. Helps ensure issues are well-defined and follow agile practices.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., PROJ-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      level: {
        type: "string",
        enum: ["minimal", "standard", "verbose"],
        default: "standard",
        description:
          "Detail level: minimal (critical only), standard (default), verbose (all)",
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Formats the guidance result as a readable text output.
 */
function formatGuidanceResult(result: GuidanceResult): string {
  const lines: string[] = [];

  // Summary section
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Issue:** ${result.summary.issueKey}`);
  lines.push(`- **Type:** ${result.summary.issueType}`);
  lines.push(`- **Status:** ${result.summary.statusCategory}`);
  lines.push(`- **Health Score:** ${result.summary.healthScore}/100`);
  lines.push(`- **Completeness:** ${result.summary.completenessScore}/100`);
  lines.push("");

  // Recommendations section
  if (result.recommendations.length > 0) {
    lines.push("## Recommendations");
    lines.push("");
    for (const rec of result.recommendations) {
      const severityIcon = getSeverityIcon(rec.severity);
      lines.push(`### ${severityIcon} ${rec.title}`);
      lines.push("");
      lines.push(`**Severity:** ${rec.severity} | **Category:** ${rec.category}`);
      lines.push("");
      lines.push(rec.description);
      lines.push("");
      lines.push(`**Suggested Action:** ${rec.suggestedAction}`);
      lines.push("");
    }
  } else {
    lines.push("## Recommendations");
    lines.push("");
    lines.push("No recommendations - this issue follows SCRUM best practices.");
    lines.push("");
  }

  // Workflow Actions section
  if (result.workflowActions.length > 0) {
    lines.push("## Workflow Actions");
    lines.push("");
    for (const action of result.workflowActions) {
      const priorityIcon = getPriorityIcon(action.priority);
      lines.push(`- ${priorityIcon} **${action.action}** (${action.priority})`);
      lines.push(`  - ${action.reason}`);
    }
    lines.push("");
  }

  // Follow-up Prompts section
  if (result.followUpPrompts.length > 0) {
    lines.push("## Follow-up Prompts");
    lines.push("");
    lines.push("Try asking:");
    lines.push("");
    for (const prompt of result.followUpPrompts) {
      lines.push(`- "${prompt.prompt}"`);
      lines.push(`  - *${prompt.description}*`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Gets an icon for severity level.
 */
function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "[CRITICAL]";
    case "high":
      return "[HIGH]";
    case "medium":
      return "[MEDIUM]";
    case "low":
      return "[LOW]";
    case "info":
      return "[INFO]";
    default:
      return "";
  }
}

/**
 * Gets an icon for priority level.
 */
function getPriorityIcon(priority: string): string {
  switch (priority) {
    case "high":
      return "[!]";
    case "medium":
      return "[-]";
    case "low":
      return "[.]";
    default:
      return "";
  }
}

/**
 * Executes the jira_scrum_guidance tool.
 */
export async function executeScrumGuidance(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = ScrumGuidanceInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, level } = parseResult.data;

  try {
    // Fetch the issue
    const issue = await client.getIssue(issueKey);

    // Analyze the issue
    const guidanceResult = analyzeIssue(issue, { level: level as DetailLevel });

    // Format output - include both readable text and JSON
    const formattedText = formatGuidanceResult(guidanceResult);
    const jsonOutput = JSON.stringify(guidanceResult, null, 2);

    return {
      content: [
        {
          type: "text",
          text: `${formattedText}\n---\n\n<details>\n<summary>Raw JSON Output</summary>\n\n\`\`\`json\n${jsonOutput}\n\`\`\`\n</details>`,
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
          text: `Failed to analyze issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
