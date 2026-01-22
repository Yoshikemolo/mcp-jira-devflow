# F007: Tool Contracts

## Overview

Input/output contracts for Git integration tools.

---

## devflow_git_link_repo

Links a Git repository to a Jira project.

### Input Schema

```typescript
{
  projectKey: string;      // Pattern: ^[A-Z][A-Z0-9]*$
  repositoryUrl: string;   // HTTPS or SSH URL
  defaultBranch?: string;  // Default: 'main'
  branchPattern?: string;  // e.g., '{type}/{key}-{slug}'
}
```

### Output Schema

```typescript
{
  success: boolean;
  projectKey: string;
  repositoryUrl: string;
  defaultBranch: string;
  branchPattern: string;
}
```

---

## devflow_git_get_repos

Lists linked repositories.

### Input Schema

```typescript
{
  projectKey?: string;  // Filter by project
}
```

### Output Schema

```typescript
{
  repositories: Array<{
    projectKey: string;
    repositoryUrl: string;
    defaultBranch: string;
    branchPattern: string;
    linkedAt: string;
  }>;
}
```

---

## devflow_git_branch_name

Generates a branch name from a Jira issue.

### Input Schema

```typescript
{
  issueKey: string;        // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  type?: 'feature' | 'fix' | 'chore' | 'hotfix' | 'release' | 'docs' | 'refactor' | 'test';
  format?: string;         // Custom pattern
  maxLength?: number;      // Default: 100, Max: 255
}
```

### Output Schema

```typescript
{
  branchName: string;
  alternatives: string[];
  issueContext: {
    key: string;
    summary: string;
    issueType: string;
    inferredBranchType: string;
  };
  gitCommands: {
    createBranch: string;
    createAndSwitch: string;
  };
}
```

### Example Output

```json
{
  "branchName": "feature/proj-123-add-user-authentication",
  "alternatives": [
    "feature/proj-123-add-user",
    "proj-123-add-user-authentication"
  ],
  "issueContext": {
    "key": "PROJ-123",
    "summary": "Add user authentication",
    "issueType": "Story",
    "inferredBranchType": "feature"
  },
  "gitCommands": {
    "createBranch": "git branch feature/proj-123-add-user-authentication",
    "createAndSwitch": "git checkout -b feature/proj-123-add-user-authentication"
  }
}
```

---

## devflow_git_validate_commit

Validates a commit message.

### Input Schema

```typescript
{
  message: string;
  projectKey?: string;       // Validate issue key references
  requireIssueKey?: boolean; // Default: false
}
```

### Output Schema

```typescript
{
  valid: boolean;
  conventionalCommit: {
    valid: boolean;
    type: string | null;
    scope: string | null;
    description: string | null;
  };
  issueKeys: {
    found: string[];
    valid: boolean;
  };
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `VALIDATION_ERROR` | Invalid input |
| `NOT_FOUND` | Referenced issue not found |
