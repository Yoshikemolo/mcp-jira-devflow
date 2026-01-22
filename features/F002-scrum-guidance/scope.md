# F002: Scrum Guidance

## Feature ID

F002-scrum-guidance

## Status

**Stable**

## Summary

Provide AI-powered Scrum best-practice recommendations based on issue analysis.

## In Scope

- Health score calculation (0-100)
- Completeness score calculation (0-100)
- Best-practice rule evaluation
- Severity-ranked recommendations (Critical, High, Medium, Low)
- Issue type-specific guidance (Epic, Story, Task, Bug, Subtask)
- Workflow state recommendations
- Follow-up prompt suggestions

## Out of Scope

- Automatic issue modification
- Team-level metrics
- Sprint planning recommendations
- Historical trend analysis
- Custom rule configuration

## Dependencies

- F001: Jira Read Operations (for fetching issue data)
- `/skills/jira-read` - Operational constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Opinionated recommendations | Medium | Configurable severity levels |
| Stale best practices | Low | Regular rule review |
| Over-prescriptive guidance | Medium | Allow minimal output mode |

## Success Criteria

- Health and completeness scores are consistent
- Recommendations are actionable
- Output adapts to issue type
- No false positives on well-structured issues
