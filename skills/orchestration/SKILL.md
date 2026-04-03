---
name: orchestration
description: "Chain multiple skill operations in sequence with automatic state tracking and rollback on failure. Use when the user needs to run a pipeline of steps in order, batch operations across Jira and Git, or retry failed steps in a multi-step workflow."
license: MIT
compatibility: Requires access to other skills being orchestrated
metadata:
  author: ximplicity
  version: "1.0"
  category: workflow
---

# Orchestration Skill

Chain multi-step workflows across skills with planning, execution, state tracking, and automatic rollback.

## Allowed Operations

- Create execution plans from user requests
- Execute approved plans step-by-step
- Coordinate between skills (git-operations, jira-write, pr-creation, etc.)
- Track execution state per step
- Roll back completed steps on failure

## Forbidden Operations

- Execute without plan approval
- Skip plan validation
- Ignore step failures
- Parallel execution without explicit flag
- Modify plan during execution

## Workflow

Follow this sequence for every orchestrated operation:

1. **Plan** → Build the step list, identify skills/tools/risks, present to user — NO side effects
2. **Validate** → Dry-run each step: check inputs, verify permissions, confirm dependencies
3. **Execute** → Run steps in order; after each step, record result in state object (see below); abort on first error
4. **Rollback** (on failure) → Execute rollback actions in reverse order; log each action; report final state

### State Tracking

Maintain a state object during execution:

```json
{
  "planId": "plan-001",
  "currentStep": "step-2",
  "status": "executing",
  "steps": {
    "step-1": { "status": "completed", "result": "branch feature/PROJ-123 created" },
    "step-2": { "status": "in-progress" }
  }
}
```

Update after each step completes or fails. On failure, use this state to determine which rollback actions to run.

## Quick Plan Structure

```yaml
plan:
  id: "plan-001"
  name: "Implement Feature"
  steps:
    - id: "step-1"
      skill: "git-operations"
      action: "create-branch"
      params:
        name: "feature/PROJ-123"
      rollback:
        action: "delete-branch"

    - id: "step-2"
      skill: "jira-write"
      action: "transition"
      params:
        issue: "PROJ-123"
        status: "In Progress"
      dependsOn: ["step-1"]
      rollback:
        action: "transition"
        params:
          status: "To Do"
```

For complete plan examples, see [PLAN-EXAMPLES.md](references/PLAN-EXAMPLES.md).

For rollback patterns, see [ROLLBACK-STRATEGIES.md](references/ROLLBACK-STRATEGIES.md).

## Error Handling

| Scenario | Action | Next Step |
|----------|--------|-----------|
| Single step failure | Pause, report error with state | Ask user: retry, skip, or rollback |
| Multiple failures | Abort execution | Rollback all completed steps in reverse |
| Rollback failure | Log failed rollback step | Alert user for manual intervention with state dump |
| Dependency missing | Block dependent step | Report which upstream step must complete first |
