/**
 * Branch Generator
 *
 * Generates Git branch names from Jira issue information.
 * Follows common branching conventions and patterns.
 */

import type { BranchType, BranchNameResult } from "./types.js";

/**
 * Default branch naming pattern.
 * Supported placeholders: {type}, {key}, {slug}
 */
const DEFAULT_PATTERN = "{type}/{key}-{slug}";

/**
 * Default maximum branch name length.
 */
const DEFAULT_MAX_LENGTH = 100;

/**
 * Characters to remove from branch names.
 */
const INVALID_CHARS_REGEX = /[^a-z0-9-]/g;

/**
 * Multiple dashes replacement.
 */
const MULTIPLE_DASHES_REGEX = /-+/g;

/**
 * Maps issue types to branch types.
 */
const ISSUE_TYPE_TO_BRANCH_TYPE: Record<string, BranchType> = {
  bug: "fix",
  defect: "fix",
  hotfix: "hotfix",
  story: "feature",
  task: "feature",
  "new feature": "feature",
  enhancement: "feature",
  improvement: "feature",
  documentation: "docs",
  docs: "docs",
  "technical debt": "refactor",
  refactor: "refactor",
  test: "test",
  chore: "chore",
  maintenance: "chore",
  release: "release",
};

/**
 * Branch type prefixes for naming.
 */
const BRANCH_TYPE_PREFIXES: Record<BranchType, string> = {
  feature: "feature",
  fix: "fix",
  chore: "chore",
  hotfix: "hotfix",
  release: "release",
  docs: "docs",
  refactor: "refactor",
  test: "test",
};

/**
 * Branch naming conventions explanation.
 */
const BRANCH_CONVENTIONS = [
  "Use lowercase letters, numbers, and hyphens only",
  "Include issue key for traceability (e.g., PROJECT-123)",
  "Use descriptive slugs from issue summary",
  "Prefix with type (feature, fix, hotfix, etc.)",
  "Keep total length under 100 characters",
];

/**
 * Converts a string to a URL-safe slug.
 */
function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[&]/g, "-and-") // Replace & with 'and'
    .replace(INVALID_CHARS_REGEX, "-") // Replace invalid chars with hyphens
    .replace(MULTIPLE_DASHES_REGEX, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .slice(0, maxLength);
}

/**
 * Infers branch type from issue type.
 */
export function inferBranchType(issueType: string): BranchType {
  const normalizedType = issueType.toLowerCase().trim();
  return ISSUE_TYPE_TO_BRANCH_TYPE[normalizedType] ?? "feature";
}

/**
 * Generates a branch name from issue information.
 */
export function generateBranchName(
  issueKey: string,
  issueSummary: string,
  options: {
    type?: BranchType | undefined;
    issueType?: string | undefined;
    pattern?: string | undefined;
    maxLength?: number | undefined;
  } = {}
): BranchNameResult {
  const {
    pattern = DEFAULT_PATTERN,
    maxLength = DEFAULT_MAX_LENGTH,
    issueType,
  } = options;

  // Determine branch type
  const branchType = options.type ?? (issueType ? inferBranchType(issueType) : "feature");

  // Normalize issue key
  const normalizedKey = issueKey.toLowerCase();

  // Generate slug from summary
  // Reserve space for type prefix, slashes, and key
  const typePrefix = BRANCH_TYPE_PREFIXES[branchType];
  const reservedLength = typePrefix.length + 1 + normalizedKey.length + 1; // "type/" + "key-"
  const availableForSlug = Math.max(10, maxLength - reservedLength);
  const slug = slugify(issueSummary, availableForSlug);

  // Generate primary branch name using pattern
  let branchName = pattern
    .replace("{type}", typePrefix)
    .replace("{key}", normalizedKey)
    .replace("{slug}", slug);

  // Ensure it doesn't exceed max length
  if (branchName.length > maxLength) {
    branchName = branchName.slice(0, maxLength).replace(/-+$/, "");
  }

  // Generate alternatives
  const alternatives = generateAlternatives(normalizedKey, issueSummary, branchType, slug);

  return {
    branchName,
    alternatives: alternatives.filter((alt) => alt !== branchName).slice(0, 3),
    issueSummary,
    pattern,
    conventions: BRANCH_CONVENTIONS,
  };
}

/**
 * Generates alternative branch name suggestions.
 */
function generateAlternatives(
  issueKey: string,
  _summary: string,
  type: BranchType,
  slug: string
): string[] {
  const typePrefix = BRANCH_TYPE_PREFIXES[type];
  const shortSlug = slug.split("-").slice(0, 3).join("-");

  return [
    `${typePrefix}/${issueKey}-${slug}`, // Standard
    `${typePrefix}/${issueKey}-${shortSlug}`, // Short version
    `${issueKey}-${shortSlug}`, // Without type prefix
    `${typePrefix}/${issueKey}`, // Just key
  ];
}

/**
 * Validates a branch name against conventions.
 */
export function validateBranchName(branchName: string): {
  valid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for uppercase letters
  if (/[A-Z]/.test(branchName)) {
    issues.push("Branch name contains uppercase letters");
    suggestions.push(`Use lowercase: ${branchName.toLowerCase()}`);
  }

  // Check for spaces
  if (/\s/.test(branchName)) {
    issues.push("Branch name contains spaces");
    suggestions.push("Replace spaces with hyphens");
  }

  // Check for invalid characters
  if (/[^a-zA-Z0-9/-]/.test(branchName.replace(/-/g, ""))) {
    issues.push("Branch name contains invalid characters");
    suggestions.push("Use only letters, numbers, hyphens, and forward slashes");
  }

  // Check length
  if (branchName.length > DEFAULT_MAX_LENGTH) {
    issues.push(`Branch name exceeds ${DEFAULT_MAX_LENGTH} characters`);
    suggestions.push(`Shorten to: ${branchName.slice(0, DEFAULT_MAX_LENGTH)}`);
  }

  // Check for double slashes or double hyphens
  if (/\/\//.test(branchName) || /--/.test(branchName)) {
    issues.push("Branch name contains consecutive slashes or hyphens");
    suggestions.push("Use single slashes and hyphens");
  }

  // Check for leading/trailing special characters
  if (/^[-/]|[-/]$/.test(branchName)) {
    issues.push("Branch name starts or ends with special characters");
    suggestions.push("Remove leading/trailing hyphens or slashes");
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Parses an existing branch name to extract components.
 */
export function parseBranchName(branchName: string): {
  type?: BranchType | undefined;
  issueKey?: string | undefined;
  slug?: string | undefined;
} {
  // Try pattern: type/KEY-123-slug
  const typeKeySlugMatch = branchName.match(/^([a-z]+)\/([A-Za-z]+-\d+)(?:-(.+))?$/);
  if (typeKeySlugMatch) {
    const [, type, issueKey, slug] = typeKeySlugMatch;
    return {
      type: type as BranchType,
      issueKey: issueKey?.toUpperCase(),
      slug,
    };
  }

  // Try pattern: KEY-123-slug
  const keySlugMatch = branchName.match(/^([A-Za-z]+-\d+)(?:-(.+))?$/);
  if (keySlugMatch) {
    const [, issueKey, slug] = keySlugMatch;
    return {
      issueKey: issueKey?.toUpperCase(),
      slug,
    };
  }

  return {};
}

/**
 * Gets available branch types.
 */
export function getBranchTypes(): BranchType[] {
  return Object.keys(BRANCH_TYPE_PREFIXES) as BranchType[];
}

/**
 * Gets the branch type prefix.
 */
export function getBranchTypePrefix(type: BranchType): string {
  return BRANCH_TYPE_PREFIXES[type];
}
