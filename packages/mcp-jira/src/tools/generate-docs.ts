/**
 * Generate Docs Tool
 *
 * Generates documentation from Jira issue hierarchies.
 */

import { z } from "zod";
import type { JiraClient } from "../domain/jira-client.js";
import { JiraAuthError } from "../domain/jira-client.js";
import {
  extractDocSpec,
  mergeDocSpecs,
  validateDocSpec,
  generateDocument,
} from "../analysis/docs/index.js";
import type { DocType, DocFormat } from "../analysis/docs/index.js";

/**
 * Input schema for generate docs tool.
 */
export const GenerateDocsInputSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-\d+$/i, "Invalid issue key format")
    .describe("The issue key to generate docs from (e.g., 'PROJ-123')"),
  docType: z
    .enum(["specification", "adr", "test-plan", "api-doc", "user-story"])
    .optional()
    .default("specification")
    .describe("Type of document to generate"),
  format: z
    .enum(["markdown", "confluence", "json"])
    .optional()
    .default("markdown")
    .describe("Output format"),
  includeChildren: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include child issues in the document"),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .default(2)
    .describe("Maximum depth for hierarchy traversal"),
});

export type GenerateDocsInput = z.infer<typeof GenerateDocsInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const generateDocsTool = {
  name: "devflow_generate_docs",
  description:
    "Generates documentation from Jira issue hierarchies. Supports specifications, ADRs, test plans, and more. Extracts structured content from issues and applies templates.",
  inputSchema: {
    type: "object" as const,
    properties: {
      issueKey: {
        type: "string",
        description: "The issue key (e.g., 'PROJ-123')",
        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
      },
      docType: {
        type: "string",
        enum: ["specification", "adr", "test-plan", "api-doc", "user-story"],
        description: "Type of document to generate",
      },
      format: {
        type: "string",
        enum: ["markdown", "confluence", "json"],
        description: "Output format",
      },
      includeChildren: {
        type: "boolean",
        description: "Include child issues in the document",
      },
      maxDepth: {
        type: "number",
        description: "Maximum depth for hierarchy traversal (1-5)",
        minimum: 1,
        maximum: 5,
      },
    },
    required: ["issueKey"],
  },
};

/**
 * Executes the generate docs tool.
 */
export async function executeGenerateDocs(
  client: JiraClient,
  input: unknown
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const parseResult = GenerateDocsInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { issueKey, docType, format, includeChildren } = parseResult.data;
  const normalizedKey = issueKey.toUpperCase();

  try {
    // Fetch the main issue (extended if we need children)
    const issue = includeChildren
      ? await client.getIssueExtended(normalizedKey)
      : await client.getIssue(normalizedKey);

    if (!issue) {
      return {
        content: [
          {
            type: "text",
            text: `Issue ${normalizedKey} not found`,
          },
        ],
        isError: true,
      };
    }

    // Extract doc spec from main issue
    let spec = extractDocSpec(issue, docType as DocType);

    // Fetch and include children if requested
    if (includeChildren && "subtasks" in issue) {
      const extendedIssue = issue as { subtasks: Array<{ key: string }> };
      if (extendedIssue.subtasks.length > 0) {
        const childSpecs = [];

        for (const subtaskRef of extendedIssue.subtasks.slice(0, 20)) {
          try {
            const childIssue = await client.getIssue(subtaskRef.key);
            if (childIssue) {
              childSpecs.push(extractDocSpec(childIssue, docType as DocType));
            }
          } catch {
            // Skip failed child fetches
          }
        }

        if (childSpecs.length > 0) {
          spec = mergeDocSpecs([spec, ...childSpecs]);
        }
      }
    }

    // Validate the spec
    const validation = validateDocSpec(spec);

    // Generate the document
    const doc = generateDocument(spec, docType as DocType, format as DocFormat);

    // Build response
    const response: Record<string, unknown> = {
      issueKey: normalizedKey,
      docType,
      format,
      title: doc.title,
      wordCount: doc.wordCount,
      generatedAt: doc.generatedAt,
    };

    // Table of contents
    if (doc.toc.length > 0) {
      response["tableOfContents"] = doc.toc;
    }

    // Validation results
    response["validation"] = {
      valid: validation.valid,
      completenessScore: validation.score,
    };

    if (validation.warnings.length > 0) {
      response["warnings"] = validation.warnings;
    }

    // The document content
    response["content"] = doc.content;

    // Metadata
    response["metadata"] = {
      source: normalizedKey,
      issueType: spec.issueType,
      status: spec.status,
      storyPoints: spec.storyPoints,
      relatedIssues: spec.relatedIssues,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof JiraAuthError) {
      return {
        content: [
          {
            type: "text",
            text: "Authentication failed. Please check your Jira credentials.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Failed to generate documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
