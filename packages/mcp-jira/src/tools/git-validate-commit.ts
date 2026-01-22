/**
 * Git Validate Commit Tool
 *
 * Validates commit messages against conventional commits format.
 */

import { z } from "zod";
import {
  validateCommitMessage,
  getCommitTypes,
  suggestCommitMessage,
} from "../git/index.js";

/**
 * Input schema for git validate commit tool.
 */
export const GitValidateCommitInputSchema = z.object({
  message: z
    .string()
    .min(1, "Commit message is required")
    .describe("The commit message to validate"),
  projectKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be uppercase letters/numbers")
    .optional()
    .describe("Jira project key to validate issue references against"),
  requireIssueKey: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to require an issue key in the message"),
});

export type GitValidateCommitInput = z.infer<typeof GitValidateCommitInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const gitValidateCommitTool = {
  name: "devflow_git_validate_commit",
  description:
    "Validates a commit message against conventional commits format and project conventions. Checks for proper type prefix, issue key references, and formatting. Provides suggestions for improvement.",
  inputSchema: {
    type: "object" as const,
    properties: {
      message: {
        type: "string",
        description: "The commit message to validate",
      },
      projectKey: {
        type: "string",
        pattern: "^[A-Z][A-Z0-9]*$",
        description: "Jira project key to validate issue references against",
      },
      requireIssueKey: {
        type: "boolean",
        description: "Whether to require an issue key in the message",
      },
    },
    required: ["message"],
  },
};

/**
 * Executes the git validate commit tool.
 */
export function executeGitValidateCommit(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const parseResult = GitValidateCommitInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { message, projectKey, requireIssueKey } = parseResult.data;

  // Validate the commit message
  const result = validateCommitMessage(message, {
    projectKey: projectKey?.toUpperCase(),
    requireIssueKey,
  });

  // Build response
  const response: Record<string, unknown> = {
    valid: result.valid,
    message,
  };

  // Add parsed components if found
  if (result.commitType) {
    response["parsed"] = {
      type: result.commitType,
      scope: result.scope,
      description: result.description,
      isBreakingChange: result.isBreakingChange,
    };
  }

  // Add issue keys if found
  if (result.issueKeys.length > 0) {
    response["issueKeys"] = result.issueKeys;

    // Check if they match the project
    if (projectKey) {
      const projectKeys = result.issueKeys.filter((key) =>
        key.startsWith(projectKey.toUpperCase() + "-")
      );
      response["projectIssueKeys"] = projectKeys;
    }
  }

  // Add validation issues
  if (result.issues.length > 0) {
    response["issues"] = result.issues.map((issue) => ({
      type: issue.type,
      message: issue.message,
      suggestion: issue.suggestion,
    }));
  }

  // Add suggestions
  if (result.suggestions.length > 0) {
    response["suggestions"] = result.suggestions;
  }

  // If invalid, add example of correct format
  if (!result.valid) {
    const commitTypes = getCommitTypes();
    response["conventionalCommitFormat"] = {
      pattern: "type(scope)?: description",
      examples: [
        "feat: add new login feature",
        "fix(auth): resolve token refresh issue",
        "feat!: breaking change in API",
        `feat: add feature\n\nRefs: ${projectKey ?? "PROJECT"}-123`,
      ],
      validTypes: commitTypes.map((t) => `${t.type}: ${t.description}`),
    };

    // Suggest a corrected message if we can parse the intent
    if (result.description) {
      const suggested = suggestCommitMessage(result.description, {
        issueKey: projectKey ? `${projectKey}-XXX` : undefined,
        type: result.commitType,
      });
      response["suggestedMessage"] = suggested;
    }
  }

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}
