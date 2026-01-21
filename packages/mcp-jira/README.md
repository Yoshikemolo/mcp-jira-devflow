# @mcp-jira-devflow/mcp-jira

MCP server for Jira integration. A comprehensive toolkit for AI-powered Jira analysis, SCRUM guidance, and sprint metrics.

## Features

- **Read-only Jira Access**: Secure integration with Jira Cloud REST API v3
- **JQL Search**: Full JQL query support with token-optimized output modes
- **SCRUM Guidance**: AI-powered recommendations for issue quality and workflow
- **Sprint Velocity**: Team performance metrics and trend analysis
- **Deep Analysis**: Automatic hierarchy traversal with anomaly detection

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
  "outputMode": "auto",
  "nextPageToken": "optional-token-for-next-page"
}
```

**Parameters:**
- `jql` (required): JQL query string
- `maxResults` (optional): Maximum results per request (1-50, default: 50)
- `outputMode` (optional): `auto` (default), `compact`, or `full`
- `nextPageToken` (optional): Token for pagination

**Output Modes:**

| Mode | Content | Use Case |
|------|---------|----------|
| `auto` | Compact for >5 results, full otherwise | General use |
| `compact` | Key, summary, status, assignee only | Large result sets |
| `full` | All issue fields | Detailed analysis |

Returns: List of matching issues with pagination info. Maximum 50 results per request.

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

#### `get_sprint_velocity`

Calculates sprint velocity metrics for a project. Returns aggregated metrics optimized for token usage.

```json
{
  "projectKey": "PROJ",
  "sprintCount": 5,
  "outputMode": "detailed"
}
```

**Parameters:**
- `projectKey` (required): The Jira project key (e.g., "PROJ")
- `sprintCount` (optional): Number of recent closed sprints to analyze (1-10, default: 5)
- `outputMode` (optional): Output format - `summary` (averages only), `detailed` (default, per-sprint metrics), or `full` (includes issue list)

**Returns:** Sprint velocity analysis including:
- **Average Velocity**: Average story points completed per sprint
- **Completion Rates**: Points completed vs committed per sprint
- **Issue Counts**: Number of completed vs total issues
- **Sprint Details**: Per-sprint breakdown (in detailed/full modes)
- **Issue List**: Compact issue list (in full mode only)

**Output Modes:**

| Mode | Content | Tokens |
|------|---------|--------|
| `summary` | Only averages and totals | ~200 |
| `detailed` | Per-sprint metrics without issues | ~500-1000 |
| `full` | Includes compact issue list | ~2000-5000 |

**Notes:**
- Uses story points from common custom field locations (`customfield_10016`, etc.)
- If story points are not found, velocity is calculated by issue count
- Only analyzes closed sprints
- Sprint data comes from `customfield_10020` (or similar sprint custom fields)

#### `jira_deep_analysis`

Analyzes an issue's complete context by automatically fetching parent epics, child subtasks, and linked issues. Detects anomalies like estimation mismatches and provides hierarchical insights.

```json
{
  "issueKey": "EPIC-123",
  "depth": "standard",
  "outputMode": "detailed",
  "maxChildren": 50,
  "includeLinks": true
}
```

**Parameters:**
- `issueKey` (required): The Jira issue key to analyze
- `depth` (optional): Analysis depth - `shallow` (issue only), `standard` (default, +parent/children), `deep` (+linked issues)
- `outputMode` (optional): `summary`, `detailed` (default), or `full`
- `maxChildren` (optional): Maximum child issues to fetch (1-100, default: 50)
- `includeLinks` (optional): Whether to include linked issues (default: true)

**Returns:** Deep analysis including:
- **Hierarchy**: Parent epic, child subtasks/stories, linked issues
- **Aggregated Metrics**: Total story points, status distribution, completion rates
- **Anomaly Detection**: Automatic identification of potential issues

**Detected Anomalies:**

| Anomaly | Description |
|---------|-------------|
| `POINTS_MISMATCH` | Epic story points don't match sum of children |
| `UNESTIMATED_CHILDREN` | Child issues missing story point estimates |
| `STALE_IN_PROGRESS` | Issues in progress for >5 days without updates |
| `NO_ASSIGNEE_IN_SPRINT` | Sprint items without an assignee |

**Token Management:**

The tool automatically adjusts output detail based on hierarchy size:

| Size | Output Level |
|------|--------------|
| <20 issues | Full details |
| 20-50 issues | Root full, children compact |
| 50-100 issues | Status distribution tables |
| >100 issues | Aggregated metrics only |

**Example Use Case:**

Analyzing `EPIC-123` (estimated at 55 points) reveals 20 subtasks totaling 75 points - the `POINTS_MISMATCH` anomaly is automatically detected and reported.

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
├── test-guidance.mjs     # Interactive CLI test script
└── src/
    ├── server.ts             # MCP server entry point (graceful startup)
    ├── server-state.ts       # Runtime state management
    ├── tools/
    │   ├── index.ts              # State-aware tool registration
    │   ├── setup-guide.ts        # Setup guide tool
    │   ├── configure.ts          # Runtime configuration tool
    │   ├── get-issue.ts          # Get issue tool
    │   ├── search-jql.ts         # JQL search tool
    │   ├── get-comments.ts       # Get comments tool
    │   ├── scrum-guidance.ts     # SCRUM guidance tool
    │   ├── get-sprint-velocity.ts # Sprint velocity metrics tool
    │   └── deep-analysis.ts      # Deep hierarchy analysis tool
    ├── analysis/             # Deep analysis module
    │   ├── index.ts          # Module exports
    │   ├── types.ts          # Analysis types
    │   ├── context-fetcher.ts    # Hierarchy data fetching
    │   ├── hierarchy-builder.ts  # Tree structure construction
    │   ├── metrics-calculator.ts # Metrics and anomaly detection
    │   └── summarizer.ts         # Token-aware output formatting
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

## Testing SCRUM Guidance

An interactive CLI tool is provided to test the SCRUM guidance feature without needing the full MCP server.

### Running the Test Script

```bash
# Build first (required)
pnpm build

# Run the interactive test
node test-guidance.mjs
```

### Features

- **Interactive credential input**: Prompts for Jira URL, email, and API token if not configured
- **Credential storage**: Optionally saves credentials locally for future use (with security warning)
- **Issue listing**: Shows your assigned "To Do" issues before analysis
- **Colored output**: Visual feedback with colors for severity levels and scores
- **Detailed analysis**: Displays recommendations, workflow actions, and follow-up prompts

### Environment Variables

You can skip the credential prompts by setting environment variables:

```bash
export JIRA_BASE_URL="https://your-company.atlassian.net"
export JIRA_USER_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-api-token"
node test-guidance.mjs
```

## See Also

- [agents.md](./agents.md) - Agent constraints for this package
- [Feature F001](../../features/F001-jira-read/) - Feature specification
