# F010: Tool Contracts

## Overview

Rich text parameters shared by the write tools. See [F006 tool contracts](../F006-jira-write/tool-contracts.md) for the remaining fields.

---

## Format Parameter

```typescript
type RichTextFormat = "markdown" | "adf" | "text"; // Default: "markdown"
```

| Format | Accepted value | Behavior |
|--------|----------------|----------|
| `markdown` | string | GitHub-flavored Markdown converted to ADF |
| `adf` | object or JSON string | Validated ADF document sent unchanged |
| `text` | string | Literal text; blank lines split paragraphs, single newlines become hard breaks |

## Fields

| Tool | Field | Format parameter |
|------|-------|------------------|
| `create_issue` | `description?: string \| AdfDocument` | `descriptionFormat?: RichTextFormat` |
| `update_issue` | `description?: string \| AdfDocument` | `descriptionFormat?: RichTextFormat` |
| `transition_issue` | `comment?: string \| AdfDocument` | `commentFormat?: RichTextFormat` |

## ADF Document

```typescript
interface AdfDocument {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string; // Required and non-empty for type "text"
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}
```

Validation is structural: unknown properties are rejected and nesting is limited to 32 levels. Node semantics are validated by Jira.

## Markdown Mapping

| Markdown | ADF |
|----------|-----|
| `# Heading` | `heading` (level 1-6) |
| Paragraph, line break | `paragraph`, `hardBreak` |
| `**bold**`, `*em*`, `~~strike~~`, inline code | `strong`, `em`, `strike`, `code` marks |
| `[text](url)` | `link` mark (safe schemes only) |
| `![alt](url)` | Text with a `link` mark |
| `- item`, `1. item` | `bulletList`, `orderedList` (`order` attribute for a custom start) |
| `- [ ] task` | `taskList` / `taskItem` (`TODO`, `DONE`); mixed lists fall back to `bulletList` with `[ ]` / `[x]` prefixes |
| Fenced code | `codeBlock` with `language` |
| `> quote` | `blockquote` |
| `---` | `rule` |
| Table | `table`, `tableRow`, `tableHeader`, `tableCell` |
| Raw HTML | Literal text |

## Dry-Run Output

`create_issue` and `update_issue` previews include:

```typescript
{
  description?: {
    format: RichTextFormat;
    adf: AdfDocument;
  };
}
```

## Errors

| Message | Condition |
|---------|-----------|
| `Validation error: description: Invalid ADF document at <path>: <reason>` | ADF fails structural validation |
| `Validation error: description: ADF input must be a JSON object or a valid JSON string` | Unparseable ADF string |
| `Validation error: description: ADF document exceeds maximum nesting depth of 32` | Nesting limit exceeded |
| `Validation error: description: Format '<format>' expects a string. ...` | Object passed with `markdown` or `text` |
| `Validation error: descriptionFormat: ...` | Unknown format value |

The same messages apply to `comment` / `commentFormat`.
