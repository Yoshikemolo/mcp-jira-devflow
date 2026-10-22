# F010: Acceptance Criteria

## Overview

Definition of Done for F010-rich-text-input.

## Functional Criteria

### AC-001: Markdown by Default

**Given** a string `description` or `comment` without a format parameter
**When** `create_issue`, `update_issue` or `transition_issue` is called
**Then** the text is converted from Markdown to ADF

**Verification:**
- [x] Headings, marks, links, lists, task lists, code blocks, blockquotes, rules and tables are converted
- [x] Single newlines become hard breaks
- [x] Plain text without Markdown syntax produces the same ADF as before

### AC-002: ADF Input

**Given** `descriptionFormat: "adf"` or `commentFormat: "adf"`
**When** the tool is called with an ADF object or JSON string
**Then** the document is validated and sent unchanged

**Verification:**
- [x] Objects and JSON strings are accepted
- [x] Wrong root, unknown properties, empty text nodes and excessive nesting are rejected
- [x] Validation errors name the field and the failing path, and no request is sent

### AC-003: Plain Text

**Given** format `text`
**When** the tool is called
**Then** the text is sent literally, with paragraphs and line breaks preserved

**Verification:**
- [x] Markdown syntax is not interpreted

### AC-004: Dry Run

**Given** `dryRun: true` on `create_issue` or `update_issue`
**When** a description is provided
**Then** the preview shows the format and the generated ADF

**Verification:**
- [x] No request is sent to Jira

## Security Criteria

- [x] Links with schemes other than `http`, `https`, `mailto`, relative or anchor are rendered as plain text
- [x] Raw HTML is never interpreted
- [x] ADF input is validated structurally with a nesting limit

## Test Coverage

- [x] `packages/mcp-jira/src/__tests__/domain/rich-text.test.ts` - Conversion and validation
- [x] `packages/mcp-jira/src/__tests__/tools/rich-text-tools.test.ts` - Tool integration
- [ ] Manual verification against a Jira Cloud instance
