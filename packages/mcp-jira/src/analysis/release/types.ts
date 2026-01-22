/**
 * Release Notes Types
 *
 * Type definitions for release notes compilation.
 */

/**
 * Change type classification.
 */
export type ChangeType =
  | "feature"
  | "enhancement"
  | "fix"
  | "security"
  | "deprecation"
  | "breaking"
  | "documentation"
  | "internal";

/**
 * Target audience for release notes.
 */
export type ReleaseAudience = "user-facing" | "developer" | "internal" | "all";

/**
 * Output format for release notes.
 */
export type ReleaseFormat = "markdown" | "html" | "json" | "slack";

/**
 * Group by options for organizing changes.
 */
export type GroupBy = "type" | "epic" | "component" | "none";

/**
 * A single changelog entry.
 */
export interface ChangelogEntry {
  /** Issue key */
  readonly issueKey: string;
  /** Summary/title */
  readonly summary: string;
  /** Change type */
  readonly type: ChangeType;
  /** Is this a breaking change */
  readonly isBreaking: boolean;
  /** Is this security-related */
  readonly isSecurity: boolean;
  /** Parent epic key (if any) */
  readonly epicKey?: string | undefined;
  /** Epic summary */
  readonly epicSummary?: string | undefined;
  /** Components */
  readonly components: readonly string[];
  /** Labels */
  readonly labels: readonly string[];
  /** Resolution date */
  readonly resolvedDate: string;
  /** Story points */
  readonly storyPoints?: number | undefined;
  /** Assignee */
  readonly assignee?: string | undefined;
}

/**
 * Grouped changelog entries.
 */
export interface ChangelogGroup {
  /** Group title */
  readonly title: string;
  /** Group key (type, epic key, component name) */
  readonly key: string;
  /** Entries in this group */
  readonly entries: readonly ChangelogEntry[];
  /** Total entries */
  readonly count: number;
  /** Has breaking changes */
  readonly hasBreaking: boolean;
}

/**
 * Complete release notes.
 */
export interface ReleaseNotes {
  /** Project key */
  readonly projectKey: string;
  /** Version (if fix version used) */
  readonly version?: string | undefined;
  /** Sprint name (if sprint used) */
  readonly sprintName?: string | undefined;
  /** Date range */
  readonly dateRange: {
    readonly from: string;
    readonly to: string;
  };
  /** Target audience */
  readonly audience: ReleaseAudience;
  /** Output format */
  readonly format: ReleaseFormat;
  /** Grouped changes */
  readonly groups: readonly ChangelogGroup[];
  /** Total changes */
  readonly totalChanges: number;
  /** Total story points */
  readonly totalPoints: number;
  /** Has breaking changes */
  readonly hasBreaking: boolean;
  /** Has security fixes */
  readonly hasSecurity: boolean;
  /** Highlights (most important changes) */
  readonly highlights: readonly ChangelogEntry[];
  /** Contributors */
  readonly contributors: readonly string[];
  /** Generated content */
  readonly content: string;
  /** Generation timestamp */
  readonly generatedAt: string;
}

/**
 * Options for release notes generation.
 */
export interface ReleaseNotesOptions {
  /** Project key */
  readonly projectKey: string;
  /** Fix version to filter by */
  readonly fixVersion?: string | undefined;
  /** Sprint ID to filter by */
  readonly sprintId?: number | undefined;
  /** From date (ISO format) */
  readonly fromDate?: string | undefined;
  /** To date (ISO format) */
  readonly toDate?: string | undefined;
  /** Target audience */
  readonly audience: ReleaseAudience;
  /** Group by option */
  readonly groupBy: GroupBy;
  /** Output format */
  readonly format: ReleaseFormat;
  /** Maximum entries to include */
  readonly maxEntries?: number | undefined;
  /** Include internal/chore items */
  readonly includeInternal?: boolean | undefined;
}

/**
 * Statistics for release notes.
 */
export interface ReleaseStats {
  /** Total issues */
  readonly totalIssues: number;
  /** By type */
  readonly byType: Record<ChangeType, number>;
  /** By component */
  readonly byComponent: Record<string, number>;
  /** Total story points */
  readonly totalPoints: number;
  /** Unique contributors */
  readonly contributorCount: number;
  /** Breaking changes count */
  readonly breakingCount: number;
  /** Security fixes count */
  readonly securityCount: number;
}
