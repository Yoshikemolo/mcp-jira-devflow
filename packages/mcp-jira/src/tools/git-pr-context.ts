/**
 * Git PR Context Tool
 *
 * Generates Pull Request context from Jira issues.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError, JiraNotFoundError } from "../domain/jira-client.js";
import {
  buildPRContext,
  jiraIssueToContext,
  getProjectDefaultBranch,
  type IssueContext,
} from "../git/index.js";

/**
 * Input schema for git PR context tool.
 */
export const GitPRContextInputSchema = z.object({
  issueKeys: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]*-\d+$/i))
    .min(1, "At least one issue key required")
    .max(10, "Maximum 10 issues per PR")
    .describe("Jira issue keys to include in the PR"),
  includeAcceptanceCriteria: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include acceptance criteria in PR body"),
  includeDescription: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include issue descriptions in PR body"),
  includeTestingChecklist: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include testing checklist in PR body"),
  targetBranch: z
    .string()
    .optional()
    .describe("Target branch for the PR (auto-detected from linked repo)"),
});

export type GitPRContextInput = z.infer<typeof GitPRContextInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const gitPRContextTool = {
  name: "devflow_git_pr_context",
  description:
    "Generates Pull Request context from Jira issues. Fetches issue details to create a PR title, body template with acceptance criteria, testing checklist, and suggested labels. Does not create the PR - provides the content for you to use.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKeys: {
        type: "array",
        items: { type: "string", pattern: "^[A-Z][A-Z0-9]*-\\d+$" },
        description: "Jira issue keys to include in the PR",
        minItems: 1,
        maxItems: 10,
      },
      includeAcceptanceCriteria: {
        type: "boolean",
        description: "Include acceptance criteria in PR body (default: true)",
      },
      includeDescription: {
        type: "boolean",
        description: "Include issue descriptions in PR body (default: true)",
      },
      includeTestingChecklist: {
        type: "boolean",
        description: "Include testing checklist in PR body (default: true)",
      },
      targetBranch: {
        type: "string",
        description: "Target branch for the PR",
      },
    },
    required: ["issueKeys"],
  },
};

/**
 * Executes the git PR context tool.
 */
export async function executeGitPRContext(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = GitPRContextInputSchema.safeParse(input);

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
    issueKeys,
    includeAcceptanceCriteria,
    includeDescription,
    includeTestingChecklist,
    targetBranch,
  } = parseResult.data;

  const normalizedKeys = issueKeys.map((k) => k.toUpperCase());

  try {
    // Fetch all issues from Jira
    const issueContexts: IssueContext[] = [];
    const notFound: string[] = [];
    const errors: string[] = [];

    for (const key of normalizedKeys) {
      try {
        const issue = await client.getIssue(key);
        if (issue) {
          issueContexts.push(
            jiraIssueToContext({
              key: issue.key,
              summary: issue.summary,
              issueType: issue.issueType.name,
              description: issue.description,
              storyPoints: issue.storyPoints,
            })
          );
        } else {
          notFound.push(key);
        }
      } catch (error) {
        if (error instanceof JiraNotFoundError) {
          notFound.push(key);
        } else {
          errors.push(`${key}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    if (issueContexts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "No valid issues found",
                notFound,
                errors,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Get default target branch from linked repo if not specified
    const projectKey = normalizedKeys[0]?.split("-")[0];
    const effectiveTargetBranch =
      targetBranch ?? (projectKey ? getProjectDefaultBranch(projectKey) : "main");

    // Build PR context
    const prContext = buildPRContext(issueContexts, {
      includeAcceptanceCriteria,
      includeDescription,
      includeTestingChecklist,
      targetBranch: effectiveTargetBranch,
    });

    // Build response
    const response: Record<string, unknown> = {
      title: prContext.title,
      body: prContext.body,
    };

    if (prContext.testingChecklist.length > 0) {
      response["testingChecklist"] = prContext.testingChecklist;
    }

    if (prContext.suggestedLabels.length > 0) {
      response["suggestedLabels"] = prContext.suggestedLabels;
    }

    if (prContext.reviewersRecommendation) {
      response["reviewersRecommendation"] = prContext.reviewersRecommendation;
    }

    // Add summary of issues included
    response["includedIssues"] = issueContexts.map((ctx) => ({
      key: ctx.key,
      summary: ctx.summary,
      type: ctx.type,
      storyPoints: ctx.storyPoints,
    }));

    // Add warnings if any issues weren't found
    if (notFound.length > 0 || errors.length > 0) {
      response["warnings"] = {
        notFound,
        errors,
      };
    }

    // Add target branch info
    response["targetBranch"] = effectiveTargetBranch;

    // Add total story points
    const totalPoints = issueContexts.reduce((sum, ctx) => sum + (ctx.storyPoints ?? 0), 0);
    if (totalPoints > 0) {
      response["totalStoryPoints"] = totalPoints;
    }

    // Add helpful gh command
    response["ghCommand"] = `gh pr create --title "${prContext.title}" --body "<PR body from above>" --base ${effectiveTargetBranch}`;

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
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
          text: `Failed to generate PR context: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
