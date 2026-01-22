/**
 * Dependency Analysis Module
 *
 * Cross-project dependency graph analysis with cycle detection and risk assessment.
 */

// Types
export type {
  DependencyLinkType,
  DependencyRiskLevel,
  DependencyNode,
  DependencyEdge,
  DependencyCycle,
  BlockingChain,
  CascadeRisk,
  DependencyGraph,
  DependencyGraphOptions,
  DependencyGraphSummary,
  DependencyOutputMode,
} from "./types.js";

// Graph Builder
export {
  buildDependencyGraph,
  getDependencyGraphSummary,
} from "./graph-builder.js";

// Cycle Detector
export {
  detectCycles,
  wouldCreateCycle,
  findNodesInCycles,
  getCycleBreakingSuggestions,
} from "./cycle-detector.js";

// Risk Calculator
export {
  calculateCascadeRisks,
  getProjectRiskScore,
  getRiskRecommendations,
  getUnblockPriorities,
} from "./risk-calculator.js";
