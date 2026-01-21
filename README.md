# MCP Jira DevFlow

**AI-Powered Development Workflow Automation for Enterprise SCRUM Teams**

MCP Jira DevFlow is a comprehensive suite of Model Context Protocol (MCP) servers that bridge AI agents with Jira and Git, enabling intelligent automation across the entire software development lifecycle. From sprint planning to deployment, empower your team with AI-assisted workflows that understand your SCRUM process.

MCP Jira DevFlow made by senior software engineers for all software developers and scrum masters.

---

## Why MCP Jira DevFlow?

Modern enterprise development demands more than basic integrations. Teams need intelligent tools that:

- **Understand Context**: AI agents that grasp issue hierarchies, dependencies, and team velocity
- **Enforce Best Practices**: Automated SCRUM compliance checks and actionable recommendations
- **Scale Efficiently**: Token-optimized responses that handle large backlogs without overwhelming context windows
- **Integrate Seamlessly**: Native MCP support for Claude, with extensible architecture for other AI platforms

Whether you are managing a single project or orchestrating multiple enterprise applications, MCP Jira DevFlow provides the foundation for AI-augmented agile development.

---

## Current Capabilities

### Jira Integration (Production Ready)

| Feature | Description |
|---------|-------------|
| **Issue Management** | Retrieve, search, and analyze Jira issues with full JQL support |
| **SCRUM Guidance** | Automated best-practice analysis with health scores and actionable recommendations |
| **Sprint Velocity** | Historical velocity metrics with trend analysis across multiple sprints |
| **Deep Analysis** | Hierarchical issue analysis with anomaly detection (points mismatch, stale items, unassigned work) |
| **Token Optimization** | Intelligent output compression that adapts to result size |

### Available Tools

| Tool | Purpose |
|------|---------|
| `get_issue` | Retrieve complete issue details by key |
| `search_jql` | Execute JQL queries with pagination support |
| `get_issue_comments` | Access issue discussion threads |
| `jira_scrum_guidance` | SCRUM best-practice analysis with severity-ranked recommendations |
| `get_sprint_velocity` | Team velocity metrics and sprint performance analysis |
| `jira_deep_analysis` | Hierarchical analysis with metrics aggregation and anomaly detection |
| `create_issue` | Create new issues with full field support (subtasks, story points, labels) |
| `update_issue` | Update existing issues (summary, description, assignee, priority, etc.) |
| `transition_issue` | Transition issues between workflow states |
| `jira_dev_reload` | Development only: triggers graceful server restart to apply code changes |

---

## Roadmap: The Complete DevFlow Vision

MCP Jira DevFlow is evolving toward a unified platform for AI-assisted enterprise development:

### Phase 1: Jira Mastery (Current)
- [x] Read operations (issues, comments, search)
- [x] SCRUM guidance and best-practice enforcement
- [x] Sprint velocity and performance metrics
- [x] Deep hierarchical analysis with anomaly detection
- [x] Write operations (create, update, transition issues)
- [ ] Board and sprint management
- [ ] Custom field mapping and configuration

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

### Configuration

```bash
# Create environment configuration
cp .env.example .env
```

Required environment variables:

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USER_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

### Claude Desktop Integration

Add to `~/.claude/claude_desktop_config.json`:

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

### Development Mode

For contributors and developers working on the MCP server, a hot-reload mode is available that watches for file changes and notifies connected clients.

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JIRA_MCP_DEV` | Enable development mode with file watcher | `false` |
| `JIRA_MCP_AUTO_RESTART` | Automatically restart server on file changes | `false` |
| `JIRA_MCP_DEBOUNCE_MS` | Debounce delay for file change detection (ms) | `500` |

#### Development Workflow

1. Enable development mode in your Claude Desktop config:

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
        "JIRA_MCP_DEV": "true"
      }
    }
  }
}
```

2. Run TypeScript in watch mode:

```bash
cd packages/mcp-jira
pnpm build --watch
```

3. When you make changes:
   - TypeScript compiles to `dist/`
   - The watcher detects changes and logs them
   - Use the `jira_dev_reload` tool to trigger a graceful restart
   - Claude Code automatically reconnects with the updated code

---

## Feature Status

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F001 | Jira Read Operations | Stable | Issue retrieval, JQL search, comments |
| F002 | SCRUM Guidance | Stable | Best-practice analysis and recommendations |
| F004 | Sprint Velocity | Stable | Team performance metrics |
| F005 | Deep Analysis | Stable | Hierarchical analysis with anomaly detection |
| F006 | Jira Write Operations | Stable | Issue creation and updates |
| F007 | Git Integration | Planned | Repository and branch management |
| F008 | PR Automation | Planned | Automated pull request workflows |

---

## Use Cases

### Sprint Planning
Analyze your backlog with deep hierarchical insights. Detect estimation inconsistencies before sprint commitment. Get AI-powered recommendations for story breakdown and capacity planning.

### Daily Standups
Quickly surface stale in-progress items, unassigned sprint work, and blockers. Generate status summaries with context from related issues.

### Retrospectives
Review sprint velocity trends, completion rates, and team performance metrics. Identify patterns across multiple sprints for continuous improvement.

### Code Reviews
Connect PR context with Jira requirements. Ensure acceptance criteria alignment and track completion status directly from your development workflow.

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
