# MCP Jira DevFlow

> **Not just Jira CRUD. This is Scrum-aware AI tooling.**

---

## Table of Contents

| Section | What You'll Find |
|---------|------------------|
| [**Why MCP Jira DevFlow**](#why-mcp-jira-devflow) | Differentiation, comparison table, why developers should care |
| [**The Core Idea**](#the-core-idea) | The philosophy: decisions and summaries, not raw payloads |
| [**What This is NOT**](#what-this-is-not) | Setting clear expectations |
| [**Try in 90 Seconds**](#try-in-90-seconds) | Run the interactive test tool with your Jira |
| [**Prompt Examples**](#prompt-examples-with-real-output) | Real screenshots from live Jira projects |
| [**Quick Start**](#quick-start) | Installation, configuration, Claude Desktop setup |
| [**Security**](#security-and-permissions) | Read vs write operations, best practices |
| [**Architecture**](#architecture) | Project structure, design principles, feature status |
| [**Roadmap**](#roadmap) | Current phase, upcoming Git integration, future plans |
| [**Contributing**](#contributing) | How to contribute to the project |

---

## Why MCP Jira DevFlow

There are 20+ MCP Jira connectors. Most do the same thing: create, read, update issues. **This one understands your agile process.**

MCP Jira DevFlow is a **semantic AI layer for Agile workflows**. It doesn't just fetch data from Jira—it analyzes sprint health, detects estimation anomalies, enforces Scrum best practices, and shapes outputs for AI context efficiency.

**MCP Jira DevFlow returns decisions and summaries, not raw Jira payloads.**

### What Makes This Different

| Capability | Generic MCP Jira | MCP Jira DevFlow |
|------------|------------------|------------------|
| **Scrum Semantics** | Read/write issues | Health scores, workflow recommendations, compliance checks |
| **Hierarchy Analysis** | Flat issue lists | Epic → Story → Subtask traversal with rollup metrics |
| **Sprint Intelligence** | Basic queries | Velocity trends, burndown insights, capacity analysis |
| **Token Optimization** | Raw JSON dumps | Adaptive output compression for large backlogs |
| **Anomaly Detection** | None | Points mismatch, stale items, unestimated work alerts |

### Why Developers Should Care

- **Fewer Jira clicks** — Query your backlog from the terminal or IDE
- **Less ceremony overhead** — Get sprint status in seconds, not meetings
- **Faster standups** — "What's blocking the team?" answered instantly
- **Better ticket quality** — AI-assisted acceptance criteria and estimation checks
- **Less planning friction** — Velocity trends and capacity analysis on demand

---

## The Core Idea

**AI should understand Agile semantics, not just issue fields.**

When you ask "Is my sprint healthy?", you don't want raw JSON. You want:
- Completion percentage and remaining capacity
- Items at risk based on time-in-status patterns
- Recommendations grounded in Scrum best practices

MCP Jira DevFlow provides that intelligence layer.

---

## What This is NOT

To set clear expectations, MCP Jira DevFlow is:

- **Not a replacement for the Jira UI**: This tool augments your workflow by enabling AI-powered queries and automation. You will still use Jira's interface for visual boards, complex configurations, and administrative tasks.

- **Not an autonomous agent**: MCP Jira DevFlow responds to explicit prompts and commands. It does not independently make decisions, modify issues without instruction, or take actions on its own initiative.

- **Not full planning automation**: While it provides velocity metrics, Scrum guidance, and analysis, sprint planning still requires human judgment. The tool informs decisions; it does not make them for you.

---

## Try in 90 Seconds

> Uses Jira API token. Stored locally in `.jira-test-config.json` (gitignored).
> **Recommended**: use a service account with read-only permissions.

Want to see Scrum guidance in action before configuring Claude? Run the interactive test tool:

```bash
# Clone and build
git clone https://github.com/ximplicity/mcp-jira-devflow.git
cd mcp-jira-devflow
pnpm install && pnpm build

# Run the interactive test
node packages/mcp-jira/test-guidance.mjs
```

![Example of quick MCP Jira DevFlow test in 90 seconds](/examples/output-example-00.png)

The tool will:
1. Prompt for your Jira credentials (or use environment variables)
2. Optionally show your assigned issues
3. Analyze any issue for Scrum best practices
4. Display health score, completeness score, and actionable recommendations

**Example output:**

```
  Issue:        IPV2-960 (Epic)
  Status:       indeterminate
  Health:       92/100
  Completeness: 89/100

── Recommendations ─────────────────────────────────────────────

  [MEDIUM] Consider Adding Business Value Statement
  Epics should clearly articulate business value to guide prioritization.
  → Add a business value or goal statement explaining why this epic matters.
```

> **Note**: Credentials may be stored locally for convenience in `.jira-test-config.json` (excluded from version control). This option is intended for local testing only. For production deployments or shared environments, always use environment variables (`env`) as documented.

---

## Prompt Examples with Real Output

The screenshots below are **real MCP responses** generated by Claude Code using MCP Jira DevFlow on a live Jira project. No mockups—this is what you actually get.

---

### Team Coordination

**Problem**: Standup meetings lack focus because team members spend time searching for their assigned work instead of discussing blockers.

**Prompt**:
```
Show me all in-progress items assigned to the frontend team.
Include how long each has been in progress and any blockers.
```

**Output (Real Claude Session)**:

![Team coordination output showing in-progress items with duration and blockers](/examples/output-example-01.png)

> **Figure: Team Workload Analysis**
> - In-progress items grouped by assignee
> - Duration tracked (e.g., "58 days" flags stale work)
> - Blockers surfaced with decision context
> - Actionable recommendations included

**What this demonstrates**:
- Scrum semantic analysis (not just raw issue data)
- Time-in-status tracking for stale item detection
- Blocker context extraction from comments
- Token-optimized tabular output

---

### Issue History and Auditing

**Problem**: You need to track when estimates were changed, who modified issues, or audit the history of critical tickets.

**Prompt**:
```
Get the history of status changes for issue IPV2-960.
When did it move to In Progress and how long was it there?
```

**Output (Real Claude Session)**:

![Status change history with timeline visualization](/examples/output-example-02.png)

> **Figure: Issue Status Timeline**
> - Complete status transition history
> - Duration in each status calculated
> - Visual timeline representation
> - Blocked periods identified

**What this demonstrates**:
- Changelog API integration
- Temporal analysis (time spent per status)
- Pattern detection (repeated status changes)
- Audit trail for compliance

---

### Advanced JQL Queries

**Problem**: Complex queries require JQL expertise. You need powerful searches without memorizing syntax.

**Prompt**:
```
Find all high-priority bugs created in the last 2 weeks that are still open
and not assigned to anyone in the project IPV1?
```

**Output (Real Claude Session)**:

![JQL query results with filtering and analysis](/examples/output-example-03.png)

> **Figure: Unassigned High-Priority Bugs**
> - Natural language → JQL translation
> - Results with priority and age context
> - Triage recommendations included

**What this demonstrates**:
- JQL generation from natural language
- Multi-criteria filtering (priority, date, assignee)
- Actionable output format

---

### Self-Management Queries

**Prompt**:
```
Search issues assigned to me in the next sprint, without acceptance criteria.
```

**Output (Real Claude Session)**:

![Personal sprint items missing acceptance criteria](/examples/output-example-04.png)

> **Figure: Sprint Readiness Check**
> - Issues missing acceptance criteria flagged
> - Sprint context included
> - Direct links to issues for quick fixes

**What this demonstrates**:
- Personal workload analysis
- Scrum compliance checking (acceptance criteria)
- Proactive quality gates

---

### Deep Health Analysis

**Problem**: You need comprehensive insight into epic health—child story status, estimation consistency, blockers, and Scrum compliance—without manually clicking through dozens of issues.

**Prompt**:
```
Provide me a deep health analysis of issue IPV2-960.
```

**Output (Real Claude Session)**:

![Deep analysis showing health scorecard, metrics, and hierarchy](/examples/output-example-06.png)

> **Figure: Epic Health Scorecard**
> - Health score: 92/100
> - Completion: 94% (17/18 stories done)
> - Story points: 96 total, 96 completed
> - Status distribution visualization

**Recursive Child Analysis**:

![Recursive analysis of child stories with rollup metrics](/examples/output-example-07.png)

> **Figure: Hierarchy Traversal**
> - Epic → Story breakdown with points
> - Status per child issue
> - Anomaly detection (unestimated items, stale work)

**Scrum Recommendations**:

![Scrum guidance with actionable recommendations](/examples/output-example-08.png)

> **Figure: Actionable Recommendations**
> - Severity-ranked issues (Critical/Medium/Low)
> - Specific actions: "Transition epic to DONE"
> - Follow-up prompts suggested

**What this demonstrates**:
- Multi-API orchestration (JQL + Changelog + Issue Details)
- Hierarchical traversal with metric aggregation
- Anomaly detection (points mismatch, stale items)
- Scrum best-practice recommendations
- Token-optimized output for large hierarchies

---

### Intelligent Issue Updates

**Problem**: Writing quality acceptance criteria takes time. You want AI to draft them based on project context and patterns.

**Prompt**:
```
Complete acceptance criteria of IPV2-56
```

**Output (Real Claude Session)**:

![AI-generated acceptance criteria based on project context](/examples/output-example-05.png)

> **Figure: AI-Assisted Issue Refinement**
> - Acceptance criteria generated from project patterns
> - Technical context inferred from related issues
> - Properly formatted for Jira (headers, bullets)

**What this demonstrates**:
- Context-aware content generation
- Project pattern recognition
- Write operations with dry-run support
- Quality improvement automation

---

### Additional Prompt Examples

These prompts work out of the box—no screenshots needed to understand their value:

**Backlog Analysis**:
```
Analyze the backlog for project WEBAPP. Show me all unestimated stories,
any epics with inconsistent point totals, and items in progress for 5+ days.
```

**Sprint Management**:
```
Compare the velocity of the last 5 sprints for project MOBILE.
Are we improving or declining? What is our average capacity?
```

**Issue Creation**:
```
Create a bug ticket in project API: Users are receiving 500 errors when
uploading files larger than 10MB. Priority is high. Assign it to me.
```

**Scrum Compliance**:
```
Find all stories in the current sprint that are missing acceptance criteria
or have no story points assigned.
```

**Custom Field Discovery**:
```
Discover all custom fields in my Jira instance that might be used for story points.
Show me numeric fields with names containing "point" or "estimate".
```

---

## Current Capabilities

### Jira Integration (Production Ready)

| Feature | Description |
|---------|-------------|
| **Issue Management** | Retrieve, search, and analyze Jira issues with full JQL support |
| **Scrum Guidance** | Automated best-practice analysis with health scores and actionable recommendations |
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
| `jira_scrum_guidance` | Scrum best-practice analysis with severity-ranked recommendations |
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
- [x] Scrum guidance and best-practice enforcement
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
| F002 | Scrum Guidance | Stable | Best-practice analysis and recommendations |
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
