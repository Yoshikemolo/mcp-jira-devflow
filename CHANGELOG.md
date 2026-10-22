# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/).

## [@ximplicity/mcp-jira 0.2.0] - 2026-10-22

### Added

- Rich text input (F010): `create_issue` and `update_issue` accept `descriptionFormat`, and
  `transition_issue` accepts `commentFormat`, with values `markdown` (default), `adf` or `text`.
- Markdown to ADF conversion covering headings, inline marks, links, bullet, ordered and task
  lists, code blocks, blockquotes, horizontal rules and tables.
- ADF documents can be passed as objects or JSON strings. They are validated structurally
  before any request is sent.
- Dry-run previews of `create_issue` and `update_issue` show the generated ADF.
- Runtime dependency `marked` 18.0.14, pinned to an exact version.

### Changed

- String descriptions and comments are now interpreted as Markdown by default. Text without
  Markdown syntax renders as before; use format `text` to keep Markdown syntax literal.

### Security

- Raw HTML in Markdown is kept as literal text, and links with schemes other than `http`,
  `https`, `mailto`, relative or anchor URLs are rendered as plain text.

## [@ximplicity/mcp-jira 0.1.1] - 2026-10-22

### Fixed

- `update_issue` always reported failure (`Network error`, status 0) even though Jira
  applied the change. Jira answers successful writes with `204 No Content`, and the HTTP
  client tried to parse the empty body as JSON. The parse error was treated as a network
  error, so the write was retried up to `maxRetries` times. The same bug affected
  `transition_issue` and `move_issues_to_sprint`.
- A successful response with invalid JSON is no longer retried, which avoids repeating
  side effects.

### Changed

- 4xx errors from Jira now include Jira's validation messages, for example a story points
  field missing from the edit screen, instead of only `Request failed with status 400`.
