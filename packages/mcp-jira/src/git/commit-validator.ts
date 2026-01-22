/**
 * Commit Validator
 *
 * Validates commit messages against conventional commits format
 * and checks for issue key references.
 */

import type {
  CommitType,
  CommitValidationResult,
  CommitValidationIssue,
} from "./types.js";

/**
 * Conventional commit pattern.
 * Format: type(scope)?: description
 *
 * Examples:
 * - feat: add new feature
 * - fix(auth): resolve login issue
 * - feat!: breaking change
 */
const CONVENTIONAL_COMMIT_REGEX = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

/**
 * Issue key pattern (e.g., PROJECT-123).
 */
const ISSUE_KEY_REGEX = /\b([A-Z][A-Z0-9]*-\d+)\b/g;

/**
 * Valid conventional commit types.
 */
const VALID_COMMIT_TYPES: CommitType[] = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

/**
 * Commit type descriptions for suggestions.
 */
const COMMIT_TYPE_DESCRIPTIONS: Record<CommitType, string> = {
  feat: "A new feature",
  fix: "A bug fix",
  docs: "Documentation only changes",
  style: "Changes that do not affect the meaning of the code",
  refactor: "A code change that neither fixes a bug nor adds a feature",
  perf: "A code change that improves performance",
  test: "Adding missing tests or correcting existing tests",
  build: "Changes that affect the build system or dependencies",
  ci: "Changes to CI configuration files and scripts",
  chore: "Other changes that don't modify src or test files",
  revert: "Reverts a previous commit",
};

/**
 * Maximum recommended lengths.
 */
const MAX_SUBJECT_LENGTH = 72;
const MAX_LINE_LENGTH = 100;

/**
 * Validates a commit message against conventional commits and project conventions.
 */
export function validateCommitMessage(
  message: string,
  options: {
    projectKey?: string | undefined;
    requireIssueKey?: boolean | undefined;
    allowedTypes?: readonly CommitType[] | undefined;
  } = {}
): CommitValidationResult {
  const {
    projectKey,
    requireIssueKey = false,
    allowedTypes = VALID_COMMIT_TYPES,
  } = options;

  const issues: CommitValidationIssue[] = [];
  const suggestions: string[] = [];

  // Split message into subject and body
  const lines = message.trim().split("\n");
  const subject = lines[0] ?? "";
  const body = lines.slice(1).join("\n").trim();

  // Parse conventional commit format
  const match = subject.match(CONVENTIONAL_COMMIT_REGEX);

  let commitType: CommitType | undefined;
  let scope: string | undefined;
  let description: string | undefined;
  let isBreakingChange = false;

  if (match) {
    const [, type, scopeMatch, breaking, desc] = match;
    commitType = type as CommitType;
    scope = scopeMatch;
    description = desc;
    isBreakingChange = breaking === "!" || /^BREAKING CHANGE:/m.test(body);

    // Validate commit type
    if (!allowedTypes.includes(commitType)) {
      issues.push({
        type: "error",
        message: `Invalid commit type: '${commitType}'`,
        suggestion: `Use one of: ${allowedTypes.join(", ")}`,
      });
    }
  } else {
    issues.push({
      type: "error",
      message: "Commit message does not follow conventional commits format",
      suggestion: "Format: type(scope)?: description",
    });
    suggestions.push("Example: feat(auth): add login functionality");
    suggestions.push("Example: fix: resolve null pointer exception");

    // Try to extract description for partial parsing
    description = subject;
  }

  // Extract issue keys from full message
  const issueKeys = extractIssueKeys(message);

  // Check for project-specific issue key
  if (requireIssueKey && issueKeys.length === 0) {
    issues.push({
      type: "error",
      message: "Commit message must include an issue key",
      suggestion: projectKey
        ? `Add issue key like: ${projectKey}-123`
        : "Add issue key like: PROJECT-123",
    });
  }

  // Check if issue keys match project
  if (projectKey && issueKeys.length > 0) {
    const projectIssues = issueKeys.filter((key) =>
      key.toUpperCase().startsWith(projectKey.toUpperCase() + "-")
    );

    if (projectIssues.length === 0) {
      issues.push({
        type: "warning",
        message: `No issue keys found for project ${projectKey}`,
        suggestion: `Add relevant issue key: ${projectKey}-XXX`,
      });
    }
  }

  // Check subject length
  if (subject.length > MAX_SUBJECT_LENGTH) {
    issues.push({
      type: "warning",
      message: `Subject line exceeds ${MAX_SUBJECT_LENGTH} characters (${subject.length})`,
      suggestion: "Keep subject line concise for better readability",
    });
  }

  // Check subject casing (should start with lowercase after type)
  if (description && /^[A-Z]/.test(description)) {
    issues.push({
      type: "info",
      message: "Description starts with uppercase letter",
      suggestion: "Conventional commits recommend starting with lowercase",
    });
  }

  // Check for period at end of subject
  if (subject.endsWith(".")) {
    issues.push({
      type: "info",
      message: "Subject line ends with period",
      suggestion: "Remove trailing period from subject line",
    });
  }

  // Check body line lengths
  if (body) {
    const longLines = body.split("\n").filter((line) => line.length > MAX_LINE_LENGTH);
    if (longLines.length > 0) {
      issues.push({
        type: "info",
        message: `${longLines.length} line(s) in body exceed ${MAX_LINE_LENGTH} characters`,
        suggestion: "Wrap long lines for better readability",
      });
    }
  }

  // Check for blank line between subject and body
  if (body && lines.length > 1 && lines[1] !== "") {
    issues.push({
      type: "warning",
      message: "Missing blank line between subject and body",
      suggestion: "Add a blank line after the subject line",
    });
  }

  // Add general suggestions
  if (issues.length === 0) {
    if (!body && description && description.length < 20) {
      suggestions.push("Consider adding a body with more context for complex changes");
    }
  }

  // Determine if valid (no errors)
  const valid = !issues.some((issue) => issue.type === "error");

  return {
    valid,
    commitType,
    scope,
    description,
    issueKeys,
    issues,
    suggestions,
    isBreakingChange,
  };
}

/**
 * Extracts issue keys from text.
 */
export function extractIssueKeys(text: string): string[] {
  const matches = text.match(ISSUE_KEY_REGEX) ?? [];
  // Return unique keys, uppercased
  return [...new Set(matches.map((key) => key.toUpperCase()))];
}

/**
 * Suggests a commit message format based on changes description.
 */
export function suggestCommitMessage(
  changeDescription: string,
  options: {
    issueKey?: string | undefined;
    type?: CommitType | undefined;
    scope?: string | undefined;
  } = {}
): string {
  const { issueKey, type = "feat", scope } = options;

  // Build the subject line
  const scopePart = scope ? `(${scope})` : "";
  let subject = `${type}${scopePart}: ${changeDescription.toLowerCase()}`;

  // Truncate if too long
  if (subject.length > MAX_SUBJECT_LENGTH) {
    subject = subject.slice(0, MAX_SUBJECT_LENGTH - 3) + "...";
  }

  // Add issue key in footer if provided
  if (issueKey) {
    return `${subject}\n\nRefs: ${issueKey}`;
  }

  return subject;
}

/**
 * Gets commit type from description.
 */
export function inferCommitType(description: string): CommitType {
  const lowered = description.toLowerCase();

  if (/\b(add|implement|create|new)\b/.test(lowered)) return "feat";
  if (/\b(fix|resolve|repair|correct)\b/.test(lowered)) return "fix";
  if (/\b(document|readme|comment)\b/.test(lowered)) return "docs";
  if (/\b(refactor|restructure|reorganize)\b/.test(lowered)) return "refactor";
  if (/\b(test|spec|coverage)\b/.test(lowered)) return "test";
  if (/\b(build|compile|bundle|deps)\b/.test(lowered)) return "build";
  if (/\b(ci|pipeline|workflow|github action)\b/.test(lowered)) return "ci";
  if (/\b(style|format|lint)\b/.test(lowered)) return "style";
  if (/\b(perf|performance|optimize|speed)\b/.test(lowered)) return "perf";
  if (/\b(revert)\b/.test(lowered)) return "revert";

  return "chore";
}

/**
 * Gets all valid commit types with descriptions.
 */
export function getCommitTypes(): Array<{ type: CommitType; description: string }> {
  return VALID_COMMIT_TYPES.map((type) => ({
    type,
    description: COMMIT_TYPE_DESCRIPTIONS[type],
  }));
}

/**
 * Checks if a string is a valid commit type.
 */
export function isValidCommitType(type: string): type is CommitType {
  return VALID_COMMIT_TYPES.includes(type as CommitType);
}

/**
 * Gets commit type description.
 */
export function getCommitTypeDescription(type: CommitType): string {
  return COMMIT_TYPE_DESCRIPTIONS[type] ?? "Unknown type";
}
