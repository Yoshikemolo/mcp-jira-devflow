# Orchestration Skill

Skill for coordinating multi-step workflows.

## Allowed Operations

- Create execution plans
- Execute plans step-by-step
- Coordinate between skills
- Track execution state
- Handle rollbacks

## Forbidden Operations

- Execute without plan approval
- Skip plan validation
- Ignore step failures
- Parallel execution without explicit flag
- Modify plan during execution

## Plan Structure

```yaml
plan:
  id: "plan-001"
  name: "Implement F001"
  steps:
    - id: "step-1"
      skill: "git-operations"
      action: "create-branch"
      params:
        name: "feature/F001-jira-read"
      rollback:
        action: "delete-branch"

    - id: "step-2"
      skill: "jira-write"
      action: "transition"
      params:
        issue: "PROJECT-123"
        status: "In Progress"
      dependsOn: ["step-1"]
```

## Execution Phases

### 1. Plan Phase

- Output all steps
- Identify tools needed
- Identify risks
- NO side effects
- Requires approval to proceed

### 2. Validation Phase

- Validate all inputs
- Check all permissions
- Verify all targets exist
- Dry-run each step

### 3. Execution Phase

- Execute step-by-step
- Abort on error (unless configured)
- Log every action
- Track state for rollback

### 4. Rollback Phase (if needed)

- Execute rollback in reverse order
- Log all rollback actions
- Report final state

## State Management

- Persist plan state between executions
- Allow resume from last successful step
- Clear state on successful completion

## Error Handling

- Single step failure: Pause and report
- Multiple failures: Abort and rollback
- Rollback failure: Alert and manual intervention
