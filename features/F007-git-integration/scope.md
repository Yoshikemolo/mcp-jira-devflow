# F007: Git Integration

## Feature ID

F007-git-integration

## Status

**Stable**

## Summary

Connect Git workflows with Jira issues through repository linking, branch naming, and commit validation.

## In Scope

- Repository to project linking
- Branch name generation from issues
- Conventional commit validation
- Issue key extraction from commits
- Branch type inference from issue type
- Custom branch naming patterns

## Out of Scope

- Git operations (clone, push, pull)
- GitHub/GitLab API integration
- Webhook handling
- CI/CD pipeline integration
- Merge conflict resolution

## Dependencies

- F001: Jira Read Operations (for issue data)
- `/skills/git-jira-integration` - Workflow constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Branch name conflicts | Low | Include issue key for uniqueness |
| Long branch names | Low | Configurable max length |
| Special characters | Medium | Sanitization rules |

## Success Criteria

- Branch names are git-compatible
- Commit validation catches violations
- Issue keys correctly extracted
- Branch types match issue types
