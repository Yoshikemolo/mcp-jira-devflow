/**
 * Dependency Analysis Types
 *
 * Type definitions for cross-project dependency analysis.
 */

/**
 * Link types for dependency relationships.
 */
export type DependencyLinkType =
  | "blocks"
  | "is blocked by"
  | "depends on"
  | "is depended on by"
  | "relates to"
  | "clones"
  | "is cloned by"
  | "duplicates"
  | "is duplicated by";

/**
 * Risk level for dependencies.
 */
export type DependencyRiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Node in the dependency graph.
 */
export interface DependencyNode {
  /** Issue key */
  readonly key: string;
  /** Issue summary */
  readonly summary: string;
  /** Project key */
  readonly projectKey: string;
  /** Issue type */
  readonly issueType: string;
  /** Current status */
  readonly status: string;
  /** Status category */
  readonly statusCategory: "new" | "indeterminate" | "done" | "undefined";
  /** Story points if available */
  readonly storyPoints?: number | undefined;
  /** Assignee display name */
  readonly assignee?: string | undefined;
  /** Number of inbound dependencies (other issues depend on this) */
  readonly inDegree: number;
  /** Number of outbound dependencies (this depends on other issues) */
  readonly outDegree: number;
  /** Total connections */
  readonly totalDegree: number;
  /** Whether this is a critical path node */
  readonly isCriticalPath: boolean;
}

/**
 * Edge in the dependency graph.
 */
export interface DependencyEdge {
  /** Source issue key */
  readonly from: string;
  /** Target issue key */
  readonly to: string;
  /** Link type */
  readonly type: DependencyLinkType;
  /** Whether this is a blocking relationship */
  readonly isBlocking: boolean;
  /** Whether the target is completed */
  readonly isResolved: boolean;
  /** Risk level of this dependency */
  readonly riskLevel: DependencyRiskLevel;
}

/**
 * A cycle (circular dependency) in the graph.
 */
export interface DependencyCycle {
  /** Issues involved in the cycle */
  readonly path: readonly string[];
  /** Length of the cycle */
  readonly length: number;
  /** Description of the cycle */
  readonly description: string;
}

/**
 * A blocking chain (sequence of blocking dependencies).
 */
export interface BlockingChain {
  /** Chain of issue keys from root blocker to blocked */
  readonly chain: readonly string[];
  /** Length of the chain */
  readonly length: number;
  /** Root blocker (first item) */
  readonly rootBlocker: string;
  /** Final blocked issue */
  readonly finalBlocked: string;
  /** Whether the root blocker is done */
  readonly isRootResolved: boolean;
  /** Total story points blocked */
  readonly blockedPoints: number;
}

/**
 * Cascade risk for a node (impact if delayed).
 */
export interface CascadeRisk {
  /** Issue key */
  readonly issueKey: string;
  /** Number of issues directly blocked */
  readonly directlyBlocked: number;
  /** Number of issues transitively blocked */
  readonly transitivelyBlocked: number;
  /** Total story points at risk */
  readonly pointsAtRisk: number;
  /** Risk level */
  readonly riskLevel: DependencyRiskLevel;
  /** Affected issue keys */
  readonly affectedIssues: readonly string[];
}

/**
 * Complete dependency graph.
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  readonly nodes: readonly DependencyNode[];
  /** All edges in the graph */
  readonly edges: readonly DependencyEdge[];
  /** Number of nodes */
  readonly nodeCount: number;
  /** Number of edges */
  readonly edgeCount: number;
  /** Projects included in the graph */
  readonly projects: readonly string[];
  /** Detected cycles */
  readonly cycles: readonly DependencyCycle[];
  /** Blocking chains (longest paths) */
  readonly blockingChains: readonly BlockingChain[];
  /** Critical path nodes (high cascade risk) */
  readonly criticalPathNodes: readonly string[];
  /** Cascade risks per node */
  readonly cascadeRisks: readonly CascadeRisk[];
}

/**
 * Options for building dependency graph.
 */
export interface DependencyGraphOptions {
  /** Projects to include */
  readonly projectKeys: readonly string[];
  /** Link types to follow (default: all blocking types) */
  readonly linkTypes?: readonly DependencyLinkType[] | undefined;
  /** Whether to detect cycles (default: true) */
  readonly detectCycles?: boolean | undefined;
  /** Whether to calculate cascade risks (default: true) */
  readonly calculateCascadeRisks?: boolean | undefined;
  /** Maximum depth for traversal (default: 10) */
  readonly maxDepth?: number | undefined;
}

/**
 * Summary statistics for the graph.
 */
export interface DependencyGraphSummary {
  /** Total nodes */
  readonly nodeCount: number;
  /** Total edges */
  readonly edgeCount: number;
  /** Number of blocking relationships */
  readonly blockingEdgeCount: number;
  /** Number of unresolved blocking relationships */
  readonly unresolvedBlockingCount: number;
  /** Number of cycles detected */
  readonly cycleCount: number;
  /** Longest blocking chain length */
  readonly longestChainLength: number;
  /** Number of critical path nodes */
  readonly criticalNodeCount: number;
  /** Projects analyzed */
  readonly projects: readonly string[];
}

/**
 * Output mode for dependency results.
 */
export type DependencyOutputMode = "summary" | "detailed" | "full";
