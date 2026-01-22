/**
 * Cycle Detector
 *
 * Detects circular dependencies in the dependency graph using DFS.
 */

import type {
  DependencyNode,
  DependencyEdge,
  DependencyCycle,
} from "./types.js";

/**
 * Node colors for DFS cycle detection.
 */
type NodeColor = "white" | "gray" | "black";

/**
 * Detects cycles in the dependency graph using DFS.
 *
 * Uses the standard three-color DFS algorithm:
 * - White: unvisited
 * - Gray: visiting (in current path)
 * - Black: visited (completed)
 *
 * A cycle is detected when we encounter a gray node.
 */
export function detectCycles(
  nodes: readonly DependencyNode[],
  edges: readonly DependencyEdge[]
): DependencyCycle[] {
  const cycles: DependencyCycle[] = [];
  const colors = new Map<string, NodeColor>();
  const parent = new Map<string, string>();
  const path = new Map<string, number>(); // node -> position in current path

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.key, []);
    colors.set(node.key, "white");
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.from);
    if (neighbors && !neighbors.includes(edge.to)) {
      neighbors.push(edge.to);
    }
  }

  /**
   * DFS visit function.
   */
  function visit(node: string, currentPath: string[]): void {
    colors.set(node, "gray");
    path.set(node, currentPath.length);

    const neighbors = adjacency.get(node) ?? [];

    for (const neighbor of neighbors) {
      const neighborColor = colors.get(neighbor);

      if (neighborColor === "white") {
        parent.set(neighbor, node);
        visit(neighbor, [...currentPath, neighbor]);
      } else if (neighborColor === "gray") {
        // Found a cycle - extract the cycle path
        const cycleStartIndex = path.get(neighbor);
        if (cycleStartIndex !== undefined) {
          const cyclePath = currentPath.slice(cycleStartIndex);
          cyclePath.push(neighbor); // Close the cycle

          // Only add if we haven't found this cycle before
          const cycleKey = [...cyclePath].sort().join(",");
          const existingKeys = cycles.map((c) =>
            [...c.path].sort().join(",")
          );

          if (!existingKeys.includes(cycleKey)) {
            cycles.push({
              path: cyclePath,
              length: cyclePath.length,
              description: formatCycleDescription(cyclePath),
            });
          }
        }
      }
      // If black, already processed - no cycle from this path
    }

    colors.set(node, "black");
    path.delete(node);
  }

  // Run DFS from all unvisited nodes
  for (const node of nodes) {
    if (colors.get(node.key) === "white") {
      visit(node.key, [node.key]);
    }
  }

  // Sort cycles by length (shorter cycles first)
  return cycles.sort((a, b) => a.length - b.length);
}

/**
 * Formats a cycle description for display.
 */
function formatCycleDescription(path: readonly string[]): string {
  if (path.length === 2) {
    return `Mutual dependency: ${path[0]} <-> ${path[1]}`;
  }

  const pathString = path.join(" -> ");
  return `Circular dependency chain: ${pathString}`;
}

/**
 * Checks if adding an edge would create a cycle.
 * Useful for preventing new circular dependencies.
 */
export function wouldCreateCycle(
  nodes: readonly DependencyNode[],
  edges: readonly DependencyEdge[],
  newFrom: string,
  newTo: string
): boolean {
  // Check if there's already a path from newTo to newFrom
  // If so, adding newFrom -> newTo would create a cycle

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.key, []);
  }

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.from);
    if (neighbors) {
      neighbors.push(edge.to);
    }
  }

  // BFS to check reachability from newTo to newFrom
  const visited = new Set<string>();
  const queue = [newTo];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === newFrom) {
      return true; // Found a path, would create cycle
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Finds all nodes involved in any cycle.
 */
export function findNodesInCycles(cycles: readonly DependencyCycle[]): Set<string> {
  const nodesInCycles = new Set<string>();

  for (const cycle of cycles) {
    for (const node of cycle.path) {
      nodesInCycles.add(node);
    }
  }

  return nodesInCycles;
}

/**
 * Gets suggestions for breaking a cycle.
 */
export function getCycleBreakingSuggestions(
  cycle: DependencyCycle,
  edges: readonly DependencyEdge[]
): string[] {
  const suggestions: string[] = [];
  const cycleSet = new Set(cycle.path);

  // Find edges that are part of this cycle
  const cycleEdges = edges.filter(
    (e) => cycleSet.has(e.from) && cycleSet.has(e.to)
  );

  // Prioritize breaking non-blocking edges first
  const nonBlockingEdges = cycleEdges.filter((e) => !e.isBlocking);
  const blockingEdges = cycleEdges.filter((e) => e.isBlocking);

  if (nonBlockingEdges.length > 0) {
    const edge = nonBlockingEdges[0]!;
    suggestions.push(
      `Consider removing the "${edge.type}" link from ${edge.from} to ${edge.to}`
    );
  }

  if (blockingEdges.length > 0) {
    // For blocking edges, suggest restructuring
    suggestions.push(
      "Review the blocking relationships to identify which can be removed or restructured"
    );

    // Find the edge with the highest risk level
    const sortedByRisk = [...blockingEdges].sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3)
      );
    });

    if (sortedByRisk[0]) {
      suggestions.push(
        `The most critical blocking dependency is from ${sortedByRisk[0].from} to ${sortedByRisk[0].to}`
      );
    }
  }

  if (cycle.length === 2) {
    suggestions.push(
      "This is a mutual dependency - consider if both directions are truly necessary"
    );
  }

  return suggestions;
}
