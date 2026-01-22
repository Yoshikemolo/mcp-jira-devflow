---
name: jira-write
description: Create and update Jira issues, add comments, transition statuses, and manage sprints. Use when you need to make changes to Jira data. Supports dry-run mode for validation.
license: MIT
compatibility: Requires Jira Cloud API access with write permissions
metadata:
  author: ximplicity
  version: "1.0"
  category: jira
---

# Jira Write Skill

Write operations for creating and modifying Jira data.

## Allowed Operations

- Create issues
- Update issue fields
- Add comments
- Transition issues between statuses
- Move issues to sprints
- Update sprint details
- Link issues

## Forbidden Operations

- Delete issues (requires separate approval)
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

1. Validate all inputs
2. Check permissions
3. Verify target exists
4. Return what WOULD happen
5. Make NO changes

Always recommend dry-run first for destructive operations.

## Audit Requirements

- Log all write operations (redacted)
- Include request ID for traceability
- Record before/after states where applicable

## Error Handling

| Scenario | Action |
|----------|--------|
| Validation failure | Return all errors at once |
| Permission denied | Clear message, no retry |
| Conflict | Return current state for resolution |
| Network error | Retry with backoff |

## Example Usage

```
Create a bug in project API with high priority
Update PROJ-123 to add acceptance criteria
Transition PROJ-456 to In Review
Move issues PROJ-1, PROJ-2 to Sprint 5
```
