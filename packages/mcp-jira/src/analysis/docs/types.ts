/**
 * Documentation Generator Types
 *
 * Type definitions for documentation generation from Jira issues.
 */

/**
 * Types of documentation that can be generated.
 */
export type DocType =
  | "specification"
  | "adr"
  | "test-plan"
  | "api-doc"
  | "user-story"
  | "release-notes";

/**
 * Output formats for generated documentation.
 */
export type DocFormat = "markdown" | "confluence" | "json";

/**
 * Section extracted from issue content.
 */
export interface DocSection {
  /** Section title */
  readonly title: string;
  /** Section content */
  readonly content: string;
  /** Order in the document */
  readonly order: number;
  /** Whether this section is required */
  readonly required: boolean;
}

/**
 * Extracted specification from an issue.
 */
export interface DocSpec {
  /** Issue key */
  readonly issueKey: string;
  /** Issue summary */
  readonly summary: string;
  /** Issue type */
  readonly issueType: string;
  /** Project key */
  readonly projectKey: string;
  /** Document type */
  readonly docType: DocType;
  /** Overview/description */
  readonly overview: string;
  /** Acceptance criteria */
  readonly acceptanceCriteria: readonly string[];
  /** Technical requirements */
  readonly technicalRequirements: readonly string[];
  /** Dependencies */
  readonly dependencies: readonly string[];
  /** Assumptions */
  readonly assumptions: readonly string[];
  /** Out of scope items */
  readonly outOfScope: readonly string[];
  /** Additional sections */
  readonly sections: readonly DocSection[];
  /** Related issues */
  readonly relatedIssues: readonly string[];
  /** Labels */
  readonly labels: readonly string[];
  /** Story points */
  readonly storyPoints?: number | undefined;
  /** Assignee */
  readonly assignee?: string | undefined;
  /** Status */
  readonly status: string;
}

/**
 * Architecture Decision Record specification.
 */
export interface ADRSpec {
  /** ADR number */
  readonly number: number;
  /** Title */
  readonly title: string;
  /** Issue key (source) */
  readonly issueKey: string;
  /** Date */
  readonly date: string;
  /** Status (Proposed, Accepted, Deprecated, Superseded) */
  readonly status: "Proposed" | "Accepted" | "Deprecated" | "Superseded";
  /** Context - why is this decision needed */
  readonly context: string;
  /** Decision - what was decided */
  readonly decision: string;
  /** Consequences - what are the implications */
  readonly consequences: readonly string[];
  /** Alternatives considered */
  readonly alternatives: readonly string[];
  /** Related ADRs */
  readonly relatedAdrs: readonly string[];
}

/**
 * Test plan specification.
 */
export interface TestSpec {
  /** Issue key */
  readonly issueKey: string;
  /** Feature being tested */
  readonly feature: string;
  /** Test scenarios */
  readonly scenarios: readonly TestScenario[];
  /** Prerequisites */
  readonly prerequisites: readonly string[];
  /** Test environment requirements */
  readonly environment: readonly string[];
  /** Data requirements */
  readonly testData: readonly string[];
  /** Non-functional requirements to test */
  readonly nfrTests: readonly string[];
}

/**
 * Individual test scenario.
 */
export interface TestScenario {
  /** Scenario ID */
  readonly id: string;
  /** Scenario title */
  readonly title: string;
  /** Given - preconditions */
  readonly given: readonly string[];
  /** When - actions */
  readonly when: readonly string[];
  /** Then - expected results */
  readonly then: readonly string[];
  /** Priority */
  readonly priority: "critical" | "high" | "medium" | "low";
  /** Whether it's an edge case */
  readonly isEdgeCase: boolean;
}

/**
 * Documentation generation options.
 */
export interface DocGenerationOptions {
  /** Document type to generate */
  readonly docType: DocType;
  /** Output format */
  readonly format: DocFormat;
  /** Whether to include child issues */
  readonly includeChildren: boolean;
  /** Maximum depth for hierarchy traversal */
  readonly maxDepth: number;
  /** Whether to include linked issues */
  readonly includeLinks: boolean;
  /** Custom template name */
  readonly template?: string | undefined;
}

/**
 * Generated documentation output.
 */
export interface GeneratedDoc {
  /** Document type */
  readonly docType: DocType;
  /** Output format */
  readonly format: DocFormat;
  /** Source issue key */
  readonly issueKey: string;
  /** Document title */
  readonly title: string;
  /** Generated content */
  readonly content: string;
  /** Table of contents (for markdown/confluence) */
  readonly toc: readonly string[];
  /** Word count */
  readonly wordCount: number;
  /** Generation timestamp */
  readonly generatedAt: string;
  /** Warning messages */
  readonly warnings: readonly string[];
}
