/**
 * Update Sprint Tool
 *
 * MCP tool for updating sprint details and state.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import {
  JiraAuthError,
  JiraSprintNotFoundError,
  JiraSprintStateError,
  JiraApiError,
} from "../domain/jira-client.js";
import type { JiraSprintExtended } from "../domain/types.js";

/**
 * ISO date format regex for validation.
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Input schema for update_sprint tool.
 */
export const UpdateSprintInputSchema = z.object({
  sprintId: z
    .number()
    .int()
    .positive()
    .describe("The sprint ID to update (required)"),
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("New sprint name"),
  startDate: z
    .string()
    .regex(ISO_DATE_REGEX, "Date must be in ISO format (YYYY-MM-DD or full ISO timestamp)")
    .optional()
    .describe("Sprint start date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)"),
  endDate: z
    .string()
    .regex(ISO_DATE_REGEX, "Date must be in ISO format (YYYY-MM-DD or full ISO timestamp)")
    .optional()
    .describe("Sprint end date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)"),
  goal: z
    .string()
    .max(1000)
    .optional()
    .describe("Sprint goal description"),
  state: z
    .enum(["active", "closed"])
    .optional()
    .describe(
      "New sprint state: 'active' to start a future sprint, 'closed' to complete an active sprint"
    ),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, validate the operation without executing it"),
});

export type UpdateSprintInput = z.infer<typeof UpdateSprintInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const updateSprintTool = {
  name: "update_sprint",
  description:
    "Updates a sprint's name, dates, goal, or state. Use state 'active' to start a future sprint, or 'closed' to complete an active sprint. Supports dry run mode.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sprintId: {
        type: "number",
        description: "The sprint ID to update (required)",
      },
      name: {
        type: "string",
        description: "New sprint name",
        maxLength: 255,
      },
      startDate: {
        type: "string",
        description:
          "Sprint start date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
      },
      endDate: {
        type: "string",
        description:
          "Sprint end date (ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
      },
      goal: {
        type: "string",
        description: "Sprint goal description",
        maxLength: 1000,
      },
      state: {
        type: "string",
        enum: ["active", "closed"],
        description:
          "New sprint state: 'active' to start a future sprint, 'closed' to complete an active sprint",
      },
      dryRun: {
        type: "boolean",
        description: "If true, validate the operation without executing it",
      },
    },
    required: ["sprintId"],
  },
};

/**
 * Formats a sprint for output.
 */
function formatSprint(sprint: JiraSprintExtended): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    originBoardId: sprint.originBoardId,
  };

  if (sprint.goal) {
    result["goal"] = sprint.goal;
  }

  if (sprint.startDate) {
    result["startDate"] = sprint.startDate;
  }

  if (sprint.endDate) {
    result["endDate"] = sprint.endDate;
  }

  if (sprint.completeDate) {
    result["completeDate"] = sprint.completeDate;
  }

  return result;
}

/**
 * Describes what will change.
 */
function describeChanges(
  current: JiraSprintExtended,
  input: UpdateSprintInput
): string[] {
  const changes: string[] = [];

  if (input.name !== undefined && input.name !== current.name) {
    changes.push(`Name: "${current.name}" → "${input.name}"`);
  }

  if (input.startDate !== undefined && input.startDate !== current.startDate) {
    changes.push(
      `Start date: ${current.startDate ?? "(none)"} → ${input.startDate}`
    );
  }

  if (input.endDate !== undefined && input.endDate !== current.endDate) {
    changes.push(
      `End date: ${current.endDate ?? "(none)"} → ${input.endDate}`
    );
  }

  if (input.goal !== undefined && input.goal !== current.goal) {
    const currentGoal = current.goal
      ? current.goal.length > 50
        ? current.goal.substring(0, 50) + "..."
        : current.goal
      : "(none)";
    const newGoal =
      input.goal.length > 50 ? input.goal.substring(0, 50) + "..." : input.goal;
    changes.push(`Goal: "${currentGoal}" → "${newGoal}"`);
  }

  if (input.state !== undefined && input.state !== current.state) {
    const stateAction =
      input.state === "active" ? "Start sprint" : "Complete sprint";
    changes.push(`State: ${current.state} → ${input.state} (${stateAction})`);
  }

  return changes;
}

/**
 * Validates state transition rules.
 */
function validateStateTransition(
  currentState: string,
  targetState: string | undefined
): { valid: boolean; error?: string } {
  if (!targetState || targetState === currentState) {
    return { valid: true };
  }

  const validTransitions: Record<string, string[]> = {
    future: ["active"],
    active: ["closed"],
    closed: [],
  };

  if (!validTransitions[currentState]?.includes(targetState)) {
    if (currentState === "closed") {
      return {
        valid: false,
        error: "Cannot change state of a closed sprint. Closed sprints are immutable.",
      };
    }

    if (currentState === "future" && targetState === "closed") {
      return {
        valid: false,
        error:
          "Cannot close a future sprint directly. First start it (state='active'), then close it.",
      };
    }

    if (currentState === "active" && targetState === "future") {
      return {
        valid: false,
        error: "Cannot revert an active sprint to future state.",
      };
    }

    return {
      valid: false,
      error: `Invalid state transition from '${currentState}' to '${targetState}'.`,
    };
  }

  return { valid: true };
}

/**
 * Executes the update_sprint tool.
 */
export async function executeUpdateSprint(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = UpdateSprintInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { sprintId, name, startDate, endDate, goal, state, dryRun } =
    parseResult.data;

  // Check if there's anything to update
  if (
    name === undefined &&
    startDate === undefined &&
    endDate === undefined &&
    goal === undefined &&
    state === undefined
  ) {
    return {
      content: [
        {
          type: "text",
          text: "No updates specified. Provide at least one field to update (name, startDate, endDate, goal, or state).",
        },
      ],
      isError: true,
    };
  }

  try {
    // Get current sprint state for validation
    const currentSprint = await client.getSprint(sprintId);

    // Validate state transition
    const stateValidation = validateStateTransition(currentSprint.state, state);
    if (!stateValidation.valid) {
      return {
        content: [
          {
            type: "text",
            text: stateValidation.error!,
          },
        ],
        isError: true,
      };
    }

    // Describe changes
    const changes = describeChanges(currentSprint, parseResult.data);

    if (changes.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "No changes detected. Sprint already has the specified values.",
                sprint: formatSprint(currentSprint),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Dry run - validate without executing
    if (dryRun) {
      const response = {
        dryRun: true,
        valid: true,
        sprintId,
        sprintName: currentSprint.name,
        currentState: currentSprint.state,
        plannedChanges: changes,
        message: `Validation successful. ${changes.length} change(s) will be applied.`,
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

    // Execute the update
    const result = await client.updateSprint({
      sprintId,
      name,
      startDate,
      endDate,
      goal,
      state,
    });

    const response = {
      success: result.success,
      sprint: formatSprint(result.sprint),
      appliedChanges: changes,
      message: `Successfully updated sprint '${result.sprint.name}'.`,
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

    if (error instanceof JiraSprintNotFoundError) {
      return {
        content: [
          {
            type: "text",
            text: `Sprint with ID ${sprintId} not found. Use get_board_sprints to list available sprints.`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof JiraSprintStateError) {
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

    if (error instanceof JiraApiError) {
      // Handle specific error cases
      if (error.statusCode === 400) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid request: The update parameters may be invalid. Check that dates are in correct format and required fields are set for state changes.`,
            },
          ],
          isError: true,
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Failed to update sprint: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
