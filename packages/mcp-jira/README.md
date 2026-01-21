# @mcp-jira-devflow/mcp-jira

MCP server for Jira integration.

## Status

**F001 Implemented** - Read operations available.

## API Compatibility

This MCP server is compatible with:

- **Jira Cloud** REST API v3 (2024+)
- **Deployment type**: Cloud only (Server/Data Center not supported)

The server verifies API compatibility on connection and will report an error if the Jira instance is not compatible.

### API Changes (2024)

This implementation uses the new `/rest/api/3/search/jql` endpoint which:
- Requires `POST` method with JSON body
- Uses token-based pagination (`nextPageToken`, `isLast`) instead of total count
- Requires bounded JQL queries (must include restrictions like `project = X`)

### Connection Verification

The client automatically verifies:
1. Jira instance is Cloud deployment
2. API authentication is valid
3. User has access to the Jira instance

Use `verifyConnection()` to check compatibility before executing operations.

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
  "maxResults": 50,
  "nextPageToken": "optional-token-for-next-page"
}
```

Returns: List of matching issues with pagination info. Maximum 50 results per request.

**Note**: The new Jira API v3 uses token-based pagination. Use the `nextPageToken` from the response to fetch subsequent pages. The `total` count is no longer provided by Jira; use `isLast` to check if there are more results.

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
