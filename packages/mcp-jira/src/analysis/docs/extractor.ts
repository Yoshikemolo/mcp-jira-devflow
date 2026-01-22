/**
 * Content Extractor
 *
 * Extracts structured content from Jira issue descriptions.
 */

import type { JiraIssue, JiraIssueExtended } from "../../domain/types.js";
import type { DocSpec, DocSection, DocType } from "./types.js";

/**
 * Common section patterns in issue descriptions.
 */
const SECTION_PATTERNS: Record<string, RegExp> = {
  acceptanceCriteria: /(?:acceptance\s+criteria|ac|given.+when.+then)/i,
  technicalRequirements: /(?:technical\s+requirements?|tech\s+spec|implementation\s+notes?)/i,
  dependencies: /(?:dependencies|depends\s+on|blockers?)/i,
  assumptions: /(?:assumptions?|prerequisites?)/i,
  outOfScope: /(?:out\s+of\s+scope|exclusions?|not\s+included)/i,
  context: /(?:context|background|problem\s+statement)/i,
  solution: /(?:solution|approach|proposal)/i,
  consequences: /(?:consequences|implications|impact)/i,
  alternatives: /(?:alternatives?|options?\s+considered)/i,
};

/**
 * Extracts a list from description text.
 */
function extractList(text: string): string[] {
  const lines = text.split("\n");
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Match bullet points, numbered lists, or checkbox items
    const listMatch = trimmed.match(/^(?:[-*•]|\d+[.)]\s*|\[[ x]\]\s*)/i);
    if (listMatch) {
      const content = trimmed.slice(listMatch[0].length).trim();
      if (content.length > 0) {
        items.push(content);
      }
    }
  }

  return items;
}

/**
 * Extracts sections from description based on headers.
 */
function extractSections(description: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = description.split("\n");

  let currentSection = "overview";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for header patterns (# Header, **Header**, Header:)
    const headerMatch = trimmed.match(/^(?:#{1,3}\s*|\*\*)?(.+?)(?:\*\*)?:?\s*$/);

    if (headerMatch && headerMatch[1]) {
      const headerText = headerMatch[1].toLowerCase();

      // Check if this matches a known section
      for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
        if (pattern.test(headerText)) {
          // Save previous section
          if (currentContent.length > 0) {
            sections.set(currentSection, currentContent.join("\n").trim());
          }

          currentSection = sectionName;
          currentContent = [];
          break;
        }
      }

      continue;
    }

    currentContent.push(line);
  }

  // Save last section
  if (currentContent.length > 0) {
    sections.set(currentSection, currentContent.join("\n").trim());
  }

  return sections;
}

/**
 * Determines the appropriate document type based on issue type.
 */
function inferDocType(issueType: string, labels: readonly string[]): DocType {
  const lowerType = issueType.toLowerCase();
  const lowerLabels = labels.map((l) => l.toLowerCase());

  if (lowerType === "epic" || lowerLabels.includes("specification")) {
    return "specification";
  }
  if (lowerLabels.includes("adr") || lowerLabels.includes("architecture-decision")) {
    return "adr";
  }
  if (lowerLabels.includes("test") || lowerLabels.includes("qa")) {
    return "test-plan";
  }
  if (lowerLabels.includes("api") || lowerLabels.includes("endpoint")) {
    return "api-doc";
  }
  if (lowerType === "story" || lowerType === "user story") {
    return "user-story";
  }

  return "specification";
}

/**
 * Extracts a document specification from a Jira issue.
 */
export function extractDocSpec(
  issue: JiraIssue | JiraIssueExtended,
  docType?: DocType
): DocSpec {
  const description = issue.description ?? "";
  const sections = extractSections(description);

  // Determine doc type
  const effectiveDocType = docType ?? inferDocType(issue.issueType.name, issue.labels);

  // Extract acceptance criteria
  const acSection = sections.get("acceptanceCriteria") ?? "";
  const acceptanceCriteria = extractList(acSection);

  // If no explicit AC section, try to find Given/When/Then patterns
  if (acceptanceCriteria.length === 0) {
    const gwtMatches = description.match(/given\s+.+when\s+.+then\s+.+/gi);
    if (gwtMatches) {
      acceptanceCriteria.push(...gwtMatches.map((m) => m.trim()));
    }
  }

  // Extract other sections
  const technicalRequirements = extractList(sections.get("technicalRequirements") ?? "");
  const dependencies = extractList(sections.get("dependencies") ?? "");
  const assumptions = extractList(sections.get("assumptions") ?? "");
  const outOfScope = extractList(sections.get("outOfScope") ?? "");

  // Build additional sections
  const additionalSections: DocSection[] = [];
  let order = 1;

  for (const [name, content] of sections) {
    if (!["overview", "acceptanceCriteria", "technicalRequirements", "dependencies", "assumptions", "outOfScope"].includes(name)) {
      additionalSections.push({
        title: name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        content,
        order: order++,
        required: false,
      });
    }
  }

  // Get related issues
  const relatedIssues: string[] = [];
  if ("issueLinks" in issue) {
    relatedIssues.push(...issue.issueLinks.map((l) => l.linkedIssue.key));
  }
  if ("parent" in issue && issue.parent) {
    relatedIssues.unshift(issue.parent.key);
  }
  if ("subtasks" in issue) {
    relatedIssues.push(...issue.subtasks.map((s) => s.key));
  }

  return {
    issueKey: issue.key,
    summary: issue.summary,
    issueType: issue.issueType.name,
    projectKey: issue.project.key,
    docType: effectiveDocType,
    overview: sections.get("overview") ?? description.split("\n\n")[0] ?? "",
    acceptanceCriteria,
    technicalRequirements,
    dependencies,
    assumptions,
    outOfScope,
    sections: additionalSections,
    relatedIssues,
    labels: issue.labels,
    storyPoints: issue.storyPoints,
    assignee: issue.assignee?.displayName,
    status: issue.status.name,
  };
}

/**
 * Merges multiple specs into a unified document (for epics with children).
 */
export function mergeDocSpecs(specs: readonly DocSpec[]): DocSpec {
  if (specs.length === 0) {
    throw new Error("Cannot merge empty specs array");
  }

  const primary = specs[0]!;

  if (specs.length === 1) {
    return primary;
  }

  const children = specs.slice(1);

  return {
    ...primary,
    acceptanceCriteria: [
      ...primary.acceptanceCriteria,
      ...children.flatMap((c) => c.acceptanceCriteria.map((ac) => `[${c.issueKey}] ${ac}`)),
    ],
    technicalRequirements: [
      ...primary.technicalRequirements,
      ...children.flatMap((c) => c.technicalRequirements),
    ],
    dependencies: [
      ...primary.dependencies,
      ...children.flatMap((c) => c.dependencies),
    ],
    sections: [
      ...primary.sections,
      ...children.map((c, i) => ({
        title: `${c.issueKey}: ${c.summary}`,
        content: c.overview,
        order: primary.sections.length + i + 1,
        required: false,
      })),
    ],
    relatedIssues: [...new Set([...primary.relatedIssues, ...children.map((c) => c.issueKey)])],
  };
}

/**
 * Validates a doc spec for completeness.
 */
export function validateDocSpec(spec: DocSpec): {
  valid: boolean;
  warnings: string[];
  score: number;
} {
  const warnings: string[] = [];
  let score = 100;

  // Check for essential content
  if (!spec.overview || spec.overview.length < 50) {
    warnings.push("Overview/description is too short or missing");
    score -= 20;
  }

  if (spec.acceptanceCriteria.length === 0) {
    warnings.push("No acceptance criteria found");
    score -= 25;
  }

  if (spec.docType === "specification" && spec.technicalRequirements.length === 0) {
    warnings.push("No technical requirements found for specification");
    score -= 15;
  }

  if (spec.docType === "adr" && !spec.sections.some((s) => s.title.toLowerCase().includes("decision"))) {
    warnings.push("ADR should include a decision section");
    score -= 20;
  }

  return {
    valid: score >= 60,
    warnings,
    score: Math.max(0, score),
  };
}
