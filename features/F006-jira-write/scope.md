# F006: Jira Write Operations

## Feature ID

F006-jira-write

## Status

**Stable**

## Summary

Implement write operations for Jira issues with validation and dry-run support.

## In Scope

- Create new issues (all standard types)
- Update issue fields (summary, description, assignee, priority, labels)
- Update story points
- Transition issues between workflow states
- Dry-run mode for create and update
- Input validation before API calls

## Out of Scope

- Bulk operations
- Attachment handling
- Comment creation (separate feature)
- Issue deletion
- Custom workflow configuration
- Field-level permissions

## Dependencies

- F001: Jira Read Operations (for validation)
- `/skills/jira-write` - Write operation constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accidental modifications | High | Dry-run by default consideration |
| Invalid transitions | Medium | Fetch available transitions first |
| Permission errors | Medium | Clear error messages |
| Field validation | Medium | Pre-validate against metadata |

## Success Criteria

- All write operations validate inputs
- Dry-run accurately simulates results
- Error messages are actionable
- No data loss on failures
