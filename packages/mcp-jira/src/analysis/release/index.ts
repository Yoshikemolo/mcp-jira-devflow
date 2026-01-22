/**
 * Release Notes Module
 *
 * Compiles release notes from completed Jira issues.
 */

// Types
export type {
  ChangeType,
  ReleaseAudience,
  ReleaseFormat,
  GroupBy,
  ChangelogEntry,
  ChangelogGroup,
  ReleaseNotes,
  ReleaseNotesOptions,
  ReleaseStats,
} from "./types.js";

// Collector
export {
  buildReleaseNotesJql,
  issueToChangelogEntry,
  filterByAudience,
  extractDateRange,
  extractContributors,
  extractHighlights,
  calculateStats,
} from "./collector.js";

// Classifier
export {
  classifyChange,
  getChangeTypeDisplayName,
  getChangeTypeEmoji,
  getChangeTypeSortOrder,
} from "./classifier.js";

// Formatter
export {
  groupEntries,
  formatReleaseNotes,
} from "./formatter.js";
