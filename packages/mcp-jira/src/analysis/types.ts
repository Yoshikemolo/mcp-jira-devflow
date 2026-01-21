/**
 * Analysis Types
 *
 * Type definitions for the deep analysis feature.
 * Includes hierarchy analysis, metrics, and anomaly detection.
 */

import type { JiraIssue, JiraIssueExtended, JiraIssueRef } from "../domain/types.js";

/**
 * Analysis depth levels.
 * - shallow: Only the root issue
 * - standard: Root + immediate children/parent
 * - deep: Full hierarchy traversal
 */
export type AnalysisDepth = "shallow" | "standard" | "deep";

/**
 * Output mode for analysis results.
 * Determines verbosity and token usage.
 */
export type AnalysisOutputMode = "summary" | "detailed" | "full";

/**
 * Token budget levels based on context size.
 */
export type TokenLevel = "FULL" | "DETAILED" | "COMPACT" | "SUMMARY";

/**
 * Anomaly types that can be detected.
 */
export type AnomalyType =
  | "POINTS_MISMATCH"
  | "UNESTIMATED_CHILDREN"
  | "STALE_IN_PROGRESS"
  | "NO_ASSIGNEE_IN_SPRINT";

/**
 * Severity for anomalies.
 */
export type AnomalySeverity = "critical" | "warning" | "info";

/**
 * A detected anomaly/insight in the hierarchy.
 */
export interface Anomaly {
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly title: string;
  readonly description: string;
  readonly affectedIssues: readonly string[];
  readonly suggestion?: string | undefined;
}

/**
 * Status distribution for a set of issues.
 */
export interface StatusDistribution {
  readonly new: number;
  readonly inProgress: number;
  readonly done: number;
  readonly total: number;
}

/**
 * Aggregated metrics for a hierarchy.
 */
export interface HierarchyMetrics {
  readonly totalIssues: number;
  readonly totalStoryPoints: number;
  readonly estimatedIssues: number;
  readonly unestimatedIssues: number;
  readonly statusDistribution: StatusDistribution;
  readonly completedStoryPoints: number;
  readonly remainingStoryPoints: number;
  readonly completionPercentage: number;
}

/**
 * Node in the issue hierarchy tree.
 */
export interface IssueHierarchyNode {
  readonly issue: JiraIssue | JiraIssueExtended;
  readonly children: readonly IssueHierarchyNode[];
  readonly storyPoints?: number | undefined;
  readonly childrenStoryPoints: number;
  readonly depth: number;
}

/**
 * Complete issue hierarchy from root.
 */
export interface IssueHierarchy {
  readonly root: IssueHierarchyNode;
  readonly parent?: JiraIssueRef | undefined;
  readonly linkedIssues: readonly JiraIssueRef[];
  readonly totalNodes: number;
  readonly maxDepth: number;
}

/**
 * Compact issue representation for token-efficient output.
 */
export interface CompactIssue {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
  readonly type: string;
  readonly points?: number | undefined;
  readonly assignee?: string | undefined;
}

/**
 * Summary output for large hierarchies.
 */
export interface HierarchySummary {
  readonly rootKey: string;
  readonly rootType: string;
  readonly rootSummary: string;
  readonly metrics: HierarchyMetrics;
  readonly statusBreakdown: Record<string, number>;
  readonly typeBreakdown: Record<string, number>;
}

/**
 * Options for the deep analysis.
 */
export interface DeepAnalysisOptions {
  readonly depth: AnalysisDepth;
  readonly outputMode: AnalysisOutputMode;
  readonly maxChildren: number;
  readonly includeLinks: boolean;
}

/**
 * Complete result from deep analysis.
 */
export interface DeepAnalysisResult {
  readonly issueKey: string;
  readonly hierarchy: IssueHierarchy;
  readonly metrics: HierarchyMetrics;
  readonly anomalies: readonly Anomaly[];
  readonly tokenLevel: TokenLevel;
  readonly outputMode: AnalysisOutputMode;
}

/**
 * Formatted output ready for MCP response.
 */
export interface FormattedAnalysisOutput {
  readonly summary: HierarchySummary;
  readonly metrics: HierarchyMetrics;
  readonly anomalies: readonly Anomaly[];
  readonly hierarchy?: IssueHierarchyNode | undefined;
  readonly children?: readonly CompactIssue[] | undefined;
  readonly linkedIssues?: readonly CompactIssue[] | undefined;
  readonly _info?: string | undefined;
}
