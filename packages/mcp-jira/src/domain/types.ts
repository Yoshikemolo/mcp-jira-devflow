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
  readonly startAt?: number | undefined;
  readonly maxResults?: number | undefined;
  readonly fields?: readonly string[] | undefined;
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
