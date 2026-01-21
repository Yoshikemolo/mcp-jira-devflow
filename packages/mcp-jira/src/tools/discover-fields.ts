/**
 * Discover Fields Tool
 *
 * MCP tool for discovering available custom fields from the Jira instance.
 * Helps users find the correct field IDs for Story Points and Sprint fields.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraApiError, JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for jira_discover_fields tool.
 */
export const DiscoverFieldsInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe("Filter by field name (case-insensitive contains match)"),
  type: z
    .enum(["all", "number", "array", "custom"])
    .optional()
    .default("all")
    .describe(
      "Filter by field type: 'all' shows all fields, 'number' shows numeric fields (likely Story Points), 'array' shows array fields (likely Sprint), 'custom' shows only custom fields"
    ),
});

export type DiscoverFieldsInput = z.infer<typeof DiscoverFieldsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const discoverFieldsTool = {
  name: "jira_discover_fields",
  description:
    "Discover available custom fields from your Jira instance. " +
    "Use this to find the correct field IDs for Story Points and Sprint fields. " +
    "Filter by name (e.g., 'story') or type ('number' for Story Points, 'array' for Sprint).",
  inputSchema: {
    type: "object" as const,
    properties: {
      search: {
        type: "string",
        description: "Filter by field name (case-insensitive contains match)",
      },
      type: {
        type: "string",
        enum: ["all", "number", "array", "custom"],
        description:
          "Filter by field type: 'all' shows all fields, 'number' shows numeric fields (likely Story Points), 'array' shows array fields (likely Sprint), 'custom' shows only custom fields",
        default: "all",
      },
    },
    required: [],
  },
};

/**
 * Executes the jira_discover_fields tool.
 */
export async function executeDiscoverFields(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = DiscoverFieldsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { search, type } = parseResult.data;

  try {
    const allFields = await client.getFields();

    // Filter fields based on criteria
    let filteredFields = allFields;

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFields = filteredFields.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.id.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type
    if (type === "number") {
      filteredFields = filteredFields.filter((f) => f.schemaType === "number");
    } else if (type === "array") {
      filteredFields = filteredFields.filter((f) => f.schemaType === "array");
    } else if (type === "custom") {
      filteredFields = filteredFields.filter((f) => f.custom);
    }

    // Sort by name
    filteredFields.sort((a, b) => a.name.localeCompare(b.name));

    // Format output with hints
    const formattedFields = filteredFields.map((f) => {
      const hints: string[] = [];

      // Detect likely Story Points fields
      const nameLower = f.name.toLowerCase();
      if (
        f.schemaType === "number" &&
        (nameLower.includes("story") ||
          nameLower.includes("point") ||
          nameLower.includes("estimate"))
      ) {
        hints.push("Likely Story Points field");
      }

      // Detect likely Sprint fields
      if (
        f.schemaType === "array" &&
        (nameLower.includes("sprint") ||
          f.customType?.includes("sprint"))
      ) {
        hints.push("Likely Sprint field");
      }

      return {
        id: f.id,
        name: f.name,
        custom: f.custom,
        schemaType: f.schemaType,
        customType: f.customType,
        itemsType: f.itemsType,
        hints: hints.length > 0 ? hints : undefined,
      };
    });

    // Provide helpful suggestions
    const suggestions: string[] = [];

    if (!search && type === "all") {
      suggestions.push(
        "Tip: Use type:'number' to find Story Points field, type:'array' to find Sprint field"
      );
      suggestions.push(
        "Tip: Use search:'story' or search:'sprint' to narrow results"
      );
    }

    // Count stats
    const stats = {
      total: allFields.length,
      filtered: filteredFields.length,
      customFields: filteredFields.filter((f) => f.custom).length,
    };

    const response = {
      fields: formattedFields,
      stats,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      usage: {
        message:
          "Found a field? Use jira_configure_fields to set it as your Story Points or Sprint field.",
        example: {
          storyPoints: "jira_configure_fields(storyPoints: 'customfield_10016')",
          sprint: "jira_configure_fields(sprint: 'customfield_10020')",
        },
      },
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
            text: `Failed to fetch fields: ${error.message} (status: ${error.statusCode})`,
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
          text: `Failed to fetch fields: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
