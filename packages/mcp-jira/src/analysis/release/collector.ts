/**
 * Release Notes Collector
 *
 * Collects completed issues for release notes.
 */

import type { JiraIssue } from "../../domain/types.js";
import type { ChangelogEntry, ReleaseNotesOptions } from "./types.js";
import { classifyChange } from "./classifier.js";

/**
 * Builds the JQL query for collecting release notes issues.
 */
export function buildReleaseNotesJql(options: ReleaseNotesOptions): string {
  const conditions: string[] = [
    `project = "${options.projectKey}"`,
    'status = Done',
  ];

  // Fix version filter
  if (options.fixVersion) {
    conditions.push(`fixVersion = "${options.fixVersion}"`);
  }

  // Sprint filter
  if (options.sprintId) {
    conditions.push(`sprint = ${options.sprintId}`);
  }

  // Date range filter
  if (options.fromDate) {
    conditions.push(`resolved >= "${options.fromDate}"`);
  }
  if (options.toDate) {
    conditions.push(`resolved <= "${options.toDate}"`);
  }

  // Exclude certain issue types for user-facing notes
  if (options.audience === "user-facing") {
    conditions.push('issuetype not in (Sub-task, "Technical Task")');
  }

  return conditions.join(" AND ") + " ORDER BY resolved DESC";
}

/**
 * Converts a Jira issue to a changelog entry.
 */
export function issueToChangelogEntry(issue: JiraIssue): ChangelogEntry {
  const classification = classifyChange(issue);

  return {
    issueKey: issue.key,
    summary: issue.summary,
    type: classification.type,
    isBreaking: classification.isBreaking,
    isSecurity: classification.isSecurity,
    epicKey: undefined, // Would need to fetch parent
    epicSummary: undefined,
    components: issue.components.map((c) => c.name),
    labels: [...issue.labels],
    resolvedDate: issue.updated, // Use updated as proxy for resolved
    storyPoints: issue.storyPoints,
    assignee: issue.assignee?.displayName,
  };
}

/**
 * Filters entries based on audience.
 */
export function filterByAudience(
  entries: readonly ChangelogEntry[],
  audience: string,
  includeInternal: boolean = false
): ChangelogEntry[] {
  return entries.filter((entry) => {
    // Always include security and breaking changes
    if (entry.isSecurity || entry.isBreaking) {
      return true;
    }

    // Filter based on audience
    switch (audience) {
      case "user-facing":
        // Only user-visible changes
        return ["feature", "enhancement", "fix", "deprecation"].includes(entry.type);

      case "developer":
        // Include documentation and some internal
        return ["feature", "enhancement", "fix", "documentation", "deprecation"].includes(entry.type);

      case "internal":
        // Everything including internal
        return true;

      case "all":
      default:
        return includeInternal || entry.type !== "internal";
    }
  });
}

/**
 * Extracts date range from entries.
 */
export function extractDateRange(entries: readonly ChangelogEntry[]): {
  from: string;
  to: string;
} {
  if (entries.length === 0) {
    const now = new Date().toISOString().split("T")[0] ?? new Date().toISOString().slice(0, 10);
    return { from: now, to: now };
  }

  const dates = entries.map((e) => e.resolvedDate).sort();
  const fromDate = dates[0] ?? "";
  const toDate = dates[dates.length - 1] ?? "";
  return {
    from: fromDate.split("T")[0] ?? fromDate,
    to: toDate.split("T")[0] ?? toDate,
  };
}

/**
 * Extracts unique contributors from entries.
 */
export function extractContributors(entries: readonly ChangelogEntry[]): string[] {
  const contributors = new Set<string>();

  for (const entry of entries) {
    if (entry.assignee) {
      contributors.add(entry.assignee);
    }
  }

  return [...contributors].sort();
}

/**
 * Identifies highlight entries (most important changes).
 */
export function extractHighlights(
  entries: readonly ChangelogEntry[],
  maxHighlights: number = 5
): ChangelogEntry[] {
  // Priority order: breaking > security > features > large stories
  const scored = entries.map((entry) => {
    let score = 0;

    if (entry.isBreaking) score += 100;
    if (entry.isSecurity) score += 90;
    if (entry.type === "feature") score += 50;
    if (entry.type === "enhancement") score += 30;
    if ((entry.storyPoints ?? 0) >= 8) score += 20;
    if ((entry.storyPoints ?? 0) >= 5) score += 10;

    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxHighlights)
    .map((s) => s.entry);
}

/**
 * Calculates release statistics.
 */
export function calculateStats(entries: readonly ChangelogEntry[]): {
  totalIssues: number;
  byType: Record<string, number>;
  byComponent: Record<string, number>;
  totalPoints: number;
  contributorCount: number;
  breakingCount: number;
  securityCount: number;
} {
  const byType: Record<string, number> = {};
  const byComponent: Record<string, number> = {};
  const contributors = new Set<string>();

  let totalPoints = 0;
  let breakingCount = 0;
  let securityCount = 0;

  for (const entry of entries) {
    // Count by type
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;

    // Count by component
    for (const component of entry.components) {
      byComponent[component] = (byComponent[component] ?? 0) + 1;
    }

    // Points
    totalPoints += entry.storyPoints ?? 0;

    // Contributors
    if (entry.assignee) {
      contributors.add(entry.assignee);
    }

    // Flags
    if (entry.isBreaking) breakingCount++;
    if (entry.isSecurity) securityCount++;
  }

  return {
    totalIssues: entries.length,
    byType,
    byComponent,
    totalPoints,
    contributorCount: contributors.size,
    breakingCount,
    securityCount,
  };
}
