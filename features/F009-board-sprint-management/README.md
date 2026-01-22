# F009: Board & Sprint Management

| Property | Value |
|----------|-------|
| **Feature ID** | F009 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-read`, `jira-write` |

## Summary

Manage Jira boards and sprints including listing, querying, and moving issues between sprints with dry-run support.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `get_boards` | List Jira boards |
| `get_board_sprints` | List sprints for a board |
| `get_sprint` | Get sprint details with issues |
| `move_issues_to_sprint` | Move issues to a sprint |
| `update_sprint` | Update sprint properties |

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |

## Related Skills

- [`/skills/jira-read`](../../skills/jira-read/SKILL.md) - Read board/sprint data
- [`/skills/jira-write`](../../skills/jira-write/SKILL.md) - Sprint modifications

## See Also

- [F004: Sprint Velocity](../F004-sprint-velocity/README.md) - Sprint metrics
- [F006: Jira Write Operations](../F006-jira-write/README.md) - Issue modifications
