/**
 * Release Notes Formatter
 *
 * Formats release notes for different output formats.
 */

import type {
  ReleaseNotes,
  ChangelogEntry,
  ChangelogGroup,
  ReleaseFormat,
  GroupBy,
} from "./types.js";
import { getChangeTypeDisplayName, getChangeTypeEmoji, getChangeTypeSortOrder } from "./classifier.js";

/**
 * Groups entries by the specified field.
 */
export function groupEntries(
  entries: readonly ChangelogEntry[],
  groupBy: GroupBy
): ChangelogGroup[] {
  if (groupBy === "none") {
    return [
      {
        title: "Changes",
        key: "all",
        entries,
        count: entries.length,
        hasBreaking: entries.some((e) => e.isBreaking),
      },
    ];
  }

  const groups = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    let key: string;

    switch (groupBy) {
      case "type":
        key = entry.type;
        break;
      case "epic":
        key = entry.epicKey ?? "ungrouped";
        break;
      case "component":
        key = entry.components[0] ?? "ungrouped";
        break;
      default:
        key = "all";
    }

    const existing = groups.get(key) ?? [];
    existing.push(entry);
    groups.set(key, existing);
  }

  // Convert to group objects and sort
  const result: ChangelogGroup[] = [];

  for (const [key, groupEntries] of groups) {
    let title: string;

    switch (groupBy) {
      case "type":
        title = getChangeTypeDisplayName(key as any);
        break;
      case "epic":
        title = groupEntries[0]?.epicSummary ?? key;
        break;
      case "component":
        title = key;
        break;
      default:
        title = key;
    }

    result.push({
      title,
      key,
      entries: groupEntries,
      count: groupEntries.length,
      hasBreaking: groupEntries.some((e) => e.isBreaking),
    });
  }

  // Sort groups by type sort order if grouping by type
  if (groupBy === "type") {
    result.sort((a, b) => getChangeTypeSortOrder(a.key as any) - getChangeTypeSortOrder(b.key as any));
  }

  return result;
}

/**
 * Formats release notes as Markdown.
 */
function formatMarkdown(notes: ReleaseNotes): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Release Notes`);
  lines.push("");

  if (notes.version) {
    lines.push(`**Version:** ${notes.version}`);
  }
  if (notes.sprintName) {
    lines.push(`**Sprint:** ${notes.sprintName}`);
  }
  lines.push(`**Date:** ${notes.dateRange.from} - ${notes.dateRange.to}`);
  lines.push(`**Project:** ${notes.projectKey}`);
  lines.push("");

  // Highlights
  if (notes.highlights.length > 0) {
    lines.push("## Highlights");
    lines.push("");
    for (const highlight of notes.highlights) {
      const emoji = getChangeTypeEmoji(highlight.type);
      lines.push(`- ${emoji} **${highlight.issueKey}**: ${highlight.summary}`);
    }
    lines.push("");
  }

  // Breaking changes warning
  if (notes.hasBreaking) {
    lines.push("> ⚠️ **This release contains breaking changes.** Please review the Breaking Changes section carefully.");
    lines.push("");
  }

  // Security notice
  if (notes.hasSecurity) {
    lines.push("> 🔒 **This release includes security fixes.** Update as soon as possible.");
    lines.push("");
  }

  // Grouped changes
  for (const group of notes.groups) {
    lines.push(`## ${group.title}`);
    lines.push("");

    for (const entry of group.entries) {
      let prefix = "-";
      if (entry.isBreaking) prefix = "- 💥";
      else if (entry.isSecurity) prefix = "- 🔒";

      lines.push(`${prefix} **${entry.issueKey}**: ${entry.summary}`);
    }
    lines.push("");
  }

  // Contributors
  if (notes.contributors.length > 0) {
    lines.push("## Contributors");
    lines.push("");
    lines.push(`Thanks to: ${notes.contributors.join(", ")}`);
    lines.push("");
  }

  // Stats
  lines.push("---");
  lines.push(`*${notes.totalChanges} changes | ${notes.totalPoints} story points*`);

  return lines.join("\n");
}

/**
 * Formats release notes as HTML.
 */
function formatHtml(notes: ReleaseNotes): string {
  const lines: string[] = [];

  lines.push("<div class=\"release-notes\">");
  lines.push(`<h1>Release Notes</h1>`);

  if (notes.version) {
    lines.push(`<p><strong>Version:</strong> ${notes.version}</p>`);
  }
  lines.push(`<p><strong>Date:</strong> ${notes.dateRange.from} - ${notes.dateRange.to}</p>`);

  // Highlights
  if (notes.highlights.length > 0) {
    lines.push("<h2>Highlights</h2>");
    lines.push("<ul>");
    for (const highlight of notes.highlights) {
      lines.push(`<li><strong>${highlight.issueKey}:</strong> ${highlight.summary}</li>`);
    }
    lines.push("</ul>");
  }

  // Grouped changes
  for (const group of notes.groups) {
    lines.push(`<h2>${group.title}</h2>`);
    lines.push("<ul>");
    for (const entry of group.entries) {
      const classes = [
        entry.isBreaking ? "breaking" : "",
        entry.isSecurity ? "security" : "",
      ].filter(Boolean).join(" ");

      lines.push(`<li class="${classes}"><strong>${entry.issueKey}:</strong> ${entry.summary}</li>`);
    }
    lines.push("</ul>");
  }

  lines.push("</div>");

  return lines.join("\n");
}

/**
 * Formats release notes for Slack.
 */
function formatSlack(notes: ReleaseNotes): string {
  const lines: string[] = [];

  lines.push(`*Release Notes* - ${notes.projectKey}`);
  if (notes.version) {
    lines.push(`Version: ${notes.version}`);
  }
  lines.push(`Date: ${notes.dateRange.from} - ${notes.dateRange.to}`);
  lines.push("");

  // Highlights
  if (notes.highlights.length > 0) {
    lines.push("*Highlights*");
    for (const highlight of notes.highlights) {
      const emoji = getChangeTypeEmoji(highlight.type);
      lines.push(`${emoji} \`${highlight.issueKey}\`: ${highlight.summary}`);
    }
    lines.push("");
  }

  // Breaking changes
  const breaking = notes.groups
    .flatMap((g) => g.entries)
    .filter((e) => e.isBreaking);

  if (breaking.length > 0) {
    lines.push(":warning: *Breaking Changes*");
    for (const entry of breaking) {
      lines.push(`• \`${entry.issueKey}\`: ${entry.summary}`);
    }
    lines.push("");
  }

  // Summary
  lines.push(`_${notes.totalChanges} changes | ${notes.totalPoints} points_`);

  return lines.join("\n");
}

/**
 * Formats release notes as JSON.
 */
function formatJson(notes: ReleaseNotes): string {
  return JSON.stringify(
    {
      projectKey: notes.projectKey,
      version: notes.version,
      sprintName: notes.sprintName,
      dateRange: notes.dateRange,
      audience: notes.audience,
      hasBreaking: notes.hasBreaking,
      hasSecurity: notes.hasSecurity,
      totalChanges: notes.totalChanges,
      totalPoints: notes.totalPoints,
      highlights: notes.highlights.map((h) => ({
        key: h.issueKey,
        summary: h.summary,
        type: h.type,
      })),
      groups: notes.groups.map((g) => ({
        title: g.title,
        count: g.count,
        entries: g.entries.map((e) => ({
          key: e.issueKey,
          summary: e.summary,
          type: e.type,
          isBreaking: e.isBreaking,
          isSecurity: e.isSecurity,
        })),
      })),
      contributors: notes.contributors,
      generatedAt: notes.generatedAt,
    },
    null,
    2
  );
}

/**
 * Formats release notes based on the specified format.
 */
export function formatReleaseNotes(notes: ReleaseNotes, format: ReleaseFormat): string {
  switch (format) {
    case "markdown":
      return formatMarkdown(notes);
    case "html":
      return formatHtml(notes);
    case "slack":
      return formatSlack(notes);
    case "json":
      return formatJson(notes);
    default:
      return formatMarkdown(notes);
  }
}
