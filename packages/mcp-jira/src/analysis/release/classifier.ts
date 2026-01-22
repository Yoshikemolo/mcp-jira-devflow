/**
 * Change Classifier
 *
 * Classifies Jira issues into change types for release notes.
 */

import type { JiraIssue } from "../../domain/types.js";
import type { ChangeType } from "./types.js";

/**
 * Keywords that indicate different change types.
 */
const TYPE_KEYWORDS: Record<ChangeType, string[]> = {
  feature: ["feature", "new", "add", "implement", "create"],
  enhancement: ["enhance", "improve", "update", "upgrade", "optimize"],
  fix: ["fix", "bug", "issue", "error", "crash", "problem", "resolve"],
  security: ["security", "vulnerability", "cve", "auth", "permission", "xss", "injection"],
  deprecation: ["deprecate", "remove", "delete", "sunset"],
  breaking: ["breaking", "incompatible", "migrate", "major"],
  documentation: ["doc", "readme", "guide", "tutorial", "comment"],
  internal: ["internal", "chore", "refactor", "cleanup", "tech debt", "test"],
};

/**
 * Issue type mappings.
 */
const ISSUE_TYPE_MAP: Record<string, ChangeType> = {
  bug: "fix",
  story: "feature",
  task: "enhancement",
  "sub-task": "internal",
  epic: "feature",
  improvement: "enhancement",
  "new feature": "feature",
  "technical task": "internal",
};

/**
 * Label mappings to change types.
 */
const LABEL_MAP: Record<string, ChangeType> = {
  "breaking-change": "breaking",
  "security": "security",
  "documentation": "documentation",
  "feature": "feature",
  "bug": "fix",
  "enhancement": "enhancement",
  "internal": "internal",
  "tech-debt": "internal",
};

/**
 * Classification result.
 */
interface ClassificationResult {
  type: ChangeType;
  isBreaking: boolean;
  isSecurity: boolean;
  confidence: number;
}

/**
 * Classifies a Jira issue into a change type.
 */
export function classifyChange(issue: JiraIssue): ClassificationResult {
  let type: ChangeType = "enhancement";
  let isBreaking = false;
  let isSecurity = false;
  let confidence = 0.5;

  const summary = issue.summary.toLowerCase();
  const labels = issue.labels.map((l) => l.toLowerCase());
  const issueType = issue.issueType.name.toLowerCase();

  // 1. Check labels first (highest confidence)
  for (const label of labels) {
    if (LABEL_MAP[label]) {
      type = LABEL_MAP[label];
      confidence = 0.9;
      break;
    }
  }

  // 2. Check issue type
  if (ISSUE_TYPE_MAP[issueType]) {
    type = ISSUE_TYPE_MAP[issueType];
    confidence = Math.max(confidence, 0.7);
  }

  // 3. Analyze summary for keywords
  for (const [changeType, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (summary.includes(keyword)) {
        // Keywords in summary take precedence over issue type
        if (confidence < 0.8) {
          type = changeType as ChangeType;
          confidence = 0.8;
        }

        // Special handling for flags
        if (changeType === "breaking") {
          isBreaking = true;
        }
        if (changeType === "security") {
          isSecurity = true;
        }
        break;
      }
    }
  }

  // 4. Check for breaking/security labels specifically
  for (const label of labels) {
    if (label.includes("breaking")) {
      isBreaking = true;
    }
    if (label.includes("security") || label.includes("vulnerability")) {
      isSecurity = true;
    }
  }

  // 5. Override type for security if security flag is set
  if (isSecurity && type !== "security") {
    type = "security";
    confidence = 0.95;
  }

  return {
    type,
    isBreaking,
    isSecurity,
    confidence,
  };
}

/**
 * Gets display name for a change type.
 */
export function getChangeTypeDisplayName(type: ChangeType): string {
  const displayNames: Record<ChangeType, string> = {
    feature: "New Features",
    enhancement: "Enhancements",
    fix: "Bug Fixes",
    security: "Security",
    deprecation: "Deprecations",
    breaking: "Breaking Changes",
    documentation: "Documentation",
    internal: "Internal Changes",
  };

  return displayNames[type] ?? type;
}

/**
 * Gets emoji for a change type (for Slack/markdown).
 */
export function getChangeTypeEmoji(type: ChangeType): string {
  const emojis: Record<ChangeType, string> = {
    feature: "✨",
    enhancement: "⬆️",
    fix: "🐛",
    security: "🔒",
    deprecation: "⚠️",
    breaking: "💥",
    documentation: "📝",
    internal: "🔧",
  };

  return emojis[type] ?? "•";
}

/**
 * Determines sort order for change types.
 * Breaking and security first, then features, then others.
 */
export function getChangeTypeSortOrder(type: ChangeType): number {
  const order: Record<ChangeType, number> = {
    breaking: 0,
    security: 1,
    feature: 2,
    enhancement: 3,
    fix: 4,
    deprecation: 5,
    documentation: 6,
    internal: 7,
  };

  return order[type] ?? 99;
}
