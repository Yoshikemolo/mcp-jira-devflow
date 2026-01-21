/**
 * Metrics Calculator
 *
 * Aggregates story points, status distribution, and detects anomalies.
 * Provides insights for issue hierarchy analysis.
 */

import type { JiraIssue } from "../domain/types.js";
import type {
  Anomaly,
  AnomalyType,
  AnomalySeverity,
  HierarchyMetrics,
  IssueHierarchy,
  IssueHierarchyNode,
  StatusDistribution,
} from "./types.js";

/**
 * Threshold for detecting stale in-progress issues (days).
 */
const STALE_THRESHOLD_DAYS = 5;

/**
 * Threshold for points mismatch percentage.
 * If children points differ from parent by more than this, flag it.
 */
const POINTS_MISMATCH_THRESHOLD = 0.1; // 10%

/**
 * Calculates status distribution from a list of issues.
 */
function calculateStatusDistribution(issues: readonly JiraIssue[]): StatusDistribution {
  let newCount = 0;
  let inProgressCount = 0;
  let doneCount = 0;

  for (const issue of issues) {
    switch (issue.status.categoryKey) {
      case "new":
        newCount++;
        break;
      case "indeterminate":
        inProgressCount++;
        break;
      case "done":
        doneCount++;
        break;
    }
  }

  return {
    new: newCount,
    inProgress: inProgressCount,
    done: doneCount,
    total: issues.length,
  };
}

/**
 * Collects all issues from a hierarchy node.
 */
function collectIssues(node: IssueHierarchyNode): JiraIssue[] {
  const issues: JiraIssue[] = [node.issue];
  for (const child of node.children) {
    issues.push(...collectIssues(child));
  }
  return issues;
}

/**
 * Calculates aggregate metrics for a hierarchy.
 */
export function calculateMetrics(hierarchy: IssueHierarchy): HierarchyMetrics {
  const allIssues = collectIssues(hierarchy.root);

  let totalStoryPoints = 0;
  let estimatedIssues = 0;
  let completedStoryPoints = 0;

  for (const issue of allIssues) {
    if (issue.storyPoints !== undefined) {
      totalStoryPoints += issue.storyPoints;
      estimatedIssues++;

      if (issue.status.categoryKey === "done") {
        completedStoryPoints += issue.storyPoints;
      }
    }
  }

  const statusDistribution = calculateStatusDistribution(allIssues);
  const remainingStoryPoints = totalStoryPoints - completedStoryPoints;
  const completionPercentage =
    totalStoryPoints > 0
      ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
      : statusDistribution.done > 0
        ? Math.round((statusDistribution.done / statusDistribution.total) * 100)
        : 0;

  return {
    totalIssues: allIssues.length,
    totalStoryPoints,
    estimatedIssues,
    unestimatedIssues: allIssues.length - estimatedIssues,
    statusDistribution,
    completedStoryPoints,
    remainingStoryPoints,
    completionPercentage,
  };
}

/**
 * Creates an anomaly object.
 */
function createAnomaly(
  type: AnomalyType,
  severity: AnomalySeverity,
  title: string,
  description: string,
  affectedIssues: readonly string[],
  suggestion?: string
): Anomaly {
  return {
    type,
    severity,
    title,
    description,
    affectedIssues,
    suggestion,
  };
}

/**
 * Detects points mismatch between parent and children.
 */
function detectPointsMismatch(hierarchy: IssueHierarchy): Anomaly | null {
  const root = hierarchy.root;

  // Skip if no children
  if (root.children.length === 0) {
    return null;
  }

  const parentPoints = root.storyPoints;
  const childrenPoints = root.childrenStoryPoints;

  // Skip if parent has no points
  if (parentPoints === undefined || parentPoints === 0) {
    return null;
  }

  // Check if children have any points
  if (childrenPoints === 0) {
    return null;
  }

  // Calculate mismatch
  const diff = Math.abs(parentPoints - childrenPoints);
  const mismatchRatio = diff / Math.max(parentPoints, childrenPoints);

  if (mismatchRatio > POINTS_MISMATCH_THRESHOLD) {
    const direction = childrenPoints > parentPoints ? "exceeds" : "is less than";
    return createAnomaly(
      "POINTS_MISMATCH",
      "warning",
      "Story Points Mismatch",
      `${root.issue.key} has ${parentPoints} story points but children total ${childrenPoints} points (${direction} parent by ${Math.round(mismatchRatio * 100)}%)`,
      [root.issue.key],
      `Review and align story point estimates. ${
        childrenPoints > parentPoints
          ? "Consider updating parent estimate or breaking down further."
          : "Some children may be missing estimates."
      }`
    );
  }

  return null;
}

/**
 * Detects children without story point estimates.
 */
function detectUnestimatedChildren(hierarchy: IssueHierarchy): Anomaly | null {
  const children = hierarchy.root.children;

  if (children.length === 0) {
    return null;
  }

  const unestimated = children.filter(
    (child) => child.storyPoints === undefined
  );

  if (unestimated.length === 0) {
    return null;
  }

  const severity: AnomalySeverity =
    unestimated.length > children.length * 0.5 ? "warning" : "info";

  return createAnomaly(
    "UNESTIMATED_CHILDREN",
    severity,
    "Children Without Estimates",
    `${unestimated.length} of ${children.length} children are missing story point estimates`,
    unestimated.map((n) => n.issue.key),
    "Add story point estimates to improve tracking accuracy."
  );
}

/**
 * Detects issues that have been in progress for too long.
 */
function detectStaleInProgress(hierarchy: IssueHierarchy): Anomaly | null {
  const now = new Date();
  const staleIssues: string[] = [];

  function checkNode(node: IssueHierarchyNode): void {
    const issue = node.issue;
    if (issue.status.categoryKey === "indeterminate") {
      const updated = new Date(issue.updated);
      const daysSinceUpdate = Math.floor(
        (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate >= STALE_THRESHOLD_DAYS) {
        staleIssues.push(`${issue.key} (${daysSinceUpdate} days)`);
      }
    }

    for (const child of node.children) {
      checkNode(child);
    }
  }

  checkNode(hierarchy.root);

  if (staleIssues.length === 0) {
    return null;
  }

  return createAnomaly(
    "STALE_IN_PROGRESS",
    "warning",
    "Stale In-Progress Issues",
    `${staleIssues.length} issue(s) have been "In Progress" without updates for ${STALE_THRESHOLD_DAYS}+ days`,
    staleIssues,
    "Review these issues for blockers or forgotten status updates."
  );
}

/**
 * Detects sprint items without assignees.
 */
function detectNoAssigneeInSprint(hierarchy: IssueHierarchy): Anomaly | null {
  const unassignedInSprint: string[] = [];

  function checkNode(node: IssueHierarchyNode): void {
    const issue = node.issue;

    // Check if issue is in a sprint and unassigned
    if (issue.sprint && !issue.assignee) {
      // Only flag if not done
      if (issue.status.categoryKey !== "done") {
        unassignedInSprint.push(issue.key);
      }
    }

    for (const child of node.children) {
      checkNode(child);
    }
  }

  checkNode(hierarchy.root);

  if (unassignedInSprint.length === 0) {
    return null;
  }

  return createAnomaly(
    "NO_ASSIGNEE_IN_SPRINT",
    "info",
    "Sprint Items Without Assignee",
    `${unassignedInSprint.length} issue(s) in active sprints have no assignee`,
    unassignedInSprint,
    "Assign team members to ensure work is properly distributed."
  );
}

/**
 * Detects all anomalies in the hierarchy.
 */
export function detectAnomalies(hierarchy: IssueHierarchy): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Run all detectors
  const detectors = [
    detectPointsMismatch,
    detectUnestimatedChildren,
    detectStaleInProgress,
    detectNoAssigneeInSprint,
  ];

  for (const detector of detectors) {
    const anomaly = detector(hierarchy);
    if (anomaly) {
      anomalies.push(anomaly);
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return anomalies;
}

/**
 * Gets status breakdown as a record for output.
 */
export function getStatusBreakdown(issues: readonly JiraIssue[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const issue of issues) {
    const status = issue.status.name;
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }

  return breakdown;
}

/**
 * Gets issue type breakdown as a record for output.
 */
export function getTypeBreakdown(issues: readonly JiraIssue[]): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const issue of issues) {
    const type = issue.issueType.name;
    breakdown[type] = (breakdown[type] ?? 0) + 1;
  }

  return breakdown;
}
