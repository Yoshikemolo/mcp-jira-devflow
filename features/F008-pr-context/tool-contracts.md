# F008: Tool Contracts

## Overview

Input/output contracts for PR context tools.

---

## devflow_git_pr_context

Generates Pull Request context from Jira issues.

### Input Schema

```typescript
{
  issueKeys: string[];              // 1-10 issue keys
  targetBranch?: string;            // e.g., 'main', 'develop'
  includeDescription?: boolean;     // Default: true
  includeAcceptanceCriteria?: boolean;  // Default: true
  includeTestingChecklist?: boolean;    // Default: true
}
```

### Output Schema

```typescript
{
  title: string;
  body: string;  // Full markdown body
  sections: {
    summary: string;
    relatedIssues: Array<{
      key: string;
      summary: string;
      url: string;
      type: string;
    }>;
    acceptanceCriteria?: string[];
    testingChecklist?: string[];
  };
  labels: Array<{
    name: string;
    reason: string;
  }>;
  metadata: {
    issueCount: number;
    totalStoryPoints: number | null;
    primaryType: string;
  };
}
```

### Example Output

```json
{
  "title": "feat(auth): add user authentication [PROJ-123]",
  "body": "## Summary\n\nImplement user authentication system...\n\n## Related Issues\n\n- [PROJ-123](https://jira.example.com/browse/PROJ-123): Add user authentication\n\n## Acceptance Criteria\n\n- [ ] Users can log in with email/password\n- [ ] Session persists across page refreshes\n- [ ] Invalid credentials show error message\n\n## Testing Checklist\n\n- [ ] Manual testing completed\n- [ ] Unit tests added\n- [ ] Edge cases covered\n\n---\n*Generated from Jira*",
  "sections": {
    "summary": "Implement user authentication system with session management.",
    "relatedIssues": [
      {
        "key": "PROJ-123",
        "summary": "Add user authentication",
        "url": "https://jira.example.com/browse/PROJ-123",
        "type": "Story"
      }
    ],
    "acceptanceCriteria": [
      "Users can log in with email/password",
      "Session persists across page refreshes",
      "Invalid credentials show error message"
    ],
    "testingChecklist": [
      "Manual testing completed",
      "Unit tests added",
      "Edge cases covered"
    ]
  },
  "labels": [
    {"name": "feature", "reason": "Primary issue is Story"},
    {"name": "size/medium", "reason": "5 story points"}
  ],
  "metadata": {
    "issueCount": 1,
    "totalStoryPoints": 5,
    "primaryType": "Story"
  }
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | One or more issues not found |
| `VALIDATION_ERROR` | Invalid issue keys or too many issues |
