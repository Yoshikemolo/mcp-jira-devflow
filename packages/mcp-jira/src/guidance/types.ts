/**
 * Guidance Types
 *
 * Type definitions for the SCRUM guidance feature.
 */

/**
 * Severity levels for recommendations.
 */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Categories for recommendations.
 */
export type RecommendationCategory =
  | "completeness"
  | "quality"
  | "process"
  | "estimation"
  | "assignment";

/**
 * Categories for follow-up prompts.
 */
export type PromptCategory = "action" | "research" | "refinement" | "review";

/**
 * Status categories from Jira.
 */
export type StatusCategory = "new" | "indeterminate" | "done" | "undefined";

/**
 * Supported issue types for analysis.
 */
export type IssueTypeName =
  | "Story"
  | "Bug"
  | "Task"
  | "Epic"
  | "Sub-task"
  | "Subtask"
  | string;

/**
 * Detail level for guidance output.
 */
export type DetailLevel = "minimal" | "standard" | "verbose";

/**
 * Priority levels for workflow actions.
 */
export type ActionPriority = "high" | "medium" | "low";

/**
 * A single recommendation from the guidance analysis.
 */
export interface Recommendation {
  readonly id: string;
  readonly severity: Severity;
  readonly category: RecommendationCategory;
  readonly title: string;
  readonly description: string;
  readonly suggestedAction: string;
}

/**
 * A suggested workflow action based on current issue state.
 */
export interface WorkflowAction {
  readonly id: string;
  readonly action: string;
  readonly reason: string;
  readonly priority: ActionPriority;
}

/**
 * A follow-up prompt suggestion.
 */
export interface FollowUpPrompt {
  readonly prompt: string;
  readonly description: string;
  readonly category: PromptCategory;
}

/**
 * Summary of the issue analysis.
 */
export interface GuidanceSummary {
  readonly issueKey: string;
  readonly issueType: string;
  readonly statusCategory: StatusCategory;
  readonly healthScore: number;
  readonly completenessScore: number;
}

/**
 * Complete guidance output from analysis.
 */
export interface GuidanceResult {
  readonly summary: GuidanceSummary;
  readonly recommendations: readonly Recommendation[];
  readonly workflowActions: readonly WorkflowAction[];
  readonly followUpPrompts: readonly FollowUpPrompt[];
}

/**
 * Options for guidance analysis.
 */
export interface GuidanceOptions {
  readonly level: DetailLevel;
}

/**
 * Context for future sprint integration (placeholder).
 */
export interface SprintContext {
  readonly sprintId?: string | undefined;
  readonly sprintName?: string | undefined;
  readonly daysRemaining?: number | undefined;
  readonly sprintGoal?: string | undefined;
}

/**
 * Context for future git integration (placeholder).
 */
export interface GitContext {
  readonly suggestedBranchName?: string | undefined;
  readonly linkedBranches?: readonly string[] | undefined;
  readonly linkedPRs?: readonly string[] | undefined;
}

/**
 * Field detection result for analysis.
 */
export interface FieldDetection {
  readonly hasField: boolean;
  readonly fieldValue?: string | undefined;
  readonly isEmpty: boolean;
}

/**
 * Issue context extracted for analysis.
 */
export interface IssueContext {
  readonly key: string;
  readonly summary: string;
  readonly description: FieldDetection;
  readonly issueType: IssueTypeName;
  readonly statusCategory: StatusCategory;
  readonly statusName: string;
  readonly priority: string | undefined;
  readonly assignee: string | undefined;
  readonly labels: readonly string[];
  readonly components: readonly string[];
  readonly created: Date;
  readonly updated: Date;
}
