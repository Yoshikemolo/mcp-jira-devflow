# F010: Rich Text Input (Markdown and ADF)

## Feature ID

F010-rich-text-input

## Status

**Stable**

## Summary

Let agents write formatted descriptions and comments in Jira using Markdown or native ADF, instead of plain text only.

## In Scope

- Explicit format parameter per rich text field (`descriptionFormat`, `commentFormat`)
- Markdown to ADF conversion (GitHub-flavored Markdown):
  - Headings, paragraphs, hard breaks
  - Strong, emphasis, strikethrough, inline code, links
  - Bullet, ordered (with custom start) and task lists, including nesting
  - Fenced code blocks with language, blockquotes, horizontal rules, tables
- ADF input as an object or JSON string, validated before any API call
- Plain text format that keeps the previous behavior
- Dry-run previews that show the generated ADF

## Out of Scope

- Images and attachments (Markdown images are rendered as links)
- Mentions, emojis, panels, status lozenges and other Jira-specific nodes from Markdown (available through ADF input)
- Raw HTML rendering (kept as literal text)
- ADF to Markdown conversion for read tools
- Full ADF schema validation (Jira performs the final validation)

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Explicit format parameter instead of auto-detection | All intent must be explicit (global agent rules) |
| Markdown is the default for strings | Agents produce Markdown natively; plain text without Markdown syntax renders the same as before |
| Single newlines become hard breaks | Matches the previous plain text behavior and Jira comment conventions |
| `marked` lexer plus own ADF mapping | Mature parser with no transitive dependencies; the ADF mapping stays under project control. Pinned to an exact version |
| Links limited to `http`, `https`, `mailto`, relative and anchor URLs | Blocks `javascript:` and other unsafe schemes; other links are rendered as plain text |
| ADF nesting limited to 32 levels | Bounds validation cost on untrusted input |

## Dependencies

- F006: Jira Write Operations (tools being extended)
- `marked` (runtime dependency, exact version)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plain text containing Markdown syntax changes rendering | Low | Use `descriptionFormat: "text"` to keep it literal |
| Jira rejects a generated node | Medium | Only widely supported ADF nodes are generated; Jira validation errors are returned in the tool response |
| Invalid caller-supplied ADF | Low | Structural validation before the request; Jira detail returned on 400 |
