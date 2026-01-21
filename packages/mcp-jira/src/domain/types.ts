/**
 * Jira Domain Types
 *
 * TypeScript types for Jira entities.
 * These types represent the domain model, not raw API responses.
 */

/**
 * Jira user representation.
 */
export interface JiraUser {
  readonly accountId: string;
  readonly displayName: string;
  readonly emailAddress?: string;
  readonly avatarUrl?: string;
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
  readonly avatarUrl?: string;
}

/**
 * Jira status representation.
 */
export interface JiraStatus {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryKey: "new" | "indeterminate" | "done" | "undefined";
}

/**
 * Jira priority representation.
 */
export interface JiraPriority {
  readonly id: string;
  readonly name: string;
  readonly iconUrl?: string;
}

/**
 * Jira issue type representation.
 */
export interface JiraIssueType {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly iconUrl?: string;
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
  readonly description?: string;
  readonly status: JiraStatus;
  readonly priority?: JiraPriority;
  readonly issueType: JiraIssueType;
  readonly project: JiraProject;
  readonly assignee?: JiraUser;
  readonly reporter?: JiraUser;
  readonly created: string;
  readonly updated: string;
  readonly labels: readonly string[];
  readonly components: readonly JiraComponent[];
}

/**
 * Jira component representation.
 */
export interface JiraComponent {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/**
 * Search options for JQL queries.
 */
export interface JiraSearchOptions {
  readonly startAt?: number;
  readonly maxResults?: number;
  readonly fields?: readonly string[];
}

/**
 * Search result from JQL query.
 */
export interface JiraSearchResult {
  readonly issues: readonly JiraIssue[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/**
 * Pagination options for list operations.
 */
export interface JiraPaginationOptions {
  readonly startAt?: number;
  readonly maxResults?: number;
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
