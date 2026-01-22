/**
 * PR Context Builder
 *
 * Generates Pull Request context from Jira issues.
 * Provides title suggestions, body templates, and testing checklists.
 */

import type { IssueContext, PRContextResult } from "./types.js";

/**
 * Issue type to label mapping.
 */
const ISSUE_TYPE_LABELS: Record<string, string[]> = {
  bug: ["bug", "fix"],
  defect: ["bug", "fix"],
  story: ["feature", "enhancement"],
  task: ["task"],
  "new feature": ["feature", "enhancement"],
  enhancement: ["enhancement"],
  improvement: ["enhancement"],
  documentation: ["documentation", "docs"],
  "technical debt": ["tech-debt", "refactor"],
  test: ["testing"],
  hotfix: ["hotfix", "urgent"],
};

/**
 * Default testing checklist items.
 */
const DEFAULT_TESTING_CHECKLIST = [
  "Unit tests pass locally",
  "Integration tests pass",
  "Manual testing completed",
  "No regressions in existing functionality",
  "Code review completed",
];

/**
 * Testing checklist items by issue type.
 */
const TESTING_CHECKLIST_BY_TYPE: Record<string, string[]> = {
  bug: [
    "Bug reproduction verified before fix",
    "Fix resolves the reported issue",
    "No new regressions introduced",
    "Edge cases considered and tested",
  ],
  story: [
    "Acceptance criteria met",
    "Feature works as specified",
    "UI/UX matches design (if applicable)",
    "Performance is acceptable",
  ],
  hotfix: [
    "Critical issue resolved",
    "Minimal changes to reduce risk",
    "Rollback plan documented",
    "Monitoring in place",
  ],
  documentation: [
    "Documentation is accurate",
    "Examples are correct and runnable",
    "Links are valid",
    "Formatting is consistent",
  ],
};

/**
 * Extracts acceptance criteria from description.
 */
export function extractAcceptanceCriteria(description: string | undefined): string | undefined {
  if (!description) return undefined;

  // Look for common acceptance criteria patterns
  const patterns = [
    /acceptance criteria[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
    /ac[:\s]*\n([\s\S]*?)(?=\n\n|\n#|$)/i,
    /given[\s\S]*?when[\s\S]*?then/gi,
    /\*\s*as a[\s\S]*?so that/gi,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1]?.trim() ?? match[0]?.trim();
    }
  }

  return undefined;
}

/**
 * Generates a PR title from issues.
 */
export function generatePRTitle(issues: readonly IssueContext[]): string {
  if (issues.length === 0) {
    return "Untitled PR";
  }

  if (issues.length === 1) {
    const issue = issues[0];
    return `${issue?.key}: ${issue?.summary}`;
  }

  // Multiple issues - find common type or summarize
  const types = [...new Set(issues.map((i) => i.type.toLowerCase()))];
  const keys = issues.map((i) => i.key).join(", ");

  if (types.length === 1 && types[0] === "bug") {
    return `Fix: ${keys}`;
  }

  if (types.length === 1 && (types[0] === "story" || types[0] === "feature")) {
    return `Feature: ${issues[0]?.summary ?? keys}`;
  }

  // Default to listing keys and first summary
  return `${keys}: ${issues[0]?.summary ?? "Multiple issues"}`;
}

/**
 * Generates PR body from issues.
 */
export function generatePRBody(
  issues: readonly IssueContext[],
  options: {
    includeAcceptanceCriteria?: boolean | undefined;
    includeDescription?: boolean | undefined;
    includeTestingChecklist?: boolean | undefined;
    targetBranch?: string | undefined;
  } = {}
): string {
  const {
    includeAcceptanceCriteria = true,
    includeDescription = true,
    includeTestingChecklist = true,
    targetBranch,
  } = options;

  const sections: string[] = [];

  // Summary section
  sections.push("## Summary");
  if (issues.length === 1) {
    const issue = issues[0];
    sections.push(`This PR addresses [${issue?.key}](${getJiraIssueUrl(issue?.key ?? "")}).`);
    if (includeDescription && issue?.description) {
      sections.push("");
      sections.push(truncateDescription(issue.description));
    }
  } else {
    sections.push("This PR addresses the following issues:");
    sections.push("");
    for (const issue of issues) {
      sections.push(`- [${issue.key}](${getJiraIssueUrl(issue.key)}): ${issue.summary}`);
    }
  }

  // Related Issues section (for Jira linking)
  sections.push("");
  sections.push("## Related Issues");
  for (const issue of issues) {
    sections.push(`- ${issue.key}: ${issue.summary}`);
  }

  // Acceptance Criteria section
  if (includeAcceptanceCriteria) {
    const allCriteria = issues
      .map((i) => ({
        key: i.key,
        criteria: i.acceptanceCriteria ?? extractAcceptanceCriteria(i.description),
      }))
      .filter((item) => item.criteria);

    if (allCriteria.length > 0) {
      sections.push("");
      sections.push("## Acceptance Criteria");
      for (const item of allCriteria) {
        if (issues.length > 1) {
          sections.push(`### ${item.key}`);
        }
        sections.push(item.criteria ?? "");
      }
    }
  }

  // Changes section placeholder
  sections.push("");
  sections.push("## Changes");
  sections.push("<!-- Describe the main changes in this PR -->");
  sections.push("- ");

  // Testing section
  if (includeTestingChecklist) {
    const testingChecklist = generateTestingChecklist(issues);
    sections.push("");
    sections.push("## Testing");
    for (const item of testingChecklist) {
      sections.push(`- [ ] ${item}`);
    }
  }

  // Target branch info
  if (targetBranch) {
    sections.push("");
    sections.push("## Deployment");
    sections.push(`Target branch: \`${targetBranch}\``);
  }

  // Story points summary
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  if (totalPoints > 0) {
    sections.push("");
    sections.push(`**Story Points:** ${totalPoints}`);
  }

  return sections.join("\n");
}

/**
 * Generates testing checklist based on issue types.
 */
export function generateTestingChecklist(issues: readonly IssueContext[]): string[] {
  const checklist = new Set<string>();

  // Add default items
  for (const item of DEFAULT_TESTING_CHECKLIST) {
    checklist.add(item);
  }

  // Add type-specific items
  for (const issue of issues) {
    const typeItems = TESTING_CHECKLIST_BY_TYPE[issue.type.toLowerCase()];
    if (typeItems) {
      for (const item of typeItems) {
        checklist.add(item);
      }
    }
  }

  return Array.from(checklist);
}

/**
 * Suggests labels based on issue types.
 */
export function suggestLabels(issues: readonly IssueContext[]): string[] {
  const labels = new Set<string>();

  for (const issue of issues) {
    const typeLabels = ISSUE_TYPE_LABELS[issue.type.toLowerCase()];
    if (typeLabels) {
      for (const label of typeLabels) {
        labels.add(label);
      }
    }
  }

  // Add size label based on story points
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  if (totalPoints > 0) {
    if (totalPoints <= 2) labels.add("size/small");
    else if (totalPoints <= 5) labels.add("size/medium");
    else labels.add("size/large");
  }

  return Array.from(labels);
}

/**
 * Builds complete PR context from issues.
 */
export function buildPRContext(
  issues: readonly IssueContext[],
  options: {
    includeAcceptanceCriteria?: boolean | undefined;
    includeDescription?: boolean | undefined;
    includeTestingChecklist?: boolean | undefined;
    targetBranch?: string | undefined;
  } = {}
): PRContextResult {
  const {
    includeAcceptanceCriteria = true,
    includeDescription = true,
    includeTestingChecklist = true,
    targetBranch,
  } = options;

  return {
    title: generatePRTitle(issues),
    body: generatePRBody(issues, {
      includeAcceptanceCriteria,
      includeDescription,
      includeTestingChecklist,
      targetBranch,
    }),
    testingChecklist: includeTestingChecklist ? generateTestingChecklist(issues) : [],
    relatedIssues: issues,
    suggestedLabels: suggestLabels(issues),
    reviewersRecommendation: generateReviewersRecommendation(issues),
  };
}

/**
 * Generates reviewers recommendation based on issue context.
 */
function generateReviewersRecommendation(issues: readonly IssueContext[]): string | undefined {
  const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const hasHotfix = issues.some((i) => i.type.toLowerCase() === "hotfix");
  const hasBug = issues.some((i) => i.type.toLowerCase() === "bug");

  if (hasHotfix) {
    return "This is a hotfix - consider expedited review from senior team members";
  }

  if (totalPoints > 8) {
    return "Large PR - consider splitting or requesting multiple reviewers";
  }

  if (hasBug) {
    return "Bug fix - verify the fix addresses the root cause";
  }

  return undefined;
}

/**
 * Truncates description to reasonable length.
 */
function truncateDescription(description: string, maxLength: number = 500): string {
  if (description.length <= maxLength) {
    return description;
  }

  return description.slice(0, maxLength).trim() + "...";
}

/**
 * Gets Jira issue URL (placeholder - would use actual base URL).
 */
function getJiraIssueUrl(issueKey: string): string {
  // This would use the actual Jira base URL from configuration
  return `[Jira ${issueKey}]`;
}

/**
 * Converts Jira issue to IssueContext.
 */
export function jiraIssueToContext(issue: {
  key: string;
  summary: string;
  issueType: string;
  description?: string | null | undefined;
  storyPoints?: number | undefined;
}): IssueContext {
  const context: IssueContext = {
    key: issue.key,
    summary: issue.summary,
    type: issue.issueType,
  };

  // Add optional fields only if they have values
  if (issue.description) {
    const description = issue.description;
    const acceptanceCriteria = extractAcceptanceCriteria(description);

    return {
      ...context,
      description,
      acceptanceCriteria,
      storyPoints: issue.storyPoints,
    };
  }

  if (issue.storyPoints !== undefined) {
    return {
      ...context,
      storyPoints: issue.storyPoints,
    };
  }

  return context;
}
