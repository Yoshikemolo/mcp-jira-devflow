/**
 * Deployment Link Tool
 *
 * Links deployments to Jira issues for tracking.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import { recordDeployment } from "../analysis/cicd/index.js";
import type { DeploymentInfo, DeploymentEnvironment, DeploymentStatus } from "../analysis/cicd/index.js";

/**
 * Input schema for deployment link tool.
 */
export const DeploymentLinkInputSchema = z.object({
  issueKeys: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]*-\d+$/i))
    .min(1, "At least one issue key required")
    .max(50, "Maximum 50 issues per deployment")
    .describe("Issue keys to link to the deployment"),
  environment: z
    .enum(["development", "staging", "production", "preview", "qa"])
    .describe("Deployment environment"),
  version: z
    .string()
    .min(1)
    .describe("Version or tag being deployed"),
  status: z
    .enum(["pending", "in_progress", "success", "failed", "rolled_back"])
    .optional()
    .default("success")
    .describe("Deployment status"),
  commitSha: z
    .string()
    .optional()
    .describe("Git commit SHA"),
  branch: z
    .string()
    .optional()
    .describe("Git branch name"),
  deployedBy: z
    .string()
    .optional()
    .describe("Deployer name or system"),
  url: z
    .string()
    .url()
    .optional()
    .describe("Deployment URL"),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe("Validate without recording"),
});

export type DeploymentLinkInput = z.infer<typeof DeploymentLinkInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const deploymentLinkTool = {
  name: "devflow_deployment_link",
  description:
    "Links deployments to Jira issues for tracking. Records which issues have been deployed to which environments, enabling release progress monitoring.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKeys: {
        type: "array",
        items: { type: "string", pattern: "^[A-Z][A-Z0-9]*-\\d+$" },
        description: "Issue keys to link (e.g., ['PROJ-123', 'PROJ-456'])",
        minItems: 1,
        maxItems: 50,
      },
      environment: {
        type: "string",
        enum: ["development", "staging", "production", "preview", "qa"],
        description: "Deployment environment",
      },
      version: {
        type: "string",
        description: "Version or tag being deployed",
      },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "success", "failed", "rolled_back"],
        description: "Deployment status (default: success)",
      },
      commitSha: {
        type: "string",
        description: "Git commit SHA",
      },
      branch: {
        type: "string",
        description: "Git branch name",
      },
      deployedBy: {
        type: "string",
        description: "Deployer name or system",
      },
      url: {
        type: "string",
        description: "Deployment URL",
      },
      dryRun: {
        type: "boolean",
        description: "Validate without recording",
      },
    },
    required: ["issueKeys", "environment", "version"],
  },
};

/**
 * Validates that issues exist.
 */
async function validateIssues(
  client: JiraClient,
  issueKeys: readonly string[]
): Promise<{ valid: string[]; invalid: string[] }> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const key of issueKeys) {
    try {
      const issue = await client.getIssue(key);
      if (issue) {
        valid.push(key);
      } else {
        invalid.push(key);
      }
    } catch {
      invalid.push(key);
    }
  }

  return { valid, invalid };
}

/**
 * Executes the deployment link tool.
 */
export async function executeDeploymentLink(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = DeploymentLinkInputSchema.safeParse(input);

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
    environment,
    version,
    status,
    commitSha,
    branch,
    deployedBy,
    url,
    dryRun,
  } = parseResult.data;

  const normalizedKeys = issueKeys.map((k) => k.toUpperCase());

  try {
    // Validate issues exist
    const { valid, invalid } = await validateIssues(client, normalizedKeys);

    if (valid.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "No valid issues found",
                invalidIssues: invalid,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Create deployment info
    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const deployment: DeploymentInfo = {
      deploymentId,
      environment: environment as DeploymentEnvironment,
      status: status as DeploymentStatus,
      deployedAt: new Date().toISOString(),
      version,
      commitSha,
      branch,
      deployedBy,
      url,
    };

    // Build response
    const response: Record<string, unknown> = {
      deploymentId,
      environment,
      version,
      status,
      issueCount: valid.length,
      dryRun,
    };

    if (dryRun) {
      // Just validate
      response["validation"] = {
        validIssues: valid,
        invalidIssues: invalid,
        message: "Dry run - no changes made",
      };
    } else {
      // Record the deployment
      const result = recordDeployment(valid, deployment);

      response["result"] = {
        linkedIssues: result.linked,
        failedIssues: result.failed,
        successCount: result.linked.length,
      };

      if (invalid.length > 0) {
        response["warnings"] = [`${invalid.length} issue(s) not found: ${invalid.join(", ")}`];
      }
    }

    // Deployment details
    response["deployment"] = {
      environment,
      version,
      status,
      commitSha,
      branch,
      deployedBy,
      url,
      timestamp: deployment.deployedAt,
    };

    // Recommendations
    const recommendations: string[] = [];

    if (environment === "production" && status === "success") {
      recommendations.push("Update fix versions in Jira for released issues");
      recommendations.push("Consider creating release notes for stakeholders");
    }

    if (environment === "staging" && status === "success") {
      recommendations.push("Verify staging deployment before production release");
    }

    if (status === "failed") {
      recommendations.push("Investigate deployment failure and retry");
      recommendations.push("Check CI/CD logs for error details");
    }

    if (recommendations.length > 0) {
      response["recommendations"] = recommendations;
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
          text: `Failed to link deployment: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
