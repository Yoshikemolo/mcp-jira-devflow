/**
 * Summarizer
 *
 * Progressive summarization for token management.
 * Formats output based on token level and output mode.
 */

import type { JiraIssue, JiraIssueRef } from "../domain/types.js";
import type {
  AnalysisOutputMode,
  CompactIssue,
  DeepAnalysisResult,
  FormattedAnalysisOutput,
  HierarchyMetrics,
  HierarchySummary,
  IssueHierarchy,
  IssueHierarchyNode,
  TokenLevel,
} from "./types.js";
import {
  getStatusBreakdown,
  getTypeBreakdown,
} from "./metrics-calculator.js";
import { flattenHierarchy } from "./hierarchy-builder.js";

/**
 * Converts an issue to compact format.
 */
export function toCompactIssue(issue: JiraIssue): CompactIssue {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    type: issue.issueType.name,
    points: issue.storyPoints,
    assignee: issue.assignee?.displayName,
  };
}

/**
 * Converts an issue ref to compact format.
 */
export function refToCompactIssue(ref: JiraIssueRef): CompactIssue {
  return {
    key: ref.key,
    summary: ref.summary,
    status: ref.status,
    type: ref.issueType,
    points: undefined,
    assignee: undefined,
  };
}

/**
 * Creates hierarchy summary for token-efficient output.
 */
export function createHierarchySummary(
  hierarchy: IssueHierarchy,
  metrics: HierarchyMetrics
): HierarchySummary {
  const root = hierarchy.root.issue;
  const allIssues = flattenHierarchy(hierarchy);

  return {
    rootKey: root.key,
    rootType: root.issueType.name,
    rootSummary: root.summary,
    metrics,
    statusBreakdown: getStatusBreakdown(allIssues),
    typeBreakdown: getTypeBreakdown(allIssues),
  };
}

/**
 * Formats hierarchy node for full output.
 * Includes all details for small hierarchies.
 */
function formatNodeFull(node: IssueHierarchyNode): Record<string, unknown> {
  const issue = node.issue;

  const result: Record<string, unknown> = {
    key: issue.key,
    summary: issue.summary,
    type: issue.issueType.name,
    status: issue.status.name,
    statusCategory: issue.status.categoryKey,
    priority: issue.priority?.name,
    assignee: issue.assignee?.displayName,
    storyPoints: issue.storyPoints,
    labels: issue.labels.length > 0 ? issue.labels : undefined,
    sprint: issue.sprint?.name,
    created: issue.created,
    updated: issue.updated,
  };

  if (node.children.length > 0) {
    result["children"] = node.children.map(formatNodeFull);
    result["childrenStoryPoints"] = node.childrenStoryPoints;
  }

  // Remove undefined values
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }

  return result;
}

/**
 * Formats hierarchy node for detailed output.
 * Root is full, children are compact.
 */
function formatNodeDetailed(node: IssueHierarchyNode): Record<string, unknown> {
  const issue = node.issue;

  const result: Record<string, unknown> = {
    key: issue.key,
    summary: issue.summary,
    type: issue.issueType.name,
    status: issue.status.name,
    statusCategory: issue.status.categoryKey,
    priority: issue.priority?.name,
    assignee: issue.assignee?.displayName,
    storyPoints: issue.storyPoints,
  };

  if (node.depth === 0) {
    // Root node gets more detail
    result["labels"] = issue.labels.length > 0 ? issue.labels : undefined;
    result["sprint"] = issue.sprint?.name;
    result["updated"] = issue.updated;
  }

  if (node.children.length > 0) {
    // Children are compact
    result["children"] = node.children.map((child) => toCompactIssue(child.issue));
    result["childrenStoryPoints"] = node.childrenStoryPoints;
  }

  // Remove undefined values
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }

  return result;
}

/**
 * Determines effective output level based on token level and output mode.
 */
function getEffectiveLevel(
  tokenLevel: TokenLevel,
  outputMode: AnalysisOutputMode
): "full" | "detailed" | "compact" | "summary" {
  // Token level acts as a ceiling
  const tokenLevelMap: Record<TokenLevel, number> = {
    FULL: 3,
    DETAILED: 2,
    COMPACT: 1,
    SUMMARY: 0,
  };

  const outputModeMap: Record<AnalysisOutputMode, number> = {
    full: 3,
    detailed: 2,
    summary: 0,
  };

  const effectiveLevel = Math.min(
    tokenLevelMap[tokenLevel],
    outputModeMap[outputMode]
  );

  switch (effectiveLevel) {
    case 3:
      return "full";
    case 2:
      return "detailed";
    case 1:
      return "compact";
    default:
      return "summary";
  }
}

/**
 * Formats the complete analysis result for output.
 */
export function formatAnalysisOutput(
  result: DeepAnalysisResult
): FormattedAnalysisOutput {
  const { hierarchy, metrics, anomalies, tokenLevel, outputMode } = result;

  const effectiveLevel = getEffectiveLevel(tokenLevel, outputMode);
  const summary = createHierarchySummary(hierarchy, metrics);

  const output: FormattedAnalysisOutput = {
    summary,
    metrics,
    anomalies,
  };

  // Add detail based on effective level
  // Using Record to allow adding optional properties
  const mutableOutput = output as unknown as Record<string, unknown>;

  switch (effectiveLevel) {
    case "full":
      mutableOutput["hierarchy"] = formatNodeFull(hierarchy.root);
      if (hierarchy.linkedIssues.length > 0) {
        mutableOutput["linkedIssues"] = hierarchy.linkedIssues.map(refToCompactIssue);
      }
      break;

    case "detailed":
      mutableOutput["hierarchy"] = formatNodeDetailed(hierarchy.root);
      if (hierarchy.linkedIssues.length > 0) {
        mutableOutput["linkedIssues"] = hierarchy.linkedIssues.map(refToCompactIssue);
      }
      break;

    case "compact":
      // Just children list, no full hierarchy
      if (hierarchy.root.children.length > 0) {
        mutableOutput["children"] = hierarchy.root.children.map((child) =>
          toCompactIssue(child.issue)
        );
      }
      break;

    // "summary" - just summary and metrics, no additional detail
  }

  // Add info message about effective level if different from requested
  if (effectiveLevel !== outputMode) {
    (output as { _info: string })._info =
      `Output reduced from '${outputMode}' to '${effectiveLevel}' due to result size (${hierarchy.totalNodes} issues)`;
  }

  return output;
}

/**
 * Converts formatted output to JSON string for MCP response.
 */
export function formatAsJson(output: FormattedAnalysisOutput): string {
  return JSON.stringify(output, null, 2);
}
