# F001: Jira Read Operations

| Property | Value |
|----------|-------|
| **Feature ID** | F001 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-read` |

## Summary

Read-only operations for retrieving Jira issues, comments, and search results via MCP tools.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `get_issue` | Retrieve single issue by key |
| `search_jql` | Search issues using JQL queries |
| `get_issue_comments` | Get comments for an issue |
| `get_issue_changelog` | Get change history for an issue |

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |
| [architecture.md](./architecture.md) | Technical design |

## Related Skills

- [`/skills/jira-read`](../../skills/jira-read/SKILL.md) - Operational constraints for read operations

## See Also

- [F006: Jira Write Operations](../F006-jira-write/README.md) - Write operations
- [F002: Scrum Guidance](../F002-scrum-guidance/README.md) - Analysis on top of read data
