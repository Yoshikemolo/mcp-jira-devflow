/**
 * Context Fetcher
 *
 * Fetches related context (parent, children, linked issues) for deep analysis.
 * Implements token budgeting to prevent overflow.
 */

import type { JiraClient } from "../domain/jira-client.js";
import type { JiraIssue, JiraIssueExtended, JiraIssueRef } from "../domain/types.js";
import type { AnalysisDepth, TokenLevel } from "./types.js";

/**
 * Budget configuration for fetching.
 */
interface FetchBudget {
  readonly maxChildren: number;
  readonly maxLinkedIssues: number;
  readonly fetchParent: boolean;
}

/**
 * Result of context fetching.
 */
export interface FetchedContext {
  readonly rootIssue: JiraIssueExtended;
  readonly parent?: JiraIssueExtended | undefined;
  readonly children: readonly JiraIssue[];
  readonly linkedIssues: readonly JiraIssue[];
  readonly tokenLevel: TokenLevel;
  readonly truncated: boolean;
  readonly truncationInfo?: string | undefined;
}

/**
 * Token thresholds for output level decisions.
 */
const TOKEN_THRESHOLDS = {
  FULL: 20, // <20 issues: full details
  DETAILED: 50, // 20-50 issues: compact children
  COMPACT: 100, // 50-100 issues: status tables
  // >100 issues: summary only
};

/**
 * Determines fetch budget based on depth setting.
 */
function getFetchBudget(depth: AnalysisDepth, maxChildren: number): FetchBudget {
  switch (depth) {
    case "shallow":
      return {
        maxChildren: 0,
        maxLinkedIssues: 0,
        fetchParent: false,
      };
    case "standard":
      return {
        maxChildren: Math.min(maxChildren, 50),
        maxLinkedIssues: 10,
        fetchParent: true,
      };
    case "deep":
      return {
        maxChildren,
        maxLinkedIssues: 20,
        fetchParent: true,
      };
  }
}

/**
 * Determines token level based on total issue count.
 */
export function calculateTokenLevel(totalIssues: number): TokenLevel {
  if (totalIssues < TOKEN_THRESHOLDS.FULL) {
    return "FULL";
  }
  if (totalIssues < TOKEN_THRESHOLDS.DETAILED) {
    return "DETAILED";
  }
  if (totalIssues < TOKEN_THRESHOLDS.COMPACT) {
    return "COMPACT";
  }
  return "SUMMARY";
}

/**
 * Checks if an issue is an epic.
 */
function isEpic(issue: JiraIssue | JiraIssueExtended): boolean {
  return issue.issueType.name.toLowerCase() === "epic";
}

/**
 * Fetches related context for an issue.
 */
export async function fetchContext(
  client: JiraClient,
  issueKey: string,
  depth: AnalysisDepth,
  maxChildren: number,
  includeLinks: boolean
): Promise<FetchedContext> {
  const budget = getFetchBudget(depth, maxChildren);

  // Fetch the root issue with extended data
  const rootIssue = await client.getIssueExtended(issueKey);

  let children: JiraIssue[] = [];
  let linkedIssues: JiraIssue[] = [];
  let parent: JiraIssueExtended | undefined;
  let truncated = false;
  let truncationInfo: string | undefined;

  // Fetch parent if requested and available
  if (budget.fetchParent && rootIssue.parent) {
    try {
      parent = await client.getIssueExtended(rootIssue.parent.key);
    } catch {
      // Parent might not be accessible, continue without it
    }
  }

  // Fetch children based on issue type
  if (budget.maxChildren > 0) {
    if (isEpic(rootIssue)) {
      // For epics, fetch epic children
      children = await client.getEpicChildren(issueKey, budget.maxChildren);
      if (children.length >= budget.maxChildren) {
        truncated = true;
        truncationInfo = `Children limited to ${budget.maxChildren} issues`;
      }
    } else if (rootIssue.subtasks.length > 0) {
      // For regular issues, fetch subtasks using JQL search
      // This ensures story points and sprint fields are included (unlike getIssue)
      children = await client.getSubtasks(issueKey, budget.maxChildren);

      if (rootIssue.subtasks.length > budget.maxChildren) {
        truncated = true;
        truncationInfo = `Subtasks limited to ${budget.maxChildren} (${rootIssue.subtasks.length} total)`;
      }
    }
  }

  // Fetch linked issues if requested
  if (includeLinks && budget.maxLinkedIssues > 0 && rootIssue.issueLinks.length > 0) {
    const linksToFetch = rootIssue.issueLinks.slice(0, budget.maxLinkedIssues);
    const linkPromises = linksToFetch.map(async (link) => {
      try {
        return await client.getIssue(link.linkedIssue.key);
      } catch {
        return null;
      }
    });

    const results = await Promise.all(linkPromises);
    linkedIssues = results.filter((issue): issue is JiraIssue => issue !== null);

    if (rootIssue.issueLinks.length > budget.maxLinkedIssues) {
      const linkTrunc = `Linked issues limited to ${budget.maxLinkedIssues} (${rootIssue.issueLinks.length} total)`;
      truncationInfo = truncationInfo ? `${truncationInfo}; ${linkTrunc}` : linkTrunc;
      truncated = true;
    }
  }

  // Calculate token level based on total issues
  const totalIssues =
    1 + // root
    (parent ? 1 : 0) +
    children.length +
    linkedIssues.length;

  const tokenLevel = calculateTokenLevel(totalIssues);

  return {
    rootIssue,
    parent,
    children,
    linkedIssues,
    tokenLevel,
    truncated,
    truncationInfo,
  };
}

/**
 * Converts an issue ref to a minimal format for token efficiency.
 */
export function toIssueRef(issue: JiraIssue): JiraIssueRef {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    statusCategory: issue.status.categoryKey,
    issueType: issue.issueType.name,
    priority: issue.priority?.name,
  };
}
