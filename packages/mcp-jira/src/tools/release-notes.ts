/**
 * Release Notes Tool
 *
 * Compiles release notes from completed Jira work.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import type { JiraIssue } from "../domain/types.js";
import {
  buildReleaseNotesJql,
  issueToChangelogEntry,
  filterByAudience,
  extractDateRange,
  extractContributors,
  extractHighlights,
  calculateStats,
  groupEntries,
  formatReleaseNotes,
} from "../analysis/release/index.js";
import type { ReleaseNotes, ReleaseAudience, ReleaseFormat, GroupBy } from "../analysis/release/index.js";

/**
 * Input schema for release notes tool.
 */
export const ReleaseNotesInputSchema = z.object({
  projectKey: z
    .string()
    .min(1, "Project key cannot be empty")
    .regex(/^[A-Z][A-Z0-9]*$/i, "Project key must be alphanumeric")
    .describe("The project key (e.g., 'PROJ')"),
  fixVersion: z
    .string()
    .optional()
    .describe("Filter by fix version"),
  sprintId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by sprint ID"),
  fromDate: z
    .string()
    .optional()
    .describe("From date in ISO format (YYYY-MM-DD)"),
  toDate: z
    .string()
    .optional()
    .describe("To date in ISO format (YYYY-MM-DD)"),
  audience: z
    .enum(["user-facing", "developer", "internal", "all"])
    .optional()
    .default("user-facing")
    .describe("Target audience for release notes"),
  groupBy: z
    .enum(["type", "epic", "component", "none"])
    .optional()
    .default("type")
    .describe("How to group changes"),
  format: z
    .enum(["markdown", "html", "json", "slack"])
    .optional()
    .default("markdown")
    .describe("Output format"),
  maxEntries: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(100)
    .describe("Maximum entries to include"),
});

export type ReleaseNotesInput = z.infer<typeof ReleaseNotesInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const releaseNotesTool = {
  name: "devflow_release_notes",
  description:
    "Compiles release notes from completed Jira work. Classifies changes by type, groups by category, and formats for different audiences (user-facing, developer, internal).",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectKey: {
        type: "string",
        description: "The project key (e.g., 'PROJ')",
        pattern: "^[A-Z][A-Z0-9]*$",
      },
      fixVersion: {
        type: "string",
        description: "Filter by fix version",
      },
      sprintId: {
        type: "number",
        description: "Filter by sprint ID",
      },
      fromDate: {
        type: "string",
        description: "From date (YYYY-MM-DD)",
      },
      toDate: {
        type: "string",
        description: "To date (YYYY-MM-DD)",
      },
      audience: {
        type: "string",
        enum: ["user-facing", "developer", "internal", "all"],
        description: "Target audience",
      },
      groupBy: {
        type: "string",
        enum: ["type", "epic", "component", "none"],
        description: "How to group changes",
      },
      format: {
        type: "string",
        enum: ["markdown", "html", "json", "slack"],
        description: "Output format",
      },
      maxEntries: {
        type: "number",
        description: "Maximum entries (default: 100, max: 200)",
        minimum: 1,
        maximum: 200,
      },
    },
    required: ["projectKey"],
  },
};

/**
 * Fetches issues for release notes.
 */
async function fetchReleaseIssues(
  client: JiraClient,
  jql: string,
  maxEntries: number
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined;
  let pagesLoaded = 0;
  const maxPages = Math.ceil(maxEntries / 50);

  do {
    const result = await client.searchJql(jql, {
      maxResults: Math.min(50, maxEntries - allIssues.length),
      nextPageToken,
    });

    allIssues.push(...result.issues);
    nextPageToken = result.nextPageToken;
    pagesLoaded++;

    if (allIssues.length >= maxEntries) {
      break;
    }
  } while (nextPageToken && pagesLoaded < maxPages);

  return allIssues.slice(0, maxEntries);
}

/**
 * Executes the release notes tool.
 */
export async function executeReleaseNotes(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = ReleaseNotesInputSchema.safeParse(input);

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
    projectKey,
    fixVersion,
    sprintId,
    fromDate,
    toDate,
    audience,
    groupBy,
    format,
    maxEntries,
  } = parseResult.data;
  const normalizedProjectKey = projectKey.toUpperCase();

  try {
    // Build JQL
    const jql = buildReleaseNotesJql({
      projectKey: normalizedProjectKey,
      fixVersion,
      sprintId,
      fromDate,
      toDate,
      audience: audience as ReleaseAudience,
      groupBy: groupBy as GroupBy,
      format: format as ReleaseFormat,
    });

    // Fetch issues
    const issues = await fetchReleaseIssues(client, jql, maxEntries);

    if (issues.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                projectKey: normalizedProjectKey,
                message: "No completed issues found matching the criteria",
                jql,
                recommendation: "Adjust date range, version, or audience filter",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Convert to changelog entries
    const entries = issues.map(issueToChangelogEntry);

    // Filter by audience
    const filteredEntries = filterByAudience(
      entries,
      audience as ReleaseAudience,
      audience === "internal" || audience === "all"
    );

    // Extract metadata
    const dateRange = extractDateRange(filteredEntries);
    const contributors = extractContributors(filteredEntries);
    const highlights = extractHighlights(filteredEntries, 5);
    const stats = calculateStats(filteredEntries);

    // Group entries
    const groups = groupEntries(filteredEntries, groupBy as GroupBy);

    // Build release notes object
    const releaseNotes: ReleaseNotes = {
      projectKey: normalizedProjectKey,
      version: fixVersion,
      sprintName: sprintId ? `Sprint ${sprintId}` : undefined,
      dateRange,
      audience: audience as ReleaseAudience,
      format: format as ReleaseFormat,
      groups,
      totalChanges: filteredEntries.length,
      totalPoints: stats.totalPoints,
      hasBreaking: stats.breakingCount > 0,
      hasSecurity: stats.securityCount > 0,
      highlights,
      contributors,
      content: "",
      generatedAt: new Date().toISOString(),
    };

    // Format content
    const formattedContent = formatReleaseNotes(releaseNotes, format as ReleaseFormat);

    // Build response
    const response: Record<string, unknown> = {
      projectKey: normalizedProjectKey,
      version: fixVersion,
      sprintId,
      dateRange,
      audience,
      format,
    };

    // Statistics
    response["statistics"] = {
      totalChanges: stats.totalIssues,
      totalPoints: stats.totalPoints,
      contributors: stats.contributorCount,
      breakingChanges: stats.breakingCount,
      securityFixes: stats.securityCount,
      byType: stats.byType,
    };

    // Highlights
    if (highlights.length > 0) {
      response["highlights"] = highlights.map((h) => ({
        key: h.issueKey,
        summary: h.summary,
        type: h.type,
        isBreaking: h.isBreaking,
        isSecurity: h.isSecurity,
      }));
    }

    // Warnings
    const warnings: string[] = [];
    if (stats.breakingCount > 0) {
      warnings.push(`Contains ${stats.breakingCount} breaking change(s) - document migration steps`);
    }
    if (stats.securityCount > 0) {
      warnings.push(`Contains ${stats.securityCount} security fix(es) - prioritize release`);
    }
    if (warnings.length > 0) {
      response["warnings"] = warnings;
    }

    // The formatted content
    response["content"] = formattedContent;

    // Group summary
    response["groups"] = groups.map((g) => ({
      title: g.title,
      count: g.count,
      hasBreaking: g.hasBreaking,
    }));

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
          text: `Failed to compile release notes: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
