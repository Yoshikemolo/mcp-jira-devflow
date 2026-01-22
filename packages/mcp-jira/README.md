# @mcp-jira-devflow/mcp-jira

**Intelligent Jira Integration for AI-Powered Development Workflows**

The MCP Jira server provides comprehensive read access to your Jira Cloud instance through the Model Context Protocol. Designed for enterprise Scrum teams, it delivers intelligent analysis capabilities that transform raw Jira data into actionable insights for AI agents.

---

## Key Features

### Comprehensive Jira Access
Full read access to issues, comments, and search through JQL. Supports pagination, custom fields, and all standard Jira Cloud issue types.

### Scrum Best Practice Analysis
Automated evaluation of issues against Scrum standards. Receive severity-ranked recommendations, health scores, and suggested workflow actions tailored to each issue type.

### Sprint Performance Metrics
Historical velocity tracking across multiple sprints. Analyze completion rates, committed vs delivered points, and identify trends for better sprint planning.

### Deep Hierarchical Analysis
Navigate Epic-to-subtask hierarchies with aggregated metrics. Automatic detection of estimation mismatches, stale work items, unassigned sprint items, and other anomalies.

### Token-Optimized Output
Intelligent response compression that automatically adjusts detail level based on result size. Handle large backlogs without overwhelming AI context windows.

---

## Quick Start

### Option 1: Node.js

```bash
# Install and build
pnpm install
pnpm build

# Run with credentials
JIRA_BASE_URL="https://your-company.atlassian.net" \
JIRA_USER_EMAIL="your-email@company.com" \
JIRA_API_TOKEN="your-api-token" \
node dist/server.js
```

### Option 2: Docker

```bash
# Build and run
docker build -t mcp-jira .
docker run -i \
  -e JIRA_BASE_URL="https://your-company.atlassian.net" \
  -e JIRA_USER_EMAIL="your-email@company.com" \
  -e JIRA_API_TOKEN="your-api-token" \
  mcp-jira
```

### Claude Desktop Configuration

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

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_BASE_URL` | Yes | Your Jira Cloud URL (e.g., `https://company.atlassian.net`) |
| `JIRA_USER_EMAIL` | Yes | Jira account email |
| `JIRA_API_TOKEN` | Yes | API token from Atlassian account settings |
| `JIRA_TIMEOUT` | No | Request timeout in milliseconds (default: 30000) |
| `JIRA_MAX_RETRIES` | No | Maximum retry attempts (default: 3) |

**Getting an API Token**: Visit https://id.atlassian.com/manage-profile/security/api-tokens

---

## Available Tools

### Setup Tools (Always Available)

#### `jira_setup_guide`
Displays configuration status and setup instructions. Useful for troubleshooting connection issues.

#### `jira_configure`
Runtime credential configuration. Enables setup without environment variables (credentials visible in chat history).

---

### Core Operations

#### `get_issue`
Retrieves complete issue details including metadata, status, assignee, labels, components, and custom fields.

```json
{ "issueKey": "PROJ-123" }
```

#### `search_jql`
Executes JQL queries with full pagination support. Token-based pagination handles large result sets efficiently.

```json
{
  "jql": "project = PROJ AND status = 'In Progress'",
  "maxResults": 50,
  "outputMode": "auto"
}
```

**Output Modes**:
- `auto`: Compact format for large results, full details for small results
- `compact`: Minimal fields only (key, summary, status, type)
- `full`: Complete issue details

#### `get_issue_comments`
Retrieves discussion threads with author information and timestamps.

```json
{
  "issueKey": "PROJ-123",
  "maxResults": 50
}
```

---

### Analysis Tools

#### `jira_scrum_guidance`
Evaluates issues against Scrum best practices with type-specific checks.

```json
{
  "issueKey": "PROJ-123",
  "level": "standard"
}
```

**Analysis Levels**:
- `minimal`: Critical issues only
- `standard`: Balanced recommendations
- `verbose`: Complete analysis

**Issue Type Checks**:

| Type | Validations |
|------|-------------|
| Story | Acceptance criteria, user story format, description completeness, assignee |
| Bug | Reproduction steps, environment details, expected/actual behavior, priority |
| Task | Description, in-progress assignee, staleness detection |
| Epic | Business value statement, description, child issue status |
| Subtask | Parent alignment, description, assignee |

**Output Includes**:
- Health score (0-100)
- Completeness score (0-100)
- Severity-ranked recommendations
- Suggested workflow actions
- Context-aware follow-up prompts

---

#### `get_sprint_velocity`
Calculates team velocity metrics across closed sprints.

```json
{
  "projectKey": "PROJ",
  "sprintCount": 5,
  "outputMode": "detailed"
}
```

**Output Modes**:

| Mode | Content | Token Estimate |
|------|---------|----------------|
| `summary` | Averages and totals only | ~200 |
| `detailed` | Per-sprint breakdown | ~500-1000 |
| `full` | Includes issue list | ~2000-5000 |

**Metrics Provided**:
- Average velocity (story points per sprint)
- Completion rate (delivered vs committed)
- Issue throughput
- Sprint-by-sprint breakdown
- Trend indicators

---

#### `jira_deep_analysis`
Hierarchical analysis with automatic anomaly detection. Essential for Epic health checks and sprint readiness assessment.

```json
{
  "issueKey": "EPIC-123",
  "depth": "standard",
  "outputMode": "detailed",
  "maxChildren": 50,
  "includeLinks": true
}
```

**Analysis Depth**:
- `shallow`: Root issue only
- `standard`: Immediate children and links
- `deep`: Full hierarchy traversal

**Anomaly Detection**:

| Anomaly | Description | Severity |
|---------|-------------|----------|
| `POINTS_MISMATCH` | Parent estimate differs from children sum | Warning |
| `UNESTIMATED_CHILDREN` | Children missing story points | Warning/Info |
| `STALE_IN_PROGRESS` | In Progress >5 days without update | Warning |
| `NO_ASSIGNEE_IN_SPRINT` | Sprint items without assignees | Info |

**Automatic Token Management**:

| Result Size | Output Level | Content |
|-------------|--------------|---------|
| <20 issues | FULL | Complete details |
| 20-50 issues | DETAILED | Root full, children compact |
| 50-100 issues | COMPACT | Status tables only |
| >100 issues | SUMMARY | Aggregated metrics |

---

## Example Workflows

### Sprint Planning Review

```
1. Use jira_deep_analysis on each Epic in the sprint
2. Check for POINTS_MISMATCH anomalies (estimation alignment)
3. Identify UNESTIMATED_CHILDREN for refinement
4. Use jira_scrum_guidance on flagged stories
```

### Daily Standup Preparation

```
1. Search for in-progress items: search_jql with status = 'In Progress'
2. Run jira_deep_analysis to detect STALE_IN_PROGRESS
3. Identify blockers through linked issues
```

### Retrospective Data

```
1. Use get_sprint_velocity for the last 5 sprints
2. Compare completion rates and identify patterns
3. Drill into specific sprints with jira_deep_analysis
```

---

## API Compatibility

- **Platform**: Jira Cloud only
- **API Version**: REST API v3 (2024+)
- **Authentication**: API token (Basic Auth)

Server/Data Center deployments are not supported due to API differences.

---

## Security Best Practices

1. **Environment Variables**: Preferred over runtime configuration
2. **Token Scope**: Create dedicated tokens for this integration
3. **Token Rotation**: Regenerate tokens periodically
4. **Read-Only Access**: Server performs no write operations

### Docker Security

- Non-root user execution
- Read-only filesystem option
- No privilege escalation
- Resource limits supported

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Verify email and API token |
| 403 Forbidden | Permission denied | Check account has project access |
| 404 Not Found | Invalid URL or issue | Verify base URL includes `https://` |
| Rate Limited | Too many requests | Reduce request frequency |

---

## Project Structure

```
src/
├── server.ts              # MCP server entry point
├── server-state.ts        # Runtime state management
├── tools/
│   ├── index.ts           # Tool registration
│   ├── get-issue.ts       # Issue retrieval
│   ├── search-jql.ts      # JQL search
│   ├── get-comments.ts    # Comment retrieval
│   ├── scrum-guidance.ts  # Scrum analysis
│   ├── get-sprint-velocity.ts  # Velocity metrics
│   └── deep-analysis.ts   # Hierarchical analysis
├── analysis/              # Deep analysis module
│   ├── context-fetcher.ts # Related issue fetching
│   ├── hierarchy-builder.ts # Tree construction
│   ├── metrics-calculator.ts # Metrics and anomalies
│   └── summarizer.ts      # Token-aware formatting
├── guidance/              # Scrum guidance module
│   ├── analyzer.ts        # Issue analysis
│   ├── rules.ts           # Best-practice rules
│   └── prompts.ts         # Follow-up generation
├── domain/
│   ├── types.ts           # Domain models
│   ├── jira-client.ts     # API client
│   └── mappers.ts         # Response transformation
└── config/
    └── schema.ts          # Configuration validation
```

---

## Development

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build
```

---

## Coming Soon

The following capabilities are planned for future releases:

- **Write Operations**: Create and update issues, manage transitions
- **Sprint Management**: Sprint creation, issue assignment, capacity planning
- **Custom Field Mapping**: Configuration-driven field discovery
- **Webhook Support**: Real-time issue change notifications
- **Advanced JQL Builder**: Natural language to JQL translation

---

## Related Documentation

- [Main Project README](../../README.md) - Project overview and roadmap
- [Agent Constraints](./agents.md) - AI behavior guidelines
- [Feature Specifications](../../features/) - Detailed feature documentation

---

*Part of the MCP Jira DevFlow suite - AI-powered development workflow automation*
