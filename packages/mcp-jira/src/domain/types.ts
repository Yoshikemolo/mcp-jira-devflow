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

// ============================================================================
// Write Operations Types
// ============================================================================

/**
 * Input for creating a new Jira issue.
 */
export interface CreateIssueInput {
  readonly projectKey: string;
  readonly summary: string;
  readonly issueTypeName: string;
  readonly description?: string | undefined;
  readonly assigneeAccountId?: string | undefined;
  readonly priorityName?: string | undefined;
  readonly labels?: readonly string[] | undefined;
  readonly parentKey?: string | undefined;
  readonly storyPoints?: number | undefined;
}

/**
 * Input for updating an existing Jira issue.
 */
export interface UpdateIssueInput {
  readonly issueKey: string;
  readonly summary?: string | undefined;
  readonly description?: string | undefined;
  readonly assigneeAccountId?: string | null | undefined;
  readonly priorityName?: string | undefined;
  readonly labels?: readonly string[] | undefined;
  readonly storyPoints?: number | undefined;
}

/**
 * Jira workflow transition.
 */
export interface JiraTransition {
  readonly id: string;
  readonly name: string;
  readonly to: JiraStatus;
  readonly hasScreen: boolean;
  readonly isGlobal: boolean;
  readonly isInitial: boolean;
  readonly isConditional: boolean;
}

/**
 * Result of listing available transitions for an issue.
 */
export interface JiraTransitionsResult {
  readonly transitions: readonly JiraTransition[];
}

/**
 * Input for transitioning an issue to a new status.
 */
export interface TransitionIssueInput {
  readonly issueKey: string;
  readonly transitionId?: string | undefined;
  readonly transitionName?: string | undefined;
  readonly fields?: Record<string, unknown> | undefined;
  readonly comment?: string | undefined;
}

/**
 * Result of creating an issue.
 */
export interface CreateIssueResult {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

/**
 * Result of updating an issue.
 */
export interface UpdateIssueResult {
  readonly success: boolean;
  readonly issueKey: string;
}

/**
 * Result of transitioning an issue.
 */
export interface TransitionIssueResult {
  readonly success: boolean;
  readonly issueKey: string;
  readonly transitionName: string;
  readonly newStatus: string;
}

// ============================================================================
// Board and Sprint Management Types
// ============================================================================

/**
 * Jira board type.
 */
export type JiraBoardType = "scrum" | "kanban" | "simple";

/**
 * Jira board location (project info).
 */
export interface JiraBoardLocation {
  readonly projectId: number;
  readonly projectKey: string;
  readonly projectName: string;
  readonly displayName: string;
}

/**
 * Jira board representation.
 */
export interface JiraBoard {
  readonly id: number;
  readonly name: string;
  readonly type: JiraBoardType;
  readonly self: string;
  readonly location?: JiraBoardLocation | undefined;
}

/**
 * Paginated boards result.
 */
export interface JiraBoardsResult {
  readonly boards: readonly JiraBoard[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly isLast: boolean;
}

/**
 * Extended sprint type with origin board info.
 */
export interface JiraSprintExtended extends JiraSprint {
  readonly originBoardId: number;
  readonly self: string;
}

/**
 * Paginated sprints result.
 */
export interface JiraSprintsResult {
  readonly sprints: readonly JiraSprintExtended[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
  readonly isLast: boolean;
}

/**
 * Sprint with its issues.
 */
export interface JiraSprintWithIssues {
  readonly sprint: JiraSprintExtended;
  readonly issues: readonly JiraIssue[];
  readonly total: number;
}

/**
 * Input for moving issues to a sprint.
 */
export interface MoveIssuesToSprintInput {
  readonly sprintId: number;
  readonly issueKeys: readonly string[];
}

/**
 * Result of moving issues to a sprint.
 */
export interface MoveIssuesToSprintResult {
  readonly success: boolean;
  readonly sprintId: number;
  readonly movedIssues: readonly string[];
}

/**
 * Sprint state for updates.
 */
export type SprintState = "active" | "closed" | "future";

/**
 * Input for updating a sprint.
 */
export interface UpdateSprintInput {
  readonly sprintId: number;
  readonly name?: string | undefined;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly goal?: string | undefined;
  readonly state?: SprintState | undefined;
}

/**
 * Result of updating a sprint.
 */
export interface UpdateSprintResult {
  readonly success: boolean;
  readonly sprint: JiraSprintExtended;
}

// ============================================================================
// Field Discovery Types
// ============================================================================

/**
 * Jira field metadata.
 * Used for discovering custom field IDs.
 */
export interface JiraField {
  readonly id: string;
  readonly name: string;
  readonly custom: boolean;
  readonly schemaType?: string | undefined;
  readonly customType?: string | undefined;
  readonly itemsType?: string | undefined;
}

// ============================================================================
// Changelog Types
// ============================================================================

/**
 * A single item that changed within a changelog entry.
 */
export interface JiraChangelogItem {
  readonly field: string;
  readonly fieldtype: string;
  readonly fieldId?: string | undefined;
  readonly from?: string | undefined;
  readonly fromString?: string | undefined;
  readonly to?: string | undefined;
  readonly toString?: string | undefined;
}

/**
 * A changelog entry representing a single change event.
 */
export interface JiraChangelogEntry {
  readonly id: string;
  readonly author: JiraUser;
  readonly created: string;
  readonly items: readonly JiraChangelogItem[];
}

/**
 * Paginated changelog result.
 */
export interface JiraChangelogResult {
  readonly changelog: readonly JiraChangelogEntry[];
  readonly startAt: number;
  readonly maxResults: number;
  readonly total: number;
}

/**
 * Options for fetching changelog.
 */
export interface JiraChangelogOptions {
  readonly startAt?: number | undefined;
  readonly maxResults?: number | undefined;
}
