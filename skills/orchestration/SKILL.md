---
name: orchestration
description: Coordinate multi-step workflows across skills with execution plans, state tracking, and rollback support. Use when tasks require multiple coordinated operations.
license: MIT
compatibility: Requires access to other skills being orchestrated
metadata:
  author: ximplicity
  version: "1.0"
  category: workflow
---

# Orchestration Skill

Coordinate multi-step workflows with planning, execution, and rollback.

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
  name: "Implement Feature"
  steps:
    - id: "step-1"
      skill: "git-operations"
      action: "create-branch"
      params:
        name: "feature/PROJ-123-new-feature"
      rollback:
        action: "delete-branch"

    - id: "step-2"
      skill: "jira-write"
      action: "transition"
      params:
        issue: "PROJ-123"
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

| Scenario | Action |
|----------|--------|
| Single step failure | Pause and report |
| Multiple failures | Abort and rollback |
| Rollback failure | Alert for manual intervention |

## Example Usage

```
Create a plan to implement feature PROJ-123
Execute the approved plan step by step
Resume plan execution from step 3
Rollback the last failed plan
```
