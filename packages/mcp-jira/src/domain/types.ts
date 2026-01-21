/**
 * Jira Domain Types
 *
 * TypeScript types for Jira entities.
 * These types represent the domain model, not raw API responses.
 *
 * Note: Optional properties use `| undefined` to be compatible with
 * exactOptionalPropertyTypes TypeScript option.
 */

/**
 * Jira sprint representation.
 */
export interface JiraSprint {
  readonly id: number;
  readonly name: string;
  readonly state: "active" | "closed" | "future";
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly completeDate?: string | undefined;
  readonly goal?: string | undefined;
}

/**
 * Jira user representation.
 */
export interface JiraUser {
  readonly accountId: string;
  readonly displayName: string;
  readonly emailAddress?: string | undefined;
  readonly avatarUrl?: string | undefined;
  readonly active: boolean;
}

/**
 * Jira project representation.
 */
export interface JiraProject {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly projectTypeKey: string;
  readonly avatarUrl?: string | undefined;
}

/**
 * Jira status representation.
 */
export interface JiraStatus {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly categoryKey: "new" | "indeterminate" | "done" | "undefined";
}

/**
 * Jira priority representation.
 */
export interface JiraPriority {
  readonly id: string;
  readonly name: string;
  readonly iconUrl?: string | undefined;
}

/**
 * Jira issue type representation.
 */
export interface JiraIssueType {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
  readonly iconUrl?: string | undefined;
  readonly subtask: boolean;
}

/**
 * Jira comment representation.
 */
export interface JiraComment {
  readonly id: string;
  readonly author: JiraUser;
  readonly body: string;
  readonly created: string;
  readonly updated: string;
}

/**
 * Jira issue representation.
 */
export interface JiraIssue {
  readonly id: string;
  readonly key: string;
  readonly self: string;
  readonly summary: string;
  readonly description?: string | undefined;
  readonly status: JiraStatus;
  readonly priority?: JiraPriority | undefined;
  readonly issueType: JiraIssueType;
  readonly project: JiraProject;
  readonly assignee?: JiraUser | undefined;
  readonly reporter?: JiraUser | undefined;
  readonly created: string;
  readonly updated: string;
  readonly labels: readonly string[];
  readonly components: readonly JiraComponent[];
  readonly storyPoints?: number | undefined;
  readonly sprint?: JiraSprint | undefined;
  readonly sprints?: readonly JiraSprint[] | undefined;
}

/**
 * Compact Jira issue representation for large result sets.
 * Contains only essential fields to reduce token usage.
 */
export interface JiraIssueCompact {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly priority?: string | undefined;
  readonly assignee?: string | undefined;
  readonly issueType: string;
  readonly storyPoints?: number | undefined;
}

/**
 * Jira component representation.
 */
export interface JiraComponent {
  readonly id: string;
  readonly name: string;
  readonly description?: string | undefined;
}

/**
 * Search options for JQL queries.
 */
export interface JiraSearchOptions {
  /** @deprecated Use nextPageToken for pagination in Jira Cloud API v3 */
  readonly startAt?: number | undefined;
  readonly maxResults?: number | undefined;
  readonly fields?: readonly string[] | undefined;
  /** Token for fetching a specific page of results (Jira Cloud API v3) */
  readonly nextPageToken?: string | undefined;
}

/**
 * Search result from JQL query.
 *
 * Note: Jira Cloud API v3 (2024+) uses token-based pagination with nextPageToken/isLast
 * instead of the older startAt/total pattern. The total count is no longer available
 * in the new endpoint.
 */
export interface JiraSearchResult {
  readonly issues: readonly JiraIssue[];
  readonly startAt: number;
  readonly maxResults: number;
  /** @deprecated The new Jira API does not return total count. This will be -1 if unknown. */
  readonly total: number;
  /** Token for fetching the next page of results. Undefined if no more pages. */
  readonly nextPageToken?: string | undefined;
  /** Whether this is the last page of results. */
  readonly isLast: boolean;
}

/**
 * Pagination options for list operations.
 */
export interface JiraPaginationOptions {
  readonly startAt?: number | undefined;
  readonly maxResults?: number | undefined;
}

/**
 * Paginated comments result.
 */
export interface JiraCommentsResult {
  readonly comments: readonly JiraComment[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/**
 * Sprint velocity metrics for a single sprint.
 */
export interface SprintVelocityEntry {
  readonly sprint: JiraSprint;
  readonly completedPoints: number;
  readonly completedIssues: number;
  readonly committedPoints: number;
  readonly committedIssues: number;
}

/**
 * Sprint velocity summary with aggregated metrics.
 */
export interface SprintVelocitySummary {
  readonly projectKey: string;
  readonly sprintCount: number;
  readonly sprints: readonly SprintVelocityEntry[];
  readonly averageVelocity: number;
  readonly averageCompletedIssues: number;
  readonly totalCompletedPoints: number;
  readonly totalCompletedIssues: number;
}

/**
 * Issue link type (inward/outward relationship).
 */
export interface JiraIssueLinkType {
  readonly id: string;
  readonly name: string;
  readonly inward: string;
  readonly outward: string;
}

/**
 * Reference to a linked issue (minimal info).
 */
export interface JiraIssueRef {
  readonly id: string;
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly statusCategory: "new" | "indeterminate" | "done" | "undefined";
  readonly issueType: string;
  readonly priority?: string | undefined;
}

/**
 * Issue link between two issues.
 */
export interface JiraIssueLink {
  readonly id: string;
  readonly type: JiraIssueLinkType;
  readonly direction: "inward" | "outward";
  readonly linkedIssue: JiraIssueRef;
}

/**
 * Extended issue with parent/subtask/link information.
 * Used for deep analysis to understand issue hierarchy.
 */
export interface JiraIssueExtended extends JiraIssue {
  readonly parent?: JiraIssueRef | undefined;
  readonly subtasks: readonly JiraIssueRef[];
  readonly issueLinks: readonly JiraIssueLink[];
}
