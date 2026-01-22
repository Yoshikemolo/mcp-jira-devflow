/**
 * Git Link Repository Tool
 *
 * Links a Git repository to a Jira project for integration.
 */

import { z } from "zod";
import { linkRepository, validateRepositoryUrl } from "../git/index.js";

/**
 * Input schema for git link repo tool.
 */
export const GitLinkRepoInputSchema = z.object({
  projectKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*$/, "Project key must be uppercase letters/numbers")
    .describe("Jira project key (e.g., PROJ)"),
  repositoryUrl: z
    .string()
    .min(1, "Repository URL is required")
    .describe("Git repository URL (HTTPS or SSH format)"),
  defaultBranch: z
    .string()
    .optional()
    .default("main")
    .describe("Default branch name (default: main)"),
  branchPattern: z
    .string()
    .optional()
    .describe("Branch naming pattern (e.g., {type}/{key}-{slug})"),
});

export type GitLinkRepoInput = z.infer<typeof GitLinkRepoInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const gitLinkRepoTool = {
  name: "devflow_git_link_repo",
  description:
    "Links a Git repository to a Jira project. Stores the mapping for branch name generation, commit validation, and PR context features. The repository URL is validated but no Git operations are performed.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        pattern: "^[A-Z][A-Z0-9]*$",
        description: "Jira project key (e.g., PROJ)",
      },
      repositoryUrl: {
        type: "string",
        description: "Git repository URL (HTTPS or SSH format)",
      },
      defaultBranch: {
        type: "string",
        description: "Default branch name (default: main)",
      },
      branchPattern: {
        type: "string",
        description: "Branch naming pattern (e.g., {type}/{key}-{slug})",
      },
    },
    required: ["projectKey", "repositoryUrl"],
  },
};

/**
 * Executes the git link repo tool.
 */
export function executeGitLinkRepo(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const parseResult = GitLinkRepoInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKey, repositoryUrl, defaultBranch, branchPattern } = parseResult.data;

  // Validate repository URL format
  const urlValidation = validateRepositoryUrl(repositoryUrl);
  if (!urlValidation.valid) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: urlValidation.error,
              providedUrl: repositoryUrl,
              examples: [
                "https://github.com/owner/repo",
                "https://github.com/owner/repo.git",
                "git@github.com:owner/repo.git",
              ],
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Link the repository
  const result = linkRepository(projectKey, repositoryUrl, {
    defaultBranch,
    branchPattern,
  });

  if (!result.success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: result.message,
              projectKey: result.projectKey,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Build response
  const response: Record<string, unknown> = {
    success: true,
    action: result.isUpdate ? "updated" : "linked",
    projectKey: result.projectKey,
    repository: {
      url: result.repository.url,
      name: result.repository.name,
      defaultBranch: result.repository.defaultBranch,
      provider: result.repository.provider,
    },
    message: result.message,
  };

  if (branchPattern) {
    response["branchPattern"] = branchPattern;
  }

  // Add usage hints
  response["nextSteps"] = [
    `Use devflow_git_branch_name to generate branch names for ${projectKey} issues`,
    `Use devflow_git_validate_commit to validate commits for ${projectKey}`,
    `Use devflow_git_pr_context to generate PR context from ${projectKey} issues`,
  ];

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}
