/**
 * Issue Analyzer
 *
 * Analyzes Jira issues and produces SCRUM guidance recommendations.
 */

import type { JiraIssue } from "../domain/types.js";
import type {
  GuidanceResult,
  GuidanceOptions,
  GuidanceSummary,
  Recommendation,
  WorkflowAction,
  IssueContext,
  StatusCategory,
  ActionPriority,
} from "./types.js";
import {
  getIssueTypeRecommendations,
  getStatusRecommendations,
  calculateHealthScore,
  calculateCompletenessScore,
  isStale,
} from "./rules.js";
import { generateFollowUpPrompts } from "./prompts.js";

/**
 * Extracts analysis context from a Jira issue.
 */
function extractIssueContext(issue: JiraIssue): IssueContext {
  const description = issue.description ?? "";
  const isEmpty = !description || description.trim().length === 0;

  return {
    key: issue.key,
    summary: issue.summary,
    description: {
      hasField: true,
      fieldValue: isEmpty ? undefined : description,
      isEmpty,
    },
    issueType: issue.issueType.name,
    statusCategory: issue.status.categoryKey as StatusCategory,
    statusName: issue.status.name,
    priority: issue.priority?.name,
    assignee: issue.assignee?.displayName,
    labels: issue.labels,
    components: issue.components.map((c) => c.name),
    created: new Date(issue.created),
    updated: new Date(issue.updated),
  };
}

/**
 * Creates a workflow action with a unique ID.
 */
function createWorkflowAction(
  index: number,
  action: string,
  reason: string,
  priority: ActionPriority
): WorkflowAction {
  return {
    id: `WF-${index.toString().padStart(3, "0")}`,
    action,
    reason,
    priority,
  };
}

/**
 * Gets workflow actions based on issue status and state.
 */
function getWorkflowActions(context: IssueContext): WorkflowAction[] {
  const actions: WorkflowAction[] = [];
  let idx = 1;

  const statusCategory = context.statusCategory;

  if (statusCategory === "new") {
    // New issues - triage and assignment
    if (!context.assignee) {
      actions.push(
        createWorkflowAction(
          idx++,
          "Assign owner",
          "New issues should have an assigned owner for accountability",
          "high"
        )
      );
    }

    actions.push(
      createWorkflowAction(
        idx++,
        "Schedule for refinement",
        "New items should be refined before sprint commitment",
        "medium"
      )
    );

    // Type-specific actions
    if (context.issueType.toLowerCase() === "bug") {
      actions.push(
        createWorkflowAction(
          idx++,
          "Triage and prioritize",
          "Bugs need priority assessment based on impact and urgency",
          "high"
        )
      );
    }

    if (context.issueType.toLowerCase() === "story") {
      actions.push(
        createWorkflowAction(
          idx++,
          "Verify ready for development",
          "Check that acceptance criteria and requirements are complete",
          "medium"
        )
      );
    }
  }

  if (statusCategory === "indeterminate") {
    // In progress - monitor and progress

    if (isStale(context.updated, 3)) {
      actions.push(
        createWorkflowAction(
          idx++,
          "Update progress",
          "Issue hasn't been updated in over 3 days - add a progress update",
          "high"
        )
      );
    }

    // Check for potential blockers
    actions.push(
      createWorkflowAction(
        idx++,
        "Check for blockers",
        "Review if there are any impediments preventing progress",
        "medium"
      )
    );

    // Suggest moving forward
    actions.push(
      createWorkflowAction(
        idx++,
        "Move to review when ready",
        "Transition to review/testing when implementation is complete",
        "low"
      )
    );
  }

  if (statusCategory === "done") {
    // Done - post-completion actions
    if (context.issueType.toLowerCase() === "bug") {
      actions.push(
        createWorkflowAction(
          idx++,
          "Document root cause",
          "Adding root cause helps prevent similar bugs in the future",
          "medium"
        )
      );
    }

    if (context.issueType.toLowerCase() === "story") {
      actions.push(
        createWorkflowAction(
          idx++,
          "Update documentation",
          "Ensure relevant documentation is updated with new feature details",
          "low"
        )
      );
    }

    if (context.issueType.toLowerCase() === "epic") {
      actions.push(
        createWorkflowAction(
          idx++,
          "Review outcomes",
          "Evaluate if the epic achieved its business goals",
          "medium"
        )
      );
    }
  }

  return actions;
}

/**
 * Filters recommendations based on detail level.
 */
function filterByDetailLevel(
  recommendations: readonly Recommendation[],
  level: string
): Recommendation[] {
  if (level === "verbose") {
    return [...recommendations];
  }

  if (level === "minimal") {
    // Only critical and high
    return recommendations.filter(
      (r) => r.severity === "critical" || r.severity === "high"
    );
  }

  // Standard - exclude info level
  return recommendations.filter((r) => r.severity !== "info");
}

/**
 * Filters workflow actions based on detail level.
 */
function filterActionsByDetailLevel(
  actions: readonly WorkflowAction[],
  level: string
): WorkflowAction[] {
  if (level === "verbose") {
    return [...actions];
  }

  if (level === "minimal") {
    // Only high priority
    return actions.filter((a) => a.priority === "high");
  }

  // Standard - exclude low priority
  return actions.filter((a) => a.priority !== "low");
}

/**
 * Analyzes a Jira issue and produces SCRUM guidance.
 *
 * @param issue - The Jira issue to analyze
 * @param options - Analysis options (detail level)
 * @returns Complete guidance result
 */
export function analyzeIssue(
  issue: JiraIssue,
  options: GuidanceOptions
): GuidanceResult {
  // Extract context for analysis
  const context = extractIssueContext(issue);

  // Get all recommendations
  const typeRecommendations = getIssueTypeRecommendations(context);
  const statusRecommendations = getStatusRecommendations(context);
  const allRecommendations = [...typeRecommendations, ...statusRecommendations];

  // Get workflow actions
  const allWorkflowActions = getWorkflowActions(context);

  // Calculate scores
  const healthScore = calculateHealthScore(allRecommendations);
  const completenessScore = calculateCompletenessScore(context);

  // Build summary
  const summary: GuidanceSummary = {
    issueKey: issue.key,
    issueType: issue.issueType.name,
    statusCategory: context.statusCategory,
    healthScore,
    completenessScore,
  };

  // Filter based on detail level
  const filteredRecommendations = filterByDetailLevel(
    allRecommendations,
    options.level
  );
  const filteredActions = filterActionsByDetailLevel(
    allWorkflowActions,
    options.level
  );

  // Generate follow-up prompts
  const followUpPrompts = generateFollowUpPrompts(
    context,
    filteredRecommendations,
    filteredActions,
    options.level
  );

  return {
    summary,
    recommendations: filteredRecommendations,
    workflowActions: filteredActions,
    followUpPrompts,
  };
}
