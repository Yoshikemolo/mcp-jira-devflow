# Jira Write Skill

Skill for writing data to Jira.

## Allowed Operations

- Create issues
- Update issue fields
- Add comments
- Transition issues
- Add attachments
- Link issues

## Forbidden Operations

- Delete issues (requires separate skill)
- Bulk operations without explicit approval
- Modifying project settings
- User management
- Permission changes

## Constraints

- All write operations MUST support dry-run mode
- Each operation must be atomic
- Rollback strategy must be documented
- Maximum 10 operations per batch

## Input Requirements

- All inputs must be validated against schemas
- Issue types must exist in target project
- Transitions must be valid for current status
- Comments must not exceed 32KB

## Dry-Run Mode

When `dryRun: true`:
- Validate all inputs
- Check permissions
- Verify target exists
- Return what WOULD happen
- Make NO changes

## Audit Requirements

- Log all write operations (redacted)
- Include request ID for traceability
- Record before/after states where applicable

## Error Handling

- Validation failures: Return all errors at once
- Permission denied: Clear message, no retry
- Conflict: Return current state for resolution
