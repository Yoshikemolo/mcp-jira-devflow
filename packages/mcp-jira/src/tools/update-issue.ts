/**
 * Update Issue Tool
 *
 * MCP tool for updating existing Jira issues.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import {
  JiraApiError,
  JiraAuthError,
  JiraNotFoundError,
} from "../domain/jira-client.js";

/**
 * Input schema for update_issue tool.
 */
export const UpdateIssueInputSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Issue key must be in format PROJECT-123")
    .describe("The Jira issue key (e.g., PROJECT-123)"),
  summary: z
    .string()
    .min(1, "Summary cannot be empty")
    .max(255, "Summary must be 255 characters or less")
    .optional()
    .describe("New summary/title"),
  description: z
    .string()
    .optional()
    .describe("New description (plain text, converted to ADF)"),
  assigneeAccountId: z
    .string()
    .nullable()
    .optional()
    .describe("New assignee account ID (null to unassign)"),
  priorityName: z
    .string()
    .optional()
    .describe("New priority name"),
  labels: z
    .array(z.string())
    .optional()
    .describe("New labels (replaces existing)"),
  storyPoints: z
    .number()
    .min(0)
    .optional()
    .describe("New story points value"),
  dryRun: z
    .boolean()
    .default(false)
    .describe("If true, validate without updating"),
});

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const updateIssueTool = {
  name: "update_issue",
  description:
    "Updates an existing Jira issue. Supports partial updates - only provided fields will be changed. Use dryRun:true to validate without updating.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., PROJECT-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      summary: {
        type: "string",
        description: "New summary/title",
        maxLength: 255,
      },
      description: {
        type: "string",
        description: "New description (plain text, converted to ADF)",
      },
      assigneeAccountId: {
        type: ["string", "null"],
        description: "New assignee account ID (null to unassign)",
      },
      priorityName: {
        type: "string",
        description: "New priority name",
      },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "New labels (replaces existing)",
      },
      storyPoints: {
        type: "number",
        description: "New story points value",
        minimum: 0,
      },
      dryRun: {
        type: "boolean",
        description: "If true, validate without updating",
        default: false,
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the update_issue tool.
 */
export async function executeUpdateIssue(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = UpdateIssueInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { dryRun, ...updateInput } = parseResult.data;

  // Check if there are any fields to update
  const fieldsToUpdate: string[] = [];
  if (updateInput.summary !== undefined) fieldsToUpdate.push("summary");
  if (updateInput.description !== undefined) fieldsToUpdate.push("description");
  if (updateInput.assigneeAccountId !== undefined) fieldsToUpdate.push("assignee");
  if (updateInput.priorityName !== undefined) fieldsToUpdate.push("priority");
  if (updateInput.labels !== undefined) fieldsToUpdate.push("labels");
  if (updateInput.storyPoints !== undefined) fieldsToUpdate.push("storyPoints");

  if (fieldsToUpdate.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No fields provided to update. Provide at least one field (summary, description, assigneeAccountId, priorityName, labels, or storyPoints).",
        },
      ],
      isError: true,
    };
  }

  // Dry run mode - just validate and return what would be updated
  if (dryRun) {
    const preview = {
      dryRun: true,
      issueKey: updateInput.issueKey,
      wouldUpdate: {
        summary: updateInput.summary,
        description: updateInput.description ? "(provided)" : undefined,
        assignee: updateInput.assigneeAccountId,
        priority: updateInput.priorityName,
        labels: updateInput.labels,
        storyPoints: updateInput.storyPoints,
      },
      fieldsToUpdate,
      message: "Validation passed. Set dryRun:false to apply the update.",
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
    await client.updateIssue(updateInput);

    const response = {
      success: true,
      issueKey: updateInput.issueKey,
      updatedFields: fieldsToUpdate,
      message: `Issue ${updateInput.issueKey} updated successfully`,
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
    if (error instanceof JiraNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Issue '${updateInput.issueKey}' not found`,
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

    if (error instanceof JiraApiError) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update issue: ${error.message} (status: ${error.statusCode})`,
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
          text: `Failed to update issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
