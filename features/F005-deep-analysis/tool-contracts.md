# F005: Tool Contracts

## Overview

Input/output contracts for deep analysis tools.

---

## jira_deep_analysis

Analyzes a Jira issue with its related context.

### Input Schema

```typescript
{
  issueKey: string;  // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  depth?: 'shallow' | 'standard' | 'deep';  // Default: 'standard'
  includeLinks?: boolean;  // Default: true
  maxChildren?: number;  // Default: 50, Max: 100
  outputMode?: 'summary' | 'detailed' | 'full';  // Default: 'detailed'
}
```

### Output Schema

```typescript
{
  root: {
    key: string;
    summary: string;
    issueType: string;
    status: string;
    storyPoints: number | null;
  };
  metrics: {
    totalStoryPoints: number;
    completedStoryPoints: number;
    completionPercentage: number;
    childCount: number;
    statusDistribution: Record<string, number>;
  };
  anomalies: Array<{
    type: 'points_mismatch' | 'unestimated' | 'stale' | 'unassigned';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    affectedIssues: string[];
  }>;
  children?: Array<{  // 'detailed' and 'full' modes
    key: string;
    summary: string;
    status: string;
    storyPoints: number | null;
    assignee: string | null;
  }>;
  links?: Array<{  // When includeLinks: true
    type: string;
    direction: 'inward' | 'outward';
    issue: {
      key: string;
      summary: string;
      status: string;
    };
  }>;
  recommendations?: Array<{  // 'full' mode
    severity: string;
    title: string;
    action: string;
  }>;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue does not exist |
| `VALIDATION_ERROR` | Invalid parameters |

### Example Output (summary)

```json
{
  "root": {
    "key": "PROJ-100",
    "summary": "User Authentication Epic",
    "issueType": "Epic",
    "status": "In Progress",
    "storyPoints": null
  },
  "metrics": {
    "totalStoryPoints": 34,
    "completedStoryPoints": 21,
    "completionPercentage": 62,
    "childCount": 8,
    "statusDistribution": {
      "Done": 5,
      "In Progress": 2,
      "To Do": 1
    }
  },
  "anomalies": [
    {
      "type": "unestimated",
      "severity": "medium",
      "message": "1 child issue has no story points",
      "affectedIssues": ["PROJ-108"]
    }
  ]
}
```
