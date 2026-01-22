# F008: PR Context

## Feature ID

F008-pr-context

## Status

**Stable**

## Summary

Generate comprehensive Pull Request context from Jira issues for consistent, well-documented PRs.

## In Scope

- PR title generation from issue(s)
- PR body template with:
  - Summary from issue descriptions
  - Related issues with links
  - Acceptance criteria extraction
  - Testing checklist generation
- Label suggestions based on issue types
- Multi-issue PR support

## Out of Scope

- Actual PR creation (GitHub/GitLab API)
- Code diff analysis
- Reviewer assignment
- CI/CD integration
- Automated PR updates

## Dependencies

- F001: Jira Read Operations
- F007: Git Integration
- `/skills/pr-creation` - PR content constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing acceptance criteria | Medium | Use description fallback |
| Long descriptions | Low | Truncation with link |
| Multiple issue types | Low | Aggregate appropriately |

## Success Criteria

- PR titles are concise and informative
- Bodies include all relevant Jira context
- Acceptance criteria correctly extracted
- Testing checklists are actionable
