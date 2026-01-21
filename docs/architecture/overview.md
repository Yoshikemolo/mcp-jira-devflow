# Architecture Overview

## System Design

MCP Jira DevFlow is a monorepo containing multiple MCP servers designed for agent-driven development workflows.

## Components

### MCP Servers

1. **mcp-jira** - Jira integration server
   - Read/write Jira issues
   - JQL queries
   - Issue transitions

2. **mcp-devflow** - Development workflow server
   - Git operations
   - Pull Request automation
   - Test execution

### Shared Library

- **shared** - Common utilities
  - Logging
  - Validation
  - Error handling
  - Types

## Design Principles

1. **Single Responsibility** - Each tool does one thing
2. **Explicit Contracts** - All inputs/outputs are typed
3. **Fail-Safe** - Dry-run mode for destructive operations
4. **Observable** - Structured logging everywhere
5. **Secure** - No secrets in logs or errors

## Communication

```
Agent ←→ MCP Client ←→ MCP Server ←→ External Service
```

All communication uses the MCP protocol over stdio.

## See Also

- [Security](../security/overview.md)
- [Package: mcp-jira](/packages/mcp-jira/README.md)
- [Package: mcp-devflow](/packages/mcp-devflow/README.md)
