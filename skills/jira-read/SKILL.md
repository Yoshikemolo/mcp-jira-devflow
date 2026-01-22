---
name: jira-read
description: Read data from Jira including issues, comments, sprints, and execute JQL queries. Use when you need to fetch or search Jira data without making changes.
license: MIT
compatibility: Requires Jira Cloud API access with read permissions
metadata:
  author: ximplicity
  version: "1.0"
  category: jira
---

# Jira Read Skill

Read-only operations for Jira data retrieval and analysis.

## Allowed Operations

- Read issue by key (e.g., `PROJECT-123`)
- Execute JQL queries
- Read issue metadata (fields, transitions, comments)
- Read issue changelog/history
- List projects and boards
- Read sprint information
- Get velocity metrics

## Forbidden Operations

- Writing or updating issues
- Adding comments
- Transitioning issues
- Creating issues
- Deleting anything
- Bulk write operations

## Constraints

- Maximum 50 issues per query (pagination required for more)
- No recursive or nested API calls without explicit need
- All requests must include proper authentication headers
- Rate limiting must be respected (see Jira API limits)

## Input Requirements

- Issue keys must match pattern: `[A-Z]+-\d+`
- JQL queries must be validated before execution
- Project keys must be uppercase alphanumeric

## Output Requirements

- All responses must be typed
- Sensitive fields must be redacted in logs
- Empty results must return empty arrays, not null
- Large results should use token-optimized output modes

## Error Handling

| Status | Action |
|--------|--------|
| 404 | Return NotFoundError with issue key |
| 401/403 | Return AuthenticationError (no details) |
| 429 | Implement backoff, then retry |
| 5xx | Return ExternalServiceError with sanitized message |

## Example Usage

```
Get issue PROJ-123 with full details
Search for open bugs in project WEBAPP
Show sprint velocity for the last 5 sprints
```
