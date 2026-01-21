# MCP Jira DevFlow

**AI-Powered Development Workflow Automation for Enterprise SCRUM Teams**

MCP Jira DevFlow is a comprehensive suite of Model Context Protocol (MCP) servers that bridge AI agents with Jira and Git, enabling intelligent automation across the entire software development lifecycle. From sprint planning to deployment, empower your team with AI-assisted workflows that understand your SCRUM process.

Built by practitioners for SCRUM teams that want to automate Jira workflows with AI.

---

## Why MCP Jira DevFlow?

Modern enterprise development demands more than basic integrations. Teams need intelligent tools that:

- **Understand Context**: AI agents that grasp issue hierarchies, dependencies, and team velocity
- **Enforce Best Practices**: Automated SCRUM compliance checks and actionable recommendations
- **Scale Efficiently**: Token-optimized responses that handle large backlogs without overwhelming context windows
- **Integrate Seamlessly**: Native MCP support for Claude, with extensible architecture for other AI platforms

Whether you are managing a single project or orchestrating multiple enterprise applications, MCP Jira DevFlow provides the foundation for AI-augmented agile development.

---

## Prompt Examples

Stop context-switching between Jira and your IDE. These prompts demonstrate how MCP Jira DevFlow transforms natural language into actionable Jira intelligence.

### Backlog Analysis

**Problem**: You need to understand the state of your backlog before sprint planning, but navigating Jira dashboards takes too long.

```
Analyze the backlog for project WEBAPP. Show me all unestimated stories,
any epics with inconsistent point totals, and items that have been
in progress for more than 5 days.
```

```
Give me a health check of epic WEBAPP-150. Are there any orphaned subtasks,
missing estimates, or blocked items I should know about?
```

### Sprint Management

**Problem**: Sprint ceremonies consume valuable time that could be spent coding. You need instant visibility into sprint health.

```
What is the current status of our active sprint? Show me completion percentage,
remaining story points, and highlight any items at risk.
```

```
Compare the velocity of the last 5 sprints for project MOBILE.
Are we improving or declining? What is our average capacity?
```

```
Move tickets WEBAPP-201, WEBAPP-202, and WEBAPP-203 to the next sprint.
They were not completed and need to carry over.
```

### Issue Creation and Updates

**Problem**: Creating well-structured Jira tickets interrupts your development flow. You need to capture requirements without leaving your context.

```
Create a bug ticket in project API: Users are receiving 500 errors when
uploading files larger than 10MB. Priority is high. Assign it to me.
```

```
Break down story WEBAPP-180 into subtasks for: database schema changes,
API endpoint implementation, frontend integration, and unit tests.
Estimate each subtask.
```

```
Update WEBAPP-195: change the status to In Review, add label "needs-qa",
and set story points to 5.
```

### Team Coordination

**Problem**: Standup meetings lack focus because team members spend time searching for their assigned work instead of discussing blockers.

```
Show me all in-progress items assigned to the frontend team.
Include how long each has been in progress and any blockers.
```

```
What tickets are assigned to maria@company.com in the current sprint?
Are any of them blocked or overdue?
```

### SCRUM Compliance

**Problem**: Maintaining SCRUM best practices requires constant vigilance. Poorly defined tickets slip through and cause downstream issues.

```
Review ticket WEBAPP-210 against SCRUM best practices.
Does it have clear acceptance criteria, proper estimation, and correct categorization?
```

```
Find all stories in the current sprint that are missing acceptance criteria
or have no story points assigned.
```

### Custom Field Discovery

**Problem**: Your Jira instance uses non-standard field IDs, and story points are not being captured correctly.

```
Discover all custom fields in my Jira instance that might be used for story points.
Show me numeric fields with names containing "point" or "estimate".
```

```
Configure the story points field to use customfield_10045
and the sprint field to use customfield_10022.
```

### Issue History and Auditing

**Problem**: You need to track when estimates were changed, who modified issues, or audit the history of critical tickets.

```
Show me the changelog for WEBAPP-150. I want to see when the story points
were changed and by whom.
```

```
Get the history of status changes for issue API-300.
When did it move to In Progress and how long was it there?
```

```
Who changed the assignee on MOBILE-88 and when? I need to understand
the handoff history.
```

### Advanced JQL Queries

**Problem**: Complex queries require JQL expertise. You need powerful searches without memorizing syntax.

```
Find all high-priority bugs created in the last 2 weeks that are still open
and not assigned to anyone.
```

```
Show me all stories completed in the last sprint that had their estimates
changed after sprint start.
```

```
Search for tickets in project PLATFORM that mention "performance"
in the description and have more than 3 comments.
```

---

## Current Capabilities

### Jira Integration (Production Ready)

| Feature | Description |
|---------|-------------|
| **Issue Management** | Retrieve, search, and analyze Jira issues with full JQL support |
| **SCRUM Guidance** | Automated best-practice analysis with health scores and actionable recommendations |
| **Sprint Velocity** | Historical velocity metrics with trend analysis across multiple sprints |
| **Deep Analysis** | Hierarchical issue analysis with anomaly detection (points mismatch, stale items, unassigned work) |
| **Board & Sprint Management** | List boards, manage sprints, move issues between sprints with state validation |
| **Token Optimization** | Intelligent output compression that adapts to result size |

### Available Tools

| Tool | Purpose |
|------|---------|
| `get_issue` | Retrieve complete issue details by key |
| `search_jql` | Execute JQL queries with pagination support |
| `get_issue_comments` | Access issue discussion threads |
| `get_issue_changelog` | Retrieve issue change history (field changes, status transitions, estimate updates) |
| `jira_scrum_guidance` | SCRUM best-practice analysis with severity-ranked recommendations |
| `get_sprint_velocity` | Team velocity metrics and sprint performance analysis |
| `jira_deep_analysis` | Hierarchical analysis with metrics aggregation and anomaly detection |
| `create_issue` | Create new issues with full field support (subtasks, story points, labels) |
| `update_issue` | Update existing issues (summary, description, assignee, priority, etc.) |
| `transition_issue` | Transition issues between workflow states |
| `get_boards` | List Jira boards with project/type/name filters |
| `get_board_sprints` | List sprints for a board (future/active/closed) |
| `get_sprint` | Get sprint details with issues and metrics |
| `move_issues_to_sprint` | Move issues to a sprint (with dry run support) |
| `update_sprint` | Update sprint name, dates, goal, or state |
| `jira_configure_fields` | Configure custom field mappings for Story Points and Sprint |
| `jira_discover_fields` | Discover available custom fields from your Jira instance |
| `jira_dev_reload` | Development only: triggers graceful server restart to apply code changes |

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Jira Cloud instance with API access

### Installation

```bash
# Clone the repository
git clone https://github.com/ximplicity/mcp-jira-devflow.git
cd mcp-jira-devflow

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Run Locally

Once configured (see next section), run the MCP server directly from the command line:

```bash
# Using environment variables (export or .env)
pnpm -C packages/mcp-jira start

# Or inline for quick testing
JIRA_BASE_URL=https://your-domain.atlassian.net \
JIRA_USER_EMAIL=your-email@example.com \
JIRA_API_TOKEN=your-api-token \
pnpm -C packages/mcp-jira start
```

The server communicates via stdio using the MCP protocol. It outputs startup information to stderr and waits for MCP commands on stdin.

---

## Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JIRA_BASE_URL` | Your Jira instance URL (e.g., `https://company.atlassian.net`) | Yes |
| `JIRA_USER_EMAIL` | Your Jira account email | Yes |
| `JIRA_API_TOKEN` | Your Jira API token ([generate here](https://id.atlassian.com/manage-profile/security/api-tokens)) | Yes |

```bash
# Option: Create a .env file
cp .env.example .env
# Then edit .env with your credentials
```

### Custom Field Configuration

Different Jira instances use different custom field IDs for Story Points and Sprint fields. You can configure these via environment variables or at runtime.

| Variable | Description | Example |
|----------|-------------|---------|
| `JIRA_FIELD_STORY_POINTS` | Custom field ID for Story Points | `customfield_10016` |
| `JIRA_FIELD_SPRINT` | Custom field ID for Sprint | `customfield_10020` |

**Runtime discovery**: If you don't know your field IDs, use `jira_discover_fields` to find them and `jira_configure_fields` to set them.

### Claude Desktop Integration

Add to `~/.claude/claude_desktop_config.json`:

**Minimal config:**

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/mcp-jira-devflow/packages/mcp-jira/dist/server.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_USER_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Full config (with custom fields):**

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/mcp-jira-devflow/packages/mcp-jira/dist/server.js"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_USER_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_FIELD_STORY_POINTS": "customfield_10016",
        "JIRA_FIELD_SPRINT": "customfield_10020"
      }
    }
  }
}
```

---

## Security and Permissions

MCP Jira DevFlow follows the principle of least privilege. Understanding which operations modify data helps you configure appropriate access controls.

### Read vs Write Operations

| Operation Type | Tools | Risk Level |
|---------------|-------|------------|
| **Read-only** | `get_issue`, `search_jql`, `get_issue_comments`, `get_issue_changelog`, `jira_scrum_guidance`, `get_sprint_velocity`, `jira_deep_analysis`, `get_boards`, `get_board_sprints`, `get_sprint`, `jira_discover_fields` | Low |
| **Write** | `create_issue`, `update_issue`, `transition_issue`, `move_issues_to_sprint`, `update_sprint`, `jira_configure_fields` | Medium |

### Recommendations

1. **Use service accounts**: Create a dedicated Jira user for MCP integrations instead of using personal credentials. This provides audit trails and allows granular permission control.

2. **Apply project restrictions**: Configure the service account with access only to projects that require AI automation. Jira Cloud allows project-level permission schemes.

3. **Use dry-run mode when available**: Some write operations (`create_issue`, `update_issue`, `move_issues_to_sprint`, `update_sprint`) support `dryRun: true` to validate without executing. Note that `transition_issue` does not support dry-run.

4. **Rotate API tokens**: Jira API tokens do not expire automatically. Establish a rotation policy (e.g., quarterly) and store tokens securely using environment variables or secret managers.

5. **Monitor usage**: Review the Jira audit log periodically to track actions performed by the service account.

---

## Compatibility

| Component | Supported | Notes |
|-----------|-----------|-------|
| **Jira Cloud** | Yes | Fully tested and production-ready |
| **Jira Server / Data Center** | No | Uses Cloud-only REST API v3 endpoints |
| **Node.js** | 20.0.0+ | Required for ES modules and native fetch |
| **pnpm** | 9.0.0+ | Required for workspace management |
| **MCP Protocol** | 1.0+ | Compatible with Claude Desktop and Claude Code |

---

## Roadmap

MCP Jira DevFlow is evolving toward a unified platform for AI-assisted enterprise development:

### Phase 1: Jira Mastery (Current)
- [x] Read operations (issues, comments, search, changelog)
- [x] SCRUM guidance and best-practice enforcement
- [x] Sprint velocity and performance metrics
- [x] Deep hierarchical analysis with anomaly detection
- [x] Write operations (create, update, transition issues)
- [x] Board and sprint management
- [x] Custom field mapping and configuration

### Phase 2: Git Integration (Upcoming)
- [ ] Repository context awareness
- [ ] Branch management aligned with Jira issues
- [ ] Automated PR creation with issue linking
- [ ] Commit message validation against issue requirements
- [ ] Code review assistance with context from Jira specifications

### Phase 3: Unified DevFlow (Future)
- [ ] End-to-end sprint planning with AI recommendations
- [ ] Automated documentation generation from issue hierarchies
- [ ] Release notes compilation from completed work
- [ ] Cross-project dependency analysis
- [ ] Predictive analytics for sprint planning
- [ ] CI/CD integration for deployment tracking

---

## Architecture

```
mcp-jira-devflow/
├── packages/
│   ├── mcp-jira/           # Jira integration server (Production)
│   ├── mcp-devflow/        # Git and workflow automation (Development)
│   └── shared/             # Common utilities and types
├── features/               # Feature specifications
├── skills/                 # Agent behavior definitions
└── docs/                   # Technical documentation
```

### Design Principles

- **Domain-Driven**: Clean separation between API, domain logic, and presentation
- **Token-Aware**: All outputs optimized for AI context window efficiency
- **Extensible**: Plugin architecture for custom integrations
- **Secure**: Read-only by default, explicit permissions for write operations
- **Observable**: Comprehensive logging and error handling

### Feature Status

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F001 | Jira Read Operations | Stable | Issue retrieval, JQL search, comments, changelog |
| F002 | SCRUM Guidance | Stable | Best-practice analysis and recommendations |
| F004 | Sprint Velocity | Stable | Team performance metrics |
| F005 | Deep Analysis | Stable | Hierarchical analysis with anomaly detection |
| F006 | Jira Write Operations | Stable | Issue creation and updates |
| F009 | Board & Sprint Management | Stable | Board listing, sprint operations, issue movement |
| F007 | Git Integration | Planned | Repository and branch management |
| F008 | PR Automation | Planned | Automated pull request workflows |

### Development Mode

For contributors and developers working on the MCP server, a hot-reload mode is available that watches for file changes and notifies connected clients.

| Variable | Description | Default |
|----------|-------------|---------|
| `JIRA_MCP_DEV` | Enable development mode with file watcher | `false` |
| `JIRA_MCP_AUTO_RESTART` | Automatically restart server on file changes | `false` |
| `JIRA_MCP_DEBOUNCE_MS` | Debounce delay for file change detection (ms) | `500` |

**Development workflow:**

1. Add `"JIRA_MCP_DEV": "true"` to your Claude Desktop config
2. Run `pnpm build --watch` in `packages/mcp-jira`
3. Use `jira_dev_reload` tool to trigger graceful restart after changes

---

## Documentation

- [Jira Package Documentation](./packages/mcp-jira/README.md) - Detailed tool reference
- [Architecture Overview](./docs/architecture/overview.md) - System design
- [Security Guidelines](./docs/security/overview.md) - Best practices
- [Agent Constraints](./agents.md) - AI behavior rules

---

## For AI Agents

Agents working with this codebase should:

1. Read [agents.md](./agents.md) for global rules
2. Review the relevant package's constraints
3. Check [/skills](./skills/) for permitted operations
4. Reference [/features](./features/) for specifications

---

## Contributing

We welcome contributions that advance the vision of AI-assisted enterprise development. See our contribution guidelines for details on:

- Feature proposals
- Code standards
- Testing requirements
- Documentation expectations

---

## About

**Author**: Jorge Rodriguez Rengel ([@Yoshikemolo](https://github.com/Yoshikemolo))

**Organization**: Ximplicity Software Solutions, S.L.

**Contact**: info@ximplicity.es

**License**: MIT License - See [LICENSE](LICENSE) for details.

Copyright (c) 2026 Ximplicity Software Solutions, S.L.

---

*MCP Jira DevFlow: Bridging AI Intelligence with Enterprise Agility*
