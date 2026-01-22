# F004: Tool Contracts

## Overview

Input/output contracts for sprint velocity tools.

---

## get_sprint_velocity

Calculates sprint velocity metrics for a project.

### Input Schema

```typescript
{
  projectKey: string;  // Pattern: ^[A-Z][A-Z0-9]*$
  sprintCount?: number;  // Default: 5, Max: 10
  outputMode?: 'summary' | 'detailed' | 'full';  // Default: 'detailed'
}
```

### Output Schema

```typescript
{
  projectKey: string;
  sprintsAnalyzed: number;
  averageVelocity: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendPercentage: number;
  sprints?: Array<{  // Included in 'detailed' and 'full' modes
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    committed: number;
    completed: number;
    completionPercentage: number;
    issues?: Array<{  // Included in 'full' mode only
      key: string;
      summary: string;
      storyPoints: number;
      status: string;
    }>;
  }>;
}
```

### Output Modes

| Mode | Content |
|------|---------|
| `summary` | Averages and trend only |
| `detailed` | Per-sprint metrics without issues |
| `full` | Complete data including issue lists |

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Project or board not found |
| `NO_DATA` | No closed sprints available |
| `VALIDATION_ERROR` | Invalid project key format |

### Example Output (summary)

```json
{
  "projectKey": "PROJ",
  "sprintsAnalyzed": 5,
  "averageVelocity": 42.5,
  "trend": "stable",
  "trendPercentage": 8.2
}
```
