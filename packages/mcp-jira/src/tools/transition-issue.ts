/**
 * Transition Issue Tool
 *
 * MCP tool for transitioning Jira issues to new statuses.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import {
  JiraApiError,
  JiraAuthError,
  JiraNotFoundError,
} from "../domain/jira-client.js";

/**
 * Input schema for transition_issue tool.
 */
export const TransitionIssueInputSchema = z
  .object({
    issueKey: z
      .string()
      .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Issue key must be in format PROJECT-123")
      .describe("The Jira issue key (e.g., PROJECT-123)"),
    transitionId: z
      .string()
      .optional()
      .describe("The transition ID to execute"),
    transitionName: z
      .string()
      .optional()
      .describe("The transition name (case-insensitive)"),
    fields: z
      .record(z.unknown())
      .optional()
      .describe("Fields required by the transition (e.g., resolution)"),
    comment: z
      .string()
      .optional()
      .describe("Comment to add during transition"),
    listTransitions: z
      .boolean()
      .default(false)
      .describe("If true, list available transitions instead of executing"),
  })
  .refine(
    (data) => data.listTransitions || data.transitionId || data.transitionName,
    {
      message:
        "Either listTransitions:true, transitionId, or transitionName must be provided",
    }
  );

export type TransitionIssueInput = z.infer<typeof TransitionIssueInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const transitionIssueTool = {
  name: "transition_issue",
  description:
    "Transitions a Jira issue to a new status. Use listTransitions:true to see available transitions first. Provide either transitionId or transitionName to execute a transition.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The Jira issue key (e.g., PROJECT-123)",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      transitionId: {
        type: "string",
        description: "The transition ID to execute",
      },
      transitionName: {
        type: "string",
        description: "The transition name (case-insensitive)",
      },
      fields: {
        type: "object",
        description: "Fields required by the transition (e.g., resolution)",
        additionalProperties: true,
      },
      comment: {
        type: "string",
        description: "Comment to add during transition",
      },
      listTransitions: {
        type: "boolean",
        description: "If true, list available transitions instead of executing",
        default: false,
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the transition_issue tool.
 */
export async function executeTransitionIssue(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = TransitionIssueInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, listTransitions, transitionId, transitionName, fields, comment } =
    parseResult.data;

  try {
    // List transitions mode
    if (listTransitions) {
      const result = await client.getTransitions(issueKey);

      const response = {
        issueKey,
        availableTransitions: result.transitions.map((t) => ({
          id: t.id,
          name: t.name,
          toStatus: t.to.name,
          toCategory: t.to.categoryKey,
          hasScreen: t.hasScreen,
        })),
        hint: "Use transitionId or transitionName to execute a transition",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Execute transition
    const transitionResult = await client.transitionIssue({
      issueKey,
      transitionId,
      transitionName,
      fields,
      comment,
    });

    const response = {
      success: true,
      issueKey: transitionResult.issueKey,
      transition: transitionResult.transitionName,
      newStatus: transitionResult.newStatus,
      commentAdded: !!comment,
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

    if (error instanceof JiraApiError) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to transition issue: ${error.message} (status: ${error.statusCode})`,
          },
        ],
        isError: true,
      };
    }

    // Error for transition not found (from client.transitionIssue)
    if (error instanceof Error && error.message.includes("not found")) {
      return {
        content: [
          {
            type: "text",
            text: error.message,
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
          text: `Failed to transition issue: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
