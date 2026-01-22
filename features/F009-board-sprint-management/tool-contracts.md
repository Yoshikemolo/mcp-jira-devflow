# F009: Tool Contracts

## Overview

Input/output contracts for board and sprint management tools.

---

## get_boards

Lists Jira boards with optional filters.

### Input Schema

```typescript
{
  projectKeyOrId?: string;
  type?: 'scrum' | 'kanban' | 'simple';
  name?: string;  // Contains match
  startAt?: number;
  maxResults?: number;  // Default: 50, Max: 50
}
```

### Output Schema

```typescript
{
  boards: Array<{
    id: number;
    name: string;
    type: 'scrum' | 'kanban' | 'simple';
    projectKey: string;
  }>;
  total: number;
  isLast: boolean;
}
```

---

## get_board_sprints

Lists sprints for a board.

### Input Schema

```typescript
{
  boardId: number;
  state?: 'future' | 'active' | 'closed' | 'all';  // Default: 'all'
  startAt?: number;
  maxResults?: number;  // Default: 50, Max: 50
}
```

### Output Schema

```typescript
{
  sprints: Array<{
    id: number;
    name: string;
    state: 'future' | 'active' | 'closed';
    startDate: string | null;
    endDate: string | null;
    goal: string | null;
  }>;
  total: number;
}
```

---

## get_sprint

Gets sprint details with issues.

### Input Schema

```typescript
{
  sprintId: number;
  includeIssues?: boolean;  // Default: true
  jql?: string;  // Additional filter
  maxIssues?: number;  // Default: 50, Max: 100
  outputMode?: 'auto' | 'compact' | 'full';  // Default: 'auto'
}
```

### Output Schema

```typescript
{
  sprint: {
    id: number;
    name: string;
    state: string;
    startDate: string | null;
    endDate: string | null;
    goal: string | null;
  };
  metrics: {
    totalIssues: number;
    totalStoryPoints: number;
    completedStoryPoints: number;
    statusDistribution: Record<string, number>;
  };
  issues?: Array<{
    key: string;
    summary: string;
    status: string;
    storyPoints: number | null;
    assignee: string | null;
  }>;
}
```

---

## move_issues_to_sprint

Moves issues to a sprint.

### Input Schema

```typescript
{
  sprintId: number;
  issueKeys: string[];  // 1-50 issue keys
  dryRun?: boolean;  // Default: false
}
```

### Output Schema

```typescript
{
  success: boolean;
  dryRun: boolean;
  sprintId: number;
  sprintName: string;
  movedIssues: string[];
  errors?: Array<{
    issueKey: string;
    reason: string;
  }>;
}
```

---

## update_sprint

Updates sprint properties or state.

### Input Schema

```typescript
{
  sprintId: number;
  name?: string;
  startDate?: string;  // ISO format
  endDate?: string;    // ISO format
  goal?: string;
  state?: 'active' | 'closed';  // To start or close
  dryRun?: boolean;  // Default: false
}
```

### Output Schema

```typescript
{
  success: boolean;
  dryRun: boolean;
  sprint: {
    id: number;
    name: string;
    state: string;
    startDate: string | null;
    endDate: string | null;
    goal: string | null;
  };
  changes?: Array<{  // In dry-run mode
    field: string;
    from: any;
    to: any;
  }>;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Sprint or board not found |
| `INVALID_STATE` | Invalid state transition |
| `VALIDATION_ERROR` | Invalid input data |
