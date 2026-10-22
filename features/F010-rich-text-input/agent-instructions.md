# F010: Agent Instructions

## Overview

Instructions for working on rich text input for Jira write tools.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-write` | `/skills/jira-write/SKILL.md` | Write operation constraints |

## Tools Touched

| Tool | Change |
|------|--------|
| `create_issue` | `description` accepts a string or an object; adds `descriptionFormat` |
| `update_issue` | `description` accepts a string or an object; adds `descriptionFormat` |
| `transition_issue` | `comment` accepts a string or an object; adds `commentFormat` |

## Code Locations

| File | Responsibility |
|------|----------------|
| `packages/mcp-jira/src/domain/rich-text.ts` | Formats, Markdown to ADF conversion, ADF validation (`toAdf`, `markdownToAdf`, `parseAdf`) |
| `packages/mcp-jira/src/domain/mappers.ts` | `textToAdf` for plain text |
| `packages/mcp-jira/src/domain/jira-client.ts` | Accepts a string (plain text) or an `AdfDocument` |
| `packages/mcp-jira/src/tools/*.ts` | Convert input with `toAdf` before calling the client |

## Rules

1. Conversion happens in the tool layer, before dry-run, so previews show the exact ADF that will be sent.
2. Conversion errors are returned as `Validation error: <field>: <message>` and never reach Jira.
3. Only generate ADF nodes that are valid in their parent:
   - `listItem` and `blockquote` children: `paragraph`, `bulletList`, `orderedList`, `codeBlock`
   - `code` marks may only be combined with `link` marks
   - Text nodes must not be empty
4. Never interpret raw HTML or allow unsafe link schemes.
5. Keep `marked` pinned to an exact version and review its changelog before upgrading.

## Adding a New Rich Text Field

1. Accept `z.union([z.string(), z.record(z.unknown())])` plus a `<field>Format: RichTextFormatSchema`.
2. Mirror both in the tool JSON schema (`type: ["string", "object"]`, `enum` for the format).
3. Convert with `toAdf(value, format)` and return `RichTextError` as a validation error.
4. Add tests for the `markdown`, `adf` and `text` formats.
