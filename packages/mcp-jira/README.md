# @mcp-jira-devflow/mcp-jira

MCP server for Jira integration.

## Status

**F001 Implemented** - Read operations available.

## Available Tools

### `get_issue`

Retrieves a Jira issue by its key.

```json
{
  "issueKey": "PROJ-123"
}
```

Returns: Issue details including summary, description, status, assignee, and metadata.

### `search_jql`

Searches for issues using JQL (Jira Query Language).

```json
{
  "jql": "project = PROJ AND status = Open",
  "startAt": 0,
  "maxResults": 50
}
```

Returns: List of matching issues with pagination info. Maximum 50 results per request.

### `get_issue_comments`

Retrieves comments from a Jira issue.

```json
{
  "issueKey": "PROJ-123",
  "startAt": 0,
  "maxResults": 50
}
```

Returns: List of comments with author, body, and timestamps.

## Configuration

Set the following environment variables:

```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

Optional:
```bash
JIRA_TIMEOUT=30000      # Request timeout in ms (default: 30000)
JIRA_MAX_RETRIES=3      # Max retry attempts (default: 3)
```

## Structure

```
src/
├── server.ts           # MCP server entry point
├── tools/
│   ├── get-issue.ts    # Get issue tool
│   ├── search-jql.ts   # JQL search tool
│   └── get-comments.ts # Get comments tool
├── config/
│   └── schema.ts       # Configuration validation
└── domain/
    ├── types.ts        # Domain types
    ├── jira-client.ts  # Jira API client
    └── mappers.ts      # Response mappers
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build
```

## See Also

- [agents.md](./agents.md) - Agent constraints for this package
- [Feature F001](../../features/F001-jira-read/) - Feature specification
