/**
 * Search JQL Tool
 *
 * MCP tool for searching Jira issues using JQL.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";

/**
 * Input schema for search_jql tool.
 */
export const SearchJqlInputSchema = z.object({
  jql: z
    .string()
    .min(1, "JQL query cannot be empty")
    .describe("The JQL query string"),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("The index of the first result to return (0-based)"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(50)
    .describe("Maximum number of results to return (max 50)"),
});

export type SearchJqlInput = z.infer<typeof SearchJqlInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const searchJqlTool = {
  name: "search_jql",
  description:
    "Searches for Jira issues using JQL (Jira Query Language). Returns a list of matching issues with pagination support. Maximum 50 results per request.",
  inputSchema: {
    type: "object" as const,
    properties: {
      jql: {
        type: "string",
        description: "The JQL query string (e.g., 'project = PROJ AND status = Open')",
      },
      startAt: {
        type: "number",
        description: "The index of the first result to return (0-based, default 0)",
        minimum: 0,
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return (1-50, default 50)",
        minimum: 1,
        maximum: 50,
      },
    },
    required: ["jql"],
  },
};

/**
 * Executes the search_jql tool.
 */
export async function executeSearchJql(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = SearchJqlInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { jql, startAt, maxResults } = parseResult.data;

  try {
    const result = await client.searchJql(jql, { startAt, maxResults });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total: result.total,
              startAt: result.startAt,
              maxResults: result.maxResults,
              issueCount: result.issues.length,
              issues: result.issues,
            },
            null,
            2
          ),
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

    // JQL syntax errors or other errors
    return {
      content: [
        {
          type: "text",
          text: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
