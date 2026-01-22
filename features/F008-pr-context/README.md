# F008: PR Context

| Property | Value |
|----------|-------|
| **Feature ID** | F008 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-read`, `git-jira-integration`, `pr-creation` |

## Summary

Generate Pull Request context from Jira issues including titles, body templates, acceptance criteria, and testing checklists.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `devflow_git_pr_context` | Generate PR content from issues |

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |

## Related Skills

- [`/skills/jira-read`](../../skills/jira-read/SKILL.md) - Fetch issue data
- [`/skills/git-jira-integration`](../../skills/git-jira-integration/SKILL.md) - Git workflow rules
- [`/skills/pr-creation`](../../skills/pr-creation/SKILL.md) - PR creation constraints

## See Also

- [F007: Git Integration](../F007-git-integration/README.md) - Branch and commit tools
- [F001: Jira Read Operations](../F001-jira-read/README.md) - Issue data source
