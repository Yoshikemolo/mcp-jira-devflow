/**
 * Git Integration Types
 *
 * Type definitions for Git-Jira integration features.
 * Provides repository mapping, branch naming, commit validation, and PR context.
 */

/**
 * Branch type for naming conventions.
 */
export type BranchType = "feature" | "fix" | "chore" | "hotfix" | "release" | "docs" | "refactor" | "test";

/**
 * Commit type for conventional commits.
 */
export type CommitType =
  | "feat"
  | "fix"
  | "docs"
  | "style"
  | "refactor"
  | "perf"
  | "test"
  | "build"
  | "ci"
  | "chore"
  | "revert";

/**
 * Repository information.
 */
export interface RepositoryInfo {
  /** Repository URL */
  readonly url: string;
  /** Repository name (extracted from URL) */
  readonly name: string;
  /** Default branch */
  readonly defaultBranch: string;
  /** Branch naming pattern */
  readonly branchPattern?: string | undefined;
  /** Repository provider (github, gitlab, bitbucket, etc.) */
  readonly provider?: string | undefined;
}

/**
 * Project to repository mapping.
 */
export interface ProjectRepositoryMapping {
  /** Jira project key */
  readonly projectKey: string;
  /** Linked repository */
  readonly repository: RepositoryInfo;
  /** When the mapping was created */
  readonly linkedAt: string;
  /** Who created the mapping */
  readonly linkedBy?: string | undefined;
}

/**
 * Branch name generation input.
 */
export interface BranchNameInput {
  /** Issue key (e.g., PROJECT-123) */
  readonly issueKey: string;
  /** Branch type */
  readonly type?: BranchType | undefined;
  /** Custom format string (e.g., "{type}/{key}-{slug}") */
  readonly format?: string | undefined;
  /** Maximum length for the branch name */
  readonly maxLength?: number | undefined;
}

/**
 * Generated branch name result.
 */
export interface BranchNameResult {
  /** Primary recommended branch name */
  readonly branchName: string;
  /** Alternative suggestions */
  readonly alternatives: readonly string[];
  /** Issue summary used for slug generation */
  readonly issueSummary: string;
  /** Pattern used for generation */
  readonly pattern: string;
  /** Conventions explanation */
  readonly conventions: readonly string[];
}

/**
 * Commit message validation input.
 */
export interface CommitValidationInput {
  /** Commit message to validate */
  readonly message: string;
  /** Project key for issue validation */
  readonly projectKey?: string | undefined;
  /** Whether to require an issue key in the message */
  readonly requireIssueKey?: boolean | undefined;
  /** Allowed commit types */
  readonly allowedTypes?: readonly CommitType[] | undefined;
}

/**
 * Commit validation issue.
 */
export interface CommitValidationIssue {
  /** Issue type */
  readonly type: "error" | "warning" | "info";
  /** Issue message */
  readonly message: string;
  /** Suggestion for fix */
  readonly suggestion?: string | undefined;
}

/**
 * Commit validation result.
 */
export interface CommitValidationResult {
  /** Whether the commit message is valid */
  readonly valid: boolean;
  /** Parsed commit type (if found) */
  readonly commitType?: CommitType | undefined;
  /** Parsed scope (if found) */
  readonly scope?: string | undefined;
  /** Parsed description */
  readonly description?: string | undefined;
  /** Parsed issue keys (if found) */
  readonly issueKeys: readonly string[];
  /** Validation issues */
  readonly issues: readonly CommitValidationIssue[];
  /** Suggestions for improvement */
  readonly suggestions: readonly string[];
  /** Is breaking change */
  readonly isBreakingChange: boolean;
}

/**
 * PR context generation input.
 */
export interface PRContextInput {
  /** Issue keys to include */
  readonly issueKeys: readonly string[];
  /** Include acceptance criteria */
  readonly includeAcceptanceCriteria?: boolean | undefined;
  /** Include descriptions */
  readonly includeDescription?: boolean | undefined;
  /** Include testing checklist */
  readonly includeTestingChecklist?: boolean | undefined;
  /** Target branch for the PR */
  readonly targetBranch?: string | undefined;
}

/**
 * Issue context for PR generation.
 */
export interface IssueContext {
  /** Issue key */
  readonly key: string;
  /** Issue summary */
  readonly summary: string;
  /** Issue type */
  readonly type: string;
  /** Issue description */
  readonly description?: string | undefined;
  /** Acceptance criteria (extracted from description or custom field) */
  readonly acceptanceCriteria?: string | undefined;
  /** Story points */
  readonly storyPoints?: number | undefined;
}

/**
 * Generated PR context.
 */
export interface PRContextResult {
  /** Suggested PR title */
  readonly title: string;
  /** PR body template */
  readonly body: string;
  /** Testing checklist items */
  readonly testingChecklist: readonly string[];
  /** Related issues */
  readonly relatedIssues: readonly IssueContext[];
  /** Labels to apply */
  readonly suggestedLabels: readonly string[];
  /** Reviewers recommendation */
  readonly reviewersRecommendation?: string | undefined;
}

/**
 * Repository link input for tool.
 */
export interface RepositoryLinkInput {
  /** Jira project key */
  readonly projectKey: string;
  /** Repository URL */
  readonly repositoryUrl: string;
  /** Default branch */
  readonly defaultBranch?: string | undefined;
  /** Branch naming pattern */
  readonly branchPattern?: string | undefined;
}

/**
 * Repository link result.
 */
export interface RepositoryLinkResult {
  /** Whether linking was successful */
  readonly success: boolean;
  /** Project key */
  readonly projectKey: string;
  /** Repository info */
  readonly repository: RepositoryInfo;
  /** Message */
  readonly message: string;
  /** Whether this was an update to existing mapping */
  readonly isUpdate: boolean;
}
