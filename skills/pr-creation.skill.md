# Pull Request Creation Skill

Skill for creating and managing Pull Requests.

## Allowed Operations

- Create pull requests
- Update PR description
- Add reviewers
- Add labels
- Request reviews
- View PR status
- View PR comments

## Forbidden Operations

- Merge PRs (requires explicit approval)
- Close PRs without merging
- Delete branches after merge (configurable)
- Modify PR settings
- Force-approve PRs

## Constraints

- PRs must have description
- PRs must reference feature ID
- PRs must have at least one reviewer
- Draft PRs for work-in-progress

## PR Template

```markdown
## Summary

[Brief description of changes]

## Feature

Implements: F001-jira-read

## Changes

- [Change 1]
- [Change 2]

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No secrets committed
```

## Dry-Run Mode

When `dryRun: true`:
- Validate all PR fields
- Check branch exists
- Verify reviewers exist
- Show PR preview
- Make NO API calls

## Linking

- Link to Jira issues using feature ID
- Link to related PRs if applicable
- Reference relevant documentation
