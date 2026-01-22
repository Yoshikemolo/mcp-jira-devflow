/**
 * Git Get Repos Tool
 *
 * Lists Git repositories linked to Jira projects.
 */

import { z } from "zod";
import { getRepositoryMappings, getRepositoryCount } from "../git/index.js";

/**
 * Input schema for git get repos tool.
 */
export const GitGetReposInputSchema = z.object({
  projectKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*$/, "Project key must be uppercase letters/numbers")
    .optional()
    .describe("Filter by Jira project key (optional, returns all if not specified)"),
});

export type GitGetReposInput = z.infer<typeof GitGetReposInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const gitGetReposTool = {
  name: "devflow_git_get_repos",
  description:
    "Lists Git repositories linked to Jira projects. Returns repository URL, default branch, and configuration for each linked project. Optionally filter by project key.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        pattern: "^[A-Z][A-Z0-9]*$",
        description: "Filter by Jira project key (optional)",
      },
    },
    required: [],
  },
};

/**
 * Executes the git get repos tool.
 */
export function executeGitGetRepos(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const parseResult = GitGetReposInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { projectKey } = parseResult.data;
  const mappings = getRepositoryMappings(projectKey);
  const totalCount = getRepositoryCount();

  if (mappings.length === 0) {
    const message = projectKey
      ? `No repository linked to project ${projectKey}`
      : "No repositories linked to any projects";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              repositories: [],
              totalCount: 0,
              message,
              hint: "Use devflow_git_link_repo to link a repository to a project",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Format mappings for response
  const repositories = mappings.map((mapping) => ({
    projectKey: mapping.projectKey,
    repository: {
      url: mapping.repository.url,
      name: mapping.repository.name,
      defaultBranch: mapping.repository.defaultBranch,
      provider: mapping.repository.provider,
      branchPattern: mapping.repository.branchPattern,
    },
    linkedAt: mapping.linkedAt,
    linkedBy: mapping.linkedBy,
  }));

  const response: Record<string, unknown> = {
    repositories,
    count: mappings.length,
  };

  // Add context if filtering
  if (projectKey) {
    response["filter"] = { projectKey };
  } else {
    response["totalLinkedProjects"] = totalCount;
  }

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}
