/**
 * Dependency Graph Builder
 *
 * Builds a dependency graph from Jira issue links.
 */

import type { JiraIssue, JiraIssueLink, JiraIssueExtended } from "../../domain/types.js";
import type {
  DependencyNode,
  DependencyEdge,
  DependencyLinkType,
  DependencyRiskLevel,
  DependencyGraph,
  DependencyGraphOptions,
  BlockingChain,
} from "./types.js";
import { detectCycles } from "./cycle-detector.js";
import { calculateCascadeRisks } from "./risk-calculator.js";

/**
 * Default link types considered as blocking.
 */
const BLOCKING_LINK_TYPES: readonly DependencyLinkType[] = [
  "blocks",
  "is blocked by",
  "depends on",
  "is depended on by",
];

/**
 * Creates a dependency node from a Jira issue.
 */
function createNode(
  issue: JiraIssue | JiraIssueExtended,
  inDegree: number = 0,
  outDegree: number = 0
): DependencyNode {
  return {
    key: issue.key,
    summary: issue.summary,
    projectKey: issue.project.key,
    issueType: issue.issueType.name,
    status: issue.status.name,
    statusCategory: issue.status.categoryKey,
    storyPoints: issue.storyPoints,
    assignee: issue.assignee?.displayName,
    inDegree,
    outDegree,
    totalDegree: inDegree + outDegree,
    isCriticalPath: false, // Updated later
  };
}

/**
 * Determines if a link type is a blocking relationship.
 */
function isBlockingLinkType(linkType: string): boolean {
  const normalized = linkType.toLowerCase();
  return (
    normalized.includes("block") ||
    normalized.includes("depend")
  );
}

/**
 * Normalizes link type to our enum.
 */
function normalizeLinkType(type: string, direction: "inward" | "outward"): DependencyLinkType {
  const normalized = type.toLowerCase();

  if (normalized.includes("block")) {
    return direction === "inward" ? "is blocked by" : "blocks";
  }
  if (normalized.includes("depend")) {
    return direction === "inward" ? "is depended on by" : "depends on";
  }
  if (normalized.includes("clone")) {
    return direction === "inward" ? "is cloned by" : "clones";
  }
  if (normalized.includes("duplicate")) {
    return direction === "inward" ? "is duplicated by" : "duplicates";
  }
  return "relates to";
}

/**
 * Determines risk level based on relationship and status.
 */
function determineEdgeRiskLevel(
  isBlocking: boolean,
  sourceStatus: string,
  targetStatus: string
): DependencyRiskLevel {
  if (!isBlocking) {
    return "low";
  }

  // Blocking relationship where blocker is not done
  if (sourceStatus !== "done" && targetStatus !== "done") {
    return "high";
  }

  if (sourceStatus !== "done") {
    return "medium";
  }

  return "low";
}

/**
 * Creates a dependency edge from a Jira issue link.
 */
function createEdge(
  fromKey: string,
  link: JiraIssueLink,
  fromStatusCategory: string
): DependencyEdge {
  const linkTypeName = link.direction === "inward"
    ? link.type.inward
    : link.type.outward;

  const isBlocking = isBlockingLinkType(linkTypeName);
  const targetStatusCategory = link.linkedIssue.statusCategory;
  const isResolved = targetStatusCategory === "done";

  return {
    from: fromKey,
    to: link.linkedIssue.key,
    type: normalizeLinkType(linkTypeName, link.direction),
    isBlocking,
    isResolved,
    riskLevel: determineEdgeRiskLevel(isBlocking, fromStatusCategory, targetStatusCategory),
  };
}

/**
 * Finds the longest blocking chains in the graph.
 */
function findBlockingChains(
  nodes: Map<string, DependencyNode>,
  edges: readonly DependencyEdge[],
  maxChains: number = 10
): BlockingChain[] {
  const blockingEdges = edges.filter((e) => e.isBlocking);

  // Build adjacency list for blocking edges
  const adjacency = new Map<string, string[]>();
  for (const edge of blockingEdges) {
    const existing = adjacency.get(edge.from) ?? [];
    existing.push(edge.to);
    adjacency.set(edge.from, existing);
  }

  // Find all chains using DFS
  const chains: BlockingChain[] = [];
  const visited = new Set<string>();

  function dfs(node: string, path: string[]): void {
    const neighbors = adjacency.get(node) ?? [];

    if (neighbors.length === 0 || path.length >= 10) {
      // End of chain
      if (path.length >= 2) {
        const rootBlockerKey = path[0]!;
        const finalBlockedKey = path[path.length - 1]!;
        const rootNode = nodes.get(rootBlockerKey);
        const blockedPoints = path
          .slice(1)
          .reduce((sum, key) => sum + (nodes.get(key)?.storyPoints ?? 0), 0);

        chains.push({
          chain: path,
          length: path.length,
          rootBlocker: rootBlockerKey,
          finalBlocked: finalBlockedKey,
          isRootResolved: rootNode?.statusCategory === "done",
          blockedPoints,
        });
      }
      return;
    }

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        dfs(neighbor, [...path, neighbor]);
        visited.delete(neighbor);
      }
    }
  }

  // Start DFS from nodes with no incoming blocking edges
  const hasIncoming = new Set(blockingEdges.map((e) => e.to));
  const roots = Array.from(adjacency.keys()).filter((k) => !hasIncoming.has(k));

  for (const root of roots) {
    visited.add(root);
    dfs(root, [root]);
    visited.delete(root);
  }

  // Sort by length descending and take top N
  return chains
    .sort((a, b) => b.length - a.length)
    .slice(0, maxChains);
}

/**
 * Builds a dependency graph from issues.
 */
export function buildDependencyGraph(
  issues: readonly JiraIssueExtended[],
  options: DependencyGraphOptions
): DependencyGraph {
  const nodeMap = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  const inDegreeCount = new Map<string, number>();
  const outDegreeCount = new Map<string, number>();

  // Filter link types
  const linkTypeFilter = options.linkTypes ?? BLOCKING_LINK_TYPES;
  const shouldIncludeLink = (linkType: string): boolean => {
    if (linkTypeFilter.length === 0) return true;
    const normalized = normalizeLinkType(linkType, "outward");
    return linkTypeFilter.includes(normalized);
  };

  // First pass: collect all edges and count degrees
  for (const issue of issues) {
    if (!options.projectKeys.includes(issue.project.key)) {
      continue;
    }

    for (const link of issue.issueLinks) {
      const linkTypeName = link.direction === "inward"
        ? link.type.inward
        : link.type.outward;

      if (!shouldIncludeLink(linkTypeName)) {
        continue;
      }

      const edge = createEdge(issue.key, link, issue.status.categoryKey);
      edges.push(edge);

      // Update degree counts
      outDegreeCount.set(
        issue.key,
        (outDegreeCount.get(issue.key) ?? 0) + 1
      );
      inDegreeCount.set(
        link.linkedIssue.key,
        (inDegreeCount.get(link.linkedIssue.key) ?? 0) + 1
      );
    }
  }

  // Second pass: create nodes
  for (const issue of issues) {
    if (!options.projectKeys.includes(issue.project.key)) {
      continue;
    }

    const inDeg = inDegreeCount.get(issue.key) ?? 0;
    const outDeg = outDegreeCount.get(issue.key) ?? 0;

    nodeMap.set(issue.key, createNode(issue, inDeg, outDeg));
  }

  // Add nodes for linked issues not in the main list
  for (const edge of edges) {
    if (!nodeMap.has(edge.to)) {
      // Create a minimal node for the linked issue
      const inDeg = inDegreeCount.get(edge.to) ?? 0;
      const outDeg = outDegreeCount.get(edge.to) ?? 0;

      // Find the link info from the original issues
      const sourceIssue = issues.find((i) => i.key === edge.from);
      const linkInfo = sourceIssue?.issueLinks.find(
        (l) => l.linkedIssue.key === edge.to
      );

      if (linkInfo) {
        nodeMap.set(edge.to, {
          key: edge.to,
          summary: linkInfo.linkedIssue.summary,
          projectKey: edge.to.split("-")[0] ?? "UNKNOWN",
          issueType: linkInfo.linkedIssue.issueType,
          status: linkInfo.linkedIssue.status,
          statusCategory: linkInfo.linkedIssue.statusCategory,
          storyPoints: undefined,
          assignee: undefined,
          inDegree: inDeg,
          outDegree: outDeg,
          totalDegree: inDeg + outDeg,
          isCriticalPath: false,
        });
      }
    }
  }

  const nodes = Array.from(nodeMap.values());

  // Detect cycles if requested
  const cycles = options.detectCycles !== false
    ? detectCycles(nodes, edges)
    : [];

  // Calculate cascade risks if requested
  const cascadeRisks = options.calculateCascadeRisks !== false
    ? calculateCascadeRisks(nodeMap, edges)
    : [];

  // Find blocking chains
  const blockingChains = findBlockingChains(nodeMap, edges);

  // Identify critical path nodes
  const criticalPathNodes = cascadeRisks
    .filter((r) => r.riskLevel === "high" || r.riskLevel === "critical")
    .map((r) => r.issueKey);

  // Update nodes with critical path flag
  const updatedNodes = nodes.map((node) => ({
    ...node,
    isCriticalPath: criticalPathNodes.includes(node.key),
  }));

  // Get unique projects
  const projects = [...new Set(nodes.map((n) => n.projectKey))];

  return {
    nodes: updatedNodes,
    edges,
    nodeCount: updatedNodes.length,
    edgeCount: edges.length,
    projects,
    cycles,
    blockingChains,
    criticalPathNodes,
    cascadeRisks,
  };
}

/**
 * Gets a summary of the dependency graph.
 */
export function getDependencyGraphSummary(graph: DependencyGraph): {
  nodeCount: number;
  edgeCount: number;
  blockingEdgeCount: number;
  unresolvedBlockingCount: number;
  cycleCount: number;
  longestChainLength: number;
  criticalNodeCount: number;
  projects: readonly string[];
} {
  const blockingEdges = graph.edges.filter((e) => e.isBlocking);
  const unresolvedBlocking = blockingEdges.filter((e) => !e.isResolved);

  return {
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    blockingEdgeCount: blockingEdges.length,
    unresolvedBlockingCount: unresolvedBlocking.length,
    cycleCount: graph.cycles.length,
    longestChainLength:
      graph.blockingChains.length > 0
        ? Math.max(...graph.blockingChains.map((c) => c.length))
        : 0,
    criticalNodeCount: graph.criticalPathNodes.length,
    projects: graph.projects,
  };
}
