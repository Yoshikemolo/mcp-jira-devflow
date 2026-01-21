/**
 * Analysis Module
 *
 * Deep analysis for Jira issue hierarchies.
 * Provides context fetching, hierarchy building, metrics, and anomaly detection.
 */

// Types
export type {
  AnalysisDepth,
  AnalysisOutputMode,
  TokenLevel,
  AnomalyType,
  AnomalySeverity,
  Anomaly,
  StatusDistribution,
  HierarchyMetrics,
  IssueHierarchyNode,
  IssueHierarchy,
  CompactIssue,
  HierarchySummary,
  DeepAnalysisOptions,
  DeepAnalysisResult,
  FormattedAnalysisOutput,
} from "./types.js";

// Context Fetcher
export {
  fetchContext,
  calculateTokenLevel,
  toIssueRef,
} from "./context-fetcher.js";
export type { FetchedContext } from "./context-fetcher.js";

// Hierarchy Builder
export {
  buildHierarchy,
  flattenHierarchy,
  getIssuesAtDepth,
  findNodeByKey,
  getPathToNode,
  hierarchyToRefs,
} from "./hierarchy-builder.js";

// Metrics Calculator
export {
  calculateMetrics,
  detectAnomalies,
  getStatusBreakdown,
  getTypeBreakdown,
} from "./metrics-calculator.js";

// Summarizer
export {
  toCompactIssue,
  refToCompactIssue,
  createHierarchySummary,
  formatAnalysisOutput,
  formatAsJson,
} from "./summarizer.js";
