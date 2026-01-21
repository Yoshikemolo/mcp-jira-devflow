# MCP Jira DevFlow

Agent-oriented MCP servers for Jira integration and development workflow automation.

## Overview

This project provides a suite of MCP (Model Context Protocol) servers designed to enable AI agents to interact with Jira and automate development workflows in a controlled, auditable, and maintainable way.

## Architecture

```
mcp-jira-devflow/
├── packages/
│   ├── mcp-jira/        # Jira integration MCP server
│   ├── mcp-devflow/     # Git/PR/Test automation MCP server
│   └── shared/          # Shared utilities
├── features/            # Feature specifications
├── skills/              # Agent behavior constraints
└── docs/                # Documentation
```

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [@mcp-jira-devflow/mcp-jira](./packages/mcp-jira/) | Jira API integration | Placeholder |
| [@mcp-jira-devflow/mcp-devflow](./packages/mcp-devflow/) | Git, PR, and test automation | Placeholder |
| [@mcp-jira-devflow/shared](./packages/shared/) | Shared utilities | Placeholder |

## For Agents

**Start here:**

1. Read [agents.md](./agents.md) - Global rules (mandatory)
2. Read the relevant package's `agents.md`
3. Check [/skills](./skills/) for allowed operations
4. Find your feature in [/features](./features/)

## Features

| ID | Name | Status |
|----|------|--------|
| [F001](./features/F001-jira-read/) | Jira Read Operations | Not Started |

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:

```
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_API_TOKEN=your-api-token
JIRA_USER_EMAIL=your-email@example.com
```

## Documentation

- [Architecture Overview](./docs/architecture/overview.md)
- [Security Guidelines](./docs/security/overview.md)
- [Decision Records](./docs/decisions/)

## Development

### Branch Naming

```
feature/F001-description
fix/F001-description
chore/description
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(mcp-jira): add get_issue tool
fix(shared): handle null responses
docs: update README
```

## Author

**Jorge Rodriguez Rengel** ([@Yoshikemolo](https://github.com/Yoshikemolo))

## Owner

**Ximplicity Software Solutions, S.L.**

## Contact

info@ximplicity.es

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Ximplicity Software Solutions, S.L.
