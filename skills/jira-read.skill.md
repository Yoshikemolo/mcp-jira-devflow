# Jira Read Skill

Skill for reading data from Jira.

## Allowed Operations

- Read issue by key (e.g., `PROJECT-123`)
- Execute JQL queries
- Read issue metadata (fields, transitions, comments)
- List projects
- Read sprint information

## Forbidden Operations

- Writing or updating issues
- Adding comments
- Transitioning issues
- Creating issues
- Deleting anything
- Bulk write operations

## Constraints

- Maximum 50 issues per query (pagination required for more)
- No recursive or nested API calls
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

## Error Handling

- 404: Return NotFoundError with issue key
- 401/403: Return AuthenticationError (no details)
- 429: Implement backoff, then retry
- 5xx: Return ExternalServiceError with sanitized message
