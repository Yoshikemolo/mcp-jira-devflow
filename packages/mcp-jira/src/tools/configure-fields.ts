/**
 * Configure Fields Tool
 *
 * MCP tool for configuring custom field mappings at runtime.
 * Allows users to specify their Jira instance's exact field IDs
 * for Story Points and Sprint fields.
 */

import { z } from "zod";
import { CustomFieldIdSchema } from "../config/index.js";
import {
  getFieldMappings,
  updateFieldMappings,
  resetFieldMappings,
  getServerState,
} from "../server-state.js";

/**
 * Input schema for jira_configure_fields tool.
 */
export const ConfigureFieldsInputSchema = z.object({
  storyPoints: CustomFieldIdSchema.optional().describe(
    "Custom field ID for Story Points (e.g., customfield_10016)"
  ),
  sprint: CustomFieldIdSchema.optional().describe(
    "Custom field ID for Sprint (e.g., customfield_10020)"
  ),
  reset: z
    .boolean()
    .optional()
    .describe("Reset to default field candidates"),
});

export type ConfigureFieldsInput = z.infer<typeof ConfigureFieldsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const configureFieldsTool = {
  name: "jira_configure_fields",
  description:
    "Configure custom field mappings for Story Points and Sprint fields. " +
    "Use this when your Jira instance uses non-standard field IDs. " +
    "Use the jira_discover_fields tool to find the correct field IDs. " +
    "Set reset:true to restore default field candidates.",
  inputSchema: {
    type: "object" as const,
    properties: {
      storyPoints: {
        type: "string",
        description:
          "Custom field ID for Story Points (e.g., customfield_10016)",
        pattern: "^customfield_\\d+$",
      },
      sprint: {
        type: "string",
        description: "Custom field ID for Sprint (e.g., customfield_10020)",
        pattern: "^customfield_\\d+$",
      },
      reset: {
        type: "boolean",
        description: "Reset to default field candidates",
      },
    },
    required: [],
  },
};

/**
 * Executes the jira_configure_fields tool.
 */
export function executeConfigureFields(input: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  // Check if server is configured
  const state = getServerState();
  if (state.status !== "configured") {
    return {
      content: [
        {
          type: "text",
          text: "Jira is not configured. Please configure Jira credentials first using jira_configure.",
        },
      ],
      isError: true,
    };
  }

  // Validate input
  const parseResult = ConfigureFieldsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { storyPoints, sprint, reset } = parseResult.data;

  // Handle reset
  if (reset) {
    resetFieldMappings();
    const currentMappings = getFieldMappings();

    const response = {
      success: true,
      action: "reset",
      fieldMappings: {
        storyPointsField: currentMappings?.storyPointsField,
        storyPointsCandidates: currentMappings?.storyPointsCandidates,
        sprintField: currentMappings?.sprintField,
        sprintCandidates: currentMappings?.sprintCandidates,
      },
      message: "Field mappings reset to defaults",
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

  // Check if any field is provided
  if (!storyPoints && !sprint) {
    // Return current mappings
    const currentMappings = getFieldMappings();

    const response = {
      currentMappings: {
        storyPointsField: currentMappings?.storyPointsField,
        storyPointsCandidates: currentMappings?.storyPointsCandidates,
        sprintField: currentMappings?.sprintField,
        sprintCandidates: currentMappings?.sprintCandidates,
      },
      hint: "Provide storyPoints or sprint to update, or reset:true to restore defaults",
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

  // Update field mappings
  const success = updateFieldMappings({
    storyPoints,
    sprint,
  });

  if (!success) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to update field mappings. Server may not be configured.",
        },
      ],
      isError: true,
    };
  }

  const currentMappings = getFieldMappings();

  const response = {
    success: true,
    action: "update",
    updated: {
      storyPoints: storyPoints ?? "(unchanged)",
      sprint: sprint ?? "(unchanged)",
    },
    fieldMappings: {
      storyPointsField: currentMappings?.storyPointsField,
      storyPointsCandidates: currentMappings?.storyPointsCandidates,
      sprintField: currentMappings?.sprintField,
      sprintCandidates: currentMappings?.sprintCandidates,
    },
    message: "Field mappings updated successfully",
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
