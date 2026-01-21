/**
 * Guidance Module
 *
 * SCRUM guidance and recommendations for Jira issues.
 * Provides analysis, recommendations, and follow-up prompts.
 */

// Types
export type {
  Severity,
  RecommendationCategory,
  PromptCategory,
  StatusCategory,
  IssueTypeName,
  DetailLevel,
  ActionPriority,
  Recommendation,
  WorkflowAction,
  FollowUpPrompt,
  GuidanceSummary,
  GuidanceResult,
  GuidanceOptions,
  SprintContext,
  GitContext,
  FieldDetection,
  IssueContext,
} from "./types.js";

// Analyzer
export { analyzeIssue } from "./analyzer.js";

// Rules (exported for testing)
export {
  hasAcceptanceCriteria,
  hasUserStoryFormat,
  hasReproductionSteps,
  hasEnvironmentInfo,
  hasExpectedBehavior,
  isStale,
  calculateHealthScore,
  calculateCompletenessScore,
} from "./rules.js";

// Prompts (exported for testing)
export { generateFollowUpPrompts } from "./prompts.js";
