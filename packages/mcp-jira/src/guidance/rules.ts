/**
 * SCRUM Rules Engine
 *
 * Contains field detection helpers and SCRUM best practice rules
 * for analyzing Jira issues.
 */

import type {
  IssueContext,
  Recommendation,
  Severity,
  RecommendationCategory,
} from "./types.js";

/**
 * Creates a recommendation with a unique ID.
 */
function createRecommendation(
  prefix: string,
  index: number,
  severity: Severity,
  category: RecommendationCategory,
  title: string,
  description: string,
  suggestedAction: string
): Recommendation {
  return {
    id: `${prefix}-${index.toString().padStart(3, "0")}`,
    severity,
    category,
    title,
    description,
    suggestedAction,
  };
}

/**
 * Checks if description contains acceptance criteria patterns.
 */
export function hasAcceptanceCriteria(description: string | undefined): boolean {
  if (!description) return false;
  const patterns = [
    /given\s+.+\s+when\s+.+\s+then/i,
    /acceptance\s*criteria/i,
    /\bAC\s*:/i,
    /\[\s*\]\s+.+/m, // Checkbox format
    /\*\s+.+/m, // Bullet list
    /-\s+.+/m, // Dash list
  ];
  return patterns.some((p) => p.test(description));
}

/**
 * Checks if description follows user story format.
 */
export function hasUserStoryFormat(summary: string, description: string | undefined): boolean {
  const combined = `${summary} ${description ?? ""}`;
  const pattern = /as\s+a\s+.+,?\s+i\s+want\s+.+,?\s+(so\s+that|to\s+)/i;
  return pattern.test(combined);
}

/**
 * Checks if description has reproduction steps for bugs.
 */
export function hasReproductionSteps(description: string | undefined): boolean {
  if (!description) return false;
  const patterns = [
    /steps\s+to\s+reproduce/i,
    /reproduction\s+steps/i,
    /repro\s*:/i,
    /how\s+to\s+reproduce/i,
    /\d+\.\s+.+\n\d+\.\s+/m, // Numbered steps
  ];
  return patterns.some((p) => p.test(description));
}

/**
 * Checks if description has environment information.
 */
export function hasEnvironmentInfo(description: string | undefined): boolean {
  if (!description) return false;
  const patterns = [
    /environment\s*:/i,
    /browser\s*:/i,
    /version\s*:/i,
    /os\s*:/i,
    /platform\s*:/i,
    /device\s*:/i,
  ];
  return patterns.some((p) => p.test(description));
}

/**
 * Checks if description has expected vs actual behavior.
 */
export function hasExpectedBehavior(description: string | undefined): boolean {
  if (!description) return false;
  const patterns = [
    /expected\s*(behavior|result|outcome)?/i,
    /actual\s*(behavior|result|outcome)?/i,
    /should\s+.+\s+but\s+/i,
  ];
  return patterns.some((p) => p.test(description));
}

/**
 * Checks if issue seems stale based on last update.
 */
export function isStale(updated: Date, thresholdDays: number = 3): boolean {
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > thresholdDays;
}

/**
 * Analyzes a Story issue for SCRUM recommendations.
 */
export function analyzeStory(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  const description = context.description.fieldValue;

  // Check acceptance criteria
  if (!hasAcceptanceCriteria(description)) {
    recommendations.push(
      createRecommendation(
        "STORY",
        idx++,
        "critical",
        "completeness",
        "Missing Acceptance Criteria",
        "Stories should have clear acceptance criteria to define when they are complete.",
        "Add acceptance criteria using: Given... When... Then... format, or a checklist of requirements."
      )
    );
  }

  // Check user story format
  if (!hasUserStoryFormat(context.summary, description)) {
    recommendations.push(
      createRecommendation(
        "STORY",
        idx++,
        "medium",
        "quality",
        "Consider User Story Format",
        "User story format helps clarify the value and audience.",
        'Consider using: "As a [user type], I want [goal], so that [benefit]"'
      )
    );
  }

  // Check description exists
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "STORY",
        idx++,
        "high",
        "completeness",
        "Missing Description",
        "Stories without descriptions are difficult to understand and estimate.",
        "Add a detailed description explaining the feature, its value, and any relevant context."
      )
    );
  }

  // Check assignment for in-progress
  if (context.statusCategory === "indeterminate" && !context.assignee) {
    recommendations.push(
      createRecommendation(
        "STORY",
        idx++,
        "high",
        "assignment",
        "In-Progress Without Assignee",
        "Work in progress should have an owner for accountability.",
        "Assign this story to the team member actively working on it."
      )
    );
  }

  // Check for labels/components
  if (context.labels.length === 0 && context.components.length === 0) {
    recommendations.push(
      createRecommendation(
        "STORY",
        idx++,
        "low",
        "process",
        "Consider Adding Labels or Components",
        "Labels and components help with filtering, reporting, and organization.",
        "Add relevant labels or assign to a component for better tracking."
      )
    );
  }

  return recommendations;
}

/**
 * Analyzes a Bug issue for SCRUM recommendations.
 */
export function analyzeBug(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  const description = context.description.fieldValue;

  // Check reproduction steps
  if (!hasReproductionSteps(description)) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "critical",
        "completeness",
        "Missing Reproduction Steps",
        "Bugs without reproduction steps are difficult to investigate and verify.",
        "Add clear numbered steps to reproduce the issue."
      )
    );
  }

  // Check environment info
  if (!hasEnvironmentInfo(description)) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "high",
        "completeness",
        "Missing Environment Information",
        "Environment details help narrow down the issue scope.",
        "Add environment info: browser, OS, version, device, etc."
      )
    );
  }

  // Check expected vs actual
  if (!hasExpectedBehavior(description)) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "high",
        "quality",
        "Missing Expected vs Actual Behavior",
        "Clearly stating expected and actual behavior helps understand the bug.",
        "Describe what should happen (expected) and what actually happens (actual)."
      )
    );
  }

  // Check priority
  if (!context.priority) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "medium",
        "process",
        "Missing Priority",
        "Bug priority helps with triage and planning.",
        "Set an appropriate priority based on impact and urgency."
      )
    );
  }

  // Check component assignment
  if (context.components.length === 0) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "medium",
        "assignment",
        "No Component Assigned",
        "Component assignment helps route bugs to the right team.",
        "Assign this bug to the affected component."
      )
    );
  }

  // Check description exists
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "BUG",
        idx++,
        "critical",
        "completeness",
        "Missing Description",
        "Bugs without descriptions cannot be investigated.",
        "Add a detailed description of the issue, including steps, environment, and behavior."
      )
    );
  }

  return recommendations;
}

/**
 * Analyzes a Task issue for SCRUM recommendations.
 */
export function analyzeTask(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  // Check description
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "TASK",
        idx++,
        "medium",
        "completeness",
        "Missing Description",
        "Tasks should describe what needs to be done.",
        "Add a clear description of the task scope and deliverables."
      )
    );
  }

  // Check assignment for in-progress
  if (context.statusCategory === "indeterminate" && !context.assignee) {
    recommendations.push(
      createRecommendation(
        "TASK",
        idx++,
        "high",
        "assignment",
        "In-Progress Without Assignee",
        "Active tasks should have an owner.",
        "Assign this task to the person working on it."
      )
    );
  }

  // Check for stale in-progress tasks
  if (context.statusCategory === "indeterminate" && isStale(context.updated)) {
    recommendations.push(
      createRecommendation(
        "TASK",
        idx++,
        "medium",
        "process",
        "Task May Be Stale",
        "This in-progress task hasn't been updated recently.",
        "Review the task status - is it blocked? Should it be moved forward or back?"
      )
    );
  }

  return recommendations;
}

/**
 * Analyzes an Epic issue for SCRUM recommendations.
 */
export function analyzeEpic(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  // Check description
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "EPIC",
        idx++,
        "high",
        "completeness",
        "Missing Description",
        "Epics need clear descriptions to communicate the business value and scope.",
        "Add a description explaining the epic's purpose, goals, and success criteria."
      )
    );
  }

  // Check for business value indicators
  const description = context.description.fieldValue;
  const hasValueIndicators = description && /value|goal|objective|outcome|benefit/i.test(description);
  if (!hasValueIndicators) {
    recommendations.push(
      createRecommendation(
        "EPIC",
        idx++,
        "medium",
        "quality",
        "Consider Adding Business Value Statement",
        "Epics should clearly articulate business value to guide prioritization.",
        "Add a business value or goal statement explaining why this epic matters."
      )
    );
  }

  return recommendations;
}

/**
 * Analyzes a Subtask issue for SCRUM recommendations.
 */
export function analyzeSubtask(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  // Check description
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "SUBTASK",
        idx++,
        "low",
        "completeness",
        "Consider Adding Description",
        "Even subtasks benefit from clear descriptions.",
        "Add a brief description of what this subtask involves."
      )
    );
  }

  // Check assignment for in-progress
  if (context.statusCategory === "indeterminate" && !context.assignee) {
    recommendations.push(
      createRecommendation(
        "SUBTASK",
        idx++,
        "medium",
        "assignment",
        "In-Progress Without Assignee",
        "Active subtasks should have an owner.",
        "Assign this subtask to the person working on it."
      )
    );
  }

  return recommendations;
}

/**
 * Gets issue type-specific recommendations.
 */
export function getIssueTypeRecommendations(context: IssueContext): Recommendation[] {
  const type = context.issueType.toLowerCase();

  if (type === "story") {
    return analyzeStory(context);
  }
  if (type === "bug") {
    return analyzeBug(context);
  }
  if (type === "task") {
    return analyzeTask(context);
  }
  if (type === "epic") {
    return analyzeEpic(context);
  }
  if (type === "sub-task" || type === "subtask") {
    return analyzeSubtask(context);
  }

  // Generic recommendations for unknown types
  const recommendations: Recommendation[] = [];
  if (context.description.isEmpty) {
    recommendations.push(
      createRecommendation(
        "GENERIC",
        1,
        "medium",
        "completeness",
        "Consider Adding Description",
        "Issues with descriptions are easier to understand.",
        "Add a description explaining the context and requirements."
      )
    );
  }
  return recommendations;
}

/**
 * Gets workflow recommendations based on status category.
 */
export function getStatusRecommendations(context: IssueContext): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idx = 1;

  if (context.statusCategory === "new") {
    // New issues - check readiness
    if (!context.assignee) {
      recommendations.push(
        createRecommendation(
          "STATUS",
          idx++,
          "info",
          "process",
          "Unassigned New Issue",
          "New issues should be triaged and assigned.",
          "Consider assigning an owner or scheduling for refinement."
        )
      );
    }
  }

  if (context.statusCategory === "indeterminate") {
    // In progress - check for staleness
    if (isStale(context.updated, 5)) {
      recommendations.push(
        createRecommendation(
          "STATUS",
          idx++,
          "high",
          "process",
          "Stale In-Progress Issue",
          "This issue has been in progress without updates for over 5 days.",
          "Update the issue with current progress, or flag blockers if stuck."
        )
      );
    }
  }

  return recommendations;
}

/**
 * Calculates a health score (0-100) based on recommendations.
 */
export function calculateHealthScore(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) return 100;

  // Deduct points based on severity
  const deductions = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
  };

  let totalDeduction = 0;
  for (const rec of recommendations) {
    totalDeduction += deductions[rec.severity];
  }

  return Math.max(0, 100 - totalDeduction);
}

/**
 * Calculates a completeness score (0-100) based on field presence.
 */
export function calculateCompletenessScore(context: IssueContext): number {
  let score = 0;
  let maxScore = 0;

  // Description (weight: 30)
  maxScore += 30;
  if (!context.description.isEmpty) {
    score += 30;
  }

  // Assignee (weight: 20, higher weight for in-progress)
  const assigneeWeight = context.statusCategory === "indeterminate" ? 25 : 15;
  maxScore += assigneeWeight;
  if (context.assignee) {
    score += assigneeWeight;
  }

  // Priority (weight: 15)
  maxScore += 15;
  if (context.priority) {
    score += 15;
  }

  // Labels or Components (weight: 10)
  maxScore += 10;
  if (context.labels.length > 0 || context.components.length > 0) {
    score += 10;
  }

  // Type-specific completeness
  const type = context.issueType.toLowerCase();
  const description = context.description.fieldValue;

  if (type === "story") {
    // Acceptance criteria (weight: 20)
    maxScore += 20;
    if (hasAcceptanceCriteria(description)) {
      score += 20;
    }
  } else if (type === "bug") {
    // Reproduction steps (weight: 20)
    maxScore += 20;
    if (hasReproductionSteps(description)) {
      score += 20;
    }
  } else {
    // Generic additional completeness
    maxScore += 10;
    if (context.description.fieldValue && context.description.fieldValue.length > 100) {
      score += 10;
    }
  }

  return Math.round((score / maxScore) * 100);
}
