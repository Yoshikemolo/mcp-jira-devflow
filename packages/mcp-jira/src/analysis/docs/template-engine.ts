/**
 * Template Engine
 *
 * Applies templates to generate documentation in various formats.
 */

import type { DocSpec, DocFormat, DocType, GeneratedDoc } from "./types.js";

/**
 * Template for specification documents.
 */
function specificationTemplate(spec: DocSpec, format: DocFormat): string {
  const lines: string[] = [];

  if (format === "markdown" || format === "confluence") {
    lines.push(`# ${spec.summary}`);
    lines.push("");
    lines.push(`**Issue:** ${spec.issueKey} | **Type:** ${spec.issueType} | **Status:** ${spec.status}`);
    if (spec.storyPoints) {
      lines.push(`**Story Points:** ${spec.storyPoints}`);
    }
    if (spec.assignee) {
      lines.push(`**Assignee:** ${spec.assignee}`);
    }
    lines.push("");

    lines.push("## Overview");
    lines.push("");
    lines.push(spec.overview);
    lines.push("");

    if (spec.acceptanceCriteria.length > 0) {
      lines.push("## Acceptance Criteria");
      lines.push("");
      for (const ac of spec.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`);
      }
      lines.push("");
    }

    if (spec.technicalRequirements.length > 0) {
      lines.push("## Technical Requirements");
      lines.push("");
      for (const req of spec.technicalRequirements) {
        lines.push(`- ${req}`);
      }
      lines.push("");
    }

    if (spec.dependencies.length > 0) {
      lines.push("## Dependencies");
      lines.push("");
      for (const dep of spec.dependencies) {
        lines.push(`- ${dep}`);
      }
      lines.push("");
    }

    if (spec.assumptions.length > 0) {
      lines.push("## Assumptions");
      lines.push("");
      for (const assumption of spec.assumptions) {
        lines.push(`- ${assumption}`);
      }
      lines.push("");
    }

    if (spec.outOfScope.length > 0) {
      lines.push("## Out of Scope");
      lines.push("");
      for (const item of spec.outOfScope) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }

    for (const section of spec.sections) {
      lines.push(`## ${section.title}`);
      lines.push("");
      lines.push(section.content);
      lines.push("");
    }

    if (spec.relatedIssues.length > 0) {
      lines.push("## Related Issues");
      lines.push("");
      for (const issue of spec.relatedIssues) {
        lines.push(`- ${issue}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Template for ADR documents.
 */
function adrTemplate(spec: DocSpec, format: DocFormat): string {
  const lines: string[] = [];

  if (format === "markdown" || format === "confluence") {
    lines.push(`# ADR: ${spec.summary}`);
    lines.push("");
    lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
    lines.push(`**Status:** Proposed`);
    lines.push(`**Source:** ${spec.issueKey}`);
    lines.push("");

    lines.push("## Context");
    lines.push("");
    lines.push(spec.overview);
    lines.push("");

    // Look for decision section
    const decisionSection = spec.sections.find((s) =>
      s.title.toLowerCase().includes("decision") ||
      s.title.toLowerCase().includes("solution")
    );
    lines.push("## Decision");
    lines.push("");
    lines.push(decisionSection?.content ?? "_Decision to be documented_");
    lines.push("");

    // Look for consequences/implications
    const consequencesSection = spec.sections.find((s) =>
      s.title.toLowerCase().includes("consequence") ||
      s.title.toLowerCase().includes("impact")
    );
    lines.push("## Consequences");
    lines.push("");
    if (consequencesSection) {
      lines.push(consequencesSection.content);
    } else {
      lines.push("### Positive");
      lines.push("");
      lines.push("- _To be documented_");
      lines.push("");
      lines.push("### Negative");
      lines.push("");
      lines.push("- _To be documented_");
    }
    lines.push("");

    // Look for alternatives
    const alternativesSection = spec.sections.find((s) =>
      s.title.toLowerCase().includes("alternative")
    );
    if (alternativesSection) {
      lines.push("## Alternatives Considered");
      lines.push("");
      lines.push(alternativesSection.content);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Template for user story documents.
 */
function userStoryTemplate(spec: DocSpec, format: DocFormat): string {
  const lines: string[] = [];

  if (format === "markdown" || format === "confluence") {
    lines.push(`# ${spec.issueKey}: ${spec.summary}`);
    lines.push("");
    lines.push(`**Status:** ${spec.status} | **Points:** ${spec.storyPoints ?? "Unestimated"}`);
    if (spec.assignee) {
      lines.push(`**Assignee:** ${spec.assignee}`);
    }
    lines.push("");

    lines.push("## User Story");
    lines.push("");
    lines.push(spec.overview);
    lines.push("");

    if (spec.acceptanceCriteria.length > 0) {
      lines.push("## Acceptance Criteria");
      lines.push("");
      for (let i = 0; i < spec.acceptanceCriteria.length; i++) {
        lines.push(`### AC${i + 1}`);
        lines.push("");
        lines.push(spec.acceptanceCriteria[i] ?? "");
        lines.push("");
      }
    }

    if (spec.technicalRequirements.length > 0) {
      lines.push("## Implementation Notes");
      lines.push("");
      for (const req of spec.technicalRequirements) {
        lines.push(`- ${req}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Template for test plan documents.
 */
function testPlanTemplate(spec: DocSpec, format: DocFormat): string {
  const lines: string[] = [];

  if (format === "markdown" || format === "confluence") {
    lines.push(`# Test Plan: ${spec.summary}`);
    lines.push("");
    lines.push(`**Source:** ${spec.issueKey}`);
    lines.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
    lines.push("");

    lines.push("## Scope");
    lines.push("");
    lines.push(spec.overview);
    lines.push("");

    lines.push("## Test Scenarios");
    lines.push("");

    if (spec.acceptanceCriteria.length > 0) {
      for (let i = 0; i < spec.acceptanceCriteria.length; i++) {
        lines.push(`### Scenario ${i + 1}`);
        lines.push("");
        lines.push(`**Acceptance Criterion:** ${spec.acceptanceCriteria[i]}`);
        lines.push("");
        lines.push("| Step | Action | Expected Result |");
        lines.push("|------|--------|-----------------|");
        lines.push("| 1 | _Define_ | _Define_ |");
        lines.push("");
      }
    } else {
      lines.push("_Test scenarios to be defined based on acceptance criteria_");
      lines.push("");
    }

    if (spec.assumptions.length > 0) {
      lines.push("## Prerequisites");
      lines.push("");
      for (const assumption of spec.assumptions) {
        lines.push(`- ${assumption}`);
      }
      lines.push("");
    }

    lines.push("## Test Data");
    lines.push("");
    lines.push("_Test data requirements to be defined_");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Applies the appropriate template based on doc type.
 */
export function applyTemplate(
  spec: DocSpec,
  docType: DocType,
  format: DocFormat
): string {
  switch (docType) {
    case "specification":
      return specificationTemplate(spec, format);
    case "adr":
      return adrTemplate(spec, format);
    case "user-story":
      return userStoryTemplate(spec, format);
    case "test-plan":
      return testPlanTemplate(spec, format);
    default:
      return specificationTemplate(spec, format);
  }
}

/**
 * Generates a table of contents from content.
 */
function extractToc(content: string): string[] {
  const toc: string[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match && h2Match[1]) {
      toc.push(h2Match[1]);
    }
  }

  return toc;
}

/**
 * Generates a complete document.
 */
export function generateDocument(
  spec: DocSpec,
  docType: DocType,
  format: DocFormat
): GeneratedDoc {
  const content = applyTemplate(spec, docType, format);
  const toc = extractToc(content);
  const wordCount = content.split(/\s+/).length;

  return {
    docType,
    format,
    issueKey: spec.issueKey,
    title: spec.summary,
    content,
    toc,
    wordCount,
    generatedAt: new Date().toISOString(),
    warnings: [],
  };
}
