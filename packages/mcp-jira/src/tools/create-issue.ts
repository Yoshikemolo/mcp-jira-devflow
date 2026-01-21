/**
 * Create Issue Tool
 *
 * MCP tool for creating new Jira issues.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraApiError, JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for create_issue tool.
 */
export const CreateIssueInputSchema = z.object({
  projectKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be uppercase letters/numbers")
    .describe("The project key (e.g., PROJ)"),
  summary: z
    .string()
    .min(1, "Summary cannot be empty")
    .max(255, "Summary must be 255 characters or less")
    .describe("The issue summary/title"),
  issueTypeName: z
    .string()
    .describe("The issue type name (e.g., Bug, Story, Task, Sub-task)"),
  description: z
    .string()
    .optional()
    .describe("Plain text description (converted to Atlassian Document Format)"),
  assigneeAccountId: z
    .string()
    .optional()
    .describe("Atlassian account ID of the assignee"),
  priorityName: z
    .string()
    .optional()
    .describe("Priority name (e.g., High, Medium, Low)"),
  labels: z
    .array(z.string())
    .optional()
    .describe("Array of labels to apply"),
  parentKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Parent key must be in format PROJECT-123")
    .optional()
    .describe("Parent issue key for subtasks"),
  storyPoints: z
    .number()
    .min(0)
    .optional()
    .describe("Story points estimation"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("If true, validate without creating"),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const createIssueTool = {
  name: "create_issue",
  description:
    "Creates a new Jira issue with the specified fields. Supports project, summary, type, description, assignee, priority, labels, parent (for subtasks), and story points. Use dryRun:true to validate without creating.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., PROJ)",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      summary: {
        type: "string",
        description: "The issue summary/title",
        maxLength: 255,
      },
      issueTypeName: {
        type: "string",
        description: "The issue type name (e.g., Bug, Story, Task, Sub-task)",
      },
      description: {
        type: "string",
        description: "Plain text description (converted to ADF)",
      },
      assigneeAccountId: {
        type: "string",
        description: "Atlassian account ID of the assignee",
      },
      priorityName: {
        type: "string",
        description: "Priority name (e.g., High, Medium, Low)",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Array of labels to apply",
      },
      parentKey: {
        type: "string",
        description: "Parent issue key for subtasks",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      storyPoints: {
        type: "number",
        description: "Story points estimation",
        minimum: 0,
      },
      dryRun: {
        type: "boolean",
        description: "If true, validate without creating",
        default: false,
      },
    },
    required: ["projectKey", "summary", "issueTypeName"],
  },
};

/**
 * Executes the create_issue tool.
 */
export async function executeCreateIssue(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = CreateIssueInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { dryRun, ...createInput } = parseResult.data;

  // Dry run mode - just validate and return what would be created
  if (dryRun) {
    const preview = {
      dryRun: true,
      wouldCreate: {
        project: createInput.projectKey,
        summary: createInput.summary,
        issueType: createInput.issueTypeName,
        description: createInput.description ? "(provided)" : undefined,
        assignee: createInput.assigneeAccountId,
        priority: createInput.priorityName,
        labels: createInput.labels,
        parent: createInput.parentKey,
        storyPoints: createInput.storyPoints,
      },
      message: "Validation passed. Set dryRun:false to create the issue.",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(preview, null, 2),
        },
      ],
    };
  }

  try {
    const result = await client.createIssue(createInput);

    const response = {
      success: true,
      issue: {
        key: result.key,
        id: result.id,
        self: result.self,
      },
      summary: createInput.summary,
      project: createInput.projectKey,
      issueType: createInput.issueTypeName,
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

    if (error instanceof JiraApiError) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create issue: ${error.message} (status: ${error.statusCode})`,
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
          text: `Failed to create issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
