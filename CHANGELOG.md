# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/).

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
