/**
 * Hierarchy Builder
 *
 * Constructs tree structure from fetched issues.
 * Provides hierarchy traversal and aggregation utilities.
 */

import type { JiraIssue, JiraIssueExtended, JiraIssueRef } from "../domain/types.js";
import type { FetchedContext } from "./context-fetcher.js";
import { toIssueRef } from "./context-fetcher.js";
import type { IssueHierarchy, IssueHierarchyNode } from "./types.js";

/**
 * Creates a hierarchy node from an issue.
 */
function createNode(
  issue: JiraIssue | JiraIssueExtended,
  children: readonly IssueHierarchyNode[] = [],
  depth: number = 0
): IssueHierarchyNode {
  const storyPoints = issue.storyPoints;
  const childrenStoryPoints = children.reduce(
    (sum, child) => sum + (child.storyPoints ?? 0) + child.childrenStoryPoints,
    0
  );

  return {
    issue,
    children,
    storyPoints,
    childrenStoryPoints,
    depth,
  };
}

/**
 * Builds children nodes from a list of issues.
 */
function buildChildNodes(
  issues: readonly JiraIssue[],
  depth: number
): IssueHierarchyNode[] {
  return issues.map((issue) => createNode(issue, [], depth));
}

/**
 * Builds the complete issue hierarchy from fetched context.
 */
export function buildHierarchy(context: FetchedContext): IssueHierarchy {
  const { rootIssue, parent, children, linkedIssues } = context;

  // Build child nodes (depth 1)
  const childNodes = buildChildNodes(children, 1);

  // Build root node (depth 0)
  const rootNode = createNode(rootIssue, childNodes, 0);

  // Convert parent and linked issues to refs
  const parentRef = parent ? toIssueRef(parent) : rootIssue.parent;
  const linkedRefs = linkedIssues.map(toIssueRef);

  // Calculate max depth
  let maxDepth = 0;
  function calcMaxDepth(node: IssueHierarchyNode): void {
    maxDepth = Math.max(maxDepth, node.depth);
    for (const child of node.children) {
      calcMaxDepth(child);
    }
  }
  calcMaxDepth(rootNode);

  // Count total nodes
  function countNodes(node: IssueHierarchyNode): number {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }

  return {
    root: rootNode,
    parent: parentRef,
    linkedIssues: linkedRefs,
    totalNodes: countNodes(rootNode),
    maxDepth,
  };
}

/**
 * Flattens the hierarchy into a list of issues.
 */
export function flattenHierarchy(hierarchy: IssueHierarchy): JiraIssue[] {
  const issues: JiraIssue[] = [];

  function collect(node: IssueHierarchyNode): void {
    issues.push(node.issue);
    for (const child of node.children) {
      collect(child);
    }
  }

  collect(hierarchy.root);
  return issues;
}

/**
 * Gets all issues at a specific depth level.
 */
export function getIssuesAtDepth(
  hierarchy: IssueHierarchy,
  targetDepth: number
): JiraIssue[] {
  const issues: JiraIssue[] = [];

  function collect(node: IssueHierarchyNode): void {
    if (node.depth === targetDepth) {
      issues.push(node.issue);
    }
    for (const child of node.children) {
      collect(child);
    }
  }

  collect(hierarchy.root);
  return issues;
}

/**
 * Finds a node by issue key.
 */
export function findNodeByKey(
  hierarchy: IssueHierarchy,
  key: string
): IssueHierarchyNode | undefined {
  function search(node: IssueHierarchyNode): IssueHierarchyNode | undefined {
    if (node.issue.key === key) {
      return node;
    }
    for (const child of node.children) {
      const found = search(child);
      if (found) return found;
    }
    return undefined;
  }

  return search(hierarchy.root);
}

/**
 * Gets the path from root to a specific node.
 */
export function getPathToNode(
  hierarchy: IssueHierarchy,
  key: string
): string[] {
  const path: string[] = [];

  function search(node: IssueHierarchyNode): boolean {
    path.push(node.issue.key);
    if (node.issue.key === key) {
      return true;
    }
    for (const child of node.children) {
      if (search(child)) {
        return true;
      }
    }
    path.pop();
    return false;
  }

  search(hierarchy.root);
  return path;
}

/**
 * Converts hierarchy node to refs for token-efficient output.
 */
export function hierarchyToRefs(node: IssueHierarchyNode): JiraIssueRef[] {
  const refs: JiraIssueRef[] = [];

  function collect(n: IssueHierarchyNode): void {
    refs.push(toIssueRef(n.issue));
    for (const child of n.children) {
      collect(child);
    }
  }

  collect(node);
  return refs;
}
