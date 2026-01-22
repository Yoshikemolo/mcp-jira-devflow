# F006: Jira Write Operations

| Property | Value |
|----------|-------|
| **Feature ID** | F006 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-read`, `jira-write` |

## Summary

Write operations for creating, updating, and transitioning Jira issues with dry-run support and validation.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `create_issue` | Create new issues |
| `update_issue` | Update existing issues |
| `transition_issue` | Change issue status |

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |

## Related Skills

- [`/skills/jira-read`](../../skills/jira-read/SKILL.md) - Read operations for validation
- [`/skills/jira-write`](../../skills/jira-write/SKILL.md) - Write operation constraints

## See Also

- [F001: Jira Read Operations](../F001-jira-read/README.md) - Read operations
- [F009: Board & Sprint Management](../F009-board-sprint-management/README.md) - Sprint operations
