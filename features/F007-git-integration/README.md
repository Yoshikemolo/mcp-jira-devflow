# F007: Git Integration

| Property | Value |
|----------|-------|
| **Feature ID** | F007 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-read`, `git-jira-integration` |

## Summary

Git-Jira integration for repository linking, branch name generation, and commit message validation.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `devflow_git_link_repo` | Link repository to Jira project |
| `devflow_git_get_repos` | List linked repositories |
| `devflow_git_branch_name` | Generate branch name from issue |
| `devflow_git_validate_commit` | Validate commit message |

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |

## Related Skills

- [`/skills/jira-read`](../../skills/jira-read/SKILL.md) - Fetch issue data
- [`/skills/git-jira-integration`](../../skills/git-jira-integration/SKILL.md) - Git-Jira workflow constraints

## See Also

- [F001: Jira Read Operations](../F001-jira-read/README.md) - Issue data source
- [F008: PR Context](../F008-pr-context/README.md) - PR generation from issues
