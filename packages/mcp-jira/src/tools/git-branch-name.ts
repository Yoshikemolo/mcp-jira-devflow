/**
 * Git Branch Name Tool
 *
 * Generates branch names from Jira issues.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError, JiraNotFoundError } from "../domain/jira-client.js";
import {
  generateBranchName,
  getBranchTypes,
  getProjectBranchPattern,
  type BranchType,
} from "../git/index.js";

/**
 * Input schema for git branch name tool.
 */
export const GitBranchNameInputSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Issue key must be in format PROJECT-123")
    .describe("Jira issue key (e.g., PROJECT-123)"),
  type: z
    .enum(["feature", "fix", "chore", "hotfix", "release", "docs", "refactor", "test"])
    .optional()
    .describe("Branch type (auto-detected from issue type if not specified)"),
  format: z
    .string()
    .optional()
    .describe("Custom format pattern (e.g., {type}/{key}-{slug})"),
  maxLength: z
    .number()
    .min(20)
    .max(255)
    .optional()
    .default(100)
    .describe("Maximum branch name length (default: 100)"),
});

export type GitBranchNameInput = z.infer<typeof GitBranchNameInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const gitBranchNameTool = {
  name: "devflow_git_branch_name",
  description:
    "Generates a Git branch name from a Jira issue. Fetches issue details to create a descriptive, convention-compliant branch name. Provides alternatives and explains naming conventions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
        description: "Jira issue key (e.g., PROJECT-123)",
      },
      type: {
        type: "string",
        enum: ["feature", "fix", "chore", "hotfix", "release", "docs", "refactor", "test"],
        description: "Branch type (auto-detected from issue type if not specified)",
      },
      format: {
        type: "string",
        description: "Custom format pattern (e.g., {type}/{key}-{slug})",
      },
      maxLength: {
        type: "number",
        minimum: 20,
        maximum: 255,
        description: "Maximum branch name length (default: 100)",
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the git branch name tool.
 */
export async function executeGitBranchName(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = GitBranchNameInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, type, format, maxLength } = parseResult.data;
  const normalizedKey = issueKey.toUpperCase();

  try {
    // Fetch issue from Jira
    const issue = await client.getIssue(normalizedKey);

    if (!issue) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Issue ${normalizedKey} not found`,
                issueKey: normalizedKey,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Get project-specific branch pattern if configured
    const projectKey = normalizedKey.split("-")[0];
    const projectPattern = projectKey ? getProjectBranchPattern(projectKey) : undefined;
    const effectivePattern = format ?? projectPattern;

    // Generate branch name
    const result = generateBranchName(normalizedKey, issue.summary, {
      type: type as BranchType | undefined,
      issueType: issue.issueType.name,
      pattern: effectivePattern,
      maxLength,
    });

    // Build response
    const response: Record<string, unknown> = {
      branchName: result.branchName,
      issue: {
        key: normalizedKey,
        summary: issue.summary,
        type: issue.issueType.name,
      },
    };

    if (result.alternatives.length > 0) {
      response["alternatives"] = result.alternatives;
    }

    response["pattern"] = result.pattern;

    if (projectPattern) {
      response["projectPattern"] = projectPattern;
    }

    // Add git commands for convenience
    response["gitCommands"] = {
      createBranch: `git checkout -b ${result.branchName}`,
      createFromMain: `git checkout main && git pull && git checkout -b ${result.branchName}`,
    };

    // Add conventions
    response["conventions"] = result.conventions;

    // Add available types for reference
    response["availableTypes"] = getBranchTypes();

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    if (error instanceof JiraNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Issue ${normalizedKey} not found`,
                issueKey: normalizedKey,
              },
              null,
              2
            ),
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
          text: `Failed to generate branch name: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
