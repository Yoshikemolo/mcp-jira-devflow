# @mcp-jira-devflow/mcp-jira

MCP server for Jira integration. Provides read-only access to Jira issues, JQL search, and comments.

## Quick Start

### Option 1: Direct (Node.js)

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run with environment variables
JIRA_BASE_URL="https://your-company.atlassian.net" \
JIRA_USER_EMAIL="your-email@company.com" \
JIRA_API_TOKEN="your-api-token" \
node dist/server.js
```

### Option 2: Docker

```bash
# Build image
docker build -t mcp-jira .

# Run with environment variables
docker run -i \
  -e JIRA_BASE_URL="https://your-company.atlassian.net" \
  -e JIRA_USER_EMAIL="your-email@company.com" \
  -e JIRA_API_TOKEN="your-api-token" \
  mcp-jira
```

Or with docker-compose (create a `.env` file first):

```bash
docker-compose up
```

## Configuration

### Getting a Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "MCP Jira")
4. Copy the generated token (you won't see it again!)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | Jira instance URL (e.g., `https://company.atlassian.net`) |
| `JIRA_USER_EMAIL` | Yes | Your Jira account email |
| `JIRA_API_TOKEN` | Yes | Your Jira API token |
| `JIRA_TIMEOUT` | No | Request timeout in ms (default: 30000) |
| `JIRA_MAX_RETRIES` | No | Max retry attempts (default: 3) |

### Claude Code Configuration

Add to your MCP config file (`~/.claude/claude_desktop_config.json` on macOS/Linux):

**Option A: Environment Variables (Recommended)**

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/mcp-jira/dist/server.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_USER_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Option B: Docker**

```json
{
  "mcpServers": {
    "jira": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "JIRA_BASE_URL=https://your-company.atlassian.net",
        "-e", "JIRA_USER_EMAIL=your-email@company.com",
        "-e", "JIRA_API_TOKEN=your-api-token",
        "mcp-jira"
      ]
    }
  }
}
```

### Unconfigured Mode

The server starts gracefully even without credentials. When unconfigured:

- `jira_setup_guide` and `jira_configure` tools are available
- Jira tools return helpful error messages
- Use `jira_configure` to set credentials at runtime

## Available Tools

### Always Available

#### `jira_setup_guide`

Shows configuration status and setup instructions.

```json
{}
```

Returns: Configuration status, setup steps, and troubleshooting tips.

#### `jira_configure`

Configure Jira credentials at runtime.

```json
{
  "baseUrl": "https://company.atlassian.net",
  "email": "user@company.com",
  "apiToken": "your-api-token",
  "confirmSecurityWarning": true
}
```

**Security Warning**: Credentials will be visible in chat history. For better security, use environment variables.

### Requires Configuration

#### `get_issue`

Retrieves a Jira issue by its key.

```json
{
  "issueKey": "PROJ-123"
}
```

Returns: Issue details including summary, description, status, assignee, and metadata.

#### `search_jql`

Searches for issues using JQL (Jira Query Language).

```json
{
  "jql": "project = PROJ AND status = Open",
  "maxResults": 50,
  "nextPageToken": "optional-token-for-next-page"
}
```

Returns: List of matching issues with pagination info. Maximum 50 results per request.

**Note**: Uses token-based pagination. Use `nextPageToken` from the response for subsequent pages.

#### `get_issue_comments`

Retrieves comments from a Jira issue.

```json
{
  "issueKey": "PROJ-123",
  "startAt": 0,
  "maxResults": 50
}
```

Returns: List of comments with author, body, and timestamps.

#### `jira_scrum_guidance`

Analyzes a Jira issue and provides SCRUM best practice recommendations, workflow action suggestions, and contextual follow-up prompts.

```json
{
  "issueKey": "PROJ-123",
  "level": "standard"
}
```

**Parameters:**
- `issueKey` (required): The Jira issue key
- `level` (optional): Detail level - `minimal` (critical issues only), `standard` (default), or `verbose` (all recommendations)

**Returns:** Analysis including:
- **Summary**: Issue metadata, health score (0-100), and completeness score (0-100)
- **Recommendations**: SCRUM best practice issues by severity (critical, high, medium, low, info)
- **Workflow Actions**: Suggested next steps based on issue status
- **Follow-up Prompts**: Contextual prompts for further assistance

**Issue Type Checks:**
| Type | Key Checks |
|------|------------|
| Story | Acceptance criteria, user story format, description, assignee |
| Bug | Reproduction steps, environment info, expected/actual behavior, priority |
| Task | Description, assignee when in-progress, staleness |
| Epic | Business value statement, description |
| Subtask | Description, assignee when in-progress |

**Example Output:**
```
## Summary
- Issue: PROJ-123
- Type: Story
- Health Score: 65/100
- Completeness: 70/100

## Recommendations
### [CRITICAL] Missing Acceptance Criteria
Stories should have clear acceptance criteria...

## Follow-up Prompts
- "Help me write acceptance criteria for PROJ-123"
```

## Security

### Best Practices

1. **Use environment variables** - More secure than runtime configuration
2. **Never commit credentials** - Add `.env` to `.gitignore`
3. **Use API tokens, not passwords** - Tokens can be revoked independently
4. **Limit token scope** - Create tokens specifically for this integration
5. **Rotate tokens periodically** - Revoke and regenerate regularly

### Docker Security

The Docker image includes security hardening:

- Non-root user (`mcpuser`)
- Read-only filesystem (when using docker-compose)
- No new privileges
- Resource limits

### Runtime Configuration Warning

When using `jira_configure`, credentials will be visible in the chat history. This is convenient for testing but not recommended for production. Always use environment variables for sensitive deployments.

## API Compatibility

- **Jira Cloud** REST API v3 (2024+)
- **Deployment type**: Cloud only (Server/Data Center not supported)

The server verifies API compatibility on connection.

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Check email and API token |
| 403 Forbidden | No permission | Verify account has access to the resource |
| 404 Not Found | Invalid URL | Check base URL includes `https://` |
| Connection refused | Network issue | Check firewall and network settings |

## Project Structure

```
src/
├── server.ts             # MCP server entry point (graceful startup)
├── server-state.ts       # Runtime state management
├── tools/
│   ├── index.ts          # State-aware tool registration
│   ├── setup-guide.ts    # Setup guide tool
│   ├── configure.ts      # Runtime configuration tool
│   ├── get-issue.ts      # Get issue tool
│   ├── search-jql.ts     # JQL search tool
│   ├── get-comments.ts   # Get comments tool
│   └── scrum-guidance.ts # SCRUM guidance tool
├── guidance/             # SCRUM guidance module
│   ├── index.ts          # Module exports
│   ├── types.ts          # Guidance types
│   ├── analyzer.ts       # Issue analysis logic
│   ├── rules.ts          # SCRUM rules & field checks
│   └── prompts.ts        # Follow-up prompt generator
├── config/
│   └── schema.ts         # Configuration validation
└── domain/
    ├── types.ts          # Domain types
    ├── jira-client.ts    # Jira API client
    └── mappers.ts        # Response mappers
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

# Build Docker image
docker build -t mcp-jira .
```

## See Also

- [agents.md](./agents.md) - Agent constraints for this package
- [Feature F001](../../features/F001-jira-read/) - Feature specification
