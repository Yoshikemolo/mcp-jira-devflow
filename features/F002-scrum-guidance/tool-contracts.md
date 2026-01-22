# F002: Tool Contracts

## Overview

Input/output contracts for Scrum guidance tools.

---

## jira_scrum_guidance

Analyzes a Jira issue for Scrum best practices.

### Input Schema

```typescript
{
  issueKey: string;  // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  level?: 'minimal' | 'standard' | 'verbose';  // Default: 'standard'
}
```

### Output Schema

```typescript
{
  issueKey: string;
  issueType: string;
  status: string;
  healthScore: number;       // 0-100
  completenessScore: number; // 0-100
  recommendations: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
  followUpPrompts: Array<{
    label: string;
    prompt: string;
  }>;
}
```

### Output Modes

| Level | Behavior |
|-------|----------|
| `minimal` | Only critical/high severity recommendations |
| `standard` | All recommendations, concise descriptions |
| `verbose` | Full details including rationale |

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue does not exist |
| `VALIDATION_ERROR` | Invalid issue key format |

### Example Output

```json
{
  "issueKey": "PROJ-123",
  "issueType": "Story",
  "status": "In Progress",
  "healthScore": 75,
  "completenessScore": 60,
  "recommendations": [
    {
      "severity": "high",
      "title": "Missing Acceptance Criteria",
      "description": "Stories should have clear acceptance criteria.",
      "action": "Add acceptance criteria using Given/When/Then format."
    }
  ],
  "followUpPrompts": [
    {
      "label": "Generate AC",
      "prompt": "Generate acceptance criteria for PROJ-123"
    }
  ]
}
```
