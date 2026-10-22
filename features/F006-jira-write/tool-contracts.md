# F006: Tool Contracts

## Overview

Input/output contracts for Jira write tools.

---

## create_issue

Creates a new Jira issue.

### Input Schema

```typescript
{
  projectKey: string;      // Pattern: ^[A-Z][A-Z0-9]*$
  summary: string;         // Max: 255 chars
  issueTypeName: string;   // e.g., 'Bug', 'Story', 'Task'
  description?: string;
  assigneeAccountId?: string;
  priorityName?: string;
  labels?: string[];
  parentKey?: string;      // For subtasks
  storyPoints?: number;
  dryRun?: boolean;        // Default: false
}
```

### Output Schema

```typescript
{
  success: boolean;
  dryRun: boolean;
  issue?: {
    key: string;
    self: string;
    summary: string;
  };
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `VALIDATION_ERROR` | Invalid input data |
| `NOT_FOUND` | Project or parent not found |
| `PERMISSION_ERROR` | Cannot create in project |

---

## update_issue

Updates an existing Jira issue.

### Input Schema

```typescript
{
  issueKey: string;           // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  summary?: string;
  description?: string;
  assigneeAccountId?: string | null;  // null to unassign
  priorityName?: string;
  labels?: string[];          // Replaces existing
  storyPoints?: number;
  dryRun?: boolean;           // Default: false
}
```

### Output Schema

```typescript
{
  success: boolean;
  dryRun: boolean;
  issue?: {
    key: string;
    summary: string;
    updated: string;
  };
  changes?: Array<{  // In dry-run mode
    field: string;
    from: any;
    to: any;
  }>;
  validation?: {
    valid: boolean;
    errors: string[];
  };
}
```

---

## transition_issue

Transitions an issue to a new status.

### Input Schema

```typescript
{
  issueKey: string;           // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  listTransitions?: boolean;  // Default: false
  transitionId?: string;
  transitionName?: string;    // Case-insensitive
  comment?: string;
  fields?: Record<string, any>;  // Required transition fields
}
```

### Output Schema (transition)

```typescript
{
  success: boolean;
  issue: {
    key: string;
    previousStatus: string;
    newStatus: string;
  };
}
```

### Output Schema (listTransitions)

```typescript
{
  issueKey: string;
  currentStatus: string;
  availableTransitions: Array<{
    id: string;
    name: string;
    toStatus: string;
    hasRequiredFields: boolean;
    requiredFields?: string[];
  }>;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue not found |
| `INVALID_TRANSITION` | Transition not available |
| `MISSING_FIELDS` | Required fields not provided |

---

## Jira HTTP Response Handling (all write tools)

- Jira answers successful writes (`PUT /issue/{key}`, `POST /issue/{key}/transitions`,
  `POST /sprint/{id}/issue`) with `204 No Content`. The client treats an empty body as
  success and does not try to parse it as JSON.
- A successful response with a malformed JSON body fails with
  `Invalid JSON in Jira response` and is **not** retried, since the write may already
  have been applied.
- 4xx responses are not retried. The error message includes Jira's validation detail
  (`errorMessages` plus `field: message` pairs from `errors`), truncated to 500 characters,
  e.g. `Request failed with status 400: customfield_10016: Field 'customfield_10016' cannot be set...`.
  Response bodies are never logged.
